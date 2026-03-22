import Link from "next/link";
import Image from "next/image";
import { geocodeAddress } from "@/lib/geocoding";
import QRPanel from "./qr-panel";
import PropertyMap from "@/components/PropertyMapWrapper";
import FlyerTemplatePicker from "./flyer-template-picker.client";
import DownloadFlyerButton from "./download-flyer-button.client";
import { getEffectiveClient } from "@/lib/supabase/effective-client";
import MlsRefreshButton from "./mls-refresh-button.client";

export default async function OpenHouseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, isImpersonating } = await getEffectiveClient();

  // Try with flyer_template_id first; fall back without it if column doesn't exist yet
  let evt: any = null;
  let loadError: any = null;

  const result = await supabase
    .from("open_house_events")
    .select(
      "id,address,start_at,end_at,status,pdf_download_enabled,details_page_enabled,latitude,longitude,property_photo_url,flyer_template_id,event_type,price,beds,baths,sqft,hoa_fee,listing_description,key_features,mls_listing_key,mls_listing_id,mls_open_house_key,mls_synced_at,mls_source,offer_deadline,disclosure_url,parking_notes,showing_notes"
    )
    .eq("id", id)
    .single();

  if (result.error && result.error.message?.includes("flyer_template_id")) {
    // Column doesn't exist yet — retry without it
    const fallback = await supabase
      .from("open_house_events")
      .select(
        "id,address,start_at,end_at,status,pdf_download_enabled,details_page_enabled,latitude,longitude,property_photo_url,event_type,price,beds,baths,sqft,hoa_fee,listing_description,key_features,mls_listing_key,mls_listing_id,mls_open_house_key,mls_synced_at,mls_source,offer_deadline,disclosure_url,parking_notes,showing_notes"
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
    return (
      <div style={{ padding: 24, color: "crimson" }}>
        {loadError?.message ?? "Open house not found"}
      </div>
    );
  }

  const geocodedLocation =
    !evt.latitude || !evt.longitude ? await geocodeAddress(evt.address) : null;
  const resolvedLatitude = evt.latitude ?? geocodedLocation?.latitude ?? null;
  const resolvedLongitude = evt.longitude ?? geocodedLocation?.longitude ?? null;

async function setStatus(formData: FormData) {
  "use server";
  const status = String(formData.get("status") || "");
  const eventType = String(formData.get("event_type") || "sales");
  const supabase = await (await import("@/lib/supabase/server")).supabaseServer();
  const { revalidatePath } = await import("next/cache");

  await supabase
    .from("open_house_events")
    .update({ status, event_type: eventType })
    .eq("id", id);

  // Revalidate the page to show updated status
  revalidatePath(`/app/open-houses/${id}`);
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <p style={{ margin: 0 }}>
              Status: <strong>{evt.status}</strong>
            </p>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 10px",
              borderRadius: 12,
              background: evt.event_type === "rental" ? "#dcfce7" : evt.event_type === "both" ? "#fef3c7" : "#e0e7ff",
              color: evt.event_type === "rental" ? "#166534" : evt.event_type === "both" ? "#92400e" : "#3730a3",
            }}>
              {evt.event_type === "rental" ? "Rental Showing" : evt.event_type === "both" ? "Sales + Rental" : "Open House"}
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

      {/* MLS Listing Details */}
      <div style={{ marginTop: 28, padding: "20px 24px", border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Listing Details</h2>
            {evt.mls_listing_id && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                MLS# {evt.mls_listing_id}
                {evt.mls_synced_at && ` · Last synced ${new Date(evt.mls_synced_at).toLocaleDateString()}`}
                {evt.mls_source && ` · Source: ${evt.mls_source}`}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {evt.mls_listing_key && (
              <MlsRefreshButton eventId={evt.id} mlsListingKey={evt.mls_listing_key} />
            )}
            <Link
              href={`/app/open-houses/${evt.id}/edit`}
              style={{ fontSize: 13, color: "#6b7280", textDecoration: "underline" }}
            >
              Edit details
            </Link>
          </div>
        </div>

        {/* Price + specs row */}
        {(evt.price || evt.beds || evt.baths || evt.sqft) ? (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
            {evt.price && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>List Price</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>${Number(evt.price).toLocaleString()}</div>
              </div>
            )}
            {evt.beds && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Beds</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{evt.beds}</div>
              </div>
            )}
            {evt.baths && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Baths</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{evt.baths}</div>
              </div>
            )}
            {evt.sqft && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Sq Ft</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{Number(evt.sqft).toLocaleString()}</div>
              </div>
            )}
            {evt.hoa_fee && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>HOA/mo</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>${Number(evt.hoa_fee).toLocaleString()}</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "12px 0", color: "#9ca3af", fontSize: 13, marginBottom: 8 }}>
            No listing data yet.{" "}
            {evt.mls_listing_key
              ? "Click \"Refresh from MLS\" to pull current data."
              : <Link href={`/app/open-houses/${evt.id}/edit`} style={{ color: "#3b82f6" }}>Enter details manually or look up by MLS number.</Link>
            }
          </div>
        )}

        {/* Key features */}
        {evt.key_features && evt.key_features.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Key Features</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {evt.key_features.map((f: string, i: number) => (
                <span key={i} style={{ fontSize: 12, padding: "3px 10px", background: "#f3f4f6", borderRadius: 20, color: "#374151" }}>{f}</span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {evt.listing_description && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Description</div>
            <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>{evt.listing_description}</p>
          </div>
        )}

        {/* Additional info row */}
        {(evt.offer_deadline || evt.disclosure_url || evt.parking_notes || evt.showing_notes) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
            {evt.offer_deadline && (
              <div style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#374151" }}>Offer Deadline:</span>{" "}
                <span style={{ color: "#dc2626" }}>{new Date(evt.offer_deadline).toLocaleString()}</span>
              </div>
            )}
            {evt.showing_notes && (
              <div style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#374151" }}>Showing Notes:</span>{" "}
                <span style={{ color: "#4b5563" }}>{evt.showing_notes}</span>
              </div>
            )}
            {evt.parking_notes && (
              <div style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#374151" }}>Parking:</span>{" "}
                <span style={{ color: "#4b5563" }}>{evt.parking_notes}</span>
              </div>
            )}
            {evt.disclosure_url && (
              <div style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#374151" }}>Disclosures:</span>{" "}
                <a href={evt.disclosure_url} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>View</a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Property Photo */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
          Property Photo
        </h2>
        {evt.property_photo_url ? (
          <div style={{ position: "relative", width: "100%", maxWidth: 800, height: 400, borderRadius: 8, overflow: "hidden" }}>
            <Image
              src={evt.property_photo_url}
              alt={`Property at ${evt.address}`}
              fill
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        ) : (
          <div style={{
            width: "100%",
            maxWidth: 800,
            height: 200,
            borderRadius: 8,
            border: "2px dashed #d1d5db",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#f9fafb",
            gap: 8,
          }}>
            <span style={{ fontSize: 14, color: "#6b7280" }}>
              No property photo uploaded yet
            </span>
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
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
          Property Location
        </h2>
        <PropertyMap
          latitude={resolvedLatitude}
          longitude={resolvedLongitude}
          address={evt.address}
          googleMapsApiKey={
            process.env.GOOGLE_MAPS_API_KEY ||
            process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          }
          className="h-[400px]"
        />
      </div>

      {/* Flyer Template Selection */}
      <FlyerTemplatePicker
        eventId={evt.id}
        currentTemplateId={evt.flyer_template_id || "modern"}
      />

      <QRPanel eventId={evt.id} status={evt.status} />
    </div>
  );
}
