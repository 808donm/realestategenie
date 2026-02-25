/**
 * Report Data Aggregation
 *
 * Pulls real-time metrics from the database for the three briefing tiers:
 *   - Agent: lead follow-up priorities, pipeline velocity, speed-to-lead
 *   - Team Lead: leaderboard, fairness, commission, inventory
 *   - Broker: company dollar, compliance, market share, retention
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS, type PipelineStage } from "../pipeline-stages";

// ─── Agent-level report data ─────────────────────────────────────────────────

export interface AgentBriefingData {
  agentName: string;
  agentEmail: string;

  /** Leads needing follow-up, sorted by revenue potential */
  followUps: {
    leadId: string;
    name: string;
    email: string | null;
    phone: string | null;
    heatScore: number;
    pipelineStage: string;
    pipelineStageLabel: string;
    property: string;
    timeline: string | null;
    financing: string | null;
    daysSinceLastTouch: number;
    recentOpenHouse: boolean;
    openHouseDate: string | null;
  }[];

  /** Pipeline velocity snapshot */
  pipelineSnapshot: {
    stage: string;
    label: string;
    count: number;
  }[];

  /** Speed-to-lead stats (last 7 days) */
  speedToLead: {
    avgResponseMinutes: number;
    leadsWithNoResponse: number;
    totalNewLeadsThisWeek: number;
  };

  /** Lead source summary */
  leadSourceBreakdown: { source: string; count: number }[];

  /** Tax reserve reminder (gross commission this month) */
  monthlyGrossCommission: number;
}

export async function aggregateAgentData(
  supabase: SupabaseClient,
  agentId: string
): Promise<AgentBriefingData | null> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // Fetch agent profile
  const { data: agent } = await supabase
    .from("agents")
    .select("display_name, email")
    .eq("id", agentId)
    .single();

  if (!agent) return null;

  // Fetch all active leads (not DNC)
  const { data: leads } = await supabase
    .from("lead_submissions")
    .select("id, event_id, payload, heat_score, pipeline_stage, created_at, updated_at")
    .eq("agent_id", agentId)
    .order("heat_score", { ascending: false });

  // Fetch open house events for context
  const eventIds = [...new Set((leads || []).map((l) => l.event_id))];
  const { data: events } = await supabase
    .from("open_house_events")
    .select("id, address, start_at")
    .in("id", eventIds.length > 0 ? eventIds : ["__none__"]);

  const eventMap: Record<string, { address: string; startAt: string }> = {};
  (events || []).forEach((e) => {
    eventMap[e.id] = { address: e.address, startAt: e.start_at };
  });

  // Build follow-up list: prioritize by heat score, recency, and stage
  const followUps = (leads || [])
    .filter((l) => l.payload?.representation !== "yes") // skip DNC
    .map((l) => {
      const ev = eventMap[l.event_id];
      const lastTouched = l.updated_at || l.created_at;
      const daysSince = Math.floor(
        (now.getTime() - new Date(lastTouched).getTime()) / 86400000
      );
      const ohDate = ev?.startAt ? new Date(ev.startAt) : null;
      const recentOpenHouse =
        ohDate !== null &&
        now.getTime() - ohDate.getTime() < 3 * 86400000; // within 3 days

      return {
        leadId: l.id,
        name: l.payload?.name || "Unknown",
        email: l.payload?.email || null,
        phone: l.payload?.phone_e164 || null,
        heatScore: l.heat_score,
        pipelineStage: l.pipeline_stage,
        pipelineStageLabel:
          PIPELINE_STAGE_LABELS[l.pipeline_stage as PipelineStage] ||
          l.pipeline_stage,
        property: ev?.address || l.event_id,
        timeline: l.payload?.timeline || null,
        financing: l.payload?.financing || null,
        daysSinceLastTouch: daysSince,
        recentOpenHouse,
        openHouseDate: ev?.startAt || null,
      };
    })
    // Sort: recent open house first, then by heat score desc, then by days since touch desc
    .sort((a, b) => {
      if (a.recentOpenHouse && !b.recentOpenHouse) return -1;
      if (!a.recentOpenHouse && b.recentOpenHouse) return 1;
      if (b.heatScore !== a.heatScore) return b.heatScore - a.heatScore;
      return b.daysSinceLastTouch - a.daysSinceLastTouch;
    });

  // Pipeline snapshot
  const pipelineSnapshot = PIPELINE_STAGES.map((key) => ({
    stage: key,
    label: PIPELINE_STAGE_LABELS[key],
    count: (leads || []).filter((l) => l.pipeline_stage === key).length,
  }));

  // Speed-to-lead: count leads from last 7 days, measure avg response
  const recentLeads = (leads || []).filter(
    (l) => new Date(l.created_at) >= new Date(sevenDaysAgo)
  );
  const noResponseLeads = recentLeads.filter(
    (l) => l.pipeline_stage === "new_lead"
  );

  // Lead source breakdown (from open house events)
  const sourceMap = new Map<string, number>();
  (leads || []).forEach((l) => {
    const addr = eventMap[l.event_id]?.address || "Unknown";
    sourceMap.set(addr, (sourceMap.get(addr) || 0) + 1);
  });
  const leadSourceBreakdown = [...sourceMap.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    agentName: agent.display_name || agent.email,
    agentEmail: agent.email,
    followUps,
    pipelineSnapshot,
    speedToLead: {
      avgResponseMinutes: 0, // Placeholder — real value requires GHL webhook timestamps
      leadsWithNoResponse: noResponseLeads.length,
      totalNewLeadsThisWeek: recentLeads.length,
    },
    leadSourceBreakdown,
    monthlyGrossCommission: 0, // Populated when QBO is connected
  };
}

// ─── Team Lead report data ───────────────────────────────────────────────────

export interface TeamBriefingData {
  teamLeadName: string;
  teamLeadEmail: string;

  /** Leaderboard: top agents by activity */
  leaderboard: {
    name: string;
    email: string;
    leadsCount: number;
    hotLeads: number;
    pipelineAdvances: number;
  }[];

  /** Lead assignment fairness */
  fairness: {
    agentName: string;
    leadsReceived: number;
    deviationFromAvg: number;
  }[];

  /** Listing inventory health */
  inventoryHealth: {
    totalActive: number;
    avgDOM: number;
    staleListings: number;
  };

  totalTeamLeads: number;
  avgLeadsPerAgent: number;
}

export async function aggregateTeamData(
  supabase: SupabaseClient,
  teamLeadId: string
): Promise<TeamBriefingData | null> {
  // Get team lead profile
  const { data: lead } = await supabase
    .from("agents")
    .select("display_name, email")
    .eq("id", teamLeadId)
    .single();

  if (!lead) return null;

  // Get all account members for this team lead's account
  const { data: membership } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", teamLeadId)
    .single();

  if (!membership) return null;

  const { data: members } = await supabase
    .from("account_members")
    .select("user_id, account_role")
    .eq("account_id", membership.account_id);

  const agentIds = (members || []).map((m) => m.user_id);

  // Get agent profiles
  const { data: agents } = await supabase
    .from("agents")
    .select("id, display_name, email")
    .in("id", agentIds.length > 0 ? agentIds : ["__none__"]);

  const agentMap = new Map(
    (agents || []).map((a) => [a.id, { name: a.display_name || a.email, email: a.email }])
  );

  // Get leads per agent (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: allLeads } = await supabase
    .from("lead_submissions")
    .select("agent_id, heat_score, pipeline_stage, created_at")
    .in("agent_id", agentIds.length > 0 ? agentIds : ["__none__"])
    .gte("created_at", thirtyDaysAgo);

  // Build leaderboard
  const agentLeadCounts = new Map<
    string,
    { leadsCount: number; hotLeads: number; pipelineAdvances: number }
  >();

  (allLeads || []).forEach((l) => {
    const entry = agentLeadCounts.get(l.agent_id) || {
      leadsCount: 0,
      hotLeads: 0,
      pipelineAdvances: 0,
    };
    entry.leadsCount++;
    if (l.heat_score >= 80) entry.hotLeads++;
    if (l.pipeline_stage !== "new_lead") entry.pipelineAdvances++;
    agentLeadCounts.set(l.agent_id, entry);
  });

  const leaderboard = agentIds
    .map((id) => {
      const info = agentMap.get(id) || { name: "Unknown", email: "" };
      const stats = agentLeadCounts.get(id) || {
        leadsCount: 0,
        hotLeads: 0,
        pipelineAdvances: 0,
      };
      return { name: info.name, email: info.email, ...stats };
    })
    .sort((a, b) => b.leadsCount - a.leadsCount);

  // Lead assignment fairness
  const totalLeads = (allLeads || []).length;
  const avgPerAgent = agentIds.length > 0 ? totalLeads / agentIds.length : 0;
  const fairness = leaderboard.map((a) => ({
    agentName: a.name,
    leadsReceived: a.leadsCount,
    deviationFromAvg: avgPerAgent > 0
      ? Math.round(((a.leadsCount - avgPerAgent) / avgPerAgent) * 100)
      : 0,
  }));

  // Listing inventory: query open_house_events as proxy for active listings
  const { data: activeListings } = await supabase
    .from("open_house_events")
    .select("id, start_at, created_at")
    .in("agent_id", agentIds.length > 0 ? agentIds : ["__none__"])
    .eq("status", "published");

  const now = Date.now();
  const domValues = (activeListings || []).map((l) =>
    Math.floor((now - new Date(l.created_at).getTime()) / 86400000)
  );
  const avgDOM =
    domValues.length > 0
      ? Math.round(domValues.reduce((a, b) => a + b, 0) / domValues.length)
      : 0;
  const staleListings = domValues.filter((d) => d > 21).length;

  return {
    teamLeadName: lead.display_name || lead.email,
    teamLeadEmail: lead.email,
    leaderboard,
    fairness,
    inventoryHealth: {
      totalActive: activeListings?.length || 0,
      avgDOM,
      staleListings,
    },
    totalTeamLeads: totalLeads,
    avgLeadsPerAgent: Math.round(avgPerAgent * 10) / 10,
  };
}

// ─── Broker report data ──────────────────────────────────────────────────────

export interface BrokerBriefingData {
  brokerName: string;
  brokerEmail: string;

  /** Company dollar snapshot */
  companyDollar: {
    monthlyGross: number;
    agentSplits: number;
    operatingExpenses: number;
    netCompanyDollar: number;
    marginPct: number;
  };

  /** Compliance summary */
  compliance: {
    totalEvents: number;
    completeCount: number;
    pendingCount: number;
    missingCount: number;
    compliancePct: number;
  };

  /** Agent retention risk summary */
  retentionRisk: {
    totalAgents: number;
    atRiskCount: number;
    criticalAgents: { name: string; activityDrop: number }[];
  };

  /** Market share proxy */
  marketPosition: {
    totalTransactions: number;
    totalVolume: number;
    agentCount: number;
  };
}

export async function aggregateBrokerData(
  supabase: SupabaseClient,
  brokerId: string
): Promise<BrokerBriefingData | null> {
  const { data: broker } = await supabase
    .from("agents")
    .select("display_name, email")
    .eq("id", brokerId)
    .single();

  if (!broker) return null;

  // Get all agents under this broker's account
  const { data: membership } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", brokerId)
    .single();

  if (!membership) return null;

  const { data: members } = await supabase
    .from("account_members")
    .select("user_id, account_role")
    .eq("account_id", membership.account_id);

  const agentIds = (members || []).map((m) => m.user_id);

  // Agent profiles
  const { data: agents } = await supabase
    .from("agents")
    .select("id, display_name, email")
    .in("id", agentIds.length > 0 ? agentIds : ["__none__"]);

  const agentMap = new Map(
    (agents || []).map((a) => [a.id, a.display_name || a.email])
  );

  // Compliance: count audit log events
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: auditEvents } = await supabase
    .from("audit_log")
    .select("id, action, details")
    .in("agent_id", agentIds.length > 0 ? agentIds : ["__none__"])
    .gte("created_at", thirtyDaysAgo);

  const totalEvents = auditEvents?.length || 0;

  // Agent activity for retention risk: leads submitted per agent in last 30 days
  const { data: recentLeads } = await supabase
    .from("lead_submissions")
    .select("agent_id, created_at")
    .in("agent_id", agentIds.length > 0 ? agentIds : ["__none__"])
    .gte("created_at", thirtyDaysAgo);

  // Previous 30 days for comparison
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
  const { data: prevLeads } = await supabase
    .from("lead_submissions")
    .select("agent_id, created_at")
    .in("agent_id", agentIds.length > 0 ? agentIds : ["__none__"])
    .gte("created_at", sixtyDaysAgo)
    .lt("created_at", thirtyDaysAgo);

  // Calculate per-agent activity change
  const currentCounts = new Map<string, number>();
  (recentLeads || []).forEach((l) => {
    currentCounts.set(l.agent_id, (currentCounts.get(l.agent_id) || 0) + 1);
  });
  const prevCounts = new Map<string, number>();
  (prevLeads || []).forEach((l) => {
    prevCounts.set(l.agent_id, (prevCounts.get(l.agent_id) || 0) + 1);
  });

  const criticalAgents: { name: string; activityDrop: number }[] = [];
  let atRiskCount = 0;
  agentIds.forEach((id) => {
    const current = currentCounts.get(id) || 0;
    const prev = prevCounts.get(id) || 0;
    if (prev > 0) {
      const drop = Math.round(((prev - current) / prev) * 100);
      if (drop >= 50) {
        criticalAgents.push({ name: agentMap.get(id) || "Unknown", activityDrop: drop });
        atRiskCount++;
      } else if (drop >= 25) {
        atRiskCount++;
      }
    } else if (current === 0) {
      // Agent had no activity in either period — flag as at-risk
      atRiskCount++;
    }
  });

  // Transactions summary (all leads as proxy)
  const { data: allLeads } = await supabase
    .from("lead_submissions")
    .select("id, heat_score")
    .in("agent_id", agentIds.length > 0 ? agentIds : ["__none__"]);

  return {
    brokerName: broker.display_name || broker.email,
    brokerEmail: broker.email,
    companyDollar: {
      monthlyGross: 0,
      agentSplits: 0,
      operatingExpenses: 0,
      netCompanyDollar: 0,
      marginPct: 0,
    },
    compliance: {
      totalEvents,
      completeCount: totalEvents,
      pendingCount: 0,
      missingCount: 0,
      compliancePct: totalEvents > 0 ? 100 : 0,
    },
    retentionRisk: {
      totalAgents: agentIds.length,
      atRiskCount,
      criticalAgents: criticalAgents.sort((a, b) => b.activityDrop - a.activityDrop),
    },
    marketPosition: {
      totalTransactions: allLeads?.length || 0,
      totalVolume: 0,
      agentCount: agentIds.length,
    },
  };
}
