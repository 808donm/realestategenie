/**
 * GHL Lead Sync Service
 * Pushes leads from open house check-ins to GoHighLevel CRM
 */

import { GHLClient, GHLContact, GHLOpportunity } from "./ghl-client";
import { createClient } from "@supabase/supabase-js";

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

    // Fetch GHL integration for agent
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("agent_id", lead.agent_id)
      .eq("provider", "ghl")
      .single();

    if (integrationError || !integration) {
      throw new Error("GHL not connected for this agent");
    }

    if (integration.status !== "connected") {
      throw new Error("GHL integration is not active");
    }

    const config = integration.config as any;
    const client = new GHLClient(config.access_token);

    // Fetch event for property address
    const { data: event } = await supabaseAdmin
      .from("open_house_events")
      .select("address")
      .eq("id", lead.event_id)
      .single();

    const propertyAddress = event?.address || "Unknown Property";

    // Prepare contact data
    const payload = lead.payload as any;
    const nameParts = payload.name?.split(" ") || [];
    const firstName = nameParts[0] || payload.name;
    const lastName = nameParts.slice(1).join(" ") || "";

    const contactData: GHLContact = {
      locationId: config.location_id,
      firstName,
      lastName,
      name: payload.name,
      email: payload.email || undefined,
      phone: payload.phone_e164 || undefined,
      tags: [
        "open-house",
        propertyAddress,
        payload.timeline || "",
        payload.financing || "",
        getHeatLevel(lead.heat_score),
      ].filter(Boolean),
      source: "Open House QR",
      customFields: {
        representation: payload.representation || "",
        wants_reach_out: payload.wants_agent_reach_out ? "Yes" : "No",
        neighborhoods: payload.neighborhoods || "",
        must_haves: payload.must_haves || "",
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

    // Fetch integration mapping for pipeline/stage
    const { data: mapping } = await supabaseAdmin
      .from("integration_mappings")
      .select("*")
      .eq("integration_id", integration.id)
      .eq("event_id", lead.event_id)
      .single();

    let opportunityId: string | undefined;

    // Create opportunity if mapping exists
    if (mapping && mapping.ghl_pipeline_id) {
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
