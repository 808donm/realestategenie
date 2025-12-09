import QRPanel from "./qr-panel";
import { supabaseServer } from "@/lib/supabase/server";

export default async function OpenHouseDetail({ params }: { params: { id: string } }) {
  const supabase = await supabaseServer();

  const { data: evt, error } = await supabase
    .from("open_house_events")
    .select("id,address,start_at,end_at,status,pdf_download_enabled,details_page_enabled")
    .eq("id", params.id)
    .single();

  if (error || !evt) {
    return <div style={{ padding: 24, color: "crimson" }}>{error?.message ?? "Not found"}</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>{evt.address}</h1>
      <p style={{ opacity: 0.75 }}>
        {new Date(evt.start_at).toLocaleString()} → {new Date(evt.end_at).toLocaleString()}
      </p>
      <p>Status: <strong>{evt.status}</strong></p>

      <QRPanel eventId={event.id} status={event.status} />

    </div>
  );
}
