"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STATUS_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
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
  ListingId: string;
  StandardStatus: string;
  ListPrice: number;
  ClosePrice?: number;
  UnparsedAddress?: string;
  City?: string;
  PostalCode?: string;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  LivingArea?: number;
  DaysOnMarket?: number;
  PropertySubType?: string;
  PropertyType?: string;
  PriceChangeAmount?: number;
  ListingContractDate?: string;
  CloseDate?: string;
  ModificationTimestamp?: string;
}

export default function MarketWatchClient() {
  const [postalCode, setPostalCode] = useState("");
  const [timeframe, setTimeframe] = useState<"today" | "7days" | "30days" | "90days">("30days");
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
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set(Object.keys(STATUS_COLORS)));

  const fetchMarketWatch = useCallback(async () => {
    if (!postalCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        postalCode: postalCode.trim(),
        timeframe,
        limit: "200",
      });
      if (propertyType) params.set("propertyType", propertyType);
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
  }, [postalCode, timeframe, propertyType]);

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

  const filteredListings = listings.filter((l) => activeStatuses.has(l.StandardStatus));

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
            Zip Code
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchMarketWatch()}
              placeholder="e.g. 96815"
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

      {/* Main Content - Card Grid */}
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

        {/* Card Grid */}
        {filteredListings.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {filteredListings.map((listing) => {
              const statusColor = STATUS_COLORS[listing.StandardStatus] || {
                fill: "#9ca3af",
                stroke: "#6b7280",
                label: listing.StandardStatus,
              };
              const price = listing.ClosePrice || listing.ListPrice;
              const shape = PROPERTY_TYPE_SHAPES[listing.PropertyType || ""] || "circle";

              return (
                <div
                  key={listing.ListingId}
                  onClick={() => setSelectedListing(selectedListing?.ListingId === listing.ListingId ? null : listing)}
                  style={{
                    border:
                      selectedListing?.ListingId === listing.ListingId
                        ? `2px solid ${statusColor.fill}`
                        : "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 16,
                    cursor: "pointer",
                    backgroundColor: selectedListing?.ListingId === listing.ListingId ? `${statusColor.fill}08` : "#fff",
                    transition: "all 0.15s",
                  }}
                >
                  {/* Status Badge + Property Type Shape */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#fff",
                        backgroundColor: statusColor.fill,
                      }}
                    >
                      {statusColor.label}
                    </span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }} title={listing.PropertySubType || listing.PropertyType}>
                      {shape === "circle" ? "\u25CF" : shape === "diamond" ? "\u25C6" : "\u25B2"}{" "}
                      {listing.PropertySubType || listing.PropertyType || ""}
                    </span>
                  </div>

                  {/* Price */}
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                    {formatCurrency(price)}
                    {listing.PriceChangeAmount && listing.PriceChangeAmount !== 0 && (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          marginLeft: 8,
                          color: listing.PriceChangeAmount > 0 ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {listing.PriceChangeAmount > 0 ? "\u2191" : "\u2193"} {formatCurrency(Math.abs(listing.PriceChangeAmount))}
                      </span>
                    )}
                  </div>

                  {/* Address */}
                  <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 8, lineHeight: 1.3 }}>
                    {listing.UnparsedAddress || "Address not available"}
                    {listing.City && `, ${listing.City}`}
                  </div>

                  {/* Details Row */}
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                    {listing.BedroomsTotal != null && <span>{listing.BedroomsTotal} bd</span>}
                    {listing.BathroomsTotalInteger != null && <span>{listing.BathroomsTotalInteger} ba</span>}
                    {listing.LivingArea != null && <span>{listing.LivingArea.toLocaleString()} sqft</span>}
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                      color: "#9ca3af",
                      borderTop: "1px solid #f3f4f6",
                      paddingTop: 8,
                    }}
                  >
                    <span>MLS# {listing.ListingId}</span>
                    {listing.DaysOnMarket != null && <span>{listing.DaysOnMarket} DOM</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
