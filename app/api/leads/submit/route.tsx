import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateHeatScore, getHeatLevel } from "@/lib/lead-scoring";
import { syncLeadToGHL } from "@/lib/integrations/ghl-sync";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";
import { createOrUpdateGHLContact, createGHLRegistrationRecord, createGHLOpenHouseRecord, createGHLOpportunity, addGHLTags, sendGHLEmail, sendGHLSMS, setGHLContactDND, addGHLContactNote } from "@/lib/notifications/ghl-service";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";
import { validateQRToken } from "@/lib/security/qr-tokens";

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

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
    const accessToken = body?.accessToken; // QR code access token

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    // SECURITY: Validate QR code access token
    if (!accessToken) {
      console.warn('[Lead Submit] Blocked: No access token provided');
      return NextResponse.json(
        { error: "Access denied. Please scan the QR code at the open house to register." },
        { status: 403 }
      );
    }

    const tokenValidation = validateQRToken(accessToken);
    if (!tokenValidation.valid) {
      console.warn('[Lead Submit] Blocked: Invalid token -', tokenValidation.error);
      return NextResponse.json(
        { error: `Invalid access token: ${tokenValidation.error}` },
        { status: 403 }
      );
    }

    // Verify token is for THIS event
    if (tokenValidation.payload?.eventId !== eventId) {
      console.warn('[Lead Submit] Blocked: Token event mismatch');
      return NextResponse.json(
        { error: "Access token is for a different open house" },
        { status: 403 }
      );
    }

    console.log('[Lead Submit] ✅ Access token validated for event:', eventId);

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
    console.log('[Registration] Fetching GHL config for agent_id:', evt.agent_id);
    const ghlConfig = await getValidGHLConfig(evt.agent_id);
    const isGHLConnected = ghlConfig !== null;

    if (isGHLConnected) {
      console.log('[Registration] GHL integration found:', {
        agentId: evt.agent_id,
        locationId: ghlConfig.location_id,
        hasAccessToken: !!ghlConfig.access_token,
        tokenPrefix: ghlConfig.access_token?.substring(0, 20) + '...',
        hasPipelineConfig: !!(ghlConfig.ghl_pipeline_id && ghlConfig.ghl_new_lead_stage),
      });
    } else {
      console.log('[Registration] No GHL integration found for agent:', evt.agent_id);
    }

    // Check for multiple visits to same open house (RED HOT indicator)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const { data: previousVisits, error: visitCheckError } = await admin
      .from("lead_submissions")
      .select("id, created_at, heat_score")
      .eq("event_id", eventId)
      .gte("created_at", today.toISOString())
      .or(`payload->>email.eq.${payload.email},payload->>phone_e164.eq.${payload.phone_e164}`);

    const isReturnVisit = !!(previousVisits && previousVisits.length > 0);
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

          let contactId: string | undefined;
          try {
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

            contactId = (contact as { id?: string })?.id;
            console.log('GHL contact created successfully:', contactId);
            console.log('GHL contact response:', JSON.stringify(contact));
          } catch (contactError: any) {
            console.error('❌ GHL contact creation failed:', contactError.message);
            console.error('❌ Will attempt to search for existing contact as fallback');

            // Fallback: search for existing contact by email/phone
            try {
              const { default: searchFallback } = await import("@/lib/notifications/ghl-service").then(m => ({ default: m }));
              const searchResponse = await fetch(
                `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${ghlConfig.location_id}&email=${encodeURIComponent(payload.email)}`,
                {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${ghlConfig.access_token}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28',
                  },
                }
              );

              if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                contactId = searchData?.contact?.id;
                if (contactId) {
                  console.log('✅ Found existing contact via fallback search:', contactId);
                }
              }
            } catch (searchError: any) {
              console.error('❌ Fallback contact search also failed:', searchError.message);
            }
          }

          // If attendee is represented by a realtor, set DND and add note
          if (contactId && payload.representation === 'yes') {
            try {
              console.log('[Registration] Attendee is represented - setting DND on all channels');
              await setGHLContactDND({
                contactId,
                locationId: ghlConfig.location_id,
                accessToken: ghlConfig.access_token,
                dndEnabled: true,
              });
              console.log('[Registration] DND set successfully for represented attendee');
            } catch (dndError: any) {
              console.error('[Registration] Failed to set DND (non-critical):', dndError.message);
            }

            // Add realtor name as a note on the contact
            const realtorName = payload.realtor_name || '';
            const noteBody = realtorName
              ? `Represented by realtor: ${realtorName}. DND enabled on all channels.`
              : `Attendee indicated they are represented by a realtor. DND enabled on all channels.`;

            try {
              await addGHLContactNote({
                contactId,
                locationId: ghlConfig.location_id,
                accessToken: ghlConfig.access_token,
                body: noteBody,
              });
              console.log('[Registration] Realtor representation note added');
            } catch (noteError: any) {
              console.error('[Registration] Failed to add realtor note (non-critical):', noteError.message);
            }
          }

          // Create Registration custom object linking contact to OpenHouse
          // (requires both contactId AND openHouseRecordId)
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
            } catch (linkError: any) {
              console.error('❌ Failed to create GHL Registration (non-blocking):', linkError.message);
              console.error('❌ Recommendation: Verify "registrations" custom object exists in GHL Settings > Custom Objects');
            }
          } else {
            console.warn('⚠️ Skipping Registration custom object:', !openHouseRecordId ? 'OpenHouse record missing' : 'Contact ID missing');
          }

          // Send thank you email (only needs contactId)
          if (contactId) {
            try {
              console.log('📧 Attempting to send email via GHL...');

              const emailSubject = isReturnVisit
                ? `🔥 Welcome Back! ${evt.address}`
                : `Thank You for Visiting ${evt.address}`;

              const emailHtml = isReturnVisit
                ? getReturnVisitEmailHtml(payload.name, evt.address, flyerUrl, visitCount)
                : getFirstVisitEmailHtml(payload.name, evt.address, flyerUrl);

              await sendGHLEmail({
                locationId: ghlConfig.location_id,
                accessToken: ghlConfig.access_token,
                contactId: contactId,
                to: payload.email,
                subject: emailSubject,
                html: emailHtml,
              });

              console.log('✅ Email sent successfully via GHL (tracked in CRM)');
            } catch (ghlEmailError: any) {
              console.warn('⚠️ GHL email failed, falling back to Resend:', ghlEmailError.message);

              try {
                const { sendOpenHouseEmail } = await import("@/lib/email/resend");

                await sendOpenHouseEmail({
                  to: payload.email,
                  name: payload.name,
                  propertyAddress: evt.address,
                  flyerUrl,
                  isReturnVisit,
                  visitCount,
                });
                console.log('✅ Email sent successfully via Resend (fallback)');
              } catch (resendError: any) {
                console.error('❌ Both GHL and Resend email sending failed:', resendError.message);
              }
            }

            // Send SMS if attendee consented
            if (payload.consent?.sms) {
              try {
                console.log('📱 Attempting to send SMS via GHL...');

                const smsMessage = isReturnVisit
                  ? `Welcome back to ${evt.address}! 🔥 We noticed you're really interested in this property. Reply YES for the property fact sheet, or let us know if you'd like to schedule a private showing!`
                  : `Thanks for visiting ${evt.address} today! 🏡 Reply YES for the property fact sheet. Questions? Just reply to this message and we'll get back to you!`;

                await sendGHLSMS({
                  locationId: ghlConfig.location_id,
                  accessToken: ghlConfig.access_token,
                  to: contactId,
                  message: smsMessage,
                });

                console.log('✅ SMS sent successfully via GHL');
              } catch (smsError: any) {
                console.error('⚠️ SMS send failed (non-blocking):', smsError.message);
              }
            } else {
              console.log('📱 SMS skipped - no SMS consent from attendee');
            }

            // Create Opportunity in pipeline if configured
            if (ghlConfig.ghl_pipeline_id && ghlConfig.ghl_new_lead_stage) {
              try {
                console.log('Creating GHL Opportunity in pipeline...');

                const heatLevel = getHeatLevel(heatScore);
                console.log(`Lead heat level: ${heatLevel} (score: ${heatScore})`);

                const opportunityId = await createGHLOpportunity({
                  locationId: ghlConfig.location_id,
                  accessToken: ghlConfig.access_token,
                  pipelineId: ghlConfig.ghl_pipeline_id,
                  pipelineStageId: ghlConfig.ghl_new_lead_stage,
                  contactId: contactId,
                  name: `${payload.name} - ${evt?.address || 'Open House'}`,
                  monetaryValue: evt?.price || 0,
                  status: 'open',
                });
                console.log('✅ GHL Opportunity created successfully:', opportunityId);

                // Store the opportunity ID back on the lead record
                if (opportunityId) {
                  await admin
                    .from("lead_submissions")
                    .update({
                      ghl_opportunity_id: opportunityId,
                      ghl_contact_id: contactId,
                      pushed_to_ghl: true,
                    })
                    .eq("id", lead.id);
                  console.log('✅ Opportunity ID saved to lead_submissions');
                }

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
                }
              } catch (oppError: any) {
                console.error('❌ Failed to create Opportunity:', oppError.message);
              }
            } else {
              console.log('⚠️ No pipeline configured - skipping opportunity creation');
              console.log('   Set ghl_pipeline_id and ghl_new_lead_stage in integration config to enable');
            }
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

// Email template helpers for GHL email sending
function getFirstVisitEmailHtml(name: string, propertyAddress: string, flyerUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Visiting</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">Thank You for Visiting!</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">${propertyAddress}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">Hi ${name},</p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">Thank you for visiting our open house today at <strong>${propertyAddress}</strong>! We hope you enjoyed touring the property.</p>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">Download the property information sheet to review all the details:</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${flyerUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">📄 Download Property Fact Sheet</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">If you have any questions or would like to schedule a private showing, please don't hesitate to reach out. We'd love to help you find your dream home!</p>
              <p style="margin: 20px 0 0; font-size: 16px; line-height: 1.6; color: #374151;">Best regards,<br><strong>Your Real Estate Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #6b7280; text-align: center;">© ${new Date().getFullYear()} Real Estate Genie. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getReturnVisitEmailHtml(name: string, propertyAddress: string, flyerUrl: string, visitCount: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome Back!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">🔥 Welcome Back! 🔥</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 600;">${propertyAddress}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">Hi ${name},</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border-left: 4px solid #f59e0b; margin: 0 0 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 16px; color: #92400e; font-weight: 600;">🔥 We noticed this is your ${visitCount === 2 ? '2nd' : visitCount === 3 ? '3rd' : visitCount + 'th'} visit today to ${propertyAddress}! We're excited about your interest in this property.</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">Your enthusiasm tells us you're seriously considering making this your new home. We'd love to help make that happen!</p>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">Here's the property information sheet for your review:</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${flyerUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.4);">📄 Download Property Fact Sheet</a>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; font-size: 16px; color: #065f46; font-weight: 600;">Ready to take the next step?</p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #065f46;">✅ Schedule a private showing<br>✅ Discuss financing options<br>✅ Submit an offer<br>✅ Get answers to any questions</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; font-size: 16px; line-height: 1.6; color: #374151;">We're here to help and will be reaching out shortly. Feel free to contact us anytime!</p>
              <p style="margin: 20px 0 0; font-size: 16px; line-height: 1.6; color: #374151;">Best regards,<br><strong>Your Real Estate Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #6b7280; text-align: center;">© ${new Date().getFullYear()} Real Estate Genie. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
