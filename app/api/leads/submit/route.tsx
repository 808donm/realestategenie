import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateHeatScore } from "@/lib/lead-scoring";
import { syncLeadToGHL } from "@/lib/integrations/ghl-sync";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";
import { createOrUpdateGHLContact, createGHLRegistrationRecord, createGHLOpenHouseRecord } from "@/lib/notifications/ghl-service";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventId = String(body?.eventId || "");
    const payload = body?.payload;

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    // Validate event exists + is published (use the view for published-only)
    const { data: published, error: pubErr } = await admin
      .from("public_open_house_event")
      .select("id")
      .eq("id", eventId)
      .single();

    if (pubErr || !published) {
      return NextResponse.json({ error: "Event not available" }, { status: 404 });
    }

    // We also need agent_id for lead_submissions. Fetch from open_house_events directly.
    // Service role bypasses RLS so this is safe server-side.
    const { data: evt, error: evtErr } = await admin
      .from("open_house_events")
      .select("id,agent_id,address,start_at,end_at,beds,baths,sqft,price")
      .eq("id", eventId)
      .single();

    if (evtErr || !evt) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get agent details for notifications
    const { data: agent, error: agentErr } = await admin
      .from("agents")
      .select("display_name,email,phone_e164,agency_name")
      .eq("id", evt.agent_id)
      .single();

    if (agentErr || !agent) {
      console.error("Failed to fetch agent details:", agentErr);
      // Continue without agent details - notifications will be skipped
    }

    // Get GHL integration credentials if connected (automatically refreshes token if expired)
    const ghlConfig = await getValidGHLConfig(evt.agent_id);
    const isGHLConnected = ghlConfig !== null;

    // Calculate heat score
    const heatScore = calculateHeatScore(payload);

    // Insert lead
    const { data: lead, error: insErr } = await admin
      .from("lead_submissions")
      .insert({
        event_id: eventId,
        agent_id: evt.agent_id,
        payload,
        heat_score: heatScore,
        pushed_to_ghl: false,
      })
      .select()
      .single();

    if (insErr || !lead) {
      return NextResponse.json({ error: insErr?.message || "Failed to create lead" }, { status: 400 });
    }

    // Write audit record
    await admin.from("audit_log").insert({
      agent_id: evt.agent_id,
      event_id: eventId,
      action: "lead_submitted",
      details: { source: "open_house_qr", heat_score: heatScore },
    });

    // Prepare flyer URL and formatted dates for webhooks and notifications
    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://yourdomain.com';
    const flyerUrl = `${origin}/api/open-houses/${eventId}/flyer`;

    const startDate = new Date(evt.start_at);
    const endDate = new Date(evt.end_at);
    const openHouseDate = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const openHouseTime = `${startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })} - ${endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })}`;

    // Send notifications to attendee
    const sendNotifications = async () => {
      if (!agent) {
        console.warn('No agent found, skipping notifications');
        return;
      }

      console.log('=== STARTING NOTIFICATIONS ===');
      console.log('Agent:', agent.display_name);
      console.log('Payload email:', payload.email);
      console.log('Payload phone:', payload.phone_e164);
      console.log('Email consent:', payload.consent?.email);
      console.log('SMS consent:', payload.consent?.sms);
      console.log('GHL connected:', isGHLConnected);
      console.log('Flyer URL:', flyerUrl);

      // Create contact and custom objects in GHL
      // Tag-based workflow will handle email/SMS notifications
      if (isGHLConnected && ghlConfig) {
        console.log('Creating GHL contact with workflow trigger tags...');
        try {
          const nameParts = payload.name.split(' ');
          const firstName = nameParts[0] || payload.name;
          const lastName = nameParts.slice(1).join(' ') || '';

          let openHouseRecordId: string | null = null;
          let openHouseTimeoutId: ReturnType<typeof setTimeout> | null = null;
          let openHouseLongTimeoutId: ReturnType<typeof setTimeout> | null = null;

          try {
            console.log('Creating GHL OpenHouse custom object...');
            openHouseTimeoutId = setTimeout(() => {
              console.error('GHL OpenHouse request still pending after 20s');
            }, 20000);
            openHouseLongTimeoutId = setTimeout(() => {
              console.error('GHL OpenHouse request still pending after 40s');
            }, 40000);
            console.log('GHL OpenHouse timeout warnings scheduled');
            openHouseRecordId = await createGHLOpenHouseRecord({
              locationId: ghlConfig.location_id,
              accessToken: ghlConfig.access_token,
              eventId: eventId,
              address: evt?.address || '',
              startDateTime: evt.start_at,
              endDateTime: evt.end_at,
              flyerUrl,
              agentId: evt.agent_id,
              beds: evt.beds,
              baths: evt.baths,
              sqft: evt.sqft,
              price: evt.price,
            });
            console.log('GHL OpenHouse created:', openHouseRecordId);
          } catch (openHouseError: any) {
            console.error('Failed to create GHL OpenHouse:', openHouseError.message);
          } finally {
            if (openHouseTimeoutId) {
              clearTimeout(openHouseTimeoutId);
            }
            if (openHouseLongTimeoutId) {
              clearTimeout(openHouseLongTimeoutId);
            }
          }

          const contact = await createOrUpdateGHLContact({
            locationId: ghlConfig.location_id,
            accessToken: ghlConfig.access_token,
            email: payload.email,
            phone: payload.phone_e164,
            firstName,
            lastName,
            source: 'Open House',
            tags: ['OpenHouse', evt?.address || 'Property'], // Tag will trigger workflow
          });

          const contactId = (contact as { id?: string })?.id;
          console.log('GHL contact created successfully:', contactId);
          console.log('GHL contact response:', JSON.stringify(contact));

          // Now create Registration custom object linking contact to OpenHouse
          if (contactId && openHouseRecordId) {
            try {
              console.log('Creating GHL Registration for contact:', contactId);
              await createGHLRegistrationRecord({
                locationId: ghlConfig.location_id,
                accessToken: ghlConfig.access_token,
                eventId,
                contactId: contactId,
                openHouseRecordId,
              });
              console.log('GHL Registration created successfully');
            } catch (linkError: any) {
              console.error('Failed to create Registration:', linkError.message);
            }
          } else if (!openHouseRecordId) {
            console.warn('Skipping Registration: OpenHouse record not created.');
          } else {
            console.warn('GHL contact response missing id, skipping Registration creation.');
          }

          console.log('Contact creation completed - GHL workflow will handle notifications');
          console.log('Contact will be tagged with: OpenHouse');
          console.log('Property address:', evt?.address);

          // The rest is handled by the GHL workflow triggered by the "OpenHouse" tag
        } catch (error) {
          console.error('GHL notification error:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          console.log('GHL notifications failed:', error);
        }
      } else {
        console.log('GHL not connected, skipping notifications');
      }
    };

    await sendNotifications();

    // Trigger async integrations (non-blocking)
    void Promise.all([
      syncLeadToGHL(lead.id).catch((err) => {
        console.error("❌ GHL sync failed:", err);
        console.error("GHL sync error details:", {
          message: err.message,
          stack: err.stack,
          leadId: lead.id,
          agentId: evt.agent_id,
        });
      }),
      dispatchWebhook(evt.agent_id, "lead.submitted", {
        lead_id: lead.id,
        event_id: eventId,
        property_address: evt.address,
        heat_score: heatScore,
        flyer_url: flyerUrl,
        open_house_date: openHouseDate,
        open_house_time: openHouseTime,
        agent_name: agent?.display_name || '',
        agent_email: agent?.email || '',
        agent_phone: agent?.phone_e164 || '',
        payload,
      }).catch((err) => console.error("Webhook dispatch failed:", err)),
      heatScore >= 80
        ? dispatchWebhook(evt.agent_id, "lead.hot_scored", {
            lead_id: lead.id,
            event_id: eventId,
            property_address: evt.address,
            heat_score: heatScore,
            payload,
          }).catch((err) => console.error("Hot lead webhook failed:", err))
        : Promise.resolve(),
    ]);

    return NextResponse.json({ ok: true, heat_score: heatScore });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
