"use client";

import { useState } from "react";

export default function MlsRefreshButton({ eventId, mlsListingKey }: { eventId: string; mlsListingKey: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setResult(null);
    try {
      // Fetch fresh data from Trestle
      const lookupRes = await fetch("/api/mls/lookup-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingKey: mlsListingKey }),
      });
      const lookupData = await lookupRes.json();
      if (!lookupRes.ok || !lookupData.mappedFields) {
        setResult({ ok: false, message: lookupData.error || "Failed to fetch MLS data" });
        return;
      }

      // Update the open house event with fresh MLS data
      const { mappedFields } = lookupData;
      const patchRes = await fetch(`/api/open-houses/${eventId}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beds: mappedFields.beds,
          baths: mappedFields.baths,
          sqft: mappedFields.sqft,
          price: mappedFields.price,
          listing_description: mappedFields.listing_description,
          key_features: mappedFields.key_features,
          ...(mappedFields.property_photo_url ? { property_photo_url: mappedFields.property_photo_url } : {}),
        }),
      });
      if (patchRes.ok) {
        setResult({ ok: true, message: "Listing data refreshed from MLS." });
        // Reload to show updated data
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const err = await patchRes.json();
        setResult({ ok: false, message: err.error || "Failed to save MLS data" });
      }
    } catch {
      setResult({ ok: false, message: "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleRefresh}
        disabled={loading}
        style={{
          padding: "8px 16px",
          background: "#0891b2",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontWeight: 600,
          fontSize: 13,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Refreshing..." : "Refresh from MLS"}
      </button>
      {result && (
        <span
          style={{
            marginLeft: 12,
            fontSize: 13,
            color: result.ok ? "#059669" : "#dc2626",
            fontWeight: 500,
          }}
        >
          {result.message}
        </span>
      )}
    </div>
  );
}
