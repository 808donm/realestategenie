"use client";

import { useState } from "react";

type OpenHouseFormProps = {
  startDefault: string;
  endDefault: string;
  onSubmit: (formData: FormData) => Promise<void>;
};

interface MlsLookupResult {
  mappedFields: {
    address: string;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    price: number | null;
    listing_description: string | null;
    key_features: string[];
    property_photo_url: string | null;
    latitude: number | null;
    longitude: number | null;
    mls_listing_key: string;
    mls_listing_id: string;
    mls_source: string;
  };
  property: {
    listingKey: string;
    listingId: string;
    status: string;
    propertyType: string;
    propertySubType?: string;
    listAgentName?: string;
    listOfficeName?: string;
    onMarketDate?: string;
    photos: { url: string; description: string }[];
    virtualTourUrl?: string;
  };
}

export default function OpenHouseForm({
  startDefault,
  endDefault,
  onSubmit,
}: OpenHouseFormProps) {
  const [address, setAddress] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MLS lookup state
  const [mlsNumber, setMlsNumber] = useState("");
  const [mlsLoading, setMlsLoading] = useState(false);
  const [mlsError, setMlsError] = useState<string | null>(null);
  const [mlsResult, setMlsResult] = useState<MlsLookupResult | null>(null);

  // Hidden fields populated from MLS
  const [mlsFields, setMlsFields] = useState<Record<string, string>>({});

  const handleMlsLookup = async () => {
    if (!mlsNumber.trim()) {
      setMlsError("Enter an MLS number.");
      return;
    }

    setMlsLoading(true);
    setMlsError(null);
    setMlsResult(null);

    try {
      const res = await fetch("/api/mls/lookup-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mlsNumber: mlsNumber.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Listing not found");
      }

      setMlsResult(data);
      // Auto-fill the address
      setAddress(data.mappedFields.address || "");

      // Store all MLS fields as hidden form values
      const fields: Record<string, string> = {};
      const m = data.mappedFields;
      if (m.beds != null) fields.beds = String(m.beds);
      if (m.baths != null) fields.baths = String(m.baths);
      if (m.sqft != null) fields.sqft = String(m.sqft);
      if (m.price != null) fields.price = String(m.price);
      if (m.listing_description) fields.listing_description = m.listing_description;
      if (m.key_features?.length) fields.key_features = JSON.stringify(m.key_features);
      if (m.property_photo_url) fields.property_photo_url = m.property_photo_url;
      if (m.latitude != null) fields.latitude = String(m.latitude);
      if (m.longitude != null) fields.longitude = String(m.longitude);
      if (m.mls_listing_key) fields.mls_listing_key = m.mls_listing_key;
      if (m.mls_listing_id) fields.mls_listing_id = m.mls_listing_id;
      if (m.mls_source) fields.mls_source = m.mls_source;
      setMlsFields(fields);
    } catch (err: any) {
      setMlsError(err?.message || "Failed to look up listing");
    } finally {
      setMlsLoading(false);
    }
  };

  const clearMls = () => {
    setMlsResult(null);
    setMlsFields({});
    setMlsNumber("");
    setMlsError(null);
    setAddress("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      await onSubmit(formData);
    } catch (err: any) {
      setError(err?.message || "Failed to create open house. Please try again.");
      setSubmitting(false);
    }
  };

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
      {/* Event type is always sales for open houses; rentals are managed in PM Showings */}
      <input type="hidden" name="event_type" value="sales" />

      {/* Hidden MLS fields */}
      {Object.entries(mlsFields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      {/* MLS Import Section */}
      <div style={{
        background: "#f0f9ff",
        border: "1px solid #bae6fd",
        borderRadius: 10,
        padding: 16,
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0369a1", marginBottom: 8 }}>
          Import from MLS
        </div>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px 0" }}>
          Enter an MLS number to auto-fill property details — address, beds, baths, price, photos, and description.
        </p>

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={mlsNumber}
              onChange={(e) => setMlsNumber(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleMlsLookup(); } }}
              placeholder="e.g. H12345678"
              disabled={mlsLoading || submitting || !!mlsResult}
              style={{
                width: "100%",
                padding: "9px 12px",
                fontSize: 14,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                background: mlsResult ? "#f0fdf4" : "#fff",
              }}
            />
          </div>
          {!mlsResult ? (
            <button
              type="button"
              onClick={handleMlsLookup}
              disabled={mlsLoading || !mlsNumber.trim()}
              style={{
                padding: "9px 18px",
                fontWeight: 600,
                fontSize: 13,
                background: "#0284c7",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: mlsLoading || !mlsNumber.trim() ? "not-allowed" : "pointer",
                opacity: mlsLoading || !mlsNumber.trim() ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {mlsLoading ? "Looking up..." : "Look Up"}
            </button>
          ) : (
            <button
              type="button"
              onClick={clearMls}
              disabled={submitting}
              style={{
                padding: "9px 18px",
                fontWeight: 600,
                fontSize: 13,
                background: "#fff",
                color: "#dc2626",
                border: "1px solid #fecaca",
                borderRadius: 6,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {mlsError && (
          <p style={{ margin: "8px 0 0 0", color: "#dc2626", fontSize: 12, fontWeight: 600 }}>{mlsError}</p>
        )}

        {/* MLS Preview Card */}
        {mlsResult && (
          <div style={{
            marginTop: 12,
            background: "#fff",
            border: "1px solid #d1fae5",
            borderRadius: 8,
            padding: 14,
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              {mlsResult.mappedFields.property_photo_url && (
                <img
                  src={mlsResult.mappedFields.property_photo_url}
                  alt="Property"
                  style={{
                    width: 100,
                    height: 75,
                    objectFit: "cover",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                  {mlsResult.mappedFields.address}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {mlsResult.mappedFields.beds != null && <span>{mlsResult.mappedFields.beds} bed</span>}
                  {mlsResult.mappedFields.baths != null && <span>{mlsResult.mappedFields.baths} bath</span>}
                  {mlsResult.mappedFields.sqft != null && <span>{mlsResult.mappedFields.sqft.toLocaleString()} sqft</span>}
                  {mlsResult.mappedFields.price != null && (
                    <span style={{ color: "#059669", fontWeight: 600 }}>{fmt(mlsResult.mappedFields.price)}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                  MLS# {mlsResult.property.listingId} · {mlsResult.property.status}
                  {mlsResult.property.listAgentName && ` · ${mlsResult.property.listAgentName}`}
                </div>
              </div>
            </div>
            <div style={{
              marginTop: 8,
              padding: "6px 10px",
              background: "#f0fdf4",
              borderRadius: 6,
              fontSize: 11,
              color: "#166534",
              fontWeight: 600,
            }}>
              Property details will be auto-filled: address, beds, baths, sqft, price, description, photo, and coordinates.
            </div>
          </div>
        )}
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Address</label>
        <input
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ width: "100%", padding: 10 }}
          placeholder="123 Main St, Honolulu, HI"
          required
          disabled={submitting}
        />
        <p style={{ fontSize: 11, opacity: 0.6, margin: "4px 0 0 0" }}>
          {mlsResult
            ? "Auto-filled from MLS. You can edit this if needed."
            : "We'll automatically geocode this address to show a map on your open house page."}
        </p>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Start</label>
          <input
            name="start_at"
            type="datetime-local"
            defaultValue={startDefault}
            style={{ width: "100%", padding: 10 }}
            required
            disabled={submitting}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>End</label>
          <input
            name="end_at"
            type="datetime-local"
            defaultValue={endDefault}
            style={{ width: "100%", padding: 10 }}
            required
            disabled={submitting}
          />
        </div>
      </div>

      {error && (
        <p style={{ margin: 0, color: "crimson", fontSize: 13, fontWeight: 600 }}>{error}</p>
      )}

      <button disabled={submitting} style={{ padding: 12, fontWeight: 900, opacity: submitting ? 0.6 : 1, cursor: submitting ? "wait" : "pointer" }}>
        {submitting ? "Creating..." : "Create"}
      </button>
      <p style={{ margin: 0, opacity: 0.7, fontSize: 12 }}>
        After creating, you'll publish it and generate the QR check-in link.
      </p>
    </form>
  );
}
