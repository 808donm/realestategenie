"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { OAHU_HISTORICAL_DATA } from "@/lib/data/oahu-historical-sales";
import {
  ValueCard,
  ReportSection,
  ComparisonTable,
  HorizontalBarChart,
  REPORT_COLORS,
  fmt$,
} from "@/components/reports/report-components";

interface ZipStat {
  zipCode: string;
  city?: string;
  medianPrice?: number;
  avgPrice?: number;
  medianPricePerSqft?: number;
  totalListings?: number;
  medianDOM?: number;
  medianRent?: number;
}

interface MarketData {
  overview: {
    county: string;
    state: string;
    medianSalePrice: number | null;
    avgSalePrice: number | null;
    medianPricePerSqft: number | null;
    avgPricePerSqft: number | null;
    medianDOM: number | null;
    totalListings: number;
    medianRent: number | null;
    zipCodesTracked: number;
  };
  zipTable: ZipStat[];
  mlsStats?: {
    activeListings: number | null;
    closedLast30Days: number | null;
  };
  hudRents?: Record<string, any>;
  generatedAt: string;
  cacheHit?: boolean;
}

const COUNTIES = ["honolulu", "maui", "hawaii", "kauai"];
const COUNTY_LABELS: Record<string, string> = { honolulu: "Honolulu (Oahu)", maui: "Maui County", hawaii: "Hawaii County", kauai: "Kauai County" };

interface NeighborhoodStats {
  subdivision: string;
  sales: number;
  stats: any;
  monthly: any[];
  propertyTypes: Record<string, number>;
  dateRange: { from: string; to: string };
}

export default function MarketAnalyticsDashboard() {
  const [county, setCounty] = useState("honolulu");
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [zipData, setZipData] = useState<MarketData | null>(null);
  const [zipLoading, setZipLoading] = useState(false);

  // Neighborhood search
  const [neighborhoodQuery, setNeighborhoodQuery] = useState("");
  const [neighborhoodData, setNeighborhoodData] = useState<NeighborhoodStats | null>(null);
  const [neighborhoodLoading, setNeighborhoodLoading] = useState(false);

  // Fetch county-level data
  useEffect(() => {
    setLoading(true);
    setData(null);
    setSelectedZip(null);
    setZipData(null);
    fetch(`/api/reports/market-analytics?county=${county}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [county]);

  // Neighborhood search handler
  const searchNeighborhood = async () => {
    if (!neighborhoodQuery.trim()) return;
    setNeighborhoodLoading(true);
    setNeighborhoodData(null);
    try {
      const res = await fetch(`/api/mls/neighborhood-stats?subdivision=${encodeURIComponent(neighborhoodQuery.trim())}&months=12`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setNeighborhoodData(d);
    } catch (e: any) {
      setError(e.message);
    }
    setNeighborhoodLoading(false);
  };

  // Fetch zip-level data when a zip is selected
  const handleZipClick = async (zip: string) => {
    if (selectedZip === zip) {
      setSelectedZip(null);
      setZipData(null);
      return;
    }
    setSelectedZip(zip);
    setZipLoading(true);
    try {
      const res = await fetch(`/api/reports/market-analytics?county=${county}&zipCode=${zip}`);
      const d = await res.json();
      if (!d.error) setZipData(d);
    } catch { /* ignore */ }
    finally { setZipLoading(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading market analytics for Honolulu County...</div>;
  if (error) return <div style={{ padding: 20, background: "#fef2f2", borderRadius: 8, color: "#dc2626" }}>{error}</div>;
  if (!data) return null;

  const o = data.overview;

  return (
    <div>
      {/* Search Controls */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>County</label>
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
          >
            {COUNTIES.map((c) => <option key={c} value={c}>{COUNTY_LABELS[c]}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Neighborhood / Subdivision</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={neighborhoodQuery}
              onChange={(e) => setNeighborhoodQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchNeighborhood()}
              placeholder="e.g. Kaimuki, Diamond Head, Hawaii Kai"
              style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
            />
            <button
              onClick={searchNeighborhood}
              disabled={neighborhoodLoading || !neighborhoodQuery.trim()}
              style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: "#059669", color: "#fff", fontWeight: 600,
                cursor: neighborhoodLoading ? "wait" : "pointer", fontSize: 14,
                opacity: neighborhoodLoading ? 0.6 : 1,
              }}
            >
              {neighborhoodLoading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>
      </div>

      {/* Neighborhood Stats */}
      {neighborhoodData && neighborhoodData.stats && (
        <div style={{ marginBottom: 24, padding: 20, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{neighborhoodData.subdivision}</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>{neighborhoodData.sales} closed sales | {neighborhoodData.dateRange.from} to {neighborhoodData.dateRange.to}</div>
            </div>
            <button onClick={() => setNeighborhoodData(null)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 12 }}>Close</button>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <ValueCard label="Median Price" value={fmt$(neighborhoodData.stats.medianPrice)!} />
            <ValueCard label="Avg Price" value={fmt$(neighborhoodData.stats.avgPrice)!} />
            <ValueCard label="Price/SqFt" value={`$${neighborhoodData.stats.medianPricePerSqft}`} />
            <ValueCard label="Median DOM" value={`${neighborhoodData.stats.medianDOM} days`} />
            <ValueCard label="List-to-Sale" value={neighborhoodData.stats.listToSaleRatio ? `${neighborhoodData.stats.listToSaleRatio}%` : "N/A"} />
            <ValueCard label="Total Sales" value={`${neighborhoodData.sales}`} />
          </div>
          {neighborhoodData.monthly.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 10, padding: 16, border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Monthly Sales Trend</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={neighborhoodData.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="price" orientation="left" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <YAxis yAxisId="sales" orientation="right" />
                  <Tooltip formatter={(v: any, name: string) => name === "Avg Price" ? `$${Number(v).toLocaleString()}` : v} />
                  <Legend />
                  <Bar yAxisId="sales" dataKey="sales" fill="#059669" name="Sales" />
                  <Line yAxisId="price" type="monotone" dataKey="avgPrice" stroke="#2563eb" name="Avg Price" strokeWidth={2} dot={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {neighborhoodData && !neighborhoodData.stats && (
        <div style={{ marginBottom: 24, padding: 16, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, color: "#92400e", fontSize: 14 }}>
          No closed sales found for "{neighborhoodData.subdivision}" in the last 12 months.
        </div>
      )}

      {/* County Header */}
      <div style={{ marginBottom: 24, padding: "16px 20px", background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)", borderRadius: 12, color: "#fff" }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, opacity: 0.7 }}>Market Analytics</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{o.county} County, {o.state}</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
          {o.zipCodesTracked} zip codes tracked | Updated {new Date(data.generatedAt).toLocaleDateString()}
          {data.cacheHit && " (cached)"}
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {o.medianSalePrice != null && (
          <ValueCard label="Median Sale Price" value={fmt$(o.medianSalePrice)!} sub="All Property Types" />
        )}
        {(o as any).sfrMedianPrice != null && (
          <ValueCard label="SFR Median" value={fmt$((o as any).sfrMedianPrice)!} sub="Single Family" color="#ecfdf5" />
        )}
        {(o as any).condoMedianPrice != null && (
          <ValueCard label="Condo/TH Median" value={fmt$((o as any).condoMedianPrice)!} sub="Condo & Townhouse" color="#eff6ff" />
        )}
        {o.medianPricePerSqft != null && (
          <ValueCard label="Price per Sq Ft" value={`$${o.medianPricePerSqft}`} />
        )}
        {o.medianDOM != null && (
          <ValueCard label="Median DOM" value={`${o.medianDOM} days`} />
        )}
        <ValueCard label="Total Listings" value={o.totalListings.toLocaleString()} />
        {o.medianRent != null && (
          <ValueCard label="Median Rent" value={`${fmt$(o.medianRent)}/mo`} color="#f5f3ff" />
        )}
      </div>
      {/* Row 2: YoY, Momentum, MLS Stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {(o as any).yoyPriceChange != null && (
          <ValueCard
            label="YoY Price Change"
            value={`${(o as any).yoyPriceChange > 0 ? "+" : ""}${(o as any).yoyPriceChange}%`}
            sub="vs. prior year"
            color={(o as any).yoyPriceChange >= 0 ? "#ecfdf5" : "#fef2f2"}
          />
        )}
        {(o as any).salesMomentum != null && (
          <ValueCard
            label="Sales Momentum"
            value={`${(o as any).salesMomentum > 0 ? "+" : ""}${(o as any).salesMomentum}%`}
            sub="6mo vs prior 6mo"
            color={(o as any).salesMomentum >= 0 ? "#ecfdf5" : "#fef2f2"}
          />
        )}
        <ValueCard label="Total Listings" value={o.totalListings.toLocaleString()} />
        {data.mlsStats?.activeListings != null && (
          <ValueCard label="MLS Active" value={data.mlsStats.activeListings.toLocaleString()} sub="Honolulu" color="#ecfdf5" />
        )}
        {data.mlsStats?.closedLast30Days != null && (
          <ValueCard label="MLS Closed (30d)" value={data.mlsStats.closedLast30Days.toLocaleString()} color="#eff6ff" />
        )}
      </div>

      {/* Sales Volume by City (Recharts vertical bar chart) */}
      {(data as any).cityStats?.length > 0 && (
        <ReportSection title={`Sale Volume by Cities in ${o.county} County`}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={(data as any).cityStats} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="city" angle={-35} textAnchor="end" fontSize={11} interval={0} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(value: any) => Number(value).toLocaleString()} />
              <Bar dataKey="totalListings" fill="#3b82f6" name="Total Listings" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ReportSection>
      )}

      {/* HUD Fair Market Rents by Dwelling Size (Recharts vertical bar chart) */}
      {data.hudRents && Object.keys(data.hudRents).length > 0 && (
        <ReportSection title={`Fair Market Rents by Dwelling Size in ${o.county} County`}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>HUD Section 8 Values</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={Object.entries(data.hudRents).map(([key, val]) => ({ name: key, rent: val as number }))}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={11} tickFormatter={(v) => `$${v.toLocaleString()}`} />
              <Tooltip formatter={(value: any) => `$${Number(value).toLocaleString()}`} />
              <Bar dataKey="rent" name="Fair Market Rent" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ReportSection>
      )}

      {/* ═══ HISTORICAL DATA (40 Years from HiCentral MLS) ═══ */}

      {/* Median Price Comparison -- SFR vs Condo (40 Years) */}
      <ReportSection title="Median Sale Price -- Oahu (40 Years)">
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Single Family vs Condo/Townhouse | Source: HiCentral MLS</div>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={OAHU_HISTORICAL_DATA} margin={{ top: 5, right: 20, left: 15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="year" fontSize={11} tickCount={10} />
            <YAxis fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value: any) => `$${Number(value).toLocaleString()}`} />
            <Legend />
            <Line type="monotone" dataKey="sfMedianPrice" name="Single Family" stroke="#dc2626" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="condoMedianPrice" name="Condo" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ReportSection>

      {/* Annual Sales Volume (40 Years) -- Line Chart */}
      <ReportSection title="Annual Sales Volume -- Oahu (40 Years)">
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Number of residential resales per year | Source: HiCentral MLS</div>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={OAHU_HISTORICAL_DATA} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="year" fontSize={11} tickCount={10} />
            <YAxis fontSize={11} tickFormatter={(v) => v.toLocaleString()} />
            <Tooltip formatter={(value: any) => Number(value).toLocaleString()} />
            <Legend />
            <Line type="monotone" dataKey="sfSales" name="Single Family" stroke="#dc2626" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="condoSales" name="Condo" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ReportSection>

      {/* Average Price Comparison (40 Years) */}
      <ReportSection title="Average Sale Price -- Oahu (40 Years)">
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Single Family vs Condo/Townhouse | Source: HiCentral MLS</div>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={OAHU_HISTORICAL_DATA} margin={{ top: 5, right: 20, left: 15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="year" fontSize={11} tickCount={10} />
            <YAxis fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value: any) => `$${Number(value).toLocaleString()}`} />
            <Legend />
            <Line type="monotone" dataKey="sfAvgPrice" name="Single Family" stroke="#dc2626" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="condoAvgPrice" name="Condo" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ReportSection>

      {/* ═══ ZIP-LEVEL DATA ═══ */}

      {/* Sales Price by ZIP Code */}
      <ReportSection title={`Sales Price by ZIP Code - ${o.county} County`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: REPORT_COLORS.brandBlue }}>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "#fff", fontWeight: 600, fontSize: 12 }}>ZIP Code</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 600, fontSize: 12 }}>Median Price</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 600, fontSize: 12 }}>SFR Median</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 600, fontSize: 12 }}>Condo/TH</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 600, fontSize: 12 }}>$/Sqft</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 600, fontSize: 12 }}>Listings</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 600, fontSize: 12 }}>DOM</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 600, fontSize: 12 }}>Rent</th>
              </tr>
            </thead>
            <tbody>
              {data.zipTable.map((z, i) => (
                <tr
                  key={z.zipCode}
                  onClick={() => handleZipClick(z.zipCode)}
                  style={{
                    background: selectedZip === z.zipCode ? "#eff6ff" : i % 2 === 0 ? "#fff" : "#f9fafb",
                    cursor: "pointer",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e40af" }}>{z.zipCode}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{fmt$(z.medianPrice)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#15803d" }}>{(z as any).sfrMedian ? fmt$((z as any).sfrMedian) : "-"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#1e40af" }}>{(z as any).condoMedian ? fmt$((z as any).condoMedian) : "-"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{z.medianPricePerSqft ? `$${z.medianPricePerSqft}` : "-"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{z.totalListings ?? "-"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{z.medianDOM ?? "-"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#7c3aed" }}>{z.medianRent ? fmt$(z.medianRent) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>Click a ZIP code for detailed breakdown.</div>
      </ReportSection>

      {/* ZIP Detail (when clicked) */}
      {selectedZip && (
        <div style={{ marginBottom: 24, padding: "16px 20px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>
            ZIP {selectedZip} Detail
          </div>
          {zipLoading ? (
            <div style={{ color: "#6b7280", fontSize: 13 }}>Loading...</div>
          ) : zipData ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {zipData.overview.medianSalePrice != null && <ValueCard label="Median Price" value={fmt$(zipData.overview.medianSalePrice)!} />}
              {zipData.overview.medianPricePerSqft != null && <ValueCard label="$/Sqft" value={`$${zipData.overview.medianPricePerSqft}`} />}
              {zipData.overview.medianDOM != null && <ValueCard label="DOM" value={`${zipData.overview.medianDOM} days`} />}
              {zipData.overview.totalListings != null && <ValueCard label="Listings" value={String(zipData.overview.totalListings)} />}
              {zipData.overview.medianRent != null && <ValueCard label="Rent" value={`${fmt$(zipData.overview.medianRent)}/mo`} color="#f5f3ff" />}
            </div>
          ) : null}
        </div>
      )}

      {/* Median Price by ZIP -- SFR vs Condo/TH grouped bar chart */}
      {data.zipTable.length > 0 && (
        <ReportSection title="Median Sale Price by ZIP Code -- SFR vs Condo/Townhouse">
          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: "#dc2626", display: "inline-block" }} />
              Single Family
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: "#2563eb", display: "inline-block" }} />
              Condo/Townhouse
            </span>
          </div>
          {/* Grouped bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...data.zipTable]
              .sort((a, b) => ((b as any).sfrMedian || 0) - ((a as any).sfrMedian || 0))
              .slice(0, 20)
              .map((z) => {
              const sfr = (z as any).sfrMedian || 0;
              const condo = (z as any).condoMedian || 0;
              const maxVal = Math.max(...data.zipTable.map((r) => Math.max((r as any).sfrMedian || 0, (r as any).condoMedian || 0, r.medianPrice || 0)), 1);
              return (
                <div key={z.zipCode} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 55, fontSize: 12, color: REPORT_COLORS.textDark, textAlign: "right", flexShrink: 0, fontWeight: 600 }}>
                    {z.zipCode}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                    {/* SFR bar (red) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ height: 14, background: "#dc2626", borderRadius: 3, width: `${Math.max((sfr / maxVal) * 100, 0.5)}%`, minWidth: sfr > 0 ? 2 : 0 }} />
                      {sfr > 0 && <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap" }}>{fmt$(sfr)}</span>}
                    </div>
                    {/* Condo/TH bar (blue) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ height: 14, background: "#2563eb", borderRadius: 3, width: `${Math.max((condo / maxVal) * 100, 0.5)}%`, minWidth: condo > 0 ? 2 : 0 }} />
                      {condo > 0 && <span style={{ fontSize: 10, color: "#2563eb", fontWeight: 600, whiteSpace: "nowrap" }}>{fmt$(condo)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ReportSection>
      )}

      {/* Median Rent by ZIP (bar chart) */}
      {data.zipTable.filter((z) => z.medianRent).length > 0 && (
        <ReportSection title="Median Rent by ZIP Code">
          <HorizontalBarChart
            data={data.zipTable
              .filter((z) => z.medianRent)
              .sort((a, b) => (b.medianRent || 0) - (a.medianRent || 0))
              .slice(0, 15)
              .map((z) => ({
                label: z.zipCode,
                value: z.medianRent || 0,
                displayValue: fmt$(z.medianRent) || "-",
              }))}
            labelWidth={70}
            barColor="#7c3aed"
          />
        </ReportSection>
      )}

      {/* HUD Fair Market Rents rendered as chart above */}

      {/* Footer */}
      <div style={{ marginTop: 24, padding: "12px 16px", background: "#f3f4f6", borderRadius: 8, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
        Data sources: MLS (active/closed listings), public records (market stats), HUD (fair market rents).
        Data is cached for 24 hours. {data.cacheHit && "Showing cached data."}
      </div>
    </div>
  );
}
