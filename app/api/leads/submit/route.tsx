import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateHeatScore } from "@/lib/lead-scoring";
import { syncLeadToGHL } from "@/lib/integrations/ghl-sync";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";
import { sendCheckInConfirmation, sendGreetingEmail } from "@/lib/notifications/email-service";
import { sendCheckInSMS, sendGreetingSMS } from "@/lib/notifications/sms-service";
import { sendGHLEmail, sendGHLSMS, createOrUpdateGHLContact, getGHLPipelines, createGHLOpportunity } from "@/lib/notifications/ghl-service";

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

    // Get GHL integration credentials if connected
    const { data: ghlIntegration } = await admin
      .from("integrations")
      .select("config,status")
      .eq("agent_id", evt.agent_id)
      .eq("provider", "ghl")
      .single();

    const isGHLConnected = ghlIntegration?.status === "connected" && ghlIntegration?.config;
    const ghlConfig = isGHLConnected ? ghlIntegration.config : null;

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

      // If GHL is connected, use GHL for notifications
      if (isGHLConnected && ghlConfig) {
        try {
          // Create or update contact in GHL first
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
            tags: ['Open House Lead', evt?.address || 'Property'],
          });

          // Create opportunity in GHL pipeline
          try {
            // Get pipelines for the location
            const pipelines = await getGHLPipelines({
              locationId: ghlConfig.location_id,
              accessToken: ghlConfig.access_token,
            });

            if (pipelines && pipelines.length > 0) {
              // Look for "Real Estate Pipeline" by name first (for Real Estate Genie snapshot)
              let targetPipeline = pipelines.find(
                (p: any) => p.name === 'Real Estate Pipeline'
              );

              // Fallback to first pipeline if "Real Estate Pipeline" not found
              if (!targetPipeline) {
                targetPipeline = pipelines[0];
                console.log('Real Estate Pipeline not found, using first pipeline:', targetPipeline.name);
              } else {
                console.log('Using Real Estate Pipeline');
              }

              const firstStage = targetPipeline.stages?.[0];

              if (targetPipeline.id && firstStage?.id) {
                await createGHLOpportunity({
                  locationId: ghlConfig.location_id,
                  accessToken: ghlConfig.access_token,
                  contactId: contact.id,
                  pipelineId: targetPipeline.id,
                  pipelineStageId: firstStage.id,
                  name: `Open House - ${evt?.address || 'Property'}`,
                  status: 'open',
                  source: 'Open House',
                });
                console.log('Created GHL opportunity for:', payload.email);
              }
            }
          } catch (error) {
            console.error('Failed to create GHL opportunity:', error);
            // Continue with notifications even if opportunity creation fails
          }

          // 1. Send check-in confirmation email via GHL
          if (payload.consent?.email) {
            try {
              const emailHtml = generateCheckInEmailHTML({
                attendeeName: payload.name,
                agentName: agent?.display_name || 'Your Agent',
                agentEmail: agent?.email || '',
                agentPhone: agent?.phone_e164 || '',
                propertyAddress: evt?.address || 'this property',
                openHouseDate,
                openHouseTime,
                flyerUrl,
              });

              await sendGHLEmail({
                locationId: ghlConfig.location_id,
                accessToken: ghlConfig.access_token,
                to: payload.email,
                subject: `Thank you for visiting ${evt?.address || 'this property'}`,
                html: emailHtml,
              });
              console.log('GHL check-in confirmation email sent to:', payload.email);
            } catch (error) {
              console.error('Failed to send GHL check-in email:', error);
            }
          }

          // 2. Send check-in confirmation SMS via GHL
          if (payload.consent?.sms && contact?.id) {
            try {
              const smsMessage = `Hi ${payload.name}! Thanks for visiting ${evt?.address || 'this property'}. If you have questions, contact ${agent?.display_name || 'your agent'} at ${agent?.phone_e164 || ''}. Reply STOP to opt out.`;

              await sendGHLSMS({
                locationId: ghlConfig.location_id,
                accessToken: ghlConfig.access_token,
                to: contact.id, // GHL uses contact ID for SMS
                message: smsMessage,
              });
              console.log('GHL check-in confirmation SMS sent to:', payload.phone_e164);
            } catch (error) {
              console.error('Failed to send GHL check-in SMS:', error);
            }
          }

          // 3. Send greeting email to unrepresented attendees via GHL
          if (payload.representation === 'no' && payload.wants_agent_reach_out) {
            if (payload.consent?.email) {
              try {
                const greetingHtml = generateGreetingEmailHTML({
                  attendeeName: payload.name,
                  agentName: agent?.display_name || 'Your Agent',
                  agentEmail: agent?.email || '',
                  agentPhone: agent?.phone_e164 || '',
                  propertyAddress: evt?.address || 'this property',
                });

                await sendGHLEmail({
                  locationId: ghlConfig.location_id,
                  accessToken: ghlConfig.access_token,
                  to: payload.email,
                  subject: `Great meeting you at ${evt?.address || 'this property'}!`,
                  html: greetingHtml,
                });
                console.log('GHL greeting email sent to:', payload.email);
              } catch (error) {
                console.error('Failed to send GHL greeting email:', error);
              }
            }

            // 4. Send greeting SMS to unrepresented attendees via GHL
            if (payload.consent?.sms && contact?.id) {
              try {
                const greetingSMS = `Hi ${payload.name}! Great meeting you at ${evt?.address || 'this property'}. I'll follow up within 24 hours. Looking forward to helping you! - ${agent?.display_name || 'Your Agent'}. Reply STOP to opt out.`;

                await sendGHLSMS({
                  locationId: ghlConfig.location_id,
                  accessToken: ghlConfig.access_token,
                  to: contact.id,
                  message: greetingSMS,
                });
                console.log('GHL greeting SMS sent to:', payload.phone_e164);
              } catch (error) {
                console.error('Failed to send GHL greeting SMS:', error);
              }
            }
          }
        } catch (error) {
          console.error('GHL notification error:', error);
          // Fall back to Resend/Twilio if GHL fails
          console.log('Falling back to Resend/Twilio...');
          await sendFallbackNotifications();
        }
      } else {
        // Use Resend/Twilio if GHL is not connected
        await sendFallbackNotifications();
      }

      // Fallback function using Resend/Twilio
      async function sendFallbackNotifications() {
        // 1. Send check-in confirmation email
        if (payload.consent?.email) {
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
