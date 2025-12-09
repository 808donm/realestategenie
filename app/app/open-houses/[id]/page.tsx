import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import QRPanel from "./qr-panel";

export default async function OpenHouseDetail({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await supabaseServer();

  const { data: evt, error } = await supabase
    .from("open_house_events")
    .select(
      "id,address,start_at,end_at,status,pdf_download_enabled,details_page_enabled"
    )
    .eq("id", params.id)
    .single();

  if (error || !evt) {
    return (
      <div style={{ padding: 24, color: "crimson" }}>
        {error?.message ?? "Open house not found"}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{evt.address}</h1>
          <p style={{ opacity: 0.75, marginTop: 6 }}>
            {new Date(evt.start_at).toLocaleString()} →{" "}
            {new Date(evt.end_at).toLocaleString()}
          </p>
          <p style={{ marginTop: 6 }}>
            Status: <strong>{evt.status}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/app/open-houses">Back to list</Link>
          <Link href={`/app/open-houses/${evt.id}/attendees`}>Attendees</Link>
        </div>
      </div>

      <QRPanel eventId={evt.id} status={evt.status} />
    </div>
  );
}
