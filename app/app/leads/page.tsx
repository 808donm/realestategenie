import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import LeadsList from "./leads-list";
import PageHelp from "../components/page-help";

export default async function LeadsPage() {
  const supabase = await supabaseServer();

  const { data: leads, error } = await supabase
    .from("lead_submissions")
    .select("id,event_id,created_at,payload,heat_score")
    .order("created_at", { ascending: false })
    .limit(200);

  // Pull event addresses for display
  const eventIds = Array.from(new Set((leads ?? []).map((l) => l.event_id)));
  const { data: events } = await supabase
    .from("open_house_events")
    .select("id,address")
    .in("id", eventIds.length ? eventIds : ["00000000-0000-0000-0000-000000000000"]);

  const eventMap = new Map((events ?? []).map((e) => [e.id, e.address]));

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

      <LeadsList leads={leads ?? []} eventMap={eventMap} />
    </div>
  );
}
