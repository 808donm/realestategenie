/**
 * GHL Token Refresh Utility
 * Automatically refreshes expired access tokens using refresh tokens
 */

import { createClient } from "@supabase/supabase-js";
import { refreshGHLToken } from "./ghl-client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Get a valid GHL access token, refreshing if necessary
 * @param agentId - The agent's ID
 * @returns Valid GHL configuration with fresh access token
 */
export async function getValidGHLConfig(agentId: string): Promise<{
  access_token: string;
  location_id: string;
  refresh_token: string;
  ghl_pipeline_id?: string;
  ghl_new_lead_stage?: string;
} | null> {
  try {
    // Fetch current integration
    const { data: integration, error } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    if (error || !integration) {
      console.error("[Token Refresh] No GHL integration found for agent:", agentId);
      return null;
    }

    const config = integration.config as any;

    if (!config.ghl_access_token || !config.ghl_refresh_token || !config.ghl_expires_at) {
      console.error("[Token Refresh] Invalid config - missing tokens or expiration");
      return null;
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const expiresAt = new Date(config.ghl_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    console.log("[Token Refresh] Token expires at:", expiresAt);
    console.log("[Token Refresh] Current time:", now);
    console.log("[Token Refresh] Token expired:", expiresAt < now);

    // If token is valid and won't expire soon, return it
    if (expiresAt > fiveMinutesFromNow) {
      console.log("[Token Refresh] Token is still valid, no refresh needed");
      return {
        access_token: config.ghl_access_token,
        location_id: config.ghl_location_id,
        refresh_token: config.ghl_refresh_token,
        ghl_pipeline_id: config.ghl_pipeline_id,
        ghl_new_lead_stage: config.ghl_new_lead_stage,
      };
    }

    // Token is expired or about to expire - refresh it
    console.log("[Token Refresh] Token expired or expiring soon, refreshing...");

    const refreshedTokens = await refreshGHLToken(config.ghl_refresh_token);

    console.log("[Token Refresh] Successfully refreshed token");

    // Calculate new expiration time
    const newExpiresAt = new Date(now.getTime() + refreshedTokens.expires_in * 1000);

    // Update the database with new tokens
    const updatedConfig = {
      ...config,
      ghl_access_token: refreshedTokens.access_token,
      ghl_refresh_token: refreshedTokens.refresh_token,
      ghl_expires_at: newExpiresAt.toISOString(),
      ghl_expires_in: refreshedTokens.expires_in,
    };

    const { error: updateError } = await supabaseAdmin
      .from("integrations")
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    if (updateError) {
      console.error("[Token Refresh] Failed to update integration with new tokens:", updateError);
      // Still return the new tokens even if DB update fails
    } else {
      console.log("[Token Refresh] Updated integration with new tokens, expires at:", newExpiresAt);
    }

    return {
      access_token: refreshedTokens.access_token,
      location_id: config.ghl_location_id,
      refresh_token: refreshedTokens.refresh_token,
      ghl_pipeline_id: config.ghl_pipeline_id,
      ghl_new_lead_stage: config.ghl_new_lead_stage,
    };
  } catch (error) {
    console.error("[Token Refresh] Error refreshing token:", error);
    return null;
  }
}
