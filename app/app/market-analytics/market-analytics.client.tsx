"use client";

import { useState, useEffect } from "react";
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

export default function MarketAnalyticsDashboard() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [zipData, setZipData] = useState<MarketData | null>(null);
  const [zipLoading, setZipLoading] = useState(false);

  // Fetch county-level data
  useEffect(() => {
    fetch("/api/reports/market-analytics?county=honolulu")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
      const res = await fetch(`/api/reports/market-analytics?county=honolulu&zipCode=${zip}`);
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
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {o.medianSalePrice != null && (
          <ValueCard label="Median Sale Price" value={fmt$(o.medianSalePrice)!} sub={o.avgSalePrice ? `Avg: ${fmt$(o.avgSalePrice)}` : undefined} />
        )}
        {o.medianPricePerSqft != null && (
          <ValueCard label="Price per Sq Ft" value={`$${o.medianPricePerSqft}`} sub={o.avgPricePerSqft ? `Avg: $${o.avgPricePerSqft}` : undefined} />
        )}
        {o.medianDOM != null && (
          <ValueCard label="Median DOM" value={`${o.medianDOM} days`} />
        )}
        <ValueCard label="Total Listings" value={o.totalListings.toLocaleString()} />
        {o.medianRent != null && (
          <ValueCard label="Median Rent" value={`${fmt$(o.medianRent)}/mo`} color="#f5f3ff" />
        )}
        {data.mlsStats?.activeListings != null && (
          <ValueCard label="MLS Active" value={data.mlsStats.activeListings.toLocaleString()} sub="Honolulu" color="#ecfdf5" />
        )}
        {data.mlsStats?.closedLast30Days != null && (
          <ValueCard label="Closed (30d)" value={data.mlsStats.closedLast30Days.toLocaleString()} sub="MLS" color="#eff6ff" />
        )}
      </div>

      {/* Sales Price by ZIP Code */}
      <ReportSection title={`Sales Price by ZIP Code - ${o.county} County`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: REPORT_COLORS.brandBlue }}>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "#fff", fontWeight: 600, fontSize: 12 }}>ZIP Code</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 600, fontSize: 12 }}>Median Price</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 600, fontSize: 12 }}>Avg Price</th>
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
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280" }}>{fmt$(z.avgPrice)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{z.medianPricePerSqft ? `$${z.medianPricePerSqft}` : "-"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{z.totalListings ?? "-"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{z.medianDOM ?? "-"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#7c3aed" }}>{z.medianRent ? fmt$(z.medianRent) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>Click a ZIP code for detailed breakdown. Source: RentCast</div>
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

      {/* Median Price by ZIP (bar chart) */}
      {data.zipTable.length > 0 && (
        <ReportSection title="Median Sale Price by ZIP Code">
          <HorizontalBarChart
            data={data.zipTable.slice(0, 15).map((z) => ({
              label: z.zipCode,
              value: z.medianPrice || 0,
              displayValue: fmt$(z.medianPrice) || "-",
            }))}
            labelWidth={70}
            barColor={REPORT_COLORS.brandBlue}
          />
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

      {/* HUD Fair Market Rents */}
      {data.hudRents && (
        <ReportSection title={`Fair Market Rents - ${o.county} County (HUD)`}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {Object.entries(data.hudRents).map(([key, val]) => (
              <ValueCard key={key} label={key} value={fmt$(val as number) || "-"} color="#f5f3ff" />
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>Source: HUD Section 8 Fair Market Rents</div>
        </ReportSection>
      )}

      {/* Footer */}
      <div style={{ marginTop: 24, padding: "12px 16px", background: "#f3f4f6", borderRadius: 8, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
        Data sources: RentCast (market stats), Trestle MLS (active/closed listings), HUD (fair market rents).
        Data is cached for 24 hours. {data.cacheHit && "Showing cached data."}
      </div>
    </div>
  );
}
