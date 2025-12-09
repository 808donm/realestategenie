import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

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

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {(leads ?? []).map((l) => {
          const p: any = l.payload ?? {};
          const address = eventMap.get(l.event_id) || l.event_id;

          return (
            <div key={l.id} style={{ padding: 12, border: "1px solid #e6e6e6", borderRadius: 14, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 900 }}>
                  {p.name || "Lead"}{" "}
                  <span style={{ fontWeight: 600, opacity: 0.7, fontSize: 12 }}>
                    • {new Date(l.created_at).toLocaleString()}
                  </span>
                </div>
                <Link href={`/app/open-houses/${l.event_id}`} style={{ fontSize: 12 }}>
                  {address}
                </Link>
              </div>

              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                {p.email ? <>Email: <code>{p.email}</code></> : null}
                {p.phone_e164 ? <> &nbsp; Phone: <code>{p.phone_e164}</code></> : null}
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                Rep: <strong>{p.representation ?? "n/a"}</strong> • Timeline: <strong>{p.timeline ?? "n/a"}</strong> • Financing: <strong>{p.financing ?? "n/a"}</strong>
              </div>

              {(p.neighborhoods || p.must_haves) && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                  {p.neighborhoods ? <>Neighborhoods: {p.neighborhoods}</> : null}
                  {p.must_haves ? <> • Must-haves: {p.must_haves}</> : null}
                </div>
              )}
            </div>
          );
        })}

        {(!leads || leads.length === 0) && (
          <p style={{ opacity: 0.7 }}>
            No leads yet. Publish an open house and have an attendee check in via QR.
          </p>
        )}
      </div>
    </div>
  );
}
