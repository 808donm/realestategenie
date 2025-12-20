import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GHLClient } from "@/lib/integrations/ghl-client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Send flyer follow-up message to a lead after they check in to an open house
 * This can be called manually or automatically after check-in
 */
export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json();

    if (!leadId) {
      return NextResponse.json(
        { error: "Missing leadId" },
        { status: 400 }
      );
    }

    // Fetch lead with event details
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("lead_submissions")
      .select(`
        *,
        open_house_events!inner(id, address, agent_id, start_at)
      `)
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    if (!lead.ghl_contact_id) {
      return NextResponse.json(
        { error: "Lead not synced to GHL yet. Please sync first." },
        { status: 400 }
      );
    }

    const event = Array.isArray(lead.open_house_events)
      ? lead.open_house_events[0]
      : lead.open_house_events;

    const agentId = event.agent_id;
    const eventId = event.id;

    // Fetch GHL integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: "GHL integration not found or not connected" },
        { status: 400 }
      );
    }

    const config = integration.config as any;
    const ghlClient = new GHLClient(config.access_token);

    // Check if follow-up already sent for this lead/event combo
    const { data: existingFollowup } = await supabaseAdmin
      .from("open_house_flyer_followups")
      .select("*")
      .eq("lead_id", leadId)
      .eq("event_id", eventId)
      .single();

    if (existingFollowup && existingFollowup.status !== "error") {
      return NextResponse.json(
        {
          message: "Follow-up already sent for this lead/event",
          followup: existingFollowup
        },
        { status: 200 }
      );
    }

    // Record attendance
    await supabaseAdmin
      .from("contact_open_house_attendance")
      .upsert({
        agent_id: agentId,
        ghl_contact_id: lead.ghl_contact_id,
        event_id: eventId,
        lead_id: leadId,
      }, {
        onConflict: "ghl_contact_id,event_id",
        ignoreDuplicates: true
      });

    // Fetch agent details for personalization
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("display_name, email, phone_e164")
      .eq("id", agentId)
      .single();

    const agentName = agent?.display_name || "your agent";
    const propertyAddress = event.address;

    // Create thank you message
    const payload = lead.payload as any;
    const leadName = payload?.name?.split(" ")[0] || "there";

    const thankYouMessage = `Hi ${leadName}! Thanks for visiting the open house at ${propertyAddress}. Would you like me to send you the property flyer? Reply YES if interested. - ${agentName}`;

    // Send SMS via GHL
    let messageId: string | null = null;
    try {
      const response = await fetch(
        "https://services.leadconnectorhq.com/conversations/messages",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.access_token}`,
            "Content-Type": "application/json",
            "Version": "2021-07-28",
          },
          body: JSON.stringify({
            type: "SMS",
            locationId: config.location_id,
            contactId: lead.ghl_contact_id,
            message: thankYouMessage,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GHL SMS failed: ${error}`);
      }

      const data = await response.json();
      messageId = data.messageId || data.id;
      console.log("GHL SMS sent successfully:", messageId);
    } catch (smsError: any) {
      console.error("Failed to send SMS:", smsError);

      // Record error in followup
      await supabaseAdmin
        .from("open_house_flyer_followups")
        .upsert({
          id: existingFollowup?.id,
          agent_id: agentId,
          lead_id: leadId,
          event_id: eventId,
          ghl_contact_id: lead.ghl_contact_id,
          status: "error",
          last_error: smsError.message,
          error_count: (existingFollowup?.error_count || 0) + 1,
        });

      return NextResponse.json(
        { error: "Failed to send SMS", details: smsError.message },
        { status: 500 }
      );
    }

    // Create or update follow-up record
    const { data: followup, error: followupError } = await supabaseAdmin
      .from("open_house_flyer_followups")
      .upsert({
        id: existingFollowup?.id,
        agent_id: agentId,
        lead_id: leadId,
        event_id: eventId,
        ghl_contact_id: lead.ghl_contact_id,
        status: "sent",
        thank_you_sent_at: new Date().toISOString(),
        thank_you_message_id: messageId,
        last_error: null,
        error_count: 0,
      }, {
        onConflict: "id"
      })
      .select()
      .single();

    if (followupError) {
      console.error("Failed to create followup record:", followupError);
    }

    // Log to audit
    await supabaseAdmin.from("audit_log").insert({
      agent_id: agentId,
      event_id: eventId,
      action: "flyer_followup.sent",
      details: {
        lead_id: leadId,
        ghl_contact_id: lead.ghl_contact_id,
        message_id: messageId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Follow-up message sent successfully",
      followup,
      messageId,
    });
  } catch (error: any) {
    console.error("Send flyer follow-up error:", error);
    return NextResponse.json(
      { error: "Failed to send follow-up", details: error.message },
      { status: 500 }
    );
  }
}
