"use client";

import { useState } from "react";
import PropertyDetailModal from "./property-detail-modal.client";

interface AttomProperty {
  identifier?: { Id?: number; fips?: string; apn?: string; attomId?: number };
  address?: { oneLine?: string; line1?: string; line2?: string; locality?: string; countrySubd?: string; postal1?: string };
  location?: { latitude?: string; longitude?: string };
  summary?: { propType?: string; propertyType?: string; propSubType?: string; yearBuilt?: number; propLandUse?: string; absenteeInd?: string };
  building?: {
    size?: { bldgSize?: number; livingSize?: number; universalSize?: number };
    rooms?: { beds?: number; bathsFull?: number; bathsHalf?: number; bathsTotal?: number; roomsTotal?: number };
    summary?: { yearBuilt?: number; levels?: number; bldgType?: string; archStyle?: string; quality?: string; storyDesc?: string; unitsCount?: string };
    construction?: { condition?: string; constructionType?: string; roofCover?: string; wallType?: string };
    interior?: { bsmtSize?: number; bsmtType?: string; fplcCount?: number };
    parking?: { garageType?: string; prkgSize?: number; prkgSpaces?: string };
  };
  lot?: { lotSize1?: number; lotSize2?: number; poolInd?: string; siteZoningIdent?: string };
  owner?: {
    owner1?: { fullName?: string }; owner2?: { fullName?: string };
    absenteeOwnerStatus?: string; mailingAddressOneLine?: string; ownerOccupied?: string;
  };
  assessment?: {
    appraised?: { apprTtlValue?: number };
    assessed?: { assdTtlValue?: number; assdImprValue?: number; assdLandValue?: number };
    market?: { mktTtlValue?: number };
    tax?: { taxAmt?: number; taxYear?: number };
  };
  sale?: { amount?: { saleAmt?: number; saleTransDate?: string; saleRecDate?: string; saleDocType?: string } };
  avm?: { amount?: { value?: number; high?: number; low?: number; scr?: number }; eventDate?: string };
  mortgage?: { amount?: number; lender?: { fullName?: string }; term?: string; date?: string };
  foreclosure?: { actionType?: string; filingDate?: string; auctionDate?: string; defaultAmount?: number };
  utilities?: { coolingType?: string; heatingType?: string; sewerType?: string; waterType?: string };
}

const PROPERTY_TYPES = [
  { value: "", label: "All Types" },
  { value: "SFR", label: "Single Family" },
  { value: "CONDO", label: "Condo" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "MOBILE", label: "Mobile Home" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "LAND", label: "Land" },
];

export default function PropertySearch() {
  const [searchMode, setSearchMode] = useState<"address" | "zip">("address");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [minBaths, setMinBaths] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [results, setResults] = useState<AttomProperty[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [selectedProperty, setSelectedProperty] = useState<AttomProperty | null>(null);

  const handleSearch = async (pageNum = 1) => {
    if (searchMode === "address" && !address.trim()) {
      setError("Enter an address to search.");
      return;
    }
    if (searchMode === "zip" && !zip.trim()) {
      setError("Enter a zip code to search.");
      return;
    }

    setIsLoading(true);
    setError("");
    setPage(pageNum);

    try {
      const params = new URLSearchParams();
      params.set("endpoint", "expanded");
      params.set("page", String(pageNum));
      params.set("pagesize", String(pageSize));

      if (searchMode === "address") {
        params.set("address", address.trim());
      } else {
        params.set("postalcode", zip.trim());
      }

      if (propertyType) params.set("propertytype", propertyType);
      if (minBeds) params.set("minBeds", minBeds);
      if (minBaths) params.set("minBaths", minBaths);

      const res = await fetch(`/api/integrations/attom/property?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch property data");
      }

      const properties = data.property || [];
      setResults(properties);
      setTotalCount(data.status?.total || properties.length);
      setHasSearched(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fmt = (n?: number) => (n != null ? `$${n.toLocaleString()}` : "—");
  const fmtNum = (n?: number) => (n != null ? n.toLocaleString() : "—");

  const getAddress = (p: AttomProperty) =>
    p.address?.oneLine || [p.address?.line1, p.address?.line2].filter(Boolean).join(", ") || "Unknown";

  const getBedBath = (p: AttomProperty) => {
    const beds = p.building?.rooms?.beds;
    const baths = p.building?.rooms?.bathsFull ?? p.building?.rooms?.bathsTotal;
    const parts: string[] = [];
    if (beds != null) parts.push(`${beds} bed`);
    if (baths != null) parts.push(`${baths} bath`);
    return parts.join(" / ") || "—";
  };

  const getSqft = (p: AttomProperty) =>
    p.building?.size?.livingSize || p.building?.size?.universalSize || p.building?.size?.bldgSize;

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      {/* Search Bar */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        {/* Mode Toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setSearchMode("address")}
            style={{
              padding: "6px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "1px solid #e5e7eb", cursor: "pointer",
              background: searchMode === "address" ? "#3b82f6" : "#fff",
              color: searchMode === "address" ? "#fff" : "#374151",
            }}
          >
            By Address
          </button>
          <button
            onClick={() => setSearchMode("zip")}
            style={{
              padding: "6px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "1px solid #e5e7eb", cursor: "pointer",
              background: searchMode === "zip" ? "#3b82f6" : "#fff",
              color: searchMode === "zip" ? "#fff" : "#374151",
            }}
          >
            By Zip Code
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {searchMode === "address" ? (
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder='Enter address (e.g. "4529 Winona Court, Denver, CO")'
              onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
              style={{
                flex: 1, minWidth: 280, padding: "10px 14px", fontSize: 14, border: "1px solid #d1d5db",
                borderRadius: 8, outline: "none",
              }}
            />
          ) : (
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="Enter zip code (e.g. 80211)"
              onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
              style={{
                width: 200, padding: "10px 14px", fontSize: 14, border: "1px solid #d1d5db",
                borderRadius: 8, outline: "none",
              }}
            />
          )}
          <button
            onClick={() => handleSearch(1)}
            disabled={isLoading}
            style={{
              padding: "10px 24px", background: "#3b82f6", color: "#fff", borderRadius: 8, border: "none",
              fontWeight: 600, fontSize: 14, cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: "10px 16px", background: showFilters ? "#f3f4f6" : "#fff", border: "1px solid #d1d5db",
              borderRadius: 8, fontSize: 13, cursor: "pointer",
            }}
          >
            Filters {showFilters ? "▲" : "▼"}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              style={{ padding: "8px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6 }}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input
              type="number"
              value={minBeds}
              onChange={(e) => setMinBeds(e.target.value)}
              placeholder="Min Beds"
              style={{ width: 100, padding: "8px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6 }}
            />
            <input
              type="number"
              value={minBaths}
              onChange={(e) => setMinBaths(e.target.value)}
              placeholder="Min Baths"
              style={{ width: 100, padding: "8px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6 }}
            />
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: 12, background: "#fee2e2", color: "#dc2626", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Results */}
      {isLoading && (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Searching ATTOM records...</div>
      )}

      {!isLoading && hasSearched && results.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: 12 }}>
          No properties found. Try a different search.
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
            {totalCount.toLocaleString()} propert{totalCount === 1 ? "y" : "ies"} found
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {results.map((prop, idx) => {
              const avmVal = prop.avm?.amount?.value;
              const lastSale = prop.sale?.amount?.saleAmt;
              const assessed = prop.assessment?.assessed?.assdTtlValue;
              const owner = prop.owner?.owner1?.fullName;
              const absentee = prop.summary?.absenteeInd === "O" || prop.owner?.absenteeOwnerStatus === "Absentee";

              return (
                <div
                  key={prop.identifier?.attomId || idx}
                  onClick={() => setSelectedProperty(prop)}
                  style={{
                    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16,
                    cursor: "pointer", transition: "box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{getAddress(prop)}</div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        {getBedBath(prop)}
                        {getSqft(prop) ? ` · ${fmtNum(getSqft(prop))} sqft` : ""}
                        {prop.building?.summary?.yearBuilt ? ` · Built ${prop.building.summary.yearBuilt}` : ""}
                      </div>
                      {owner && (
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                          Owner: {owner}
                          {absentee && (
                            <span style={{ marginLeft: 6, padding: "1px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                              Absentee
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", textAlign: "right" }}>
                      {avmVal != null && (
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>AVM</div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#059669" }}>{fmt(avmVal)}</div>
                        </div>
                      )}
                      {lastSale != null && (
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Last Sale</div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{fmt(lastSale)}</div>
                        </div>
                      )}
                      {assessed != null && !avmVal && (
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Assessed</div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{fmt(assessed)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
              <button
                onClick={() => handleSearch(page - 1)}
                disabled={page <= 1 || isLoading}
                style={{
                  padding: "8px 16px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff",
                  cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1, fontSize: 13,
                }}
              >
                Previous
              </button>
              <span style={{ padding: "8px 12px", fontSize: 13, color: "#6b7280" }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handleSearch(page + 1)}
                disabled={page >= totalPages || isLoading}
                style={{
                  padding: "8px 16px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff",
                  cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1, fontSize: 13,
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {!hasSearched && !isLoading && (
        <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", background: "#f9fafb", borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#x1F3E0;</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Search 155M+ US Property Records</div>
          <div style={{ fontSize: 13 }}>
            Look up any property by address or browse by zip code. View ownership, valuations, tax assessments, sales history, and more.
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}
