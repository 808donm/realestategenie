/**
 * GHL Lead Sync Service
 * Pushes leads from open house check-ins to GoHighLevel CRM
 */

import { GHLClient, GHLContact, GHLOpportunity } from "./ghl-client";
import { createClient } from "@supabase/supabase-js";
import { getValidGHLConfig } from "./ghl-token-refresh";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type LeadData = {
  id: string;
  event_id: string;
  agent_id: string;
  payload: {
    name: string;
    email?: string;
    phone_e164?: string;
    representation?: "yes" | "no" | "unsure";
    wants_agent_reach_out?: boolean;
    timeline?: string;
    financing?: string;
    neighborhoods?: string;
    must_haves?: string;
    consent?: {
      sms: boolean;
      email: boolean;
      captured_at: string;
    };
  };
  heat_score: number;
  created_at: string;
};

export type HeatLevel = "hot" | "warm" | "cold";

/**
 * Calculate heat level from heat score
 */
function getHeatLevel(score: number): HeatLevel {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}

/**
 * Sync a lead to GHL
 */
export async function syncLeadToGHL(leadId: string): Promise<{
  success: boolean;
  ghlContactId?: string;
  ghlOpportunityId?: string;
  error?: string;
}> {
  console.log("🔄 Starting GHL sync for lead:", leadId);
  try {
    // Fetch lead
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("lead_submissions")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      throw new Error("Lead not found");
    }

    // Get GHL config (automatically refreshes token if expired)
    const config = await getValidGHLConfig(lead.agent_id);

    if (!config) {
      console.error("❌ GHL not connected for agent:", lead.agent_id);
      throw new Error("GHL not connected for this agent");
    }

    console.log("✅ GHL config retrieved, location_id:", config.location_id);

    const client = new GHLClient(config.access_token, config.location_id);

    // Get integration record for metadata updates
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("integrations")
      .select("id")
      .eq("agent_id", lead.agent_id)
      .eq("provider", "ghl")
      .single();

    if (integrationError || !integration) {
      throw new Error("GHL integration record not found");
    }

    // Fetch event for property details
    const { data: event } = await supabaseAdmin
      .from("open_house_events")
      .select("address, start_at, end_at, beds, baths, sqft, price, ghl_custom_object_id")
      .eq("id", lead.event_id)
      .single();

    const propertyAddress = event?.address || "Unknown Property";

    // Fetch agent details for workflow
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("display_name, email, phone_e164, license_number")
      .eq("id", lead.agent_id)
      .single();

    // Prepare contact data
    const payload = lead.payload as any;
    const nameParts = payload.name?.split(" ") || [];
    const firstName = nameParts[0] || payload.name;
    const lastName = nameParts.slice(1).join(" ") || "";

    // Build flyer URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.realestategenie.app";
    const flyerUrl = `${baseUrl}/api/open-houses/${lead.event_id}/flyer`;

    // Format event time for display
    const eventStartTime = event?.start_at
      ? new Date(event.start_at).toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "";

    const contactData: GHLContact = {
      locationId: config.location_id,
      firstName,
      lastName,
      name: payload.name,
      email: payload.email || undefined,
      phone: payload.phone_e164 || undefined,
      tags: [
        `open-house-${lead.event_id}`, // Primary trigger tag
        "open-house",                   // Category tag
        propertyAddress,                // For filtering
        getHeatLevel(lead.heat_score),  // hot/warm/cold
        payload.timeline || "",
        payload.financing || "",
      ].filter(Boolean),
      source: "Open House QR",
      customFields: {
        // Property details for email template
        property_address: propertyAddress,
        property_flyer_url: flyerUrl,
        event_start_time: eventStartTime,
        open_house_event_id: lead.event_id,

        // Property specs
        beds: event?.beds?.toString() || "",
        baths: event?.baths?.toString() || "",
        sqft: event?.sqft?.toString() || "",
        price: event?.price?.toString() || "",

        // Lead qualification
        heat_score: lead.heat_score?.toString() || "",
        representation: payload.representation || "",
        wants_reach_out: payload.wants_agent_reach_out ? "Yes" : "No",
        timeline: payload.timeline || "",
        financing: payload.financing || "",
        neighborhoods: payload.neighborhoods || "",
        must_haves: payload.must_haves || "",

        // Agent info for email
        agent_license: agent?.license_number || "",
      },
    };

    // Check if contact already exists
    let contactId: string;
    if (payload.email) {
      const searchResult = await client.searchContacts({ email: payload.email });
      if (searchResult.contacts && searchResult.contacts.length > 0) {
        // Update existing contact
        contactId = searchResult.contacts[0].id!;
        await client.updateContact(contactId, contactData);
        await client.addTags(contactId, contactData.tags || []);
      } else {
        // Create new contact
        const newContact = await client.createContact(contactData);
        contactId = newContact.id!;
      }
    } else {
      // No email, create new contact
      const newContact = await client.createContact(contactData);
      contactId = newContact.id!;
    }

    // Create Registration Custom Object in GHL + local tracking record
    // Check if registration already exists in our database
    const { data: existingReg } = await supabaseAdmin
      .from("open_house_registrations")
      .select("id, ghl_registration_id")
      .eq("ghl_contact_id", contactId)
      .eq("event_id", lead.event_id)
      .single();

    let ghlRegistrationId: string | undefined;

    if (!existingReg) {
      // Get or create OpenHouse Custom Object ID
      let ghlOpenHouseId = event?.ghl_custom_object_id;

      if (ghlOpenHouseId) {
        console.log("✅ OpenHouse custom object already exists in GHL:", ghlOpenHouseId);
      } else if (event) {
        // Create OpenHouse Custom Object in GHL
        console.log("🏠 Creating NEW OpenHouse custom object in GHL for event:", lead.event_id);
        try {
          const openHouseRecord = await client.createCustomObjectRecord({
            locationId: config.location_id,
            objectType: "custom_objects.openhouses",
            properties: {
              // Property keys use internal field names WITHOUT the custom_objects.openhouses prefix
              "openhouseid": lead.event_id,
              "address": propertyAddress,
              "startdatetime": event.start_at,
              "enddatetime": event.end_at,
              "flyerurl": flyerUrl,
              "agentid": lead.agent_id,
              "beds": event.beds?.toString() || "",
              "baths": event.baths?.toString() || "",
              "sqft": event.sqft?.toString() || "",
              "price": event.price?.toString() || "",
            },
          });

          ghlOpenHouseId = openHouseRecord.id;

          // Store OpenHouse Custom Object ID in our database
          await supabaseAdmin
            .from("open_house_events")
            .update({ ghl_custom_object_id: ghlOpenHouseId })
            .eq("id", lead.event_id);

          console.log("Created OpenHouse Custom Object in GHL:", ghlOpenHouseId);
        } catch (err: any) {
          console.error("Failed to create OpenHouse Custom Object:", err);
          // Continue without it - registration can still work
        }
      }

      // Create Registration Custom Object in GHL
      console.log("📝 Creating Registration custom object in GHL");
      try {
        const registrationRecord = await client.createCustomObjectRecord({
          locationId: config.location_id,
          objectType: "custom_objects.registrations",
          properties: {
            // Property keys use internal field names WITHOUT the custom_objects.registrations prefix
            "registrationid": `reg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            "contactid": contactId,
            "openhouseid": lead.event_id,
            "registerdat": new Date().toISOString(),
            "flyerstatus": ["pending"], // Multi-select field requires array
          },
          // Note: Relationships tracked via contactid and openhouseid properties
        });

        ghlRegistrationId = registrationRecord.id;
        console.log("Created Registration Custom Object in GHL:", ghlRegistrationId);
      } catch (err: any) {
        console.error("Failed to create Registration Custom Object:", err);
        // Continue without it - we'll still track locally
      }

      // Create local registration tracking record
      const { error: regError } = await supabaseAdmin
        .from("open_house_registrations")
        .insert({
          agent_id: lead.agent_id,
          event_id: lead.event_id,
          lead_id: leadId,
          ghl_contact_id: contactId,
          ghl_registration_id: ghlRegistrationId,
          ghl_open_house_id: ghlOpenHouseId,
          registered_at: new Date().toISOString(),
          flyer_status: "pending",
        });

      if (regError) {
        console.error("Failed to create local registration record:", regError);
        // Don't fail the sync - just log the error
      } else {
        console.log("Created local registration record for contact:", contactId, "event:", lead.event_id);
      }
    } else {
      console.log("Registration already exists for contact:", contactId, "event:", lead.event_id);
      ghlRegistrationId = existingReg.ghl_registration_id || undefined;
    }

    // Fetch integration mapping for pipeline/stage
    const { data: mapping } = await supabaseAdmin
      .from("integration_mappings")
      .select("*")
      .eq("integration_id", integration.id)
      .eq("event_id", lead.event_id)
      .single();

    let opportunityId: string | undefined = lead.ghl_opportunity_id || undefined;

    // Create opportunity if mapping exists and one wasn't already created
    // (the inline notification path in the submit route may have already created one)
    if (opportunityId) {
      console.log("Opportunity already exists for this lead:", opportunityId, "- skipping creation");
    } else if (mapping && mapping.ghl_pipeline_id) {
      const heatLevel = getHeatLevel(lead.heat_score);
      const stageId =
        heatLevel === "hot"
          ? mapping.ghl_stage_hot
          : heatLevel === "warm"
          ? mapping.ghl_stage_warm
          : mapping.ghl_stage_cold;

      if (stageId) {
        const opportunity: GHLOpportunity = {
          pipelineId: mapping.ghl_pipeline_id,
          pipelineStageId: stageId,
          name: `${payload.name} - ${propertyAddress}`,
          status: "open",
          contactId,
        };

        const newOpp = await client.createOpportunity(opportunity);
        opportunityId = newOpp.id;
      }
    }

    // Add note with full intake details
    const noteBody = `
**Open House Check-In**
Property: ${propertyAddress}
Timeline: ${payload.timeline || "N/A"}
Financing: ${payload.financing || "N/A"}
Representation: ${payload.representation || "N/A"}
Wants Reach Out: ${payload.wants_agent_reach_out ? "Yes" : "No"}
Neighborhoods: ${payload.neighborhoods || "N/A"}
Must-Haves: ${payload.must_haves || "N/A"}
Heat Score: ${lead.heat_score} (${getHeatLevel(lead.heat_score).toUpperCase()})
Consent: ${payload.consent?.sms ? "SMS ✓" : ""} ${payload.consent?.email ? "Email ✓" : ""}
    `.trim();

    await client.addNote({
      contactId,
      body: noteBody,
    });

    // Update lead_submissions with GHL sync status
    await supabaseAdmin
      .from("lead_submissions")
      .update({
        pushed_to_ghl: true,
        ghl_contact_id: contactId,
        ghl_opportunity_id: opportunityId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    // Update integration last_sync_at
    await supabaseAdmin
      .from("integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        status: "connected",
        last_error: null,
      })
      .eq("id", integration.id);

    // Log to audit
    await supabaseAdmin.from("audit_log").insert({
      agent_id: lead.agent_id,
      event_id: lead.event_id,
      action: "lead.pushed_to_ghl",
      details: {
        lead_id: leadId,
        ghl_contact_id: contactId,
        ghl_opportunity_id: opportunityId,
      },
    });

    // GHL workflow will automatically trigger when the tag "open-house-{eventId}" is added
    // No need to send webhook - the tag addition is the trigger!
    console.log(`Contact synced to GHL. Workflow will trigger on tag: open-house-${lead.event_id}`);

    return {
      success: true,
      ghlContactId: contactId,
      ghlOpportunityId: opportunityId,
    };
  } catch (error: any) {
    console.error("GHL sync error:", error);

    // Update lead with error
    await supabaseAdmin
      .from("lead_submissions")
      .update({
        pushed_to_ghl: false,
        ghl_sync_error: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    return {
      success: false,
      error: error.message,
    };
  }
}
