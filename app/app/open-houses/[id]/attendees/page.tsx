import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function EventAttendeesPage({ params }: { params: { id: string } }) {
  const supabase = await supabaseServer();

  const { data: event, error: eventErr } = await supabase
    .from("open_house_events")
    .select("id,address,start_at,status")
    .eq("id", params.id)
    .single();

  if (eventErr || !event) {
    return <div style={{ color: "crimson" }}>{eventErr?.message ?? "Not found"}</div>;
  }

  const { data: leads, error } = await supabase
    .from("lead_submissions")
    .select("id,created_at,payload")
    .eq("event_id", params.id)
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{event.address}</h1>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            {new Date(event.start_at).toLocaleString()} • Status: <strong>{event.status}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href={`/app/open-houses/${params.id}`}>Back</Link>
          <Link href="/app/leads">All Leads</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <Link href={`/app/open-houses/${params.id}`}>View attendees</Link>
     </div>

      {error && <p style={{ color: "crimson" }}>{error.message}</p>}

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #e6e6e6", borderRadius: 14, background: "#fff" }}>
        <strong>Total check-ins:</strong> {(leads ?? []).length}
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {(leads ?? []).map((l) => {
          const p: any = l.payload ?? {};
          return (
            <div key={l.id} style={{ padding: 12, border: "1px solid #e6e6e6", borderRadius: 14, background: "#fff" }}>
              <div style={{ fontWeight: 900 }}>
                {p.name || "Lead"}{" "}
                <span style={{ fontWeight: 600, opacity: 0.7, fontSize: 12 }}>
                  • {new Date(l.created_at).toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
                {p.email ? <>Email: <code>{p.email}</code></> : null}
                {p.phone_e164 ? <> &nbsp; Phone: <code>{p.phone_e164}</code></> : null}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                Rep: <strong>{p.representation ?? "n/a"}</strong> • Timeline: <strong>{p.timeline ?? "n/a"}</strong> • Financing: <strong>{p.financing ?? "n/a"}</strong>
              </div>
            </div>
          );
        })}

        {(!leads || leads.length === 0) && (
          <p style={{ opacity: 0.7 }}>
            No attendees yet. Publish the event and test the QR check-in page.
          </p>
        )}
      </div>
    </div>
  );
}
