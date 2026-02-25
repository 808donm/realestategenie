/**
 * Helper to retrieve a TrestleClient from the agent's stored integration credentials.
 */
import { SupabaseClient } from "@supabase/supabase-js";
import { createTrestleClient, TrestleClient } from "@/lib/integrations/trestle-client";

export async function getTrestleClient(
  supabase: SupabaseClient,
  agentId: string
): Promise<TrestleClient | null> {
  const { data: integration } = await supabase
    .from("integrations")
    .select("config, status")
    .eq("agent_id", agentId)
    .eq("provider", "trestle")
    .maybeSingle();

  if (!integration || integration.status !== "connected") return null;

  const config =
    typeof integration.config === "string"
      ? JSON.parse(integration.config)
      : integration.config;

  if (!(config.client_id || config.username)) return null;

  return createTrestleClient(config);
}

/** Update last_sync_at timestamp for the agent's Trestle integration */
export async function updateTrestleSyncTime(
  supabase: SupabaseClient,
  agentId: string
): Promise<void> {
  await supabase
    .from("integrations")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("agent_id", agentId)
    .eq("provider", "trestle");
}
