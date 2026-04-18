/**
 * MLS provider dispatch factory.
 *
 * Returns the MLSClient appropriate for the agent's active integration.
 * Current support: Trestle (per-agent OAuth/Basic/Bearer), RMLS (vendor
 * Bearer held server-side; agent records LCLA consent in the integrations
 * table).
 *
 * Routes should prefer this factory over calling provider-specific helpers
 * directly. That keeps API routes provider-agnostic.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MLSClient, MlsProvider } from "./types";
import { createTrestleClient, type TrestleClient } from "@/lib/integrations/trestle-client";
import { createRmlsClient, type RmlsClient } from "@/lib/integrations/rmls-client";

/** Row shape of what the integrations table returns for MLS lookup. */
type IntegrationRow = {
  provider: string;
  status: string;
  config: unknown;
};

/**
 * Return the MLSClient for this agent, dispatching on their active MLS
 * integration. Preference order (when multiple are connected):
 *   1. An integration explicitly marked preferred:true in its config
 *   2. RMLS (if connected AND env vendor token is present)
 *   3. Trestle (existing default)
 *
 * Returns null when no MLS integration is connected or the preferred
 * provider is missing required credentials.
 */
export async function getMlsClient(
  supabase: SupabaseClient,
  agentId: string,
  options?: { provider?: MlsProvider },
): Promise<MLSClient | null> {
  const providers: MlsProvider[] = ["trestle", "rmls"];
  const { data: rows } = await supabase
    .from("integrations")
    .select("provider, status, config")
    .eq("agent_id", agentId)
    .in("provider", providers);

  const integrations: IntegrationRow[] = (rows || []).filter((r: IntegrationRow) => r.status === "connected");
  if (integrations.length === 0) return null;

  // Caller override — if a specific provider was requested, use it or return null.
  if (options?.provider) {
    const match = integrations.find((r) => r.provider === options.provider);
    if (!match) return null;
    return instantiate(match);
  }

  // Honor a preferred=true flag on the config.
  const preferred = integrations.find((r) => {
    const cfg = parseConfig(r.config);
    return cfg?.preferred === true;
  });
  if (preferred) return instantiate(preferred);

  // RMLS wins over Trestle when both are connected (Oregon/SW Wash markets).
  const rmls = integrations.find((r) => r.provider === "rmls");
  if (rmls) {
    const client = instantiate(rmls);
    if (client) return client;
  }
  const trestle = integrations.find((r) => r.provider === "trestle");
  if (trestle) return instantiate(trestle);

  return null;
}

/**
 * Update last_sync_at for whichever provider the client came from.
 * Callers that already know the provider can skip this by updating directly.
 */
export async function updateMlsSyncTime(
  supabase: SupabaseClient,
  agentId: string,
  provider: MlsProvider,
): Promise<void> {
  await supabase
    .from("integrations")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("agent_id", agentId)
    .eq("provider", provider);
}

/** List which MLS providers the agent has connected. Useful for UI. */
export async function listConnectedMls(
  supabase: SupabaseClient,
  agentId: string,
): Promise<MlsProvider[]> {
  const { data: rows } = await supabase
    .from("integrations")
    .select("provider, status")
    .eq("agent_id", agentId)
    .in("provider", ["trestle", "rmls"])
    .eq("status", "connected");
  return (rows || []).map((r: { provider: string }) => r.provider as MlsProvider);
}

// ─── internal helpers ──────────────────────────────────────────────────

function parseConfig(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return null; }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return null;
}

function instantiate(row: IntegrationRow): MLSClient | null {
  const cfg = parseConfig(row.config) || {};
  switch (row.provider as MlsProvider) {
    case "trestle": {
      if (!(cfg.client_id || cfg.username || cfg.bearer_token)) return null;
      return createTrestleClient(cfg) as unknown as TrestleClient;
    }
    case "rmls": {
      // RMLS bearer lives in env — agent row only tracks LCLA consent + entitlement.
      // Throws if RMLS_BEARER_TOKEN is not configured.
      try {
        return createRmlsClient() as unknown as RmlsClient;
      } catch (err) {
        console.error("[mls-factory] RMLS requested but not configured:", err);
        return null;
      }
    }
    default:
      return null;
  }
}
