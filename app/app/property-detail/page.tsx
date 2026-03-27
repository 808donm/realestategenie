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
        let prop: any = null;

        // 1. Try MLS (Trestle) first -- agent's own licensed connection
        try {
          const mlsRes = await fetch(`/api/mls/search?q=${encodeURIComponent(address)}&status=Active,Pending,Closed&limit=5`);
          if (mlsRes.ok) {
            const mlsData = await mlsRes.json();
            const listings = mlsData.listings || [];
            if (listings.length > 0) {
              // Find best match -- exact address match preferred
              const addrLower = address.toLowerCase().replace(/[,.\s]+/g, " ").trim();
              const match = listings.find((l: any) => {
                const lAddr = (l.UnparsedAddress || "").toLowerCase().replace(/[,.\s]+/g, " ").trim();
                return lAddr.includes(addrLower) || addrLower.includes(lAddr);
              }) || listings[0];

              // Map MLS listing to property data shape
              prop = {
                identifier: { obPropId: match.ListingKey },
                address: {
                  oneLine: match.UnparsedAddress || address,
                  line1: [match.StreetNumber, match.StreetName, match.StreetSuffix].filter(Boolean).join(" "),
                  locality: match.City,
                  countrySubd: match.StateOrProvince,
                  postal1: match.PostalCode,
                },
                location: {
                  latitude: match.Latitude ? String(match.Latitude) : undefined,
                  longitude: match.Longitude ? String(match.Longitude) : undefined,
                },
                building: {
                  size: { livingSize: match.LivingArea, universalSize: match.LivingArea },
                  rooms: { beds: match.BedroomsTotal, bathsTotal: match.BathroomsTotalInteger },
                },
                lot: { lotSize1: match.LotSizeArea },
                summary: {
                  propType: match.PropertyType,
                  propSubType: match.PropertySubType,
                  yearBuilt: match.YearBuilt,
                },
                mlsNumber: match.ListingId,
                listingStatus: match.StandardStatus,
                daysOnMarket: match.DaysOnMarket || match.CumulativeDaysOnMarket,
                listingAgentName: match.ListAgentFullName,
                listingOfficeName: match.ListOfficeName,
                listingDescription: match.PublicRemarks,
                ownershipType: match.OwnershipType,
                _source: "mls",
              };
            }
          }
        } catch {
          // MLS not connected or failed -- continue to next source
        }

        // 2. Try RentCast + Realie (DB cache checked server-side automatically)
        if (!prop) {
          const params = new URLSearchParams({
            endpoint: "expanded",
            address: address,
            pagesize: "1",
          });
          const res = await fetch(`/api/integrations/attom/property?${params}`);
          const data = await res.json();
          const props = data.property || [];
          if (props.length > 0) {
            prop = props[0];
          }
        }

        if (prop) {
          setProperty(prop);
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
              marginTop: 16,
              padding: "8px 20px",
              borderRadius: 6,
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          padding: "0 4px",
        }}
      >
        <button
          onClick={() => window.history.back()}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            background: "#f3f4f6",
            color: "#374151",
            border: "1px solid #d1d5db",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          &larr; Back
        </button>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>Property Intelligence</div>
      </div>
      <PropertyDetailModal property={property} onClose={() => window.history.back()} />
    </div>
  );
}
