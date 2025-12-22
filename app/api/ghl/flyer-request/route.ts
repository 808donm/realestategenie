import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * GHL Workflow Webhook: Handle "YES" replies for flyer requests
 * POST /api/ghl/flyer-request
 *
 * Called by GHL when contact replies YES to initial SMS
 * Decision logic:
 * - 1 pending registration → Return single flyer URL
 * - 2+ pending registrations → Generate offer token, return choice list
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, agentId } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400 }
      );
    }

    console.log("Processing flyer request for contact:", contactId);

    // Find all pending registrations for this contact
    const { data: registrations, error: regError } = await supabaseAdmin
      .from("open_house_registrations")
      .select(`
        id,
        event_id,
        ghl_contact_id,
        agent_id,
        registered_at,
        open_house_events!inner(
          id,
          street_address,
          city,
          state_province,
          beds,
          baths,
          sqft,
          price,
          start_at
        )
      `)
      .eq("ghl_contact_id", contactId)
      .eq("flyer_status", "pending")
      .order("registered_at", { ascending: false });

    if (regError) {
      console.error("Error fetching registrations:", regError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (!registrations || registrations.length === 0) {
      console.log("No pending registrations found for contact:", contactId);
      return NextResponse.json({
        message: "No pending open house registrations found.",
        action: "none",
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.realestategenie.app";

    // DECISION LOGIC
    if (registrations.length === 1) {
      // Single property - send flyer directly
      const reg = registrations[0];
      const event = reg.open_house_events as any;
      const flyerUrl = `${baseUrl}/api/open-houses/${reg.event_id}/flyer`;
      const propertyAddress = `${event.street_address}, ${event.city}, ${event.state_province}`;

      // Update registration status to 'sent'
      await supabaseAdmin
        .from("open_house_registrations")
        .update({
          flyer_status: "sent",
          flyer_offered_at: new Date().toISOString(),
          flyer_sent_at: new Date().toISOString(),
          flyer_url: flyerUrl,
        })
        .eq("id", reg.id);

      console.log("Single flyer sent for:", propertyAddress);

      return NextResponse.json({
        action: "send_single",
        flyerUrl,
        propertyAddress,
        message: `Here's your property flyer for ${propertyAddress}:\n\n${flyerUrl}\n\nSee you at the open house!`,
      });
    } else {
      // Multiple properties - generate offer token and return choices
      const offerToken = randomBytes(16).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create offer session
      const registrationIds = registrations.map((r) => r.id);

      const { error: sessionError } = await supabaseAdmin
        .from("flyer_offer_sessions")
        .insert({
          agent_id: agentId || registrations[0].agent_id,
          ghl_contact_id: contactId,
          offer_token: offerToken,
          registration_ids: registrationIds,
          offer_count: registrations.length,
          expires_at: expiresAt.toISOString(),
          status: "active",
        });

      if (sessionError) {
        console.error("Error creating offer session:", sessionError);
        return NextResponse.json(
          { error: "Failed to create offer session" },
          { status: 500 }
        );
      }

      // Update all registrations with the offer token
      await supabaseAdmin
        .from("open_house_registrations")
        .update({
          flyer_status: "offered",
          flyer_offered_at: new Date().toISOString(),
          last_offer_token: offerToken,
          offer_token_expires_at: expiresAt.toISOString(),
        })
        .in("id", registrationIds);

      // Also update offer_position for each registration
      for (let i = 0; i < registrations.length; i++) {
        await supabaseAdmin
          .from("open_house_registrations")
          .update({ offer_position: i + 1 })
          .eq("id", registrations[i].id);
      }

      // Build choice list message
      let choiceMessage = "Great! I see you're registered for multiple open houses:\n\n";

      registrations.forEach((reg, index) => {
        const event = reg.open_house_events as any;
        const address = `${event.street_address}, ${event.city}`;
        const details = [event.beds && `${event.beds}bd`, event.baths && `${event.baths}ba`]
          .filter(Boolean)
          .join(", ");
        choiceMessage += `${index + 1}. ${address}${details ? ` (${details})` : ""}\n`;
      });

      choiceMessage += `\nReply with the number (1-${registrations.length}) to get that property's flyer.`;

      console.log("Offer created with token:", offerToken, "for", registrations.length, "properties");

      return NextResponse.json({
        action: "send_choices",
        offerToken,
        propertyCount: registrations.length,
        expiresAt: expiresAt.toISOString(),
        message: choiceMessage,
      });
    }
  } catch (error: any) {
    console.error("Flyer request error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
