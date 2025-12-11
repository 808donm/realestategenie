import Link from "next/link";
import Image from "next/image";
import { supabaseServer } from "@/lib/supabase/server";
import QRPanel from "./qr-panel";
import PropertyMap from "@/components/PropertyMapWrapper";

export default async function OpenHouseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: evt, error } = await supabase
    .from("open_house_events")
    .select(
      "id,address,start_at,end_at,status,pdf_download_enabled,details_page_enabled,latitude,longitude,property_photo_url"
    )
    .eq("id", id)
    .single();

  if (error || !evt) {
    return (
      <div style={{ padding: 24, color: "crimson" }}>
        {error?.message ?? "Open house not found"}
      </div>
    );
  }

async function setStatus(formData: FormData) {
  "use server";
  const status = String(formData.get("status") || "");
  const supabase = await (await import("@/lib/supabase/server")).supabaseServer();

  await supabase
    .from("open_house_events")
    .update({ status })
    .eq("id", id);
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

        <form action={setStatus} style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select name="status" defaultValue={evt.status} style={{ padding: 8 }}>
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
          </select>
          <button style={{ padding: "8px 10px", fontWeight: 800 }}>Save</button>
       </form>


        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/app/open-houses">Back to list</Link>
          <Link href={`/app/open-houses/${evt.id}/attendees`}>Attendees</Link>
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
          <a
            href={`/api/open-houses/${evt.id}/flyer`}
            download
            style={{
              padding: "8px 12px",
              background: "#3b82f6",
              color: "white",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            📄 Download Flyer
          </a>
        </div>
      </div>

      {/* Property Photo */}
      {evt.property_photo_url && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
            Property Photo
          </h2>
          <div style={{ position: "relative", width: "100%", maxWidth: 800, height: 400, borderRadius: 8, overflow: "hidden" }}>
            <Image
              src={evt.property_photo_url}
              alt={`Property at ${evt.address}`}
              fill
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        </div>
      )}

      {/* Property Location Map */}
      {evt.latitude && evt.longitude ? (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
            Property Location
          </h2>
          <PropertyMap
            latitude={evt.latitude}
            longitude={evt.longitude}
            address={evt.address}
            className="h-[400px]"
          />
        </div>
      ) : (
        <div style={{ marginTop: 32, padding: 16, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            <strong>Map not available:</strong> No coordinates found for this address. The geocoding service may have been unavailable when this open house was created.
          </p>
        </div>
      )}

      <QRPanel eventId={evt.id} status={evt.status} />
    </div>
  );
}
