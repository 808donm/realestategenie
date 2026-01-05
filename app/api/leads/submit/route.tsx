import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateHeatScore, getHeatLevel } from "@/lib/lead-scoring";
import { syncLeadToGHL } from "@/lib/integrations/ghl-sync";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";
import { createOrUpdateGHLContact, createGHLRegistrationRecord, createGHLOpenHouseRecord, createGHLOpportunity, addGHLTags } from "@/lib/notifications/ghl-service";
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

    // Check for multiple visits to same open house (RED HOT indicator)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const { data: previousVisits, error: visitCheckError } = await admin
      .from("lead_submissions")
      .select("id, created_at, heat_score")
      .eq("event_id", eventId)
      .gte("created_at", today.toISOString())
      .or(`payload->>email.eq.${payload.email},payload->>phone_e164.eq.${payload.phone_e164}`);

    const isReturnVisit = previousVisits && previousVisits.length > 0;
    const visitCount = (previousVisits?.length || 0) + 1; // Including this visit

    // Calculate heat score
    let heatScore = calculateHeatScore(payload);
    let isRedHot = false;

    // BOOST SCORE for return visits - this is a VERY strong buying signal
    if (isReturnVisit) {
      console.log('🔥🔥🔥 RETURN VISIT DETECTED 🔥🔥🔥');
      console.log(`Contact has visited this open house ${visitCount} times today!`);
      console.log('Previous visits:', previousVisits?.map(v => ({ id: v.id, time: v.created_at, score: v.heat_score })));

      // Set to maximum score - this person is RED HOT
      heatScore = 100;
      isRedHot = true;

      console.log(`🚨 Heat score boosted to ${heatScore} (RED HOT) - Multiple visits indicate high interest!`);
    }

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
      details: {
        source: "open_house_qr",
        heat_score: heatScore,
        is_return_visit: isReturnVisit,
        visit_count: visitCount,
        red_hot: isRedHot,
      },
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
        console.log('========================================');
        console.log('=== GHL INTEGRATION ACTIVE ===');
        console.log('========================================');
        console.log('Location ID:', ghlConfig.location_id);
        console.log('Event ID:', eventId);
        console.log('Address:', evt?.address);
        console.log('Creating GHL contact with workflow trigger tags...');
        try {
          const nameParts = payload.name.split(' ');
          const firstName = nameParts[0] || payload.name;
          const lastName = nameParts.slice(1).join(' ') || '';

          let openHouseRecordId: string | null = null;
          let openHouseTimeoutId: ReturnType<typeof setTimeout> | null = null;
          let openHouseLongTimeoutId: ReturnType<typeof setTimeout> | null = null;

          try {
            console.log('=== CREATING GHL OPENHOUSE ===');
            console.log('Creating GHL OpenHouse custom object...');
            openHouseTimeoutId = setTimeout(() => {
              console.error('⚠️ GHL OpenHouse request still pending after 20s');
            }, 20000);
            openHouseLongTimeoutId = setTimeout(() => {
              console.error('⚠️ GHL OpenHouse request still pending after 40s');
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
            console.log('✅ GHL OpenHouse created successfully:', openHouseRecordId);
          } catch (openHouseError: any) {
            console.error('❌ CRITICAL: Failed to create GHL OpenHouse');
            console.error('❌ Error message:', openHouseError.message);
            console.error('❌ Error stack:', openHouseError.stack);
            console.error('❌ This will prevent Registration creation');
            console.error('❌ Recommendation: Verify "openhouses" custom object exists in GHL Settings > Custom Objects');
            console.error('❌ Required fields: openhouseid, address, startdatetime, enddatetime, flyerUrl, agentId, beds, baths, sqft, price');
          } finally {
            if (openHouseTimeoutId) {
              clearTimeout(openHouseTimeoutId);
            }
            if (openHouseLongTimeoutId) {
              clearTimeout(openHouseLongTimeoutId);
            }
          }

          // Build tags array - add special tags for return visits
          const contactTags = ['OpenHouse', evt?.address || 'Property'];
          if (isReturnVisit) {
            contactTags.push('Red Hot Lead');
            contactTags.push('Multiple Visits');
            contactTags.push(`Visited ${visitCount}x Today`);
            console.log('🔥 Adding RED HOT tags:', contactTags);
          }

          const contact = await createOrUpdateGHLContact({
            locationId: ghlConfig.location_id,
            accessToken: ghlConfig.access_token,
            email: payload.email,
            phone: payload.phone_e164,
            firstName,
            lastName,
            source: 'Open House',
            tags: contactTags, // Tag will trigger workflow
          });

          const contactId = (contact as { id?: string })?.id;
          console.log('GHL contact created successfully:', contactId);
          console.log('GHL contact response:', JSON.stringify(contact));

          // Now create Registration custom object linking contact to OpenHouse
          if (contactId && openHouseRecordId) {
            try {
              console.log('=== CREATING GHL REGISTRATION ===');
              console.log('Creating GHL Registration for contact:', contactId);
              console.log('Linking to OpenHouse:', openHouseRecordId);
              await createGHLRegistrationRecord({
                locationId: ghlConfig.location_id,
                accessToken: ghlConfig.access_token,
                eventId,
                contactId: contactId,
                openHouseRecordId,
              });
              console.log('✅ GHL Registration created successfully');
              console.log('✅ OpenHouse fields accessible in emails via {{registration.openHouses.fieldName}}');

              // NOTE: Emails are handled by GHL workflows based on tags
              // First-time visitors: "OpenHouse" tag triggers standard thank you email
              // Return visitors: "Multiple Visits" or "Red Hot Lead" tags trigger special follow-up
              // Configure workflows in GHL to trigger on these tags
              console.log('📧 Contact tagged for email workflow:', isReturnVisit ? 'Return Visit (Red Hot)' : 'First Visit');

              // Create Opportunity in pipeline if configured
              if (ghlConfig.ghl_pipeline_id && ghlConfig.ghl_new_lead_stage) {
                try {
                  console.log('Creating GHL Opportunity in pipeline...');

                  // Calculate heat level for tagging
                  const heatLevel = getHeatLevel(heatScore);
                  console.log(`Lead heat level: ${heatLevel} (score: ${heatScore})`);

                  // All leads start at "New Lead" stage
                  await createGHLOpportunity({
                    locationId: ghlConfig.location_id,
                    accessToken: ghlConfig.access_token,
                    pipelineId: ghlConfig.ghl_pipeline_id,
                    pipelineStageId: ghlConfig.ghl_new_lead_stage,
                    contactId: contactId,
                    name: `${payload.name} - ${evt?.address || 'Open House'}`,
                    monetaryValue: evt?.price || 0,
                    status: 'open',
                  });
                  console.log('GHL Opportunity created successfully in New Lead stage');

                  // Add heat-based tag to contact
                  try {
                    const heatTag = heatLevel === 'hot' ? 'Hot Lead'
                                  : heatLevel === 'warm' ? 'Warm Lead'
                                  : 'Cold Lead';

                    await addGHLTags({
                      contactId: contactId,
                      locationId: ghlConfig.location_id,
                      accessToken: ghlConfig.access_token,
                      tags: [heatTag],
                    });
                    console.log(`Added "${heatTag}" tag to contact based on heat score`);
                  } catch (tagError: any) {
                    console.error('Failed to add heat tag:', tagError.message);
                    // Non-critical - continue even if tagging fails
                  }
                } catch (oppError: any) {
                  console.error('Failed to create Opportunity:', oppError.message);
                }
              } else {
                console.log('No pipeline configured - skipping opportunity creation');
              }
            } catch (linkError: any) {
              console.error('❌ CRITICAL: Failed to create GHL Registration');
              console.error('❌ Error message:', linkError.message);
              console.error('❌ Error stack:', linkError.stack);
              console.error('❌ Recommendation: Verify "registrations" custom object exists in GHL Settings > Custom Objects');
              console.error('❌ Required fields: registrationid, contactid, openhouseid, registerdat, flyerstatus');
              console.error('❌ Required associations: registrations → contact, registrations → openhouses');
            }
          } else if (!openHouseRecordId) {
            console.error('❌ CRITICAL: Skipping Registration creation - OpenHouse record was not created');
            console.error('❌ Contact ID:', contactId);
            console.error('❌ This means registrations will NOT appear in GHL');
            console.error('❌ Check the OpenHouse error logs above for the root cause');
          } else {
            console.error('❌ CRITICAL: Skipping Registration creation - Contact ID is missing');
            console.error('❌ OpenHouse ID:', openHouseRecordId);
            console.error('❌ This means registrations will NOT appear in GHL');
            console.error('❌ Check the Contact creation logs above for the root cause');
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

    // URGENT: Notify agent immediately for RED HOT return visits
    if (isReturnVisit && isRedHot) {
      void dispatchWebhook(evt.agent_id, "lead.red_hot_return_visit", {
        lead_id: lead.id,
        event_id: eventId,
        property_address: evt.address,
        heat_score: heatScore,
        visit_count: visitCount,
        contact_name: payload.name,
        contact_email: payload.email,
        contact_phone: payload.phone_e164,
        message: `🔥🔥🔥 RED HOT LEAD! ${payload.name} has visited ${evt.address} ${visitCount} times today! This indicates VERY high interest. Contact them immediately!`,
        flyer_url: flyerUrl,
        open_house_date: openHouseDate,
        open_house_time: openHouseTime,
        agent_name: agent?.display_name || '',
        agent_email: agent?.email || '',
        agent_phone: agent?.phone_e164 || '',
      }).catch((err) => console.error("Red hot lead webhook failed:", err));
    }

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
