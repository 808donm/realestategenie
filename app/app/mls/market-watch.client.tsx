"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import dynamic from "next/dynamic";

const PropertyDetailModal = dynamic(() => import("../property-data/property-detail-modal.client"), {
  loading: () => null,
});

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_CENTER = { lat: 21.3113, lng: -157.86 };
const DEFAULT_ZOOM = 12;

const STATUS_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  New: { fill: "#f97316", stroke: "#c2410c", label: "New" },
  "Back On Market": { fill: "#10b981", stroke: "#059669", label: "Back On Market" },
  Active: { fill: "#3b82f6", stroke: "#1d4ed8", label: "Active" },
  Pending: { fill: "#3b82f6", stroke: "#000000", label: "Pending" },
  Closed: { fill: "#dc2626", stroke: "#991b1b", label: "Sold" },
  Expired: { fill: "#6b7280", stroke: "#374151", label: "Expired" },
  Withdrawn: { fill: "#9ca3af", stroke: "#6b7280", label: "Withdrawn" },
  Canceled: { fill: "#374151", stroke: "#111827", label: "Canceled" },
  "Price Increase": { fill: "#16a34a", stroke: "#15803d", label: "Price Increase" },
  "Price Decrease": { fill: "#b91c1c", stroke: "#7f1d1d", label: "Price Decrease" },
  "Coming Soon": { fill: "#ec4899", stroke: "#be185d", label: "Coming Soon" },
};

const PROPERTY_TYPE_SHAPES: Record<string, string> = {
  Residential: "circle",
  Condominium: "diamond",
  Land: "triangle",
};

const PROP_TYPE_ABBR: Record<string, string> = {
  SingleFamilyResidence: "SF",
  Condominium: "CND",
  Townhouse: "TH",
  Land: "LND",
  MultiFamily: "MF",
  Manufactured: "MH",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

interface Listing {
  listingKey: string;
  listingId: string;
  status: string;
  isNew?: boolean;
  isBackOnMarket?: boolean;
  isPriceIncrease?: boolean;
  isPriceDecrease?: boolean;
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
  city?: string;
  state?: string;
  postalCode?: string;
  parcelNumber?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  ownershipType?: string;
  modifiedAt?: string;
  priceChange?: number;
  photoUrl?: string;
}

export default function MarketWatchClient() {
  const [postalCode, setPostalCode] = useState("");
  const [timeframe, setTimeframe] = useState<"24hours" | "today" | "7days" | "30days" | "90days">("30days");
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
  const [tmkBoundary, setTmkBoundary] = useState<any>(null);
  const photoCache = useRef<Record<string, string>>({});
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set(Object.keys(STATUS_COLORS)));
  const [viewMode, setViewMode] = useState<"map" | "hotsheet">("map");
  const [sortField, setSortField] = useState("modifiedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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
    setTmkBoundary(null); // Clear previous TMK overlay
    try {
      const params = new URLSearchParams({ timeframe, limit: "200" });
      if (propertyType) params.set("propertyType", propertyType);

      if (isTMK(input)) {
        // TMK search: use ZIP codes to get listings, then overlay TMK boundary for visual reference
        const { parseTMKInput, getZipsForTMKSection } = await import("@/lib/hawaii-tmk-zip");
        const tmk = parseTMKInput(input);
        const zone = tmk.zone || "";
        const section = tmk.section || "";

        // Get ZIP codes for this TMK section
        const sectionZips = zone && section ? getZipsForTMKSection(zone, section) : null;
        if (!sectionZips || sectionZips.length === 0) {
          setError(`No ZIP codes mapped for TMK section ${zone}-${section}. Try a ZIP code instead.`);
          setLoading(false);
          return;
        }

        // Fetch TMK section boundary polygon for map overlay (non-blocking)
        const countyMap: Record<string, string> = { "1": "HONOLULU", "2": "MAUI", "3": "HAWAII", "4": "KAUAI" };
        const county = countyMap[tmk.island || "1"] || "HONOLULU";
        const tmkParams = new URLSearchParams({ county, layer: "sections" });
        if (zone) tmkParams.set("zone", zone);
        if (section) tmkParams.set("section", section);
        tmkParams.set("limit", "5");
        fetch(`/api/seller-map/tmk-overlay?${tmkParams}`)
          .then((r) => r.json())
          .then((data) => { if (data.features?.length) setTmkBoundary(data); })
          .catch(() => {}); // Boundary is visual only, not critical

        // Search by ZIP codes (fetches ALL listings in those zips)
        if (sectionZips.length === 1) {
          params.set("postalCode", sectionZips[0]);
        } else {
          // Multiple zips: fetch all in parallel and merge
          const allResults = await Promise.all(
            sectionZips.map(async (zip) => {
              const p = new URLSearchParams(params);
              p.set("postalCode", zip);
              const r = await fetch(`/api/mls/market-watch?${p}`);
              return r.ok ? r.json() : null;
            }),
          );
          const mergedListings: any[] = [];
          let mergedCounts: Record<string, number> = {};
          let mergedPriceChanges = { increases: 0, decreases: 0 };
          const seenKeys = new Set<string>();
          for (const d of allResults) {
            if (!d) continue;
            for (const l of d.listings || []) {
              if (!seenKeys.has(l.listingKey)) {
                seenKeys.add(l.listingKey);
                mergedListings.push(l);
              }
            }
            for (const [k, v] of Object.entries(d.statusCounts || {})) {
              mergedCounts[k] = (mergedCounts[k] || 0) + (v as number);
            }
            mergedPriceChanges.increases += d.priceChanges?.increases || 0;
            mergedPriceChanges.decreases += d.priceChanges?.decreases || 0;
          }
          // Apply TMK filter to merged results using startsWith on dashed ParcelNumber
          let filteredMerged = mergedListings;
          if (zone && section) {
            const island = tmk.island || "1";
            const tmkPrefix = `${island}-${zone}-${section}-`;
            filteredMerged = mergedListings.filter((l: any) => {
              if (!l.parcelNumber) return false;
              return String(l.parcelNumber).startsWith(tmkPrefix);
            });
            // Recalculate status counts from filtered listings
            const filteredCounts: Record<string, number> = {};
            let filteredInc = 0, filteredDec = 0;
            for (const l of filteredMerged) {
              const s = l.status || "Unknown";
              filteredCounts[s] = (filteredCounts[s] || 0) + 1;
              if (l.isNew) filteredCounts["New"] = (filteredCounts["New"] || 0) + 1;
              if (l.isBackOnMarket) filteredCounts["Back On Market"] = (filteredCounts["Back On Market"] || 0) + 1;
              if (l.isPriceIncrease) { filteredCounts["Price Increase"] = (filteredCounts["Price Increase"] || 0) + 1; filteredInc++; }
              if (l.isPriceDecrease) { filteredCounts["Price Decrease"] = (filteredCounts["Price Decrease"] || 0) + 1; filteredDec++; }
            }
            mergedCounts = filteredCounts;
            mergedPriceChanges = { increases: filteredInc, decreases: filteredDec };
            console.log(`[MarketWatch] TMK filter (multi-zip): ${mergedListings.length} -> ${filteredMerged.length} matching prefix "${tmkPrefix}"`);
          }
          setListings(filteredMerged);
          setStatusCounts(mergedCounts);
          setPriceChanges(mergedPriceChanges);
          setLoading(false);
          return;
        }
      } else {
        params.set("postalCode", input);
      }

      const res = await fetch(`/api/mls/market-watch?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      let fetchedListings = data.listings || [];

      // For TMK searches, filter listings by ParcelNumber prefix using startsWith
      if (isTMK(input) && fetchedListings.length > 0) {
        const { parseTMKInput: parseTmk } = await import("@/lib/hawaii-tmk-zip");
        const tmkParsed = parseTmk(input);
        const zone = tmkParsed.zone || "";
        const section = tmkParsed.section || "";
        const island = tmkParsed.island || "1";

        if (zone && section) {
          const before = fetchedListings.length;
          const tmkPrefix = `${island}-${zone}-${section}-`;
          fetchedListings = fetchedListings.filter((l: any) => {
            if (!l.parcelNumber) return true; // No TMK data -- keep it (already ZIP-filtered)
            return String(l.parcelNumber).startsWith(tmkPrefix);
          });
          console.log(`[MarketWatch] TMK filter: ${before} -> ${fetchedListings.length} matching prefix "${tmkPrefix}"`);
        }
      }

      // If TMK-filtered, recalculate status counts from filtered listings
      let finalCounts = data.statusCounts || {};
      let finalPriceChanges = data.priceChanges || { increases: 0, decreases: 0 };
      if (isTMK(input) && fetchedListings.length !== (data.listings || []).length) {
        finalCounts = {};
        let inc = 0, dec = 0;
        for (const l of fetchedListings) {
          const s = l.status || "Unknown";
          finalCounts[s] = (finalCounts[s] || 0) + 1;
          if (l.isNew) finalCounts["New"] = (finalCounts["New"] || 0) + 1;
          if (l.isBackOnMarket) finalCounts["Back On Market"] = (finalCounts["Back On Market"] || 0) + 1;
          if (l.isPriceIncrease) { finalCounts["Price Increase"] = (finalCounts["Price Increase"] || 0) + 1; inc++; }
          if (l.isPriceDecrease) { finalCounts["Price Decrease"] = (finalCounts["Price Decrease"] || 0) + 1; dec++; }
        }
        finalPriceChanges = { increases: inc, decreases: dec };
      }
      setListings(fetchedListings);
      setStatusCounts(finalCounts);
      setPriceChanges(finalPriceChanges);
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
    if (l.isBackOnMarket && activeStatuses.has("Back On Market")) return true;
    if (l.isPriceIncrease && activeStatuses.has("Price Increase")) return true;
    if (l.isPriceDecrease && activeStatuses.has("Price Decrease")) return true;
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
            <option value="24hours">Last 24 Hours</option>
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

        {/* Google Map / Hot Sheet */}
        {filteredListings.length > 0 && (
          <>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
              Showing {filteredListings.length} of {listings.length} listings
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setViewMode("map")} style={{ padding: "6px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", background: viewMode === "map" ? "#1e40af" : "#e5e7eb", color: viewMode === "map" ? "#fff" : "#374151" }}>Map</button>
              <button onClick={() => setViewMode("hotsheet")} style={{ padding: "6px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", background: viewMode === "hotsheet" ? "#1e40af" : "#e5e7eb", color: viewMode === "hotsheet" ? "#fff" : "#374151" }}>Hot Sheet</button>
            </div>

            {viewMode === "map" && MAPS_API_KEY && (
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
                      const markerColor = listing.isBackOnMarket ? "#10b981" : isNew ? "#f97316" : colors.fill;
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
                    {/* TMK Boundary Overlay */}
                    {tmkBoundary && <TmkBoundaryOverlay geojson={tmkBoundary} />}
                  </Map>
                </div>
              </APIProvider>
            )}

            {viewMode === "hotsheet" && (() => {
              const handleSort = (field: string) => {
                if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
                else { setSortField(field); setSortDir(field === "listPrice" ? "desc" : "asc"); }
              };
              const arrow = (field: string) => sortField === field ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "";
              const sorted = [...filteredListings].sort((a, b) => {
                const av = (a as any)[sortField] ?? "";
                const bv = (b as any)[sortField] ?? "";
                const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
                return sortDir === "asc" ? cmp : -cmp;
              });
              const thStyle: React.CSSProperties = { position: "sticky", top: 0, background: "#f9fafb", padding: "8px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", cursor: "pointer", whiteSpace: "nowrap", borderBottom: "2px solid #e5e7eb", textAlign: "left", userSelect: "none" };
              const tdStyle: React.CSSProperties = { padding: "6px 10px", fontSize: 13, borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap" };
              const getStatusLabel = (l: Listing) => {
                if (l.isNew) return "NEW";
                if (l.isBackOnMarket) return "BOM";
                return (STATUS_COLORS[l.status] || { label: l.status }).label;
              };
              const getStatusColor = (l: Listing) => {
                if (l.isNew) return STATUS_COLORS.New.fill;
                if (l.isBackOnMarket) return STATUS_COLORS["Back On Market"].fill;
                return (STATUS_COLORS[l.status] || STATUS_COLORS.Active).fill;
              };
              const fmtDate = (d?: string) => { if (!d) return ""; const dt = new Date(d); return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`; };

              return (
                <div style={{ height: "calc(100vh - 280px)", minHeight: 400, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 12 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle} onClick={() => handleSort("status")}>Status{arrow("status")}</th>
                        <th style={thStyle} onClick={() => handleSort("parcelNumber")}>TMK{arrow("parcelNumber")}</th>
                        <th style={thStyle} onClick={() => handleSort("listingId")}>MLS #{arrow("listingId")}</th>
                        <th style={thStyle} onClick={() => handleSort("propertySubType")}>Type{arrow("propertySubType")}</th>
                        <th style={thStyle} onClick={() => handleSort("address")}>Address{arrow("address")}</th>
                        <th style={{ ...thStyle, textAlign: "right" }} onClick={() => handleSort("listPrice")}>Price{arrow("listPrice")}</th>
                        <th style={thStyle} onClick={() => handleSort("beds")}>Beds{arrow("beds")}</th>
                        <th style={thStyle} onClick={() => handleSort("baths")}>Baths{arrow("baths")}</th>
                        <th style={thStyle} onClick={() => handleSort("sqft")}>Sqft{arrow("sqft")}</th>
                        <th style={thStyle} onClick={() => handleSort("lotSize")}>Lot{arrow("lotSize")}</th>
                        <th style={thStyle} onClick={() => handleSort("daysOnMarket")}>DOM{arrow("daysOnMarket")}</th>
                        <th style={thStyle} onClick={() => handleSort("yearBuilt")}>Year{arrow("yearBuilt")}</th>
                        <th style={thStyle} onClick={() => handleSort("modifiedAt")}>Date{arrow("modifiedAt")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((l, i) => (
                        <tr key={l.listingKey} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f9fafb" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#eff6ff"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = i % 2 === 0 ? "#fff" : "#f9fafb"; }}>
                          <td style={tdStyle}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: getStatusColor(l), marginRight: 6, verticalAlign: "middle" }} />{getStatusLabel(l)}</td>
                          <td style={tdStyle}>{l.parcelNumber || "-"}</td>
                          <td style={{ ...tdStyle, color: "#2563eb", cursor: "pointer" }} onClick={() => setDetailListing(l)}>{l.listingId}</td>
                          <td style={tdStyle}>{PROP_TYPE_ABBR[l.propertySubType || ""] || l.propertySubType || "-"}</td>
                          <td style={{ ...tdStyle, color: "#2563eb", cursor: "pointer", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }} onClick={() => setDetailListing(l)}>{l.address}</td>
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{formatCurrency(l.listPrice)}</td>
                          <td style={tdStyle}>{l.beds ?? "-"}</td>
                          <td style={tdStyle}>{l.baths ?? "-"}</td>
                          <td style={tdStyle}>{l.sqft ? l.sqft.toLocaleString() : "-"}</td>
                          <td style={tdStyle}>{l.lotSize ? l.lotSize.toLocaleString() : "-"}</td>
                          <td style={tdStyle}>{l.daysOnMarket ?? "-"}</td>
                          <td style={tdStyle}>{l.yearBuilt ?? "-"}</td>
                          <td style={tdStyle}>{fmtDate(l.modifiedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Property Detail Modal */}
      {detailListing && (() => {
        // For condos, Trestle ParcelNumber may lack the unit suffix entirely
        // (e.g., "1-4-2-002-016") or have zeros (e.g., "1-4-2-002-016-0000").
        // Extract the unit from the address and append/replace so OWNINFO returns
        // the specific unit owner instead of all owners in the building.
        let apn = detailListing.parcelNumber || "";
        if (apn && detailListing.propertySubType?.toLowerCase()?.includes("condo") || detailListing.propertySubType?.toLowerCase()?.includes("townhouse")) {
          const addrParts = (detailListing.address || "").split(",")[0].trim().split(/\s+/);
          const lastPart = addrParts[addrParts.length - 1];
          if (lastPart && /^[\dA-Z][\dA-Z-]*$/i.test(lastPart) && addrParts.length > 2) {
            const unitNum = lastPart.replace(/-/g, "").padStart(4, "0");
            const parts = apn.split("-");
            if (parts.length === 6) {
              // Has unit suffix -- replace it
              parts[5] = unitNum;
              apn = parts.join("-");
            } else if (parts.length === 5) {
              // No unit suffix -- append it
              apn = `${apn}-${unitNum}`;
            }
          }
        }
        return (
        <PropertyDetailModal
          property={{
            identifier: { apn },
            address: {
              oneLine: [
                detailListing.address,
                detailListing.city && !detailListing.address?.includes(detailListing.city) ? detailListing.city : null,
                `${detailListing.state || "HI"} ${detailListing.postalCode || postalCode || ""}`.trim(),
              ].filter(Boolean).join(", "),
              line1: detailListing.address?.split(",")[0]?.trim(),
              locality: detailListing.city || detailListing.address?.split(",")[1]?.trim(),
              countrySubd: detailListing.state || "HI",
              postal1: detailListing.postalCode || postalCode || detailListing.address?.match(/\d{5}/)?.[0],
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
            lot: { lotSize1: detailListing.lotSize },
            summary: { propType: detailListing.propertyType, propSubType: detailListing.propertySubType, yearBuilt: detailListing.yearBuilt },
            mlsNumber: detailListing.listingId,
            listingStatus: detailListing.status,
            daysOnMarket: detailListing.daysOnMarket,
          } as any}
          onClose={() => setDetailListing(null)}
          mlsListPrice={detailListing.listPrice}
          mlsAddress={detailListing.address}
          mlsPhotos={detailListing.photoUrl ? [detailListing.photoUrl] : undefined}
        />
        );
      })()}
    </div>
  );
}

// ── Point-in-Polygon helpers (ray casting algorithm) ──

/** Extract all polygon rings from a GeoJSON FeatureCollection.
 *  Returns arrays of [lng, lat] pairs (GeoJSON coordinate order). */
function extractPolygons(geojson: any): number[][][] {
  const polygons: number[][][] = [];
  for (const feature of geojson.features || []) {
    const geom = feature.geometry;
    if (!geom) continue;
    if (geom.type === "Polygon") {
      polygons.push(geom.coordinates[0]); // [lng, lat] pairs
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) {
        polygons.push(poly[0]); // outer ring of each polygon
      }
    }
  }
  return polygons;
}

/** Ray casting point-in-polygon test.
 *  Point is [lat, lng], polygon is array of [lng, lat] (GeoJSON order). */
function pointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]; // [lng, lat]
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ── TMK Boundary Polygon Overlay ──
function TmkBoundaryOverlay({ geojson }: { geojson: any }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !geojson?.features?.length) return;

    const polygons: google.maps.Polygon[] = [];

    for (const feature of geojson.features) {
      const geom = feature.geometry;
      if (!geom) continue;

      const paths: google.maps.LatLng[][] = [];

      if (geom.type === "Polygon") {
        for (const ring of geom.coordinates) {
          paths.push(ring.map((c: number[]) => new google.maps.LatLng(c[1], c[0])));
        }
      } else if (geom.type === "MultiPolygon") {
        for (const polygon of geom.coordinates) {
          for (const ring of polygon) {
            paths.push(ring.map((c: number[]) => new google.maps.LatLng(c[1], c[0])));
          }
        }
      }

      if (paths.length > 0) {
        const poly = new google.maps.Polygon({
          paths,
          strokeColor: "#1e40af",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#3b82f6",
          fillOpacity: 0.1,
          map,
        });
        polygons.push(poly);
      }
    }

    // Fit map to TMK boundary
    if (polygons.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      for (const poly of polygons) {
        poly.getPath().forEach((latlng) => bounds.extend(latlng));
      }
      map.fitBounds(bounds, 50);
    }

    return () => {
      for (const poly of polygons) poly.setMap(null);
    };
  }, [map, geojson]);

  return null;
}
