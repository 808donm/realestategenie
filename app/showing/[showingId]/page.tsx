import { supabaseServer } from "@/lib/supabase/server";
import RentalApplicationForm from "./rental-application-form.client";

export default async function ShowingCheckInPage({
  params,
}: {
  params: Promise<{ showingId: string }>;
}) {
  const { showingId } = await params;
  const supabase = await supabaseServer();

  // Read from the public VIEW (published showings only)
  const { data: showing, error } = await supabase
    .from("public_pm_showing")
    .select("*")
    .eq("id", showingId)
    .single();

  if (error || !showing) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Property Showing</h1>
        <p style={{ color: "crimson" }}>
          This showing is not available. It may be unpublished or cancelled.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      {/* Company Logo */}
      {showing.company_logo_url && (
        <div style={{ marginBottom: 16, textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={showing.company_logo_url}
            alt="Company Logo"
            style={{ maxWidth: 200, maxHeight: 60, objectFit: "contain" }}
          />
        </div>
      )}

      {/* Agent Info */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20 }}>
        {showing.headshot_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={showing.headshot_url}
            alt="Agent"
            style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid #e5e7eb" }}
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
            {showing.display_name || "Your Agent"}
          </div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {showing.license_number ? `Lic # ${showing.license_number}` : ""}
            {showing.phone_e164 ? ` • ${showing.phone_e164}` : ""}
          </div>
        </div>
      </div>

      {/* Property Info */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
          {showing.address}
        </h1>
        <p style={{ opacity: 0.75, marginTop: 6, marginBottom: 0 }}>
          {showing.city}, {showing.state_province} {showing.zip_postal_code}
        </p>
        <p style={{ opacity: 0.75, marginTop: 6 }}>
          Showing: {new Date(showing.start_at).toLocaleString()} - {new Date(showing.end_at).toLocaleTimeString()}
        </p>
      </div>

      {/* Property Details */}
      <div style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
          {showing.bedrooms && (
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Bedrooms</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{showing.bedrooms}</div>
            </div>
          )}
          {showing.bathrooms && (
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Bathrooms</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{showing.bathrooms}</div>
            </div>
          )}
          {showing.square_feet && (
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Sq Ft</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{showing.square_feet.toLocaleString()}</div>
            </div>
          )}
          {showing.monthly_rent && (
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Monthly Rent</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>${showing.monthly_rent.toLocaleString()}</div>
            </div>
          )}
        </div>

        {showing.description && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Description</div>
            <p style={{ fontSize: 14, margin: 0 }}>{showing.description}</p>
          </div>
        )}

        {showing.pet_policy && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Pet Policy</div>
            <p style={{ fontSize: 14, margin: 0 }}>{showing.pet_policy}</p>
          </div>
        )}
      </div>

      {/* Property Photo */}
      {showing.property_photo_url && (
        <div style={{ marginBottom: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={showing.property_photo_url}
            alt="Property"
            style={{ width: "100%", borderRadius: 12, objectFit: "cover", maxHeight: 400 }}
          />
        </div>
      )}

      {/* Rental Application Form */}
      <RentalApplicationForm
        showingId={showingId}
        pmPropertyId={showing.pm_property_id}
      />
    </div>
  );
}
