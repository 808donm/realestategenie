"use client";

import { useState, useCallback } from "react";

interface DomResult {
  listingKey?: string;
  mlsNumber?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  listPrice?: number;
  originalListPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  daysOnMarket: number;
  cumulativeDaysOnMarket?: number;
  listedDate?: string;
  avgDomForType: number;
  domRatio: number;
  tier: "red" | "orange" | "charcoal";
  listingAgentName?: string;
  listingAgentPhone?: string;
  listingAgentEmail?: string;
  listingOfficeName?: string;
  dataSource: "mls" | "rentcast";
}

interface SearchResult {
  results: DomResult[];
  marketStats: Record<string, Record<string, { avgDom: number; count: number }>>;
  dataSource: string;
  summary: { red: number; orange: number; charcoal: number };
  total: number;
}

const fmt = (n?: number) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
};

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  red: { bg: "#fef2f2", border: "#dc2626", text: "#991b1b", label: "Likely Target" },
  orange: { bg: "#fff7ed", border: "#ea580c", text: "#9a3412", label: "Possible Target" },
  charcoal: { bg: "#f9fafb", border: "#4b5563", text: "#1f2937", label: "Monitor" },
};

export function DomProspectingClient() {
  const [zipCodes, setZipCodes] = useState("96815,96816,96817");
  const [redMult, setRedMult] = useState("2.0");
  const [orangeMult, setOrangeMult] = useState("1.5");
  const [charcoalMult, setCharcoalMult] = useState("1.15");
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    const zips = zipCodes.split(",").map(z => z.trim()).filter(Boolean);
    if (!zips.length) {
      setError("Enter at least one zip code");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: any = {
        zipCodes: zips,
        redMultiplier: parseFloat(redMult) || 2.0,
        orangeMultiplier: parseFloat(orangeMult) || 1.5,
        charcoalMultiplier: parseFloat(charcoalMult) || 1.15,
      };

      if (propertyTypes.length) body.propertyTypes = propertyTypes;
      if (minPrice) body.minPrice = parseFloat(minPrice);
      if (maxPrice) body.maxPrice = parseFloat(maxPrice);

      const res = await fetch("/api/dom-prospecting/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }, [zipCodes, redMult, orangeMult, charcoalMult, propertyTypes, minPrice, maxPrice]);

  const saveSearch = useCallback(async () => {
    const zips = zipCodes.split(",").map(z => z.trim()).filter(Boolean);
    if (!zips.length) return;

    setSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch("/api/dom-prospecting/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `DOM Search: ${zips.join(", ")}`,
          zipCodes: zips,
          redMultiplier: parseFloat(redMult) || 2.0,
          orangeMultiplier: parseFloat(orangeMult) || 1.5,
          charcoalMultiplier: parseFloat(charcoalMult) || 1.15,
          propertyTypes: propertyTypes.length ? propertyTypes : undefined,
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        }),
      });

      const data = await res.json();
      if (data.search) {
        setSaveMsg("Saved! Weekly refresh enabled.");
      } else {
        setSaveMsg("Failed to save: " + (data.error || "Unknown error"));
      }
    } catch {
      setSaveMsg("Failed to save search");
    } finally {
      setSaving(false);
    }
  }, [zipCodes, redMult, orangeMult, charcoalMult, propertyTypes, minPrice, maxPrice]);

  const filteredResults = result?.results.filter(
    r => tierFilter === "all" || r.tier === tierFilter
  ) || [];

  const propTypeOptions = ["Single Family", "Condo", "Townhouse", "Multi-Family"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Search Controls */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Zip Codes</label>
            <input
              value={zipCodes}
              onChange={e => setZipCodes(e.target.value)}
              placeholder="96815, 96816, 96817"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Property Types</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {propTypeOptions.map(t => (
                <button
                  key={t}
                  onClick={() => setPropertyTypes(prev =>
                    prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
                  )}
                  style={{
                    padding: "4px 8px", fontSize: 11, borderRadius: 4,
                    border: "1px solid #d1d5db", cursor: "pointer",
                    background: propertyTypes.includes(t) ? "#1e40af" : "#fff",
                    color: propertyTypes.includes(t) ? "#fff" : "#374151",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Price Range</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                placeholder="Min"
                style={{ width: "50%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
              />
              <span style={{ color: "#9ca3af" }}>–</span>
              <input
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                placeholder="Max"
                style={{ width: "50%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>DOM Thresholds (× Avg)</label>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>Red</div>
                <input
                  value={redMult}
                  onChange={e => setRedMult(e.target.value)}
                  style={{ width: "100%", padding: "4px 6px", border: "1px solid #fca5a5", borderRadius: 4, fontSize: 12, textAlign: "center" }}
                />
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#ea580c", fontWeight: 600 }}>Orange</div>
                <input
                  value={orangeMult}
                  onChange={e => setOrangeMult(e.target.value)}
                  style={{ width: "100%", padding: "4px 6px", border: "1px solid #fdba74", borderRadius: 4, fontSize: 12, textAlign: "center" }}
                />
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 600 }}>Charcoal</div>
                <input
                  value={charcoalMult}
                  onChange={e => setCharcoalMult(e.target.value)}
                  style={{ width: "100%", padding: "4px 6px", border: "1px solid #9ca3af", borderRadius: 4, fontSize: 12, textAlign: "center" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
          <button
            onClick={runSearch}
            disabled={loading}
            style={{
              padding: "8px 20px", background: loading ? "#9ca3af" : "#1e40af", color: "#fff",
              borderRadius: 6, fontWeight: 600, fontSize: 13, border: "none", cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Searching..." : "Search DOM Prospects"}
          </button>
          <button
            onClick={saveSearch}
            disabled={saving}
            style={{
              padding: "8px 16px", background: "#fff", color: "#1e40af", border: "1px solid #1e40af",
              borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            {saving ? "Saving..." : "Save Weekly Search"}
          </button>
          {saveMsg && <span style={{ fontSize: 12, color: saveMsg.includes("Saved") ? "#059669" : "#dc2626" }}>{saveMsg}</span>}
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#991b1b", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            {(["red", "orange", "charcoal"] as const).map(tier => {
              const t = TIER_COLORS[tier];
              const count = result.summary[tier];
              return (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tierFilter === tier ? "all" : tier)}
                  style={{
                    padding: "14px 16px", background: tierFilter === tier ? t.bg : "#fff",
                    border: `2px solid ${tierFilter === tier ? t.border : "#e5e7eb"}`,
                    borderRadius: 10, cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 800, color: t.border }}>{count}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{tier === "red" ? `≥${redMult}× avg DOM` : tier === "orange" ? `≥${orangeMult}× avg DOM` : `≥${charcoalMult}× avg DOM`}</div>
                </button>
              );
            })}
            <div style={{ padding: "14px 16px", background: "#f0f9ff", border: "2px solid #3b82f6", borderRadius: 10 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1e40af" }}>{result.total}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1e3a5f" }}>Total Prospects</div>
              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Source: {result.dataSource}</div>
            </div>
          </div>

          {/* Market Stats Summary */}
          {Object.keys(result.marketStats).length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Average DOM by Property Type & Zip</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ textAlign: "left", padding: "4px 8px", color: "#6b7280", fontWeight: 600 }}>Zip</th>
                      <th style={{ textAlign: "left", padding: "4px 8px", color: "#6b7280", fontWeight: 600 }}>Property Type</th>
                      <th style={{ textAlign: "right", padding: "4px 8px", color: "#6b7280", fontWeight: 600 }}>Avg DOM</th>
                      <th style={{ textAlign: "right", padding: "4px 8px", color: "#6b7280", fontWeight: 600 }}>Listings</th>
                      <th style={{ textAlign: "right", padding: "4px 8px", color: "#dc2626", fontWeight: 600 }}>Red ≥</th>
                      <th style={{ textAlign: "right", padding: "4px 8px", color: "#ea580c", fontWeight: 600 }}>Orange ≥</th>
                      <th style={{ textAlign: "right", padding: "4px 8px", color: "#4b5563", fontWeight: 600 }}>Charcoal ≥</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.marketStats).map(([zip, types]) =>
                      Object.entries(types).map(([type, stats], i) => (
                        <tr key={`${zip}-${type}`} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                          <td style={{ padding: "4px 8px", fontWeight: 500 }}>{zip}</td>
                          <td style={{ padding: "4px 8px" }}>{type}</td>
                          <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 600 }}>{stats.avgDom}</td>
                          <td style={{ padding: "4px 8px", textAlign: "right" }}>{stats.count}</td>
                          <td style={{ padding: "4px 8px", textAlign: "right", color: "#dc2626" }}>{Math.round(stats.avgDom * (parseFloat(redMult) || 2))}</td>
                          <td style={{ padding: "4px 8px", textAlign: "right", color: "#ea580c" }}>{Math.round(stats.avgDom * (parseFloat(orangeMult) || 1.5))}</td>
                          <td style={{ padding: "4px 8px", textAlign: "right", color: "#4b5563" }}>{Math.round(stats.avgDom * (parseFloat(charcoalMult) || 1.15))}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Results List */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
              {tierFilter === "all" ? "All Prospects" : `${TIER_COLORS[tierFilter].label} Prospects`}
              <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 8 }}>({filteredResults.length})</span>
            </h3>

            {filteredResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: 20, color: "#9ca3af" }}>
                No prospects found matching the current filters.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredResults.map((r, i) => {
                  const tc = TIER_COLORS[r.tier];
                  return (
                    <div
                      key={r.listingKey || i}
                      style={{
                        padding: "12px 14px", borderRadius: 8,
                        border: `2px solid ${tc.border}`,
                        background: tc.bg,
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: tc.text }}>{r.address}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                          {r.city}, {r.state} {r.zipCode}
                          {r.mlsNumber && <span style={{ marginLeft: 8 }}>MLS# {r.mlsNumber}</span>}
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12 }}>{r.propertyType}</span>
                          {r.beds != null && <span style={{ fontSize: 12 }}>{r.beds} bd</span>}
                          {r.baths != null && <span style={{ fontSize: 12 }}>{r.baths} ba</span>}
                          {r.sqft != null && <span style={{ fontSize: 12 }}>{r.sqft.toLocaleString()} sqft</span>}
                          {r.listPrice != null && <span style={{ fontSize: 12, fontWeight: 600, color: "#059669" }}>{fmt(r.listPrice)}</span>}
                        </div>
                        {r.listingAgentName && (
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                            Agent: {r.listingAgentName}
                            {r.listingOfficeName && ` | ${r.listingOfficeName}`}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", minWidth: 100 }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: tc.border }}>{r.daysOnMarket}</div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>DOM</div>
                        <div style={{ fontSize: 11, color: tc.text, fontWeight: 600, marginTop: 4 }}>
                          {r.domRatio}× avg ({r.avgDomForType}d)
                        </div>
                        <div style={{
                          marginTop: 4, padding: "2px 8px", borderRadius: 4,
                          background: tc.border, color: "#fff", fontSize: 10, fontWeight: 700,
                          display: "inline-block",
                        }}>
                          {tc.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
