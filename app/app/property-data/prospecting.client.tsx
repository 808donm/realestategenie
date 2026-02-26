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
    corporateIndicator?: string; absenteeOwnerStatus?: string; mailingAddressOneLine?: string; ownerOccupied?: string;
  };
  assessment?: {
    appraised?: { apprTtlValue?: number };
    assessed?: { assdTtlValue?: number; assdImprValue?: number; assdLandValue?: number };
    market?: { mktTtlValue?: number };
    tax?: { taxAmt?: number; taxYear?: number };
  };
  sale?: { amount?: { saleAmt?: number; saleTransDate?: string; saleRecDate?: string; saleDocType?: string; salePrice?: number } };
  avm?: { amount?: { value?: number; high?: number; low?: number; scr?: number }; eventDate?: string };
  mortgage?: { amount?: number; lender?: { fullName?: string }; term?: string; date?: string };
  foreclosure?: { actionType?: string; filingDate?: string; auctionDate?: string; defaultAmount?: number };
  utilities?: { coolingType?: string; heatingType?: string; sewerType?: string; waterType?: string };
}

type ProspectMode = "absentee" | "equity" | "sales";

const PROPERTY_TYPES = [
  { value: "SFR", label: "Single Family" },
  { value: "CONDO", label: "Condo" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "MOBILE", label: "Mobile Home" },
];

export default function Prospecting() {
  const [mode, setMode] = useState<ProspectMode>("absentee");
  const [zip, setZip] = useState("");
  const [propertyType, setPropertyType] = useState("SFR");

  // Equity-specific
  const [maxYearBuilt, setMaxYearBuilt] = useState("2005");
  const [minAvmValue, setMinAvmValue] = useState("");

  // Sales-specific
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [results, setResults] = useState<AttomProperty[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [selectedProperty, setSelectedProperty] = useState<AttomProperty | null>(null);

  const handleSearch = async (pageNum = 1) => {
    if (!zip.trim()) {
      setError("Enter a zip code.");
      return;
    }

    setIsLoading(true);
    setError("");
    setPage(pageNum);

    try {
      const params = new URLSearchParams();
      params.set("postalcode", zip.trim());
      params.set("propertytype", propertyType);
      params.set("page", String(pageNum));
      params.set("pagesize", String(pageSize));

      if (mode === "absentee" || mode === "equity") {
        params.set("endpoint", "expanded");
      }
      if (mode === "equity") {
        if (maxYearBuilt) params.set("maxYearBuilt", maxYearBuilt);
        if (minAvmValue) params.set("minavmvalue", minAvmValue);
      }
      if (mode === "sales") {
        params.set("endpoint", "sale");
        params.set("startSaleSearchDate", startDate);
        params.set("endSaleSearchDate", endDate);
      }

      const res = await fetch(`/api/integrations/attom/property?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch data");
      }

      let properties: AttomProperty[] = data.property || [];

      // Client-side filter for absentee owners
      if (mode === "absentee") {
        properties = properties.filter(
          (p) =>
            p.summary?.absenteeInd === "O" ||
            p.owner?.absenteeOwnerStatus === "Absentee" ||
            p.owner?.ownerOccupied === "N"
        );
      }

      setResults(properties);
      setTotalCount(mode === "absentee" ? properties.length : (data.status?.total || properties.length));
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

  const totalPages = Math.ceil(totalCount / pageSize);

  const modes: { id: ProspectMode; label: string; desc: string }[] = [
    { id: "absentee", label: "Absentee Owners", desc: "Find non-owner-occupied properties — great for investor outreach and listing leads." },
    { id: "equity", label: "High Equity", desc: "Find long-term owners sitting on equity — ideal for listing presentations." },
    { id: "sales", label: "Recent Sales", desc: "Find recent transactions in an area — useful for comps and market analysis." },
  ];

  return (
    <div>
      {/* Mode Selection */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setResults([]); setHasSearched(false); setError(""); }}
            style={{
              padding: 16, borderRadius: 10, border: mode === m.id ? "2px solid #3b82f6" : "1px solid #e5e7eb",
              background: mode === m.id ? "#eff6ff" : "#fff", cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: mode === m.id ? "#3b82f6" : "#374151", marginBottom: 4 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Search Form */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Zip Code</label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="e.g. 80211"
              onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
              style={{ width: 140, padding: "8px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6 }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Property Type</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              style={{ padding: "8px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6 }}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {mode === "equity" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Built Before</label>
                <input
                  type="number"
                  value={maxYearBuilt}
                  onChange={(e) => setMaxYearBuilt(e.target.value)}
                  placeholder="e.g. 2005"
                  style={{ width: 100, padding: "8px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Min AVM Value</label>
                <input
                  type="number"
                  value={minAvmValue}
                  onChange={(e) => setMinAvmValue(e.target.value)}
                  placeholder="e.g. 300000"
                  style={{ width: 140, padding: "8px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
            </>
          )}

          {mode === "sales" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ padding: "8px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ padding: "8px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
            </>
          )}

          <button
            onClick={() => handleSearch(1)}
            disabled={isLoading}
            style={{
              padding: "8px 24px", background: "#3b82f6", color: "#fff", borderRadius: 8, border: "none",
              fontWeight: 600, fontSize: 14, cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.7 : 1, height: 38,
            }}
          >
            {isLoading ? "Searching..." : "Find Properties"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: "#fee2e2", color: "#dc2626", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {isLoading && (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Searching ATTOM records...</div>
      )}

      {!isLoading && hasSearched && results.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: 12 }}>
          No properties found. Try adjusting your filters.
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
              const lastSale = prop.sale?.amount?.saleAmt || prop.sale?.amount?.salePrice;
              const owner = prop.owner?.owner1?.fullName;
              const absentee = prop.summary?.absenteeInd === "O" || prop.owner?.absenteeOwnerStatus === "Absentee";
              const equity = avmVal && lastSale ? avmVal - lastSale : null;
              const sqft = prop.building?.size?.livingSize || prop.building?.size?.universalSize || prop.building?.size?.bldgSize;
              const beds = prop.building?.rooms?.beds;
              const baths = prop.building?.rooms?.bathsFull ?? prop.building?.rooms?.bathsTotal;

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
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{getAddress(prop)}</div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        {[
                          beds != null ? `${beds} bed` : null,
                          baths != null ? `${baths} bath` : null,
                          sqft ? `${fmtNum(sqft)} sqft` : null,
                          prop.building?.summary?.yearBuilt ? `Built ${prop.building.summary.yearBuilt}` : null,
                        ].filter(Boolean).join(" · ")}
                      </div>
                      {owner && (
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                          Owner: {owner}
                          {absentee && (
                            <span style={{ marginLeft: 6, padding: "1px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                              Absentee
                            </span>
                          )}
                          {prop.owner?.mailingAddressOneLine && (
                            <span style={{ marginLeft: 6, fontSize: 12, color: "#9ca3af" }}>
                              (Mail: {prop.owner.mailingAddressOneLine})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", textAlign: "right" }}>
                      {mode === "sales" && lastSale != null && (
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Sale Price</div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#3b82f6" }}>{fmt(lastSale)}</div>
                          {prop.sale?.amount?.saleTransDate && (
                            <div style={{ fontSize: 11, color: "#9ca3af" }}>{prop.sale.amount.saleTransDate}</div>
                          )}
                        </div>
                      )}
                      {mode !== "sales" && avmVal != null && (
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>AVM</div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#059669" }}>{fmt(avmVal)}</div>
                        </div>
                      )}
                      {mode === "equity" && equity != null && (
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Est. Equity</div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: equity > 0 ? "#a16207" : "#dc2626" }}>
                            {equity > 0 ? "+" : ""}{fmt(equity)}
                          </div>
                        </div>
                      )}
                      {mode !== "sales" && lastSale != null && (
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Last Sale</div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{fmt(lastSale)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

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
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#x1F50D;</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {mode === "absentee" && "Find Absentee Owners"}
            {mode === "equity" && "Find High-Equity Properties"}
            {mode === "sales" && "Find Recent Sales"}
          </div>
          <div style={{ fontSize: 13 }}>
            {mode === "absentee" && "Search for non-owner-occupied properties by zip code. These owners may be motivated to sell."}
            {mode === "equity" && "Search for properties owned since before a certain year, likely with significant built-up equity."}
            {mode === "sales" && "Search for recent transactions in an area. Great for comps and market analysis."}
          </div>
        </div>
      )}

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}
