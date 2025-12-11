import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateHeatScore } from "@/lib/lead-scoring";
import { syncLeadToGHL } from "@/lib/integrations/ghl-sync";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";
import { sendCheckInConfirmation, sendGreetingEmail } from "@/lib/notifications/email-service";
import { sendCheckInSMS, sendGreetingSMS } from "@/lib/notifications/sms-service";

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
      .select("id,agent_id,address,start_at,end_at")
      .eq("id", eventId)
      .single();

    if (evtErr || !evt) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get agent details for notifications
    const { data: agent, error: agentErr } = await admin
      .from("agents")
      .select("display_name,email,phone_e164")
      .eq("id", evt.agent_id)
      .single();

    if (agentErr || !agent) {
      console.error("Failed to fetch agent details:", agentErr);
      // Continue without agent details - notifications will be skipped
    }

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

    // Send notifications to attendee
    const sendNotifications = async () => {
      if (!agent) return;

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

      // Flyer URL (download endpoint)
      const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com';
      const flyerUrl = `${origin}/api/open-houses/${eventId}/flyer`;

      // 1. Send check-in confirmation email to all attendees
      if (payload.consent?.email) {
        try {
          await sendCheckInConfirmation({
            to: payload.email,
            attendeeName: payload.name,
            agentName: agent.display_name || 'Your Agent',
            agentEmail: agent.email || '',
            agentPhone: agent.phone_e164 || '',
            propertyAddress: evt.address,
            openHouseDate,
            openHouseTime,
            flyerUrl,
          });
          console.log('Check-in confirmation email sent to:', payload.email);
        } catch (error) {
          console.error('Failed to send check-in confirmation email:', error);
        }
      }

      // 2. Send check-in confirmation SMS to all attendees
      if (payload.consent?.sms && payload.phone_e164) {
        try {
          await sendCheckInSMS({
            to: payload.phone_e164,
            attendeeName: payload.name,
            agentName: agent.display_name || 'Your Agent',
            agentPhone: agent.phone_e164 || '',
            propertyAddress: evt.address,
          });
          console.log('Check-in confirmation SMS sent to:', payload.phone_e164);
        } catch (error) {
          console.error('Failed to send check-in confirmation SMS:', error);
        }
      }

      // 3. Send greeting email to unrepresented attendees who want contact
      if (payload.representation === 'no' && payload.wants_agent_reach_out) {
        if (payload.consent?.email) {
          try {
            await sendGreetingEmail({
              to: payload.email,
              attendeeName: payload.name,
              agentName: agent.display_name || 'Your Agent',
              agentEmail: agent.email || '',
              agentPhone: agent.phone_e164 || '',
              propertyAddress: evt.address,
            });
            console.log('Greeting email sent to:', payload.email);
          } catch (error) {
            console.error('Failed to send greeting email:', error);
          }
        }

        // 4. Send greeting SMS to unrepresented attendees who want contact
        if (payload.consent?.sms && payload.phone_e164) {
          try {
            await sendGreetingSMS({
              to: payload.phone_e164,
              attendeeName: payload.name,
              agentName: agent.display_name || 'Your Agent',
              propertyAddress: evt.address,
            });
            console.log('Greeting SMS sent to:', payload.phone_e164);
          } catch (error) {
            console.error('Failed to send greeting SMS:', error);
          }
        }
      }
    };

    // Trigger async integrations (non-blocking)
    Promise.all([
      // Send notifications
      sendNotifications().catch((err) =>
        console.error("Notification sending failed:", err)
      ),
      // Sync to GHL
      syncLeadToGHL(lead.id).catch((err) =>
        console.error("GHL sync failed:", err)
      ),
      // Dispatch webhook for lead.submitted
      dispatchWebhook(evt.agent_id, "lead.submitted", {
        lead_id: lead.id,
        event_id: eventId,
        property_address: evt.address,
        heat_score: heatScore,
        payload,
      }).catch((err) => console.error("Webhook dispatch failed:", err)),
      // If hot lead, dispatch lead.hot_scored webhook
      heatScore >= 80
        ? dispatchWebhook(evt.agent_id, "lead.hot_scored", {
            lead_id: lead.id,
            event_id: eventId,
            property_address: evt.address,
            heat_score: heatScore,
            payload,
          }).catch((err) => console.error("Hot lead webhook failed:", err))
        : Promise.resolve(),
    ]).catch((err) => console.error("Integration errors:", err));

    return NextResponse.json({ ok: true, heat_score: heatScore });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
