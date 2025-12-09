import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function OpenHousesPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return <div style={{ padding: 24 }}>Not signed in.</div>;

  const { data: events, error } = await supabase
    .from("open_house_events")
    .select("id,address,start_at,end_at,status")
    .order("start_at", { ascending: false });

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Open Houses</h1>
        <Link href="/app/open-houses/new">+ New</Link>
      </div>

      {error && <p style={{ color: "crimson" }}>{error.message}</p>}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {(events ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/app/open-houses/${e.id}`}
            style={{ padding: 14, border: "1px solid #ddd", borderRadius: 12, display: "block" }}
          >
            <div style={{ fontWeight: 700 }}>{e.address}</div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>
              {new Date(e.start_at).toLocaleString()} → {new Date(e.end_at).toLocaleString()}
            </div>
            <div style={{ marginTop: 6, fontSize: 12 }}>
              Status: <strong>{e.status}</strong>
            </div>
          </Link>
        ))}
        {(!events || events.length === 0) && (
          <p style={{ opacity: 0.7 }}>No open houses yet.</p>
        )}
      </div>
    </div>
  );
}
