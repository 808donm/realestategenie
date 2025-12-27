import { supabaseServer } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocoding";
import CheckInWrapper from "./check-in-wrapper.client";
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
      "id,address,start_at,end_at,details_page_enabled,flyer_pdf_url,pdf_download_enabled,display_name,license_number,phone_e164,locations_served,photo_url,headshot_url,company_logo_url,latitude,longitude,event_type,pm_property_id"
    )
    .eq("id", eventId)
    .single();

  // Debug: Check the actual open house event table
  const { data: debugEvent, error: debugError } = await supabase
    .from("open_house_events")
    .select("id, address, status, agent_id")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Open House</h1>
        <p style={{ color: "crimson" }}>
          This open house is not available. (It may be unpublished or expired.)
        </p>

        {/* Debug Info */}
        <div style={{ marginTop: 20, padding: 16, background: "#f0f0f0", borderRadius: 8, fontSize: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Debug Information:</h3>
          <div><strong>Event ID:</strong> {eventId}</div>
          <div><strong>View Error:</strong> {error?.message || "Event not found in view"}</div>
          {debugEvent && (
            <>
              <div style={{ marginTop: 8 }}><strong>Event Status:</strong> {debugEvent.status}</div>
              <div><strong>Event Address:</strong> {debugEvent.address}</div>
              <div><strong>Agent ID:</strong> {debugEvent.agent_id}</div>
              <div style={{ marginTop: 8, padding: 8, background: "#fff3cd", borderRadius: 4 }}>
                ℹ️ The event exists but status is "{debugEvent.status}".
                {debugEvent.status !== "published" && " Change status to 'published' to make it visible."}
              </div>
            </>
          )}
          {debugError && (
            <div style={{ marginTop: 8, color: "crimson" }}>
              <strong>Debug Error:</strong> {debugError.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  const geocodedLocation =
    !event.latitude || !event.longitude
      ? await geocodeAddress(event.address)
      : null;
  const resolvedLatitude = event.latitude ?? geocodedLocation?.latitude ?? null;
  const resolvedLongitude =
    event.longitude ?? geocodedLocation?.longitude ?? null;

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
      <div style={{ marginTop: 18 }}>
        <PropertyMap
          latitude={resolvedLatitude}
          longitude={resolvedLongitude}
          address={event.address}
          googleMapsApiKey={
            process.env.GOOGLE_MAPS_API_KEY ||
            process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          }
          className="h-[250px]"
        />
      </div>

      <div style={{ marginTop: 18 }}>
        <CheckInWrapper
          eventId={event.id}
          eventType={(event.event_type as "sales" | "rental" | "both") || "sales"}
          pmPropertyId={event.pm_property_id || null}
        />
      </div>
    </div>
  );
}
