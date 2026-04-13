/**
 * Skip Trace Billing
 *
 * Tracks every skip trace call for per-agent billing at $0.10/trace.
 * Cached results (already skip traced) are logged but not billed.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const COST_CENTS = 10; // $0.10 per trace

let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (_admin) return _admin;
  _admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  return _admin;
}

/**
 * Log a skip trace usage event. Call this every time a skip trace is performed.
 */
export async function logSkipTraceUsage(params: {
  agentId: string;
  address?: string;
  ownerName?: string;
  source: "bird_dog" | "property_detail" | "manual";
  cached: boolean;
}): Promise<void> {
  const admin = getAdmin();
  const now = new Date();
  const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  await admin.from("skip_trace_usage").insert({
    agent_id: params.agentId,
    address: params.address || null,
    owner_name: params.ownerName || null,
    source: params.source,
    cost_cents: params.cached ? 0 : COST_CENTS,
    billing_month: billingMonth,
    cached: params.cached,
  }).catch((err) => {
    console.error("[SkipTrace Billing] Failed to log usage:", err.message);
  });
}

/**
 * Get skip trace usage summary for an agent in a specific month.
 */
export async function getAgentSkipTraceUsage(agentId: string, billingMonth?: string): Promise<{
  billableTraces: number;
  cachedTraces: number;
  totalTraces: number;
  totalCents: number;
  totalDollars: number;
}> {
  const admin = getAdmin();
  const month = billingMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const { data } = await admin
    .from("skip_trace_usage")
    .select("cached, cost_cents")
    .eq("agent_id", agentId)
    .eq("billing_month", month);

  const rows = data || [];
  const billable = rows.filter((r) => !r.cached);
  const cached = rows.filter((r) => r.cached);

  return {
    billableTraces: billable.length,
    cachedTraces: cached.length,
    totalTraces: rows.length,
    totalCents: billable.reduce((s, r) => s + (r.cost_cents || 0), 0),
    totalDollars: billable.reduce((s, r) => s + (r.cost_cents || 0), 0) / 100,
  };
}

/**
 * Get skip trace usage for all agents (global admin report).
 */
export async function getAllSkipTraceUsage(billingMonth?: string): Promise<Array<{
  agentId: string;
  agentEmail?: string;
  agentName?: string;
  billableTraces: number;
  cachedTraces: number;
  totalCents: number;
  totalDollars: number;
}>> {
  const admin = getAdmin();
  const month = billingMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const { data: usage } = await admin
    .from("skip_trace_usage")
    .select("agent_id, cached, cost_cents")
    .eq("billing_month", month);

  if (!usage || usage.length === 0) return [];

  // Aggregate by agent
  const byAgent = new Map<string, { billable: number; cached: number; cents: number }>();
  for (const row of usage) {
    const existing = byAgent.get(row.agent_id) || { billable: 0, cached: 0, cents: 0 };
    if (row.cached) existing.cached++;
    else { existing.billable++; existing.cents += row.cost_cents || 0; }
    byAgent.set(row.agent_id, existing);
  }

  // Get agent names
  const agentIds = Array.from(byAgent.keys());
  const { data: agents } = await admin
    .from("agents")
    .select("id, email, display_name")
    .in("id", agentIds);

  const agentMap = new Map((agents || []).map((a) => [a.id, a]));

  return Array.from(byAgent.entries())
    .map(([agentId, data]) => ({
      agentId,
      agentEmail: agentMap.get(agentId)?.email,
      agentName: agentMap.get(agentId)?.display_name,
      billableTraces: data.billable,
      cachedTraces: data.cached,
      totalCents: data.cents,
      totalDollars: data.cents / 100,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}
