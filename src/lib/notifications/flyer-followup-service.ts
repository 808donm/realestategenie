/**
 * Flyer Follow-up Service
 * Handles automated flyer follow-up messages after open house check-ins
 */

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export interface SendFlyerFollowupParams {
  leadId: string;
  agentId: string;
  eventId: string;
  ghlContactId: string;
  agentName?: string;
  propertyAddress: string;
  leadFirstName?: string;
}

/**
 * Send automated flyer follow-up after open house check-in
 * This is called automatically after a lead is synced to GHL
 */
export async function sendAutomatedFlyerFollowup(
  params: SendFlyerFollowupParams
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const {
      leadId,
      agentId,
      eventId,
      ghlContactId,
      agentName = "your agent",
      propertyAddress,
      leadFirstName = "there",
    } = params;

    // Fetch GHL integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    if (integrationError || !integration) {
      console.log("GHL integration not found or not connected");
      return { success: false, error: "GHL not connected" };
    }

    const config = integration.config as any;

    // Check if follow-up already sent
    const { data: existingFollowup } = await supabaseAdmin
      .from("open_house_flyer_followups")
      .select("*")
      .eq("lead_id", leadId)
      .eq("event_id", eventId)
      .single();

    if (existingFollowup && existingFollowup.status !== "error") {
      console.log("Follow-up already sent for this lead/event");
      return { success: true, messageId: existingFollowup.thank_you_message_id };
    }

    // Record attendance
    await supabaseAdmin
      .from("contact_open_house_attendance")
      .upsert(
        {
          agent_id: agentId,
          ghl_contact_id: ghlContactId,
          event_id: eventId,
          lead_id: leadId,
        },
        {
          onConflict: "ghl_contact_id,event_id",
          ignoreDuplicates: true,
        }
      );

    // Create thank you message
    const thankYouMessage = `Hi ${leadFirstName}! Thanks for visiting the open house at ${propertyAddress}. Would you like me to send you the property flyer? Reply YES if interested. - ${agentName}`;

    // Send SMS via GHL
    const response = await fetch(
      "https://services.leadconnectorhq.com/conversations/messages",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify({
          type: "SMS",
          locationId: config.location_id,
          contactId: ghlContactId,
          message: thankYouMessage,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GHL SMS failed: ${error}`);
    }

    const data = await response.json();
    const messageId = data.messageId || data.id;

    // Create follow-up record
    await supabaseAdmin.from("open_house_flyer_followups").upsert(
      {
        id: existingFollowup?.id,
        agent_id: agentId,
        lead_id: leadId,
        event_id: eventId,
        ghl_contact_id: ghlContactId,
        status: "sent",
        thank_you_sent_at: new Date().toISOString(),
        thank_you_message_id: messageId,
        last_error: null,
        error_count: 0,
      },
      {
        onConflict: "id",
      }
    );

    // Log to audit
    await supabaseAdmin.from("audit_log").insert({
      agent_id: agentId,
      event_id: eventId,
      action: "flyer_followup.sent_auto",
      details: {
        lead_id: leadId,
        ghl_contact_id: ghlContactId,
        message_id: messageId,
      },
    });

    console.log("Automated flyer follow-up sent:", messageId);

    return { success: true, messageId };
  } catch (error: any) {
    console.error("Failed to send automated flyer follow-up:", error);

    // Log error to followup record
    try {
      await supabaseAdmin.from("open_house_flyer_followups").upsert({
        agent_id: params.agentId,
        lead_id: params.leadId,
        event_id: params.eventId,
        ghl_contact_id: params.ghlContactId,
        status: "error",
        last_error: error.message,
        error_count: 1,
      });
    } catch (dbError) {
      console.error("Failed to log error:", dbError);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Get flyer URL for an open house event
 */
export function getFlyerUrl(eventId: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://realestategenie.com";
  return `${baseUrl}/api/open-houses/${eventId}/flyer`;
}

/**
 * Get all open houses a contact has attended
 */
export async function getContactOpenHouseAttendance(
  ghlContactId: string,
  agentId: string
): Promise<any[]> {
  const { data: attendance } = await supabaseAdmin
    .from("contact_open_house_attendance")
    .select(
      `
      *,
      open_house_events!inner(id, address, start_at)
    `
    )
    .eq("ghl_contact_id", ghlContactId)
    .eq("agent_id", agentId)
    .order("attended_at", { ascending: false });

  return attendance || [];
}

/**
 * Check if a contact has pending flyer follow-ups
 */
export async function hasPendingFlyerFollowup(
  ghlContactId: string,
  agentId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("open_house_flyer_followups")
    .select("id")
    .eq("ghl_contact_id", ghlContactId)
    .eq("agent_id", agentId)
    .in("status", ["sent", "needs_clarification"])
    .limit(1)
    .single();

  return !!data;
}
