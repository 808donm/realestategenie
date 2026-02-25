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
  ghl_contacted_stage?: string;
} | null> {
  try {
    console.log("[Token Refresh] Fetching GHL integration for agent_id:", agentId);

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
      console.error("[Token Refresh] Error:", error);
      return null;
    }

    console.log("[Token Refresh] Found integration:", {
      id: integration.id,
      agentId: integration.agent_id,
      createdAt: integration.created_at,
      updatedAt: integration.updated_at,
    });

    const config = integration.config as any;

    // Support both NEW format (ghl_ prefix) and OLD format (no prefix) for backwards compatibility
    const accessToken = config.ghl_access_token || config.access_token;
    const refreshToken = config.ghl_refresh_token || config.refresh_token;
    const expiresAtStr = config.ghl_expires_at || config.expires_at;
    const locationId = config.ghl_location_id || config.location_id;

    console.log("[Token Refresh] Config details:", {
      locationId,
      hasAccessToken: !!accessToken,
      tokenPrefix: accessToken?.substring(0, 20) + '...',
      expiresAt: expiresAtStr,
    });

    if (!accessToken || !refreshToken || !expiresAtStr) {
      console.error("[Token Refresh] Invalid config - missing tokens or expiration");
      console.error("[Token Refresh] Has ghl_access_token:", !!config.ghl_access_token);
      console.error("[Token Refresh] Has access_token:", !!config.access_token);
      console.error("[Token Refresh] Has ghl_refresh_token:", !!config.ghl_refresh_token);
      console.error("[Token Refresh] Has refresh_token:", !!config.refresh_token);
      console.error("[Token Refresh] Has ghl_expires_at:", !!config.ghl_expires_at);
      console.error("[Token Refresh] Has expires_at:", !!config.expires_at);
      console.error("[Token Refresh] Config keys:", Object.keys(config));
      return null;
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const expiresAt = new Date(expiresAtStr);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    console.log("[Token Refresh] Token expires at:", expiresAt);
    console.log("[Token Refresh] Current time:", now);
    console.log("[Token Refresh] Token expired:", expiresAt < now);

    // If token is valid and won't expire soon, return it
    if (expiresAt > fiveMinutesFromNow) {
      console.log("[Token Refresh] Token is still valid, no refresh needed");
      return {
        access_token: accessToken,
        location_id: locationId,
        refresh_token: refreshToken,
        ghl_pipeline_id: config.ghl_pipeline_id,
        ghl_new_lead_stage: config.ghl_new_lead_stage,
        ghl_contacted_stage: config.ghl_contacted_stage,
      };
    }

    // Token is expired or about to expire - refresh it
    console.log("[Token Refresh] Token expired or expiring soon, refreshing...");

    const refreshedTokens = await refreshGHLToken(refreshToken);

    console.log("[Token Refresh] Successfully refreshed token");

    // Calculate new expiration time
    const newExpiresAt = new Date(now.getTime() + refreshedTokens.expires_in * 1000);

    // Update the database with new tokens using NEW field names (ghl_ prefix)
    const updatedConfig = {
      ...config,
      // Set new field names
      ghl_access_token: refreshedTokens.access_token,
      ghl_refresh_token: refreshedTokens.refresh_token,
      ghl_expires_at: newExpiresAt.toISOString(),
      ghl_expires_in: refreshedTokens.expires_in,
      ghl_location_id: locationId, // Ensure location_id is also in new format
      // Remove old field names if they exist
      access_token: undefined,
      refresh_token: undefined,
      expires_at: undefined,
      expires_in: undefined,
      location_id: undefined,
    };

    // Clean up undefined values
    Object.keys(updatedConfig).forEach(key => {
      if (updatedConfig[key] === undefined) {
        delete updatedConfig[key];
      }
    });

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
      location_id: locationId,
      refresh_token: refreshedTokens.refresh_token,
      ghl_pipeline_id: config.ghl_pipeline_id,
      ghl_new_lead_stage: config.ghl_new_lead_stage,
    };
  } catch (error) {
    console.error("[Token Refresh] Error refreshing token:", error);
    return null;
  }
}
