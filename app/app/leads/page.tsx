import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import LeadsList from "./leads-list";
import LeadsBySourceChart from "./leads-by-source-chart";
import PageHelp from "../components/page-help";

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
    .select("id,event_id,created_at,payload,heat_score,lead_source")
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

      <LeadsList leads={leads ?? []} eventMap={eventMap} />
    </div>
  );
}
