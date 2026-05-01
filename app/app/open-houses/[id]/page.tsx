import Link from "next/link";
import Image from "next/image";
import { geocodeAddress } from "@/lib/geocoding";
import QRPanel from "./qr-panel";
import PropertyMap from "@/components/PropertyMapWrapper";
import FlyerTemplatePicker from "./flyer-template-picker.client";
import DownloadFlyerButton from "./download-flyer-button.client";
import { getEffectiveClient } from "@/lib/supabase/effective-client";

export default async function OpenHouseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, isImpersonating } = await getEffectiveClient();

  // Try with flyer_template_id first; fall back without it if column doesn't exist yet
  let evt: any = null;
  let loadError: any = null;

  const result = await supabase
    .from("open_house_events")
    .select(
      "id,address,start_at,end_at,status,pdf_download_enabled,details_page_enabled,latitude,longitude,property_photo_url,flyer_template_id,event_type",
    )
    .eq("id", id)
    .single();

  if (result.error && result.error.message?.includes("flyer_template_id")) {
    // Column doesn't exist yet — retry without it
    const fallback = await supabase
      .from("open_house_events")
      .select(
        "id,address,start_at,end_at,status,pdf_download_enabled,details_page_enabled,latitude,longitude,property_photo_url,event_type",
      )
      .eq("id", id)
      .single();

    evt = fallback.data ? { ...fallback.data, flyer_template_id: null } : null;
    loadError = fallback.error;
  } else {
    evt = result.data;
    loadError = result.error;
  }

  if (loadError || !evt) {
    return <div style={{ padding: 24, color: "crimson" }}>{loadError?.message ?? "Open house not found"}</div>;
  }

  const geocodedLocation = !evt.latitude || !evt.longitude ? await geocodeAddress(evt.address) : null;
  const resolvedLatitude = evt.latitude ?? geocodedLocation?.latitude ?? null;
  const resolvedLongitude = evt.longitude ?? geocodedLocation?.longitude ?? null;

  async function setStatus(formData: FormData) {
    "use server";
    const status = String(formData.get("status") || "");
    const eventType = String(formData.get("event_type") || "sales");
    const supabase = await (await import("@/lib/supabase/server")).supabaseServer();
    const { revalidatePath } = await import("next/cache");

    await supabase.from("open_house_events").update({ status, event_type: eventType }).eq("id", id);

    revalidatePath(`/app/open-houses/${id}`);
  }

  async function updateEventDetails(formData: FormData) {
    "use server";
    const address = String(formData.get("address") || "");
    const startAt = String(formData.get("start_at") || "");
    const endAt = String(formData.get("end_at") || "");
    const supabase = await (await import("@/lib/supabase/server")).supabaseServer();
    const { revalidatePath } = await import("next/cache");

    const updates: Record<string, any> = {};
    if (address) updates.address = address;
    if (startAt) updates.start_at = new Date(startAt).toISOString();
    if (endAt) updates.end_at = new Date(endAt).toISOString();

    if (Object.keys(updates).length > 0) {
      // Re-geocode if address changed
      if (updates.address) {
        try {
          const { geocodeAddress } = await import("@/lib/geocoding");
          const coords = await geocodeAddress(updates.address);
          if (coords) {
            updates.latitude = coords.latitude;
            updates.longitude = coords.longitude;
          }
        } catch {
          /* keep existing coords */
        }
      }

      await supabase.from("open_house_events").update(updates).eq("id", id);
    }

    revalidatePath(`/app/open-houses/${id}`);
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{evt.address}</h1>
          <p style={{ opacity: 0.75, marginTop: 6 }}>
            {new Date(evt.start_at).toLocaleString()} → {new Date(evt.end_at).toLocaleString()}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <p style={{ margin: 0 }}>
              Status: <strong>{evt.status}</strong>
            </p>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 10px",
                borderRadius: 12,
                background: evt.event_type === "rental" ? "#dcfce7" : evt.event_type === "both" ? "#fef3c7" : "#e0e7ff",
                color: evt.event_type === "rental" ? "#166534" : evt.event_type === "both" ? "#92400e" : "#3730a3",
              }}
            >
              {evt.event_type === "rental"
                ? "Rental Showing"
                : evt.event_type === "both"
                  ? "Sales + Rental"
                  : "Open House"}
            </span>
          </div>
        </div>

        <form action={setStatus} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select name="status" defaultValue={evt.status} style={{ padding: 8 }}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
          <select name="event_type" defaultValue={evt.event_type || "sales"} style={{ padding: 8 }}>
            <option value="sales">Sales</option>
            <option value="rental">Rental</option>
            <option value="both">Both</option>
          </select>
          <button style={{ padding: "8px 10px", fontWeight: 800 }}>Save</button>
        </form>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/app/open-houses">Back to list</Link>
          <Link href={`/app/open-houses/${evt.id}/attendees`}>Attendees</Link>
          <Link
            href={`/app/open-houses/${evt.id}/scorecard`}
            style={{
              padding: "8px 12px",
              background: "#8b5cf6",
              color: "white",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Scorecard
          </Link>
          <Link
            href={`/app/open-houses/${evt.id}/edit`}
            style={{
              padding: "8px 12px",
              background: "#10b981",
              color: "white",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            ✏️ Edit Property Details
          </Link>
          <DownloadFlyerButton eventId={evt.id} />
        </div>
      </div>

      {/* Editable Event Details */}
      <div style={{ marginTop: 24, padding: 16, background: "hsl(var(--muted))", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Event Details</h2>
        <form action={updateEventDetails} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "hsl(var(--foreground))", marginBottom: 4 }}>
              Address
            </label>
            <input
              name="address"
              defaultValue={evt.address}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 14 }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "hsl(var(--foreground))", marginBottom: 4 }}>
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              name="start_at"
              defaultValue={
                evt.start_at
                  ? new Date(new Date(evt.start_at).getTime() - new Date(evt.start_at).getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
              style={{ width: "100%", padding: "8px 10px", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 14 }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "hsl(var(--foreground))", marginBottom: 4 }}>
              End Date & Time
            </label>
            <input
              type="datetime-local"
              name="end_at"
              defaultValue={
                evt.end_at
                  ? new Date(new Date(evt.end_at).getTime() - new Date(evt.end_at).getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
              style={{ width: "100%", padding: "8px 10px", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 14 }}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button
              type="submit"
              style={{
                padding: "8px 20px",
                background: "#1e40af",
                color: "#fff",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                border: "none",
                cursor: "pointer",
              }}
            >
              Update Event Details
            </button>
          </div>
        </form>
      </div>

      {/* Property Photo */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Property Photo</h2>
        {evt.property_photo_url ? (
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 800,
              height: 400,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <Image
              src={evt.property_photo_url}
              alt={`Property at ${evt.address}`}
              fill
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              maxWidth: 800,
              height: 200,
              borderRadius: 8,
              border: "2px dashed #d1d5db",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "hsl(var(--muted))",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14, color: "hsl(var(--muted-foreground))" }}>No property photo uploaded yet</span>
            <Link
              href={`/app/open-houses/${evt.id}/edit`}
              style={{
                fontSize: 13,
                color: "#10b981",
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              Upload a photo in Edit Property Details
            </Link>
          </div>
        )}
      </div>

      {/* Property Location Map */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Property Location</h2>
        <PropertyMap
          latitude={resolvedLatitude}
          longitude={resolvedLongitude}
          address={evt.address}
          googleMapsApiKey={process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
          className="h-[400px]"
        />
      </div>

      {/* Flyer Template Selection */}
      <FlyerTemplatePicker eventId={evt.id} currentTemplateId={evt.flyer_template_id || "modern"} />

      <QRPanel eventId={evt.id} status={evt.status} />
    </div>
  );
}
