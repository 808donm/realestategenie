import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Webhook handler for GHL message responses
 * Receives notifications when contacts reply to our messages
 *
 * GHL Webhook payload structure:
 * {
 *   type: "InboundMessage",
 *   locationId: "...",
 *   contactId: "...",
 *   conversationId: "...",
 *   messageId: "...",
 *   body: "YES", // The actual message text
 *   direction: "inbound",
 *   contentType: "text/plain",
 *   ...
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log("GHL webhook received:", JSON.stringify(payload, null, 2));

    // Validate webhook payload
    if (payload.type !== "InboundMessage" || payload.direction !== "inbound") {
      console.log("Ignoring non-inbound message");
      return NextResponse.json({ received: true });
    }

    const {
      contactId,
      locationId,
      body: messageBody,
      messageId,
    } = payload;

    if (!contactId || !messageBody) {
      console.log("Missing required fields");
      return NextResponse.json({ received: true });
    }

    // Find the agent by GHL location ID
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("agent_id, config")
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    if (!integration) {
      console.log("No GHL integration found for location:", locationId);
      return NextResponse.json({ received: true });
    }

    const config = integration.config as any;
    if (config.location_id !== locationId) {
      console.log("Location ID mismatch");
      return NextResponse.json({ received: true });
    }

    const agentId = integration.agent_id;
    const accessToken = config.access_token;

    // Find pending follow-ups for this contact
    const { data: followups } = await supabaseAdmin
      .from("open_house_flyer_followups")
      .select(`
        *,
        open_house_events!inner(id, address, agent_id)
      `)
      .eq("ghl_contact_id", contactId)
      .eq("agent_id", agentId)
      .in("status", ["sent", "needs_clarification"])
      .order("created_at", { ascending: false });

    if (!followups || followups.length === 0) {
      console.log("No pending follow-ups for contact:", contactId);
      return NextResponse.json({ received: true });
    }

    const normalizedBody = messageBody.trim().toUpperCase();

    // Handle response based on current status
    const latestFollowup = followups[0];

    if (latestFollowup.status === "sent") {
      // They're responding to the initial "Do you want the flyer?" question
      await handleInitialResponse(
        latestFollowup,
        normalizedBody,
        messageId,
        contactId,
        agentId,
        accessToken,
        locationId
      );
    } else if (latestFollowup.status === "needs_clarification") {
      // They're responding to "Which open house do you want the flyer for?"
      await handleClarificationResponse(
        latestFollowup,
        normalizedBody,
        messageBody,
        messageId,
        contactId,
        agentId,
        accessToken,
        locationId
      );
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (error: any) {
    console.error("GHL webhook error:", error);
    // Return 200 even on error to prevent GHL from retrying
    return NextResponse.json(
      { received: true, error: error.message },
      { status: 200 }
    );
  }
}

/**
 * Handle initial response to "Do you want the flyer?"
 */
async function handleInitialResponse(
  followup: any,
  normalizedBody: string,
  messageId: string,
  contactId: string,
  agentId: string,
  accessToken: string,
  locationId: string
) {
  const isYes = normalizedBody.includes("YES") ||
                normalizedBody.includes("YEA") ||
                normalizedBody.includes("YA") ||
                normalizedBody === "Y" ||
                normalizedBody.includes("SURE") ||
                normalizedBody.includes("OK") ||
                normalizedBody.includes("PLEASE");

  const isNo = normalizedBody.includes("NO") ||
               normalizedBody.includes("NAH") ||
               normalizedBody === "N" ||
               normalizedBody.includes("NOT INTERESTED");

  // Update followup with response
  await supabaseAdmin
    .from("open_house_flyer_followups")
    .update({
      response_received_at: new Date().toISOString(),
      response_text: normalizedBody,
      status: isYes ? "responded_yes" : isNo ? "responded_no" : "sent",
      updated_at: new Date().toISOString(),
    })
    .eq("id", followup.id);

  if (!isYes) {
    console.log("Lead declined or unclear response");
    return;
  }

  // They said YES! Check if they attended multiple open houses
  const { data: attendanceRecords } = await supabaseAdmin
    .from("contact_open_house_attendance")
    .select(`
      *,
      open_house_events!inner(id, address, start_at)
    `)
    .eq("ghl_contact_id", contactId)
    .eq("agent_id", agentId)
    .order("attended_at", { ascending: false })
    .limit(10);

  if (!attendanceRecords || attendanceRecords.length === 0) {
    console.log("No attendance records found");
    return;
  }

  if (attendanceRecords.length === 1) {
    // Only attended one open house - send flyer directly
    await sendFlyer(
      followup,
      followup.event_id,
      contactId,
      agentId,
      accessToken,
      locationId
    );
  } else {
    // Attended multiple - ask which one they want
    await askForClarification(
      followup,
      attendanceRecords,
      contactId,
      agentId,
      accessToken,
      locationId
    );
  }
}

/**
 * Ask which open house they want the flyer for
 */
async function askForClarification(
  followup: any,
  attendanceRecords: any[],
  contactId: string,
  agentId: string,
  accessToken: string,
  locationId: string
) {
  // Build message listing the properties
  let message = "You've visited multiple properties! Which flyer would you like?\n\n";

  attendanceRecords.forEach((record, index) => {
    const event = Array.isArray(record.open_house_events)
      ? record.open_house_events[0]
      : record.open_house_events;

    const date = new Date(event.start_at).toLocaleDateString();
    message += `${index + 1}. ${event.address} (${date})\n`;
  });

  message += `\nReply with the number (1-${attendanceRecords.length})`;

  // Send clarification message
  const response = await fetch(
    "https://services.leadconnectorhq.com/conversations/messages",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({
        type: "SMS",
        locationId,
        contactId,
        message,
      }),
    }
  );

  if (!response.ok) {
    console.error("Failed to send clarification message");
    return;
  }

  const data = await response.json();

  // Update followup status
  await supabaseAdmin
    .from("open_house_flyer_followups")
    .update({
      status: "needs_clarification",
      clarification_sent_at: new Date().toISOString(),
      clarification_message_id: data.messageId || data.id,
    })
    .eq("id", followup.id);
}

/**
 * Handle response to clarification question
 */
async function handleClarificationResponse(
  followup: any,
  normalizedBody: string,
  originalBody: string,
  messageId: string,
  contactId: string,
  agentId: string,
  accessToken: string,
  locationId: string
) {
  // Extract number from response
  const numberMatch = originalBody.match(/(\d+)/);
  if (!numberMatch) {
    console.log("No number found in clarification response");
    return;
  }

  const selectedIndex = parseInt(numberMatch[1]) - 1;

  // Get attendance records again
  const { data: attendanceRecords } = await supabaseAdmin
    .from("contact_open_house_attendance")
    .select(`
      *,
      open_house_events!inner(id, address, start_at)
    `)
    .eq("ghl_contact_id", contactId)
    .eq("agent_id", agentId)
    .order("attended_at", { ascending: false })
    .limit(10);

  if (!attendanceRecords || selectedIndex < 0 || selectedIndex >= attendanceRecords.length) {
    console.log("Invalid selection");
    return;
  }

  const selectedRecord = attendanceRecords[selectedIndex];
  const selectedEvent = Array.isArray(selectedRecord.open_house_events)
    ? selectedRecord.open_house_events[0]
    : selectedRecord.open_house_events;

  // Send the flyer for the selected property
  await sendFlyer(
    followup,
    selectedEvent.id,
    contactId,
    agentId,
    accessToken,
    locationId
  );
}

/**
 * Send flyer link to contact
 */
async function sendFlyer(
  followup: any,
  eventId: string,
  contactId: string,
  agentId: string,
  accessToken: string,
  locationId: string
) {
  // Get event details
  const { data: event } = await supabaseAdmin
    .from("open_house_events")
    .select("address")
    .eq("id", eventId)
    .single();

  if (!event) {
    console.log("Event not found");
    return;
  }

  // Generate flyer link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://realestategenie.com";
  const flyerLink = `${baseUrl}/api/open-houses/${eventId}/flyer`;

  const message = `Here's the property flyer for ${event.address}: ${flyerLink}\n\nFeel free to reach out if you have any questions!`;

  // Send message with flyer link
  const response = await fetch(
    "https://services.leadconnectorhq.com/conversations/messages",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({
        type: "SMS",
        locationId,
        contactId,
        message,
      }),
    }
  );

  if (!response.ok) {
    console.error("Failed to send flyer message");
    return;
  }

  const data = await response.json();

  // Update followup status
  await supabaseAdmin
    .from("open_house_flyer_followups")
    .update({
      status: "flyer_sent",
      selected_event_id: eventId,
      flyer_sent_at: new Date().toISOString(),
      flyer_message_id: data.messageId || data.id,
      flyer_link: flyerLink,
    })
    .eq("id", followup.id);

  // Log to audit
  await supabaseAdmin.from("audit_log").insert({
    agent_id: agentId,
    event_id: eventId,
    action: "flyer.sent",
    details: {
      followup_id: followup.id,
      ghl_contact_id: contactId,
      flyer_link: flyerLink,
    },
  });

  console.log("Flyer sent successfully to", contactId);
}
