"use client";

import { useState, useEffect } from "react";

interface Media {
  MediaURL: string;
  MediaType: string;
  Order?: number;
  ShortDescription?: string;
}

interface Property {
  ListingKey: string;
  ListingId: string;
  StandardStatus: string;
  PropertyType: string;
  PropertySubType?: string;
  ListPrice: number;
  StreetNumber?: string;
  StreetName?: string;
  StreetSuffix?: string;
  City: string;
  StateOrProvince: string;
  PostalCode: string;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  LivingArea?: number;
  LotSizeArea?: number;
  YearBuilt?: number;
  PublicRemarks?: string;
  ListAgentFullName?: string;
  ListOfficeName?: string;
  OnMarketDate?: string;
  ListingURL?: string;
  VirtualTourURLUnbranded?: string;
}

export default function ListingView({
  listingKey,
  agentId,
}: {
  listingKey: string;
  agentId: string;
}) {
  const [property, setProperty] = useState<Property | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState(0);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await fetch(
          `/api/public/listing?key=${encodeURIComponent(listingKey)}&agentId=${encodeURIComponent(agentId)}`
        );
        const data = await res.json();

        if (!res.ok || !data.property) {
          setError("This listing is no longer available.");
          return;
        }

        setProperty(data.property);
        if (data.media) {
          const photos = data.media
            .filter((m: Media) => m.MediaType === "image" || m.MediaURL?.match(/\.(jpg|jpeg|png|webp)/i))
            .sort((a: Media, b: Media) => (a.Order || 0) - (b.Order || 0));
          setMedia(photos);
        }
      } catch {
        setError("Unable to load listing. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [listingKey, agentId]);

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: "60px auto", padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 18, color: "#6b7280" }}>Loading listing...</div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div style={{ maxWidth: 800, margin: "60px auto", padding: 16, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Listing Not Available</h1>
        <p style={{ marginTop: 12, color: "#6b7280" }}>{error || "This listing could not be found."}</p>
      </div>
    );
  }

  const address = [property.StreetNumber, property.StreetName, property.StreetSuffix]
    .filter(Boolean)
    .join(" ");
  const fullAddress = [address, property.City, property.StateOrProvince, property.PostalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px", fontFamily: "Arial, sans-serif" }}>
      {/* Photo Gallery */}
      {media.length > 0 && (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
          <img
            src={media[currentPhoto]?.MediaURL}
            alt={`Property photo ${currentPhoto + 1}`}
            style={{ width: "100%", height: 400, objectFit: "cover", display: "block" }}
          />
          {media.length > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", position: "absolute", top: "50%", left: 0, right: 0, transform: "translateY(-50%)", padding: "0 8px" }}>
              <button
                onClick={() => setCurrentPhoto((p) => (p === 0 ? media.length - 1 : p - 1))}
                style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", fontSize: 20 }}
              >
                &lsaquo;
              </button>
              <button
                onClick={() => setCurrentPhoto((p) => (p === media.length - 1 ? 0 : p + 1))}
                style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", fontSize: 20 }}
              >
                &rsaquo;
              </button>
            </div>
          )}
          <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px", borderRadius: 16, fontSize: 13 }}>
            {currentPhoto + 1} / {media.length}
          </div>
        </div>
      )}

      {/* Price & Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#059669" }}>
          ${property.ListPrice?.toLocaleString()}
        </div>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: 16,
            fontSize: 13,
            fontWeight: 600,
            background: property.StandardStatus === "Active" ? "#d1fae5" : "#f3f4f6",
            color: property.StandardStatus === "Active" ? "#065f46" : "#374151",
          }}
        >
          {property.StandardStatus}
        </span>
      </div>

      {/* Address */}
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 16px" }}>{fullAddress}</h1>

      {/* Key Details */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24, fontSize: 15, color: "#374151" }}>
        {property.BedroomsTotal != null && (
          <span><strong>{property.BedroomsTotal}</strong> Beds</span>
        )}
        {property.BathroomsTotalInteger != null && (
          <span><strong>{property.BathroomsTotalInteger}</strong> Baths</span>
        )}
        {property.LivingArea != null && (
          <span><strong>{property.LivingArea.toLocaleString()}</strong> Sq Ft</span>
        )}
        {property.YearBuilt != null && (
          <span>Built <strong>{property.YearBuilt}</strong></span>
        )}
        {property.PropertyType && (
          <span>{property.PropertyType}{property.PropertySubType ? ` - ${property.PropertySubType}` : ""}</span>
        )}
      </div>

      {/* Description */}
      {property.PublicRemarks && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Description</h2>
          <p style={{ lineHeight: 1.6, color: "#4b5563", fontSize: 15 }}>{property.PublicRemarks}</p>
        </div>
      )}

      {/* Listing Details */}
      <div style={{ background: "#f9fafb", borderRadius: 8, padding: 16, fontSize: 14, color: "#6b7280" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>MLS #: <strong>{property.ListingId || property.ListingKey}</strong></div>
          {property.ListAgentFullName && <div>Agent: <strong>{property.ListAgentFullName}</strong></div>}
          {property.ListOfficeName && <div>Office: <strong>{property.ListOfficeName}</strong></div>}
          {property.OnMarketDate && <div>Listed: <strong>{new Date(property.OnMarketDate).toLocaleDateString()}</strong></div>}
        </div>
      </div>

      {/* Virtual Tour */}
      {property.VirtualTourURLUnbranded && (
        <div style={{ marginTop: 16 }}>
          <a
            href={property.VirtualTourURLUnbranded}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#3b82f6", fontSize: 15, fontWeight: 500 }}
          >
            View Virtual Tour &rarr;
          </a>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #e5e7eb", fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
        Listing shared via Real Estate Genie
      </div>
    </div>
  );
}
