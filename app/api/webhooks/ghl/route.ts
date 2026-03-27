import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSmsResponse } from "@/lib/ai/sms-assistant";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

/**
 * Handle outbound messages (email/SMS sent from CRM to a contact).
 * When we detect that the agent has sent an initial message to a lead,
 * advance that lead from "new_lead" to "initial_contact".
 */
async function handleOutboundMessage(payload: any) {
  const message = payload.message || payload.data?.message;
  const contact = payload.contact || payload.data?.contact;
  const contactId = contact?.id || payload.contactId;
  const messageType = message?.type || payload.messageType;

  console.log("📤 OUTBOUND MESSAGE DETECTED");
  console.log("To:", contact?.name || "Unknown");
  console.log("Type:", messageType);
  console.log("Contact ID:", contactId);

  if (!contactId) {
    console.log("⚠️ No contact ID in outbound message, skipping stage advancement");
    return { success: true, action: "skipped", reason: "no_contact_id" };
  }

  // Only advance for SMS or Email messages
  const normalizedType = (messageType || "").toUpperCase();
  if (!["SMS", "EMAIL"].includes(normalizedType)) {
    console.log(`⚠️ Message type "${messageType}" is not SMS/Email, skipping`);
    return { success: true, action: "skipped", reason: "unsupported_type" };
  }

  try {
    // Find leads linked to this GHL contact that are still in "new_lead" stage
    const { data: leads, error: queryError } = await admin
      .from("lead_submissions")
      .select("id, agent_id, pipeline_stage, ghl_contact_id")
      .eq("ghl_contact_id", contactId)
      .eq("pipeline_stage", "new_lead");

    if (queryError) {
      console.error("❌ Error querying leads for stage advancement:", queryError.message);
      return { success: false, error: queryError.message };
    }

    if (!leads || leads.length === 0) {
      console.log('ℹ️ No leads in "new_lead" stage for contact:', contactId);
      return { success: true, action: "no_leads_to_advance" };
    }

    // Advance each matching lead to "initial_contact"
    const leadIds = leads.map((l: any) => l.id);
    const { error: updateError } = await admin
      .from("lead_submissions")
      .update({
        pipeline_stage: "initial_contact",
        updated_at: new Date().toISOString(),
      })
      .in("id", leadIds);

    if (updateError) {
      console.error("❌ Error advancing leads:", updateError.message);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ Advanced ${leads.length} lead(s) from "new_lead" → "initial_contact" (contact: ${contactId})`);

    // Log to audit trail for each lead
    for (const lead of leads) {
      await admin
        .from("audit_log")
        .insert({
          agent_id: lead.agent_id,
          action: "lead.stage_advanced",
          details: {
            lead_id: lead.id,
            ghl_contact_id: contactId,
            previous_stage: "new_lead",
            new_stage: "initial_contact",
            trigger: `outbound_${normalizedType.toLowerCase()}`,
          },
        })
        .then(({ error }: { error: any }) => {
          if (error) console.log("⚠️ Could not log audit:", error.message);
        });
    }

    return { success: true, action: "advanced", count: leads.length };
  } catch (err: any) {
    console.error("❌ Unexpected error in outbound message handler:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Handle inbound messages from contacts
 */
async function handleInboundMessage(payload: any) {
  const message = payload.message || payload.data?.message;
  const contact = payload.contact || payload.data?.contact;
  const conversation = payload.conversation || payload.data?.conversation;

  console.log("📨 INBOUND MESSAGE RECEIVED");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("From:", contact?.name || "Unknown");
  console.log("Email:", contact?.email);
  console.log("Phone:", contact?.phone);
  console.log("Message Type:", message?.type || "Unknown");
  console.log("Message Body:", message?.body || message?.text);
  console.log("Contact ID:", contact?.id);
  console.log("Conversation ID:", conversation?.id);
  console.log("Timestamp:", new Date().toISOString());
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Store in database for follow-up
  try {
    await admin.from("inbound_messages").insert({
      contact_id: contact?.id,
      contact_name: contact?.name,
      contact_email: contact?.email,
      contact_phone: contact?.phone,
      message_type: message?.type,
      message_body: message?.body || message?.text,
      conversation_id: conversation?.id,
      ghl_message_id: message?.id,
      location_id: payload.locationId,
      raw_payload: payload,
      received_at: new Date().toISOString(),
      read: false,
    });
    console.log("✅ Inbound message stored in database");
  } catch (err: any) {
    console.log("⚠️ Could not store inbound message:", err.message);
  }

  // Route SMS messages to AI assistant
  const messageType = (message?.type || "").toUpperCase();
  const contactId = contact?.id;
  const locationId = payload.locationId;

  if (messageType === "SMS" && contactId && locationId) {
    try {
      // Find the agent integration for this location
      const { data: integration } = await admin
        .from("integrations")
        .select("agent_id, config")
        .eq("provider", "ghl")
        .eq("status", "connected")
        .single();

      if (!integration) {
        console.log("⚠️ No GHL integration found for AI routing");
        return { success: true, action: "logged" };
      }

      const config = integration.config as any;
      if (config.ghl_location_id !== locationId) {
        console.log("⚠️ Location ID mismatch for AI routing");
        return { success: true, action: "logged" };
      }

      const agentId = integration.agent_id;
      const accessToken = config.ghl_access_token;

      // Check if AI SMS assistant is enabled for this agent
      if (!config.ai_sms_enabled) {
        console.log("ℹ️ AI SMS assistant not enabled for this agent");
        return { success: true, action: "logged" };
      }

      // Get agent name for the AI prompt
      const { data: agent } = await admin.from("agents").select("full_name").eq("id", agentId).single();

      const agentName = agent?.full_name || "your agent";

      // Find property context from the lead's most recent open house
      let propertyAddress: string | undefined;
      const { data: attendance } = await admin
        .from("contact_open_house_attendance")
        .select("open_house_events!inner(address)")
        .eq("ghl_contact_id", contactId)
        .eq("agent_id", agentId)
        .order("attended_at", { ascending: false })
        .limit(1)
        .single();

      if (attendance) {
        const event = Array.isArray(attendance.open_house_events)
          ? attendance.open_house_events[0]
          : attendance.open_house_events;
        propertyAddress = event?.address;
      }

      const messageBody = message?.body || message?.text || "";

      console.log("🤖 Routing to AI SMS assistant");

      // Generate AI response
      const { reply, conversationId } = await generateSmsResponse({
        ghlContactId: contactId,
        agentId,
        agentName,
        inboundMessage: messageBody,
        propertyAddress,
      });

      // Send the AI reply via GHL SMS
      const sendResponse = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify({
          type: "SMS",
          locationId,
          contactId,
          message: reply,
        }),
      });

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error("❌ Failed to send AI reply via GHL:", errorText);
        return { success: false, action: "ai_send_failed" };
      }

      console.log(`✅ AI reply sent (conversation: ${conversationId})`);
      return { success: true, action: "ai_replied", conversationId };
    } catch (aiError: any) {
      console.error("❌ AI SMS assistant error:", aiError.message);
      // Don't fail the webhook — the message is already logged above
      return { success: true, action: "ai_error", error: aiError.message };
    }
  }

  return { success: true, action: "logged" };
}

/**
 * GHL Webhook Receiver
 * Receives events from GoHighLevel when things change
 * POST /api/webhooks/ghl
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("[GHL Webhook] Received event:", {
      type: body.type,
      locationId: body.locationId,
      timestamp: new Date().toISOString(),
    });

    // Log the full payload for debugging
    console.log("[GHL Webhook] Full payload:", JSON.stringify(body, null, 2));

    // Store webhook event in database for audit trail
    try {
      await admin.from("webhook_events").insert({
        provider: "ghl",
        event_type: body.type,
        payload: body,
        received_at: new Date().toISOString(),
      });
    } catch (err: any) {
      // Table might not exist yet, just log
      console.log("[GHL Webhook] Could not store event (table may not exist):", err.message);
    }

    // Handle different event types
    switch (body.type) {
      case "ContactCreate":
      case "ContactUpdate":
        console.log("[GHL Webhook] Contact event:", body.contact?.id);
        break;

      case "OpportunityCreate":
      case "OpportunityUpdate":
        console.log("[GHL Webhook] Opportunity event:", body.opportunity?.id);
        break;

      case "TaskCreate":
      case "TaskUpdate":
        console.log("[GHL Webhook] Task event:", body.task?.id);
        break;

      case "InboundMessage":
        await handleInboundMessage(body);
        break;

      case "OutboundMessage":
        console.log("[GHL Webhook] Outbound message sent:", body.message?.id);
        await handleOutboundMessage(body);
        break;

      case "ConversationUnreadUpdate":
        console.log("[GHL Webhook] Unread count updated:", body.conversation?.id);
        break;

      default:
        console.log("[GHL Webhook] Unknown event type:", body.type);
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({
      success: true,
      message: "Webhook received",
      eventType: body.type,
    });
  } catch (error: any) {
    console.error("[GHL Webhook] Error processing webhook:", error);

    // Still return 200 to prevent GHL from retrying
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 200 },
    );
  }
}

// Handle GET requests (for webhook verification)
export async function GET(req: Request) {
  return NextResponse.json({
    service: "Real Estate Genie - GHL Webhook Receiver",
    status: "active",
    endpoint: "/api/webhooks/ghl",
    methods: ["POST"],
    description: "Receives webhook events from GoHighLevel",
  });
}
