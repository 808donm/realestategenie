import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateHeatScore } from "@/lib/lead-scoring";
import { syncLeadToGHL } from "@/lib/integrations/ghl-sync";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";
import { sendCheckInConfirmation, sendGreetingEmail } from "@/lib/notifications/email-service";
import { sendCheckInSMS, sendGreetingSMS } from "@/lib/notifications/sms-service";
import { sendGHLEmail, sendGHLSMS, createOrUpdateGHLContact, getGHLPipelines, createGHLOpportunity, createGHLOpenHouseAndLinkContact } from "@/lib/notifications/ghl-service";
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
      .select("display_name,email,phone_e164")
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

          // Now create OpenHouse custom object and link via Registration
          if (contactId) {
            try {
              console.log('Creating GHL OpenHouse for contact:', contactId);
              await createGHLOpenHouseAndLinkContact({
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
                contactId,
              });
              console.log('GHL OpenHouse and Registration created successfully');
            } catch (linkError: any) {
              console.error('Failed to create OpenHouse/Registration:', linkError.message);
            }
          } else {
            console.warn('GHL contact response missing id, skipping OpenHouse creation.');
          }

          console.log('Contact creation completed - GHL workflow will handle notifications');
          console.log('Contact will be tagged with: OpenHouse');
          console.log('Property address:', evt?.address);

          // The rest is handled by the GHL workflow triggered by the "OpenHouse" tag
        } catch (error) {
          console.error('GHL notification error:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          // Fall back to Resend/Twilio if GHL fails
          console.log('Falling back to Resend/Twilio...');
          await sendFallbackNotifications();
        }
      } else {
        // Use Resend/Twilio if GHL is not connected
        console.log('GHL not connected, using Resend/Twilio fallback');
        await sendFallbackNotifications();
      }

      // Fallback function using Resend/Twilio
      async function sendFallbackNotifications() {
        console.log('=== FALLBACK NOTIFICATIONS ===');
        console.log('Using Resend/Twilio for notifications');

        // 1. Send check-in confirmation email
        if (payload.consent?.email) {
          console.log('Attempting to send check-in email via Resend...');
          try {
            await sendCheckInConfirmation({
              to: payload.email,
              attendeeName: payload.name,
              agentName: agent?.display_name || 'Your Agent',
              agentEmail: agent?.email || '',
              agentPhone: agent?.phone_e164 || '',
              propertyAddress: evt?.address || 'this property',
              openHouseDate,
              openHouseTime,
              flyerUrl,
            });
            console.log('Check-in confirmation email sent to:', payload.email);
          } catch (error) {
            console.error('Failed to send check-in confirmation email:', error);
          }
        }

        // 2. Send check-in confirmation SMS
        if (payload.consent?.sms && payload.phone_e164) {
          try {
            await sendCheckInSMS({
              to: payload.phone_e164,
              attendeeName: payload.name,
              agentName: agent?.display_name || 'Your Agent',
              agentPhone: agent?.phone_e164 || '',
              propertyAddress: evt?.address || 'this property',
              flyerUrl,
            });
            console.log('Check-in confirmation SMS sent to:', payload.phone_e164);
          } catch (error) {
            console.error('Failed to send check-in confirmation SMS:', error);
          }
        }

        // 3. Send greeting email to unrepresented attendees
        if (payload.representation === 'no' && payload.wants_agent_reach_out) {
          if (payload.consent?.email) {
            try {
              await sendGreetingEmail({
                to: payload.email,
                attendeeName: payload.name,
                agentName: agent?.display_name || 'Your Agent',
                agentEmail: agent?.email || '',
                agentPhone: agent?.phone_e164 || '',
                propertyAddress: evt?.address || 'this property',
              });
              console.log('Greeting email sent to:', payload.email);
            } catch (error) {
              console.error('Failed to send greeting email:', error);
            }
          }

          // 4. Send greeting SMS
          if (payload.consent?.sms && payload.phone_e164) {
            try {
              await sendGreetingSMS({
                to: payload.phone_e164,
                attendeeName: payload.name,
                agentName: agent?.display_name || 'Your Agent',
                propertyAddress: evt?.address || 'this property',
              });
              console.log('Greeting SMS sent to:', payload.phone_e164);
            } catch (error) {
              console.error('Failed to send greeting SMS:', error);
            }
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
      // Dispatch webhook for lead.submitted (for GHL workflows)
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

// Helper functions for email HTML generation
function generateCheckInEmailHTML(params: {
  attendeeName: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  propertyAddress: string;
  openHouseDate: string;
  openHouseTime: string;
  flyerUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Thank You for Visiting!</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${params.attendeeName},</p>
    <p style="font-size: 16px;">Thank you for attending the open house at:</p>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #667eea;">${params.propertyAddress}</p>
      <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">${params.openHouseDate} • ${params.openHouseTime}</p>
    </div>
    <p style="font-size: 16px;">We appreciate your interest and hope you enjoyed viewing the property!</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.flyerUrl}" style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">📄 Download Property Flyer</a>
    </div>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #667eea;">Your Agent</h3>
      <p style="margin: 5px 0; font-weight: bold; font-size: 16px;">${params.agentName}</p>
      <p style="margin: 5px 0; color: #666;">📧 <a href="mailto:${params.agentEmail}" style="color: #667eea; text-decoration: none;">${params.agentEmail}</a></p>
      <p style="margin: 5px 0; color: #666;">📱 <a href="tel:${params.agentPhone}" style="color: #667eea; text-decoration: none;">${params.agentPhone}</a></p>
    </div>
    <p style="font-size: 14px; color: #666; margin-top: 30px;">If you have any questions or would like to schedule a private showing, please don't hesitate to reach out!</p>
  </div>
</body>
</html>
  `;
}

function generateGreetingEmailHTML(params: {
  attendeeName: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  propertyAddress: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Great Meeting You!</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${params.attendeeName},</p>
    <p style="font-size: 16px;">It was wonderful meeting you at the open house for:</p>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #11998e; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #11998e;">${params.propertyAddress}</p>
    </div>
    <p style="font-size: 16px;">I'll be following up with you within the next 24 hours to answer any questions you might have and discuss next steps!</p>
    <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; font-size: 16px;"><strong>In the meantime, feel free to reach out:</strong></p>
    </div>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #11998e;">Contact Me</h3>
      <p style="margin: 5px 0; font-weight: bold; font-size: 16px;">${params.agentName}</p>
      <p style="margin: 5px 0; color: #666;">📧 <a href="mailto:${params.agentEmail}" style="color: #11998e; text-decoration: none;">${params.agentEmail}</a></p>
      <p style="margin: 5px 0; color: #666;">📱 <a href="tel:${params.agentPhone}" style="color: #11998e; text-decoration: none;">${params.agentPhone}</a></p>
    </div>
    <p style="font-size: 16px; margin-top: 30px; font-style: italic; color: #666;">"I'm here to help you find the perfect home. Let's make it happen together!"</p>
  </div>
</body>
</html>
  `;
}
