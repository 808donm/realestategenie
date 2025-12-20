import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import LeadsList from "./leads-list";

export default async function LeadsPage() {
  const supabase = await supabaseServer();

  const { data: leads, error } = await supabase
    .from("lead_submissions")
    .select("id,event_id,created_at,payload")
    .order("created_at", { ascending: false })
    .limit(100);

  // Pull event addresses for display (simple N+1 avoidance: fetch all unique event ids)
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
        <Link href="/app/open-houses">View Open Houses</Link>
      </div>

      {error && <p style={{ color: "crimson" }}>{error.message}</p>}

      <LeadsList leads={leads ?? []} eventMap={eventMap} />
    </div>
  );
}
