import Link from "next/link";
import Image from "next/image";
import { supabaseServer } from "@/lib/supabase/server";
import DeleteOpenHouseButton from "./delete-button.client";

export default async function OpenHousesIndex() {
  const supabase = await supabaseServer();

  const { data: events, error } = await supabase
    .from("open_house_events")
    .select("id,address,start_at,end_at,status,property_photo_url")
    .or("event_type.eq.sales,event_type.eq.both,event_type.is.null")
    .order("start_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Open Houses</h1>
        <Link href="/app/open-houses/new" style={btn}>+ New Open House</Link>
      </div>

      {error && <p style={{ color: "crimson" }}>{error.message}</p>}

      <div style={{ marginTop: 16, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {(events ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/app/open-houses/${e.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={{
              position: "relative",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              overflow: "hidden",
              transition: "box-shadow 0.15s",
            }}>
              <DeleteOpenHouseButton eventId={e.id} />
              {/* Property Photo */}
              {e.property_photo_url ? (
                <div style={{ position: "relative", width: "100%", height: 180 }}>
                  <Image
                    src={e.property_photo_url}
                    alt={`Property at ${e.address}`}
                    fill
                    style={{ objectFit: "cover" }}
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                </div>
              ) : (
                <div style={{
                  width: "100%",
                  height: 120,
                  background: "linear-gradient(135deg, #e0e7ff, #f0f4ff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                  fontSize: 13,
                }}>
                  No photo
                </div>
              )}

              {/* Card Content */}
              <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 900 }}>{e.address}</div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                  {new Date(e.start_at).toLocaleString()} → {new Date(e.end_at).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  Status: <strong>{e.status}</strong>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {(!events || events.length === 0) && (
          <div style={{ padding: 14, background: "#fff", border: "1px solid #e6e6e6", borderRadius: 14 }}>
            <p style={{ margin: 0, opacity: 0.75 }}>
              No open houses yet. Create one and generate your QR check-in link.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: 12,
  fontWeight: 800,
  textDecoration: "none",
  background: "#fff",
};
