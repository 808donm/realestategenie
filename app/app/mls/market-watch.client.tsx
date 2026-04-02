"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import dynamic from "next/dynamic";

const PropertyDetailModal = dynamic(() => import("../property-data/property-detail-modal.client"), {
  loading: () => null,
});

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_CENTER = { lat: 21.3113, lng: -157.86 };
const DEFAULT_ZOOM = 12;

const STATUS_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  New: { fill: "#f97316", stroke: "#c2410c", label: "New" },
  Active: { fill: "#3b82f6", stroke: "#1d4ed8", label: "Active" },
  Pending: { fill: "#3b82f6", stroke: "#000000", label: "Pending" },
  Closed: { fill: "#dc2626", stroke: "#991b1b", label: "Sold" },
  Expired: { fill: "#6b7280", stroke: "#374151", label: "Expired" },
  Withdrawn: { fill: "#9ca3af", stroke: "#6b7280", label: "Withdrawn" },
  Canceled: { fill: "#374151", stroke: "#111827", label: "Canceled" },
  "Coming Soon": { fill: "#ec4899", stroke: "#be185d", label: "Coming Soon" },
};

const PROPERTY_TYPE_SHAPES: Record<string, string> = {
  Residential: "circle",
  Condominium: "diamond",
  Land: "triangle",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

interface Listing {
  listingKey: string;
  listingId: string;
  status: string;
  isNew?: boolean;
  mlsStatus?: string;
  propertyType?: string;
  propertySubType?: string;
  listPrice: number;
  originalListPrice?: number;
  closePrice?: number;
  closeDate?: string;
  onMarketDate?: string;
  daysOnMarket?: number;
  lat?: number;
  lng?: number;
  address: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  modifiedAt?: string;
  priceChange?: number;
  photoUrl?: string;
}

export default function MarketWatchClient() {
  const [postalCode, setPostalCode] = useState("");
  const [timeframe, setTimeframe] = useState<"today" | "7days" | "30days" | "90days">("30days");
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [propertyType, setPropertyType] = useState<"" | "Residential" | "Condominium">("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [priceChanges, setPriceChanges] = useState<{ increases: number; decreases: number }>({
    increases: 0,
    decreases: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const photoCache = useRef<Record<string, string>>({});
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set(Object.keys(STATUS_COLORS)));

  // Detect if input is a TMK (has dashes between digits, or 3-4 digit non-zip)
  const isTMK = useCallback((input: string): boolean => {
    const trimmed = input.trim();
    if (/^\d+-\d+/.test(trimmed)) return true;
    const digits = trimmed.replace(/[-\s.:()]/g, "");
    if (/^\d{3,4}$/.test(digits) && !digits.startsWith("96") && !digits.startsWith("97")) return true;
    return false;
  }, []);

  const fetchMarketWatch = useCallback(async () => {
    const input = postalCode.trim();
    if (!input) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ timeframe, limit: "200" });
      if (propertyType) params.set("propertyType", propertyType);

      if (isTMK(input)) {
        // TMK search: first get the TMK parcel bounds, then search by bounding box
        const tmkParts = input.replace(/[.:() ]/g, "-").split("-").filter(Boolean);
        let parts = tmkParts;
        if (parts.length === 1 && /^\d{3,4}$/.test(parts[0])) {
          parts = parts[0].split("");
        }
        // Derive county from island digit
        const countyMap: Record<string, string> = { "1": "HONOLULU", "2": "MAUI", "3": "HAWAII", "4": "KAUAI" };
        const county = countyMap[parts[0]] || "HONOLULU";
        const zone = parts[1] || "";
        const section = parts[2] || "";

        // Get TMK section bounds
        const tmkParams = new URLSearchParams({ county, layer: "sections" });
        if (zone) tmkParams.set("zone", zone);
        if (section) tmkParams.set("section", section);
        tmkParams.set("limit", "10");
        const tmkRes = await fetch(`/api/seller-map/tmk-overlay?${tmkParams}`);
        const tmkData = await tmkRes.json();

        if (tmkData.features?.length > 0) {
          // Compute centroid from TMK geometry to find the nearest zip code
          let sumLat = 0, sumLng = 0, pointCount = 0;
          for (const feature of tmkData.features) {
            const coords = feature.geometry?.type === "Polygon"
              ? feature.geometry.coordinates[0]
              : feature.geometry?.type === "MultiPolygon"
                ? feature.geometry.coordinates.flat(2)
                : [];
            for (const coord of coords) {
              const [lng, lat] = Array.isArray(coord[0]) ? coord[0] : coord;
              sumLat += lat;
              sumLng += lng;
              pointCount++;
            }
          }
          if (pointCount > 0) {
            const centLat = sumLat / pointCount;
            const centLng = sumLng / pointCount;
            // Use Google Geocoding to find the zip code for this centroid
            try {
              const geoRes = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${centLat},${centLng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
              );
              const geoData = await geoRes.json();
              const zipResult = geoData.results?.[0]?.address_components?.find(
                (c: any) => c.types?.includes("postal_code"),
              );
              if (zipResult?.short_name) {
                params.set("postalCode", zipResult.short_name);
              }
            } catch {
              // Fallback: use a Hawaii TMK zone-to-zip rough mapping
              const ZONE_ZIP: Record<string, string> = {
                "1-1": "96816", "1-2": "96822", "1-3": "96813", "1-4": "96734",
                "1-5": "96744", "1-6": "96762", "1-7": "96791", "1-8": "96797",
                "1-9": "96706", "2-1": "96793", "2-4": "96732", "3-1": "96720",
                "4-1": "96766", "4-5": "96746",
              };
              const zoneKey = `${parts[0]}-${zone}`;
              if (ZONE_ZIP[zoneKey]) params.set("postalCode", ZONE_ZIP[zoneKey]);
            }
          }
        } else {
          setError("No TMK area found for that input");
          setLoading(false);
          return;
        }
      } else {
        params.set("postalCode", input);
      }

      const res = await fetch(`/api/mls/market-watch?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setListings(data.listings || []);
      setStatusCounts(data.statusCounts || {});
      setPriceChanges(data.priceChanges || { increases: 0, decreases: 0 });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch market data");
    } finally {
      setLoading(false);
    }
  }, [postalCode, timeframe, propertyType, isTMK]);

  const toggleStatus = (status: string) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const filteredListings = listings.filter((l) => {
    if (l.isNew && activeStatuses.has("New")) return true;
    return activeStatuses.has(l.status);
  });

  const mapCenter =
    listings.length > 0 && listings[0].lat && listings[0].lng
      ? { lat: listings[0].lat, lng: listings[0].lng }
      : null;

  const totalListings = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
    backgroundColor: "#fff",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 16px",
    borderRadius: 6,
    border: "none",
    backgroundColor: "#2563eb",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", fontFamily: "system-ui, sans-serif" }}>
      {/* Sidebar */}
      <div
        style={{
          width: 300,
          minWidth: 300,
          borderRight: "1px solid #e5e7eb",
          overflowY: "auto",
          padding: 16,
          backgroundColor: "#f9fafb",
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>Market Watch</h2>

        {/* Search */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
            Zip Code or TMK
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchMarketWatch()}
              placeholder="e.g. 96815 or 1-3-1"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={fetchMarketWatch}
              disabled={loading || !postalCode.trim()}
              style={{
                ...buttonStyle,
                width: "auto",
                padding: "8px 16px",
                opacity: loading || !postalCode.trim() ? 0.5 : 1,
              }}
            >
              {loading ? "..." : "Go"}
            </button>
          </div>
        </div>

        {/* Timeframe */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
            Timeframe
          </label>
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as typeof timeframe)} style={selectStyle}>
            <option value="today">Today</option>
            <option value="7days">7 Days</option>
            <option value="30days">30 Days</option>
            <option value="90days">90 Days</option>
          </select>
        </div>

        {/* Property Type */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
            Property Type
          </label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value as typeof propertyType)}
            style={selectStyle}
          >
            <option value="">All Types</option>
            <option value="Residential">Residential</option>
            <option value="Condominium">Condominium</option>
          </select>
        </div>

        {/* Status Counts */}
        {totalListings > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Status Filter ({totalListings} total)
            </div>
            {Object.entries(statusCounts).map(([status, count]) => {
              const color = STATUS_COLORS[status] || { fill: "#9ca3af", stroke: "#6b7280", label: status };
              const isActive = activeStatuses.has(status);
              return (
                <div
                  key={status}
                  onClick={() => toggleStatus(status)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    marginBottom: 4,
                    borderRadius: 6,
                    cursor: "pointer",
                    backgroundColor: isActive ? `${color.fill}15` : "transparent",
                    border: `1px solid ${isActive ? color.fill : "#e5e7eb"}`,
                    opacity: isActive ? 1 : 0.5,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: color.fill,
                        border: `2px solid ${color.stroke}`,
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{color.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: color.fill }}>{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Price Changes */}
        {(priceChanges.increases > 0 || priceChanges.decreases > 0) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Price Changes</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 6,
                  backgroundColor: "#dcfce7",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, color: "#16a34a" }}>{priceChanges.increases}</div>
                <div style={{ fontSize: 11, color: "#15803d" }}>Increases</div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 6,
                  backgroundColor: "#fee2e2",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, color: "#dc2626" }}>{priceChanges.decreases}</div>
                <div style={{ fontSize: 11, color: "#991b1b" }}>Decreases</div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Legend</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: color.fill,
                    border: `1.5px solid ${color.stroke}`,
                  }}
                />
                <span style={{ color: "#6b7280" }}>{color.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 11, color: "#6b7280" }}>
            {Object.entries(PROPERTY_TYPE_SHAPES).map(([type, shape]) => (
              <span key={type}>
                {shape === "circle" ? "\u25CF" : shape === "diamond" ? "\u25C6" : "\u25B2"} {type}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Map + Card Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, backgroundColor: "#fff" }}>
        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200, color: "#6b7280" }}>
            Loading market data...
          </div>
        )}

        {!loading && filteredListings.length === 0 && totalListings === 0 && !error && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: 300,
              color: "#9ca3af",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>&#x1F50D;</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Enter a zip code to view market activity</div>
          </div>
        )}

        {!loading && filteredListings.length === 0 && totalListings > 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
            No listings match the selected status filters.
          </div>
        )}

        {/* Google Map */}
        {filteredListings.length > 0 && MAPS_API_KEY && (
          <>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
              Showing {filteredListings.filter((l) => l.lat && l.lng).length} of {listings.length} listings on map
            </div>
            <APIProvider apiKey={MAPS_API_KEY}>
              <div
                style={{
                  height: "calc(100vh - 280px)",
                  minHeight: 400,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                  marginBottom: 16,
                }}
              >
                <Map
                  defaultCenter={mapCenter || DEFAULT_CENTER}
                  defaultZoom={DEFAULT_ZOOM}
                  mapId="market-watch-map"
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  style={{ width: "100%", height: "100%" }}
                >
                  {filteredListings.map((listing) => {
                    if (!listing.lat || !listing.lng) return null;
                    const colors = STATUS_COLORS[listing.status] || STATUS_COLORS.Active;
                    const isNew = listing.isNew || (listing.daysOnMarket != null && listing.daysOnMarket <= 7);
                    const markerColor = isNew ? "#f97316" : colors.fill;
                    const strokeColor = listing.status === "Pending" ? "#000000" : colors.stroke;
                    const strokeWidth = listing.status === "Pending" ? 3 : 1.5;

                    return (
                      <AdvancedMarker
                        key={listing.listingKey}
                        position={{ lat: listing.lat, lng: listing.lng }}
                        onClick={() => setSelectedListing(listing)}
                      >
                        <div
                          onMouseEnter={() => setSelectedListing(listing)}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: listing.propertyType === "Condominium" ? 2 : "50%",
                            background: markerColor,
                            border: `${strokeWidth}px solid ${strokeColor}`,
                            cursor: "pointer",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                          }}
                        />
                      </AdvancedMarker>
                    );
                  })}

                  {selectedListing && selectedListing.lat && selectedListing.lng && (
                    <InfoWindow
                      position={{ lat: selectedListing.lat, lng: selectedListing.lng }}
                      onCloseClick={() => setSelectedListing(null)}
                      maxWidth={320}
                      pixelOffset={[0, -12]}
                    >
                      <div style={{ padding: 0, minWidth: 280 }}>
                        {/* Listing Photo */}
                        {selectedListing.photoUrl && (
                          <div style={{ width: "100%", height: 160, overflow: "hidden", borderRadius: "4px 4px 0 0", marginBottom: 8 }}>
                            <img
                              src={selectedListing.photoUrl}
                              alt={selectedListing.address}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                        )}
                        <div style={{ padding: "4px 8px 8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 18, fontWeight: 700 }}>
                              {formatCurrency(selectedListing.closePrice || selectedListing.listPrice)}
                            </span>
                            <span style={{
                              padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, color: "#fff",
                              background: selectedListing.isNew
                                ? STATUS_COLORS.New.fill
                                : (STATUS_COLORS[selectedListing.status] || STATUS_COLORS.Active).fill,
                            }}>
                              {selectedListing.isNew ? "New" : (STATUS_COLORS[selectedListing.status] || STATUS_COLORS.Active).label}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>{selectedListing.address}</div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                            {[
                              selectedListing.beds && `${selectedListing.beds} bd`,
                              selectedListing.baths && `${selectedListing.baths} ba`,
                              selectedListing.sqft && `${selectedListing.sqft.toLocaleString()} sqft`,
                              selectedListing.daysOnMarket != null && `${selectedListing.daysOnMarket} DOM`,
                            ].filter(Boolean).join(" \u00B7 ")}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
                            {selectedListing.listingId && <span>MLS# {selectedListing.listingId}</span>}
                            {selectedListing.propertySubType && <span>{selectedListing.propertySubType}</span>}
                          </div>
                          <button
                            onClick={() => { setDetailListing(selectedListing); setSelectedListing(null); }}
                            style={{
                              width: "100%",
                              padding: "8px 0",
                              background: "#1e40af",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            View Full Details
                          </button>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </div>
            </APIProvider>
          </>
        )}

        {/* Map-only view -- no card grid. Click markers for property details. */}
      </div>

      {/* Property Detail Modal */}
      {detailListing && (
        <PropertyDetailModal
          property={{
            identifier: { apn: "" },
            address: {
              oneLine: detailListing.address,
              locality: detailListing.address?.split(",")[1]?.trim(),
              countrySubd: "HI",
              postal1: detailListing.address?.match(/\d{5}/)?.[0],
            },
            location: {
              latitude: detailListing.lat ? String(detailListing.lat) : undefined,
              longitude: detailListing.lng ? String(detailListing.lng) : undefined,
            },
            building: {
              rooms: { beds: detailListing.beds, bathsTotal: detailListing.baths },
              size: { universalSize: detailListing.sqft, livingSize: detailListing.sqft },
              summary: { yearBuilt: detailListing.yearBuilt },
            },
            summary: { propType: detailListing.propertyType, yearBuilt: detailListing.yearBuilt },
          } as any}
          onClose={() => setDetailListing(null)}
        />
      )}
    </div>
  );
}
