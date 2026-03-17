import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import LeadsList from "./leads-list";
import LeadsBySourceChart from "./leads-by-source-chart";
import LeadsInsightsCharts from "./leads-insights-charts";
import PageHelp from "../components/page-help";
import { PIPELINE_STAGE_LABELS, PIPELINE_STAGE_COLORS, type PipelineStage } from "@/lib/pipeline-stages";

const SOURCE_LABELS: Record<string, string> = {
  open_house: "Open House",
  zillow: "Zillow",
  google: "Google",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

export default async function LeadsPage() {
  const supabase = await supabaseServer();

  const { data: leads, error } = await supabase
    .from("lead_submissions")
    .select("id,event_id,created_at,payload,heat_score,lead_source,pipeline_stage")
    .order("created_at", { ascending: false })
    .limit(200);

  // Pull event addresses for display
  const eventIds = Array.from(new Set((leads ?? []).map((l) => l.event_id)));
  const { data: events } = await supabase
    .from("open_house_events")
    .select("id,address")
    .in("id", eventIds.length ? eventIds : ["00000000-0000-0000-0000-000000000000"]);

  const eventMap = new Map((events ?? []).map((e) => [e.id, e.address]));

  // Aggregate leads by source
  const sourceCounts: Record<string, number> = {};
  for (const lead of leads ?? []) {
    const src = lead.lead_source || "open_house";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }
  const bySource = Object.entries(sourceCounts)
    .map(([key, count]) => ({ name: SOURCE_LABELS[key] || key, count }))
    .sort((a, b) => b.count - a.count);

  // Aggregate leads by open house event
  const eventCounts: Record<string, number> = {};
  for (const lead of leads ?? []) {
    const addr = eventMap.get(lead.event_id) || "Unknown Event";
    eventCounts[addr] = (eventCounts[addr] || 0) + 1;
  }
  const byEvent = Object.entries(eventCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Aggregate heat score distribution
  const allLeads = leads ?? [];
  const heatDistribution = [
    { name: "Hot (80+)", count: allLeads.filter((l) => l.heat_score >= 80).length, color: "#ef4444" },
    { name: "Warm (50-79)", count: allLeads.filter((l) => l.heat_score >= 50 && l.heat_score < 80).length, color: "#f59e0b" },
    { name: "Cold (<50)", count: allLeads.filter((l) => l.heat_score < 50).length, color: "#3b82f6" },
  ];

  // Aggregate pipeline stage breakdown
  const stageCounts: Record<string, number> = {};
  for (const lead of allLeads) {
    const stage = lead.pipeline_stage || "new_lead";
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
  }
  const byPipelineStage = Object.entries(stageCounts)
    .map(([key, count]) => ({
      name: PIPELINE_STAGE_LABELS[key as PipelineStage] || key,
      count,
      color: PIPELINE_STAGE_COLORS[key as PipelineStage] || "#9ca3af",
    }))
    .sort((a, b) => b.count - a.count);

  // Aggregate leads over time (by week)
  const leadsOverTime: { week: string; count: number }[] = [];
  if (allLeads.length > 0) {
    const weekMap: Record<string, number> = {};
    for (const lead of allLeads) {
      const d = new Date(lead.created_at);
      // Round to start of week (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
      const key = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      weekMap[key] = (weekMap[key] || 0) + 1;
    }
    // Sort chronologically
    const sorted = Object.entries(weekMap).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
    for (const [week, count] of sorted) {
      leadsOverTime.push({ week, count });
    }
  }

  // Aggregate buyer readiness from payload
  const readinessCounts = { preApproved: 0, notPreApproved: 0, unknown: 0 };
  for (const lead of allLeads) {
    const payload = lead.payload as any;
    if (payload?.pre_approved === true || payload?.pre_approved === "yes") {
      readinessCounts.preApproved++;
    } else if (payload?.pre_approved === false || payload?.pre_approved === "no") {
      readinessCounts.notPreApproved++;
    } else {
      readinessCounts.unknown++;
    }
  }
  const buyerReadiness = [
    { name: "Pre-Approved", count: readinessCounts.preApproved, color: "#10b981" },
    { name: "Not Pre-Approved", count: readinessCounts.notPreApproved, color: "#f97316" },
    { name: "Unknown", count: readinessCounts.unknown, color: "#94a3b8" },
  ].filter((d) => d.count > 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Leads</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <PageHelp title="Leads" description="All leads captured from your open house QR check-ins, organized by heat score. Hot leads are most likely to convert." tips={["Call hot leads within 5 minutes for best results", "Click a lead to generate a neighborhood profile", "Use Call/Text/Email buttons for one-click outreach"]} />
          <Link href="/app/open-houses">View Open Houses</Link>
        </div>
      </div>

      {error && <p style={{ color: "crimson" }}>{error.message}</p>}

      <div style={{ margin: "24px 0" }}>
        <LeadsBySourceChart bySource={bySource} byEvent={byEvent} />
      </div>

      <div style={{ margin: "24px 0" }}>
        <LeadsInsightsCharts
          heatDistribution={heatDistribution}
          byPipelineStage={byPipelineStage}
          leadsOverTime={leadsOverTime}
          buyerReadiness={buyerReadiness}
        />
      </div>

      <LeadsList leads={leads ?? []} eventMap={eventMap} />
    </div>
  );
}
