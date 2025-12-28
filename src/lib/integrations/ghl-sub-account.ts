/**
 * GHL Sub-Account Creation Service
 * Creates GoHighLevel sub-accounts (locations) for new agents
 */

import { GHLClient } from "./ghl-client";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@/lib/error-logging";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Create a GHL sub-account for a new agent
 * This is called automatically during agent onboarding
 */
export async function createGHLSubAccount(agentId: string): Promise<{
  success: boolean;
  locationId?: string;
  error?: string;
}> {
  try {
    // Check if GHL SaaS mode is enabled
    const agencyToken = process.env.GHL_AGENCY_ACCESS_TOKEN;
    const companyId = process.env.GHL_COMPANY_ID;

    if (!agencyToken || !companyId) {
      console.log("GHL SaaS mode not configured - skipping sub-account creation");
      return {
        success: false,
        error: "GHL SaaS mode not configured",
      };
    }

    // Fetch agent details
    const { data: agent, error: agentError } = await supabaseAdmin
      .from("agents")
      .select("email, display_name, phone_e164, agency_name")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      throw new Error("Agent not found");
    }

    // Create GHL client with agency token
    const client = new GHLClient(agencyToken);

    // Create sub-account (location)
    const locationData = {
      name: agent.display_name || agent.email,
      email: agent.email,
      phone: agent.phone_e164 || "+1 (555) 000-0000", // Default if not provided
      address: agent.agency_name || "",
      country: "US",
    };

    console.log(`Creating GHL sub-account for agent ${agent.email}...`);

    const { id: locationId, location } = await client.createLocation(locationData);

    console.log(`GHL sub-account created successfully: ${locationId}`);

    // Store GHL location ID in agent record
    await supabaseAdmin
      .from("agents")
      .update({
        ghl_location_id: locationId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId);

    // Create integration record for the agent
    await supabaseAdmin.from("integrations").insert({
      agent_id: agentId,
      provider: "ghl",
      status: "connected",
      location_id: locationId,
      connected_at: new Date().toISOString(),
      metadata: {
        location_name: location.name,
        auto_created: true,
        created_via: "self_registration",
      },
    });

    // Log success
    await supabaseAdmin.from("audit_log").insert({
      agent_id: agentId,
      action: "ghl.sub_account_created",
      details: {
        location_id: locationId,
        location_name: location.name,
      },
    });

    return {
      success: true,
      locationId,
    };
  } catch (error: any) {
    console.error("GHL sub-account creation error:", error);

    // Log error
    await logError({
      agentId,
      endpoint: "ghl.createSubAccount",
      errorMessage: error.message,
      stackTrace: error.stack,
      severity: "warning", // Don't fail onboarding if GHL fails
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if agent already has a GHL sub-account
 */
export async function hasGHLSubAccount(agentId: string): Promise<boolean> {
  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("ghl_location_id")
    .eq("id", agentId)
    .single();

  return !!agent?.ghl_location_id;
}
