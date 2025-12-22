import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * GHL Workflow Webhook: Handle numeric replies for flyer choice
 * POST /api/ghl/flyer-choice
 *
 * Called by GHL when contact replies with a number (1, 2, 3, etc.)
 * Validates offer token and returns the selected property's flyer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, choice } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400 }
      );
    }

    if (!choice) {
      return NextResponse.json(
        { error: "choice is required" },
        { status: 400 }
      );
    }

    // Parse choice as integer
    const selectedPosition = parseInt(choice, 10);

    if (isNaN(selectedPosition) || selectedPosition < 1) {
      return NextResponse.json({
        error: "Invalid choice. Please reply with a number (1, 2, 3, etc.)",
        action: "invalid_choice",
      });
    }

    console.log("Processing flyer choice for contact:", contactId, "choice:", selectedPosition);

    // Find active offer session for this contact
    const { data: sessions, error: sessionError } = await supabaseAdmin
      .from("flyer_offer_sessions")
      .select("*")
      .eq("ghl_contact_id", contactId)
      .eq("status", "active")
      .order("offer_sent_at", { ascending: false })
      .limit(1);

    if (sessionError) {
      console.error("Error fetching offer session:", sessionError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (!sessions || sessions.length === 0) {
      console.log("No active offer session found for contact:", contactId);
      return NextResponse.json({
        action: "no_active_offer",
        message: "Sorry, I don't have any active property offers for you. Please reply YES to request a flyer.",
      });
    }

    const session = sessions[0];

    // Check if token has expired
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      console.log("Offer token expired for contact:", contactId);

      // Mark session as expired
      await supabaseAdmin
        .from("flyer_offer_sessions")
        .update({ status: "expired" })
        .eq("id", session.id);

      return NextResponse.json({
        action: "expired",
        message: "Sorry, this offer has expired. Please reply YES to get a new list of properties.",
      });
    }

    // Validate choice is within range
    if (selectedPosition > session.offer_count) {
      return NextResponse.json({
        action: "out_of_range",
        message: `Please choose a number between 1 and ${session.offer_count}.`,
      });
    }

    // Get the registration ID at the selected position (1-indexed)
    const registrationIds = session.registration_ids as string[];
    const selectedRegistrationId = registrationIds[selectedPosition - 1];

    // Fetch the selected registration with event details
    const { data: registration, error: regError } = await supabaseAdmin
      .from("open_house_registrations")
      .select(`
        id,
        event_id,
        agent_id,
        open_house_events!inner(
          id,
          street_address,
          city,
          state_province,
          beds,
          baths,
          sqft,
          price
        )
      `)
      .eq("id", selectedRegistrationId)
      .single();

    if (regError || !registration) {
      console.error("Error fetching registration:", regError);
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    const event = registration.open_house_events as any;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.realestategenie.app";
    const flyerUrl = `${baseUrl}/api/open-houses/${registration.event_id}/flyer`;
    const propertyAddress = `${event.street_address}, ${event.city}, ${event.state_province}`;

    // Update the selected registration
    await supabaseAdmin
      .from("open_house_registrations")
      .update({
        flyer_status: "sent",
        flyer_sent_at: new Date().toISOString(),
        flyer_url: flyerUrl,
      })
      .eq("id", selectedRegistrationId);

    // Mark offer session as responded
    await supabaseAdmin
      .from("flyer_offer_sessions")
      .update({
        status: "responded",
        responded_at: new Date().toISOString(),
        selected_position: selectedPosition,
        selected_registration_id: selectedRegistrationId,
      })
      .eq("id", session.id);

    // Log to audit
    await supabaseAdmin.from("audit_log").insert({
      agent_id: registration.agent_id,
      event_id: registration.event_id,
      action: "flyer.sent_via_sms",
      details: {
        contact_id: contactId,
        property: propertyAddress,
        choice_position: selectedPosition,
        offer_token: session.offer_token,
      },
    });

    console.log("Flyer sent for choice:", selectedPosition, "property:", propertyAddress);

    return NextResponse.json({
      action: "send_flyer",
      flyerUrl,
      propertyAddress,
      selectedPosition,
      message: `Here's your property flyer for ${propertyAddress}:\n\n${flyerUrl}\n\nLooking forward to seeing you at the open house!`,
    });
  } catch (error: any) {
    console.error("Flyer choice error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
