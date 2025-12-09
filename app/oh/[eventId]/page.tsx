import { supabaseServer } from "@/lib/supabase/server";
import IntakeForm from "./intake-form.client";

export default async function OpenHouseIntakePage({
  params,
}: {
  params: { eventId: string };
}) {
  const supabase = await supabaseServer();

  // Read from the public VIEW (published events only)
  const { data: event, error } = await supabase
    .from("public_open_house_event")
    .select(
      "id,address,start_at,end_at,details_page_enabled,flyer_pdf_url,pdf_download_enabled,display_name,license_number,phone_e164,locations_served,photo_url"
    )
    .eq("id", params.eventId)
    .single();

  if (error || !event) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Open House</h1>
        <p style={{ color: "crimson" }}>
          This open house is not available. (It may be unpublished or expired.)
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {event.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.photo_url}
            alt="Agent"
            style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#eee",
            }}
          />
        )}

        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            {event.display_name || "Your Agent"}
          </div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {event.license_number ? `Lic # ${event.license_number}` : ""}
            {event.phone_e164 ? ` • ${event.phone_e164}` : ""}
          </div>
        </div>
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 18 }}>
        {event.address}
      </h1>
      <p style={{ opacity: 0.75, marginTop: 6 }}>
        {new Date(event.start_at).toLocaleString()} →{" "}
        {new Date(event.end_at).toLocaleString()}
      </p>

      <div style={{ marginTop: 18 }}>
        <IntakeForm eventId={event.id} />
      </div>
    </div>
  );
}
