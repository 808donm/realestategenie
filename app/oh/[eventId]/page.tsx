import { supabaseServer } from "@/lib/supabase/server";
import IntakeForm from "./intake-form.client";
import PropertyMap from "@/components/PropertyMapWrapper";

export default async function OpenHouseIntakePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await supabaseServer();

  // Read from the public VIEW (published events only)
  const { data: event, error } = await supabase
    .from("public_open_house_event")
    .select(
      "id,address,start_at,end_at,details_page_enabled,flyer_pdf_url,pdf_download_enabled,display_name,license_number,phone_e164,locations_served,photo_url,headshot_url,company_logo_url,latitude,longitude"
    )
    .eq("id", eventId)
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
      {/* Company Logo (if available) */}
      {event.company_logo_url && (
        <div style={{ marginBottom: 16, textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.company_logo_url}
            alt="Company Logo"
            style={{ maxWidth: 200, maxHeight: 60, objectFit: "contain" }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {event.headshot_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.headshot_url}
            alt="Agent"
            style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid #e5e7eb" }}
          />
        ) : event.photo_url ? (
          // Fallback to old photo_url if headshot not available
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.photo_url}
            alt="Agent"
            style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
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

      {/* Property Location Map */}
      {event.latitude && event.longitude && (
        <div style={{ marginTop: 18 }}>
          <PropertyMap
            latitude={event.latitude}
            longitude={event.longitude}
            address={event.address}
            className="h-[250px]"
          />
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <IntakeForm eventId={event.id} />
      </div>
    </div>
  );
}
