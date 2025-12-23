import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { GHLClient } from "@/lib/integrations/ghl-client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const FLYER_EXPIRATION_DAYS = 3;

/**
 * GHL Workflow Webhook: Handle "YES" replies for flyer requests
 * POST /api/ghl/flyer-request
 *
 * Called by GHL when contact replies YES to initial SMS
 * Queries registrations, checks 3-day expiration, sends SMS directly via GHL API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId } = body;

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
          start_at,
          created_at
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
        message: "No pending registrations",
        action: "none",
      });
    }

    // Get agent info for phone number and GHL integration
    const agentId = registrations[0].agent_id;
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("display_name, phone_e164")
      .eq("id", agentId)
      .single();

    const agentPhone = agent?.phone_e164 || "808-555-1234";

    // Get GHL integration for sending SMS
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    if (!integration) {
      console.error("No active GHL integration for agent:", agentId);
      return NextResponse.json(
        { error: "GHL integration not found" },
        { status: 500 }
      );
    }

    const config = integration.config as any;
    const client = new GHLClient(config.access_token);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.realestategenie.app";

    // Filter out expired registrations (> 3 days old)
    const now = new Date();
    const activeRegistrations = registrations.filter((reg) => {
      const regDate = new Date(reg.registered_at);
      const daysSinceReg = (now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceReg <= FLYER_EXPIRATION_DAYS;
    });

    // Check if all registrations are expired
    if (activeRegistrations.length === 0) {
      const expiredMessage = `Thanks for your interest! This open house registration has expired. Please contact ${agent?.display_name || "your agent"} at ${agentPhone} for the property flyer.`;

      await client.sendSMS({
        contactId,
        message: expiredMessage,
      });

      console.log("All registrations expired. Sent contact agent message.");

      return NextResponse.json({
        action: "expired",
        message: expiredMessage,
      });
    }

    // DECISION LOGIC
    if (activeRegistrations.length === 1) {
      // Single property - send flyer directly
      const reg = activeRegistrations[0];
      const event = reg.open_house_events as any;
      const flyerUrl = `${baseUrl}/api/open-houses/${reg.event_id}/flyer`;
      const propertyAddress = `${event.street_address}, ${event.city}, ${event.state_province}`;

      const message = `Here's your property flyer for ${propertyAddress}:\n\n${flyerUrl}\n\nSee you at the open house!`;

      await client.sendSMS({
        contactId,
        message,
      });

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
      });
    } else {
      // Multiple properties - generate offer token and send choice list
      const offerToken = randomBytes(16).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create offer session
      const registrationIds = activeRegistrations.map((r) => r.id);

      const { error: sessionError } = await supabaseAdmin
        .from("flyer_offer_sessions")
        .insert({
          agent_id: agentId,
          ghl_contact_id: contactId,
          offer_token: offerToken,
          registration_ids: registrationIds,
          offer_count: activeRegistrations.length,
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

      // Set offer_position for each registration
      for (let i = 0; i < activeRegistrations.length; i++) {
        await supabaseAdmin
          .from("open_house_registrations")
          .update({ offer_position: i + 1 })
          .eq("id", activeRegistrations[i].id);
      }

      // Build choice list message
      let choiceMessage = "Great! I see you're registered for multiple open houses:\n\n";

      activeRegistrations.forEach((reg, index) => {
        const event = reg.open_house_events as any;
        const address = `${event.street_address}, ${event.city}`;
        const details = [event.beds && `${event.beds}bd`, event.baths && `${event.baths}ba`]
          .filter(Boolean)
          .join(", ");
        choiceMessage += `${index + 1}. ${address}${details ? ` (${details})` : ""}\n`;
      });

      choiceMessage += `\nReply with the number (1-${activeRegistrations.length}) to get that property's flyer.`;

      // Send SMS via GHL API
      await client.sendSMS({
        contactId,
        message: choiceMessage,
      });

      console.log("Offer created with token:", offerToken, "for", activeRegistrations.length, "properties");

      return NextResponse.json({
        action: "send_choices",
        offerToken,
        propertyCount: activeRegistrations.length,
        expiresAt: expiresAt.toISOString(),
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
