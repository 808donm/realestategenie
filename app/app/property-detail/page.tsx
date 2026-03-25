"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import PropertyDetailModal from "../property-data/property-detail-modal.client";

/**
 * Standalone property detail page — fetches a property by address
 * and renders the full PropertyDetailModal.
 *
 * Used by Hoku copilot when agent clicks a property card in results.
 * URL: /app/property-detail?address=123+Main+St,+Honolulu,+HI+96816
 */
export default function PropertyDetailPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get("address") || "";

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      setError("No address provided");
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          endpoint: "expanded",
          address: address,
          pagesize: "1",
        });
        const res = await fetch(`/api/integrations/attom/property?${params}`);
        const data = await res.json();
        const props = data.property || [];
        if (props.length > 0) {
          setProperty(props[0]);
        } else {
          setError("Property not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch property");
      } finally {
        setLoading(false);
      }
    })();
  }, [address]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>Loading property details...</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>{address}</div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#dc2626" }}>{error || "Property not found"}</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>{address}</div>
          <button
            onClick={() => window.history.back()}
            style={{
              marginTop: 16, padding: "8px 20px", borderRadius: 6,
              background: "#4f46e5", color: "#fff", border: "none",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: "0 4px" }}>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: "6px 16px", borderRadius: 6,
            background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          &larr; Back
        </button>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          Property Intelligence
        </div>
      </div>
      <PropertyDetailModal
        property={property}
        onClose={() => window.history.back()}
      />
    </div>
  );
}
