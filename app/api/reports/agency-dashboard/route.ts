import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const CLOSED_STAGES = ["closed_and_followup", "review_request"];
const CONTACTED_STAGES = [
  "initial_contact", "qualification", "initial_consultation",
  "property_search_listing_prep", "open_houses_and_tours",
  "offer_and_negotiation", "under_contract_escrow",
  "closing_coordination", "closed_and_followup", "review_request",
];
const ALL_STAGES = [
  "new_lead", "initial_contact", "qualification", "initial_consultation",
  "property_search_listing_prep", "open_houses_and_tours",
  "offer_and_negotiation", "under_contract_escrow",
  "closing_coordination", "closed_and_followup", "review_request",
];

/**
 * GET /api/reports/agency-dashboard
 *
 * Returns comprehensive agency-level metrics for the broker/admin dashboard.
 * Aggregates data across all agents in the user's account.
 */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all agents in user's account
  const { data: membership } = await supabase
    .from("account_members")
    .select("account_id, account_role")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No account membership found" }, { status: 403 });
  }

  // Only allow broker, admin, owner roles
  if (!["owner", "admin"].includes(membership.account_role)) {
    // Also check agents.role for broker
    const { data: agentRecord } = await supabase
      .from("agents")
      .select("role, is_admin")
      .eq("id", user.id)
      .single();
    if (!agentRecord?.is_admin && agentRecord?.role !== "broker" && agentRecord?.role !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
  }

  const { data: members } = await supabase
    .from("account_members")
    .select("user_id, account_role, office_id")
    .eq("account_id", membership.account_id)
    .eq("is_active", true);

  const agentIds = (members || []).map((m) => m.user_id);
  if (agentIds.length === 0) {
    return NextResponse.json({ error: "No agents found in account" }, { status: 404 });
  }

  const memberMap = new Map((members || []).map((m: any) => [m.user_id, m]));

  // Time windows
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

  // Parallel data fetches
  const [agentsRes, leadsRes, leads30Res, leadsYTDRes, eventsRes, events30Res] = await Promise.all([
    supabase.from("agents").select("id, display_name, email, role, is_active, created_at").in("id", agentIds),
    supabase.from("lead_submissions").select("id, agent_id, pipeline_stage, heat_score, lead_source, created_at, updated_at, event_id").in("agent_id", agentIds),
    supabase.from("lead_submissions").select("id, agent_id, pipeline_stage, heat_score, lead_source, created_at, updated_at").in("agent_id", agentIds).gte("created_at", thirtyDaysAgo),
    supabase.from("lead_submissions").select("id, agent_id, pipeline_stage, heat_score, created_at").in("agent_id", agentIds).gte("created_at", startOfYear),
    supabase.from("open_house_events").select("id, agent_id, status, address, start_at, created_at").in("agent_id", agentIds),
    supabase.from("open_house_events").select("id, agent_id, status, created_at").in("agent_id", agentIds).gte("created_at", thirtyDaysAgo),
  ]);

  // Activity log queries -- table may not exist yet, so handle gracefully
  let activity30: any[] = [];
  let activity60: any[] = [];
  let offices: any[] = [];
  try {
    const actRes = await supabase.from("agent_activity_log").select("agent_id, action, created_at").in("agent_id", agentIds).gte("created_at", thirtyDaysAgo);
    activity30 = actRes.data || [];
  } catch { /* table may not exist */ }
  try {
    const act60Res = await supabase.from("agent_activity_log").select("agent_id, action, created_at").in("agent_id", agentIds).gte("created_at", sixtyDaysAgo).lte("created_at", thirtyDaysAgo);
    activity60 = act60Res.data || [];
  } catch { /* table may not exist */ }
  try {
    const officesRes = await supabase.from("offices").select("id, name").eq("account_id", membership.account_id);
    offices = officesRes.data || [];
  } catch { /* table may not exist */ }

  const agents = agentsRes.data || [];
  const allLeads: any[] = leadsRes.data || [];
  const leads30: any[] = leads30Res.data || [];
  const leadsYTD: any[] = leadsYTDRes.data || [];
  const allEvents: any[] = eventsRes.data || [];
  const events30: any[] = events30Res.data || [];

  const officeMap = new Map(offices.map((o: any) => [o.id, o.name]));
  const agentMap = new Map(agents.map((a: any) => [a.id, a]));

  // ── Overview Metrics ──
  const totalLeads = allLeads.length;
  const hotLeads = allLeads.filter((l) => l.heat_score >= 80).length;
  const totalEvents = allEvents.filter((e) => e.status === "published").length;
  const closingsMTD = allLeads.filter((l) => CLOSED_STAGES.includes(l.pipeline_stage) && l.updated_at && l.updated_at >= startOfMonth).length;
  const closingsYTD = leadsYTD.filter((l) => CLOSED_STAGES.includes(l.pipeline_stage)).length;
  const pipelineDeals = allLeads.filter((l) => !CLOSED_STAGES.includes(l.pipeline_stage) && l.pipeline_stage !== "new_lead").length;

  // ── Per-Agent Metrics ──
  const agentMetrics = agentIds.map((id) => {
    const agent = agentMap.get(id);
    const member = memberMap.get(id);
    const agentLeads30 = leads30.filter((l) => l.agent_id === id);
    const agentLeadsAll = allLeads.filter((l) => l.agent_id === id);
    const agentEvents30 = events30.filter((e) => e.agent_id === id);
    const agentEventsAll = allEvents.filter((e) => e.agent_id === id && e.status === "published");
    const agentActivity30 = activity30.filter((a: any) => a.agent_id === id);
    const agentActivity60 = activity60.filter((a: any) => a.agent_id === id);

    const leadsCaptured = agentLeads30.length;
    const hot = agentLeads30.filter((l) => l.heat_score >= 80).length;
    const openHouses = agentEvents30.length;
    const totalCheckins = agentLeadsAll.filter((l) => agentEventsAll.some((e) => e.id === l.event_id)).length;
    const checkinsPerOH = agentEventsAll.length > 0 ? Math.round(totalCheckins / agentEventsAll.length * 10) / 10 : 0;

    const pipeline = agentLeadsAll.filter((l) => !CLOSED_STAGES.includes(l.pipeline_stage) && l.pipeline_stage !== "new_lead").length;
    const closings = agentLeads30.filter((l) => CLOSED_STAGES.includes(l.pipeline_stage)).length;
    const volume = closings * 425000;
    const converted = agentLeadsAll.filter((l) => CLOSED_STAGES.includes(l.pipeline_stage)).length;
    const conversionRate = agentLeadsAll.length > 0 ? Math.round((converted / agentLeadsAll.length) * 1000) / 10 : 0;

    // Speed to lead: avg minutes from created_at to first updated_at
    const responseTimes = agentLeads30
      .filter((l) => l.updated_at && l.pipeline_stage !== "new_lead")
      .map((l) => (new Date(l.updated_at).getTime() - new Date(l.created_at).getTime()) / 60000)
      .filter((t) => t > 0 && t < 10080); // under 7 days
    const speedToLead = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;

    // Last activity
    const allDates = [
      ...agentLeads30.map((l) => l.created_at),
      ...agentEvents30.map((e) => e.created_at),
      ...agentActivity30.map((a: any) => a.created_at),
    ].filter(Boolean).sort().reverse();
    const lastActivity = allDates[0] || agent?.created_at || "";

    // Activity counts from agent_activity_log
    const reportsGenerated = agentActivity30.filter((a: any) => a.action === "report_generated" || a.action === "report_downloaded").length;
    const mlsSearches = agentActivity30.filter((a: any) => a.action === "mls_search").length;

    // Retention risk: compare current 30-day to previous 30-day
    const currentScore = agentLeads30.length + agentEvents30.length + agentActivity30.length;
    const previousScore = activity60.filter((a: any) => a.agent_id === id).length + allLeads.filter((l) => l.agent_id === id && l.created_at >= sixtyDaysAgo && l.created_at < thirtyDaysAgo).length;
    const isAtRisk = previousScore > 0 && currentScore < previousScore * 0.6;

    return {
      id,
      name: agent?.display_name || agent?.email || "Unknown",
      email: agent?.email || "",
      role: member?.account_role || agent?.role || "agent",
      office: member?.office_id ? officeMap.get(member.office_id) || undefined : undefined,
      leadsCaptured: leadsCaptured,
      hotLeads: hot,
      openHouses,
      checkinsPerOH,
      pipelineDeals: pipeline,
      closingsMTD: closings,
      volumeMTD: volume,
      speedToLead,
      lastActivity,
      reportsGenerated,
      mlsSearches,
      conversionRate,
      isAtRisk,
    };
  });

  // ── Lead Funnel ──
  const leadFunnel = ALL_STAGES.map((stage, i) => {
    const count = allLeads.filter((l) => l.pipeline_stage === stage).length;
    const nextStageCount = i < ALL_STAGES.length - 1
      ? allLeads.filter((l) => ALL_STAGES.indexOf(l.pipeline_stage) > i).length
      : 0;
    return {
      stage: stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      count,
      conversionPct: count > 0 ? Math.round((nextStageCount / count) * 1000) / 10 : 0,
    };
  });

  // ── Leads by Source ──
  const sourceMap = new Map<string, { count: number; converted: number }>();
  allLeads.forEach((l) => {
    const source = l.lead_source || "Open House";
    if (!sourceMap.has(source)) sourceMap.set(source, { count: 0, converted: 0 });
    const s = sourceMap.get(source)!;
    s.count++;
    if (CLOSED_STAGES.includes(l.pipeline_stage)) s.converted++;
  });
  const leadsBySource = [...sourceMap.entries()].map(([source, data]) => ({ source, ...data })).sort((a, b) => b.count - a.count);

  // ── Lead Aging ──
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
  const newLeads = allLeads.filter((l) => l.pipeline_stage === "new_lead");
  const leadAging = {
    notContacted3d: newLeads.filter((l) => l.created_at <= threeDaysAgo).length,
    notContacted7d: newLeads.filter((l) => l.created_at <= sevenDaysAgo).length,
    notContacted14d: newLeads.filter((l) => l.created_at <= fourteenDaysAgo).length,
  };

  // ── Monthly Trend (last 6 months) ──
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthStr = monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const monthLeads = allLeads.filter((l) => l.created_at >= monthStart.toISOString() && l.created_at <= monthEnd.toISOString());
    const monthClosings = monthLeads.filter((l) => CLOSED_STAGES.includes(l.pipeline_stage));

    monthlyTrend.push({
      month: monthStr,
      leads: monthLeads.length,
      closings: monthClosings.length,
      revenue: monthClosings.length * 8500,
    });
  }

  return NextResponse.json({
    overview: {
      totalAgents: agents.filter((a) => a.is_active).length,
      activeAgents: agentMetrics.filter((a) => a.lastActivity && new Date(a.lastActivity).getTime() > now.getTime() - 7 * 86400000).length,
      totalLeads,
      hotLeads,
      totalOpenHouses: totalEvents,
      totalCheckins: allLeads.filter((l) => l.event_id).length,
      closingsMTD,
      closingsYTD,
      pipelineValue: pipelineDeals * 425000,
    },
    agents: agentMetrics.sort((a, b) => b.volumeMTD - a.volumeMTD),
    leadFunnel,
    leadsBySource,
    leadAging,
    monthlyTrend,
  });
}
