"use client";

import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { YORK_ADAMS_MONTHLY_DATA } from "@/lib/data/york-adams-monthly-data";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n}%`;
const pctColor = (n: number) => (n >= 0 ? "#059669" : "#dc2626");

const COLORS = { york: "#1e40af", adams: "#dc2626" };

function StatCard({ label, value, change, sub }: { label: string; value: string; change?: number; sub?: string }) {
  return (
    <div style={{ padding: "16px 20px", background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginTop: 4 }}>{value}</div>
      {change != null && (
        <div style={{ fontSize: 13, fontWeight: 700, color: pctColor(change), marginTop: 2 }}>{pct(change)} YoY</div>
      )}
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function YorkAdamsMarketClient() {
  const [selectedMonth, setSelectedMonth] = useState(YORK_ADAMS_MONTHLY_DATA[YORK_ADAMS_MONTHLY_DATA.length - 1].month);

  const data = useMemo(() => {
    return (
      YORK_ADAMS_MONTHLY_DATA.find((m) => m.month === selectedMonth) ??
      YORK_ADAMS_MONTHLY_DATA[YORK_ADAMS_MONTHLY_DATA.length - 1]
    );
  }, [selectedMonth]);

  const york = data.counties.find((c) => c.county === "York County")!;
  const adams = data.counties.find((c) => c.county === "Adams County")!;

  // School district charts
  const yorkDistrictPriceData = york.schoolDistricts
    .sort((a, b) => b.medianPrice2026 - a.medianPrice2026)
    .map((d) => ({ name: d.name, "2026": d.medianPrice2026, "2025": d.medianPrice2025 }));

  const adamsDistrictPriceData = adams.schoolDistricts
    .sort((a, b) => b.medianPrice2026 - a.medianPrice2026)
    .map((d) => ({ name: d.name, "2026": d.medianPrice2026, "2025": d.medianPrice2025 }));

  const yorkDistrictSalesData = york.schoolDistricts
    .sort((a, b) => b.sold2026 - a.sold2026)
    .map((d) => ({ name: d.name, "2026": d.sold2026, "2025": d.sold2025 }));

  // County comparison
  const countyCompare = [
    { metric: "Median Sold Price", york: york.medianSoldPrice, adams: adams.medianSoldPrice },
    { metric: "Homes Sold", york: york.homesSold, adams: adams.homesSold },
    { metric: "Active Listings", york: york.activeListings, adams: adams.activeListings },
    { metric: "Pending Sales", york: york.pendingSales, adams: adams.pendingSales },
    { metric: "New Listings", york: york.newListings, adams: adams.newListings },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Month selector */}
      {YORK_ADAMS_MONTHLY_DATA.length > 1 && (
        <div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
          >
            {YORK_ADAMS_MONTHLY_DATA.map((m) => (
              <option key={m.month} value={m.month}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Headline */}
      <div style={{ padding: 16, background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e3a5f" }}>{data.headline}</div>
        <ul style={{ margin: "8px 0 0 16px", padding: 0, fontSize: 12, color: "#374151" }}>
          {data.highlights.map((h, i) => (
            <li key={i} style={{ marginBottom: 3 }}>
              {h}
            </li>
          ))}
        </ul>
      </div>

      {/* ═══════ YORK COUNTY ═══════ */}
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: COLORS.york,
          margin: "10px 0 0 0",
          borderBottom: "3px solid " + COLORS.york,
          paddingBottom: 6,
        }}
      >
        York County
      </h2>

      {/* York Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <StatCard
          label="Median Sold Price"
          value={fmt(york.medianSoldPrice)}
          change={york.priceChangeYoY}
          sub={`Jan 2025: ${fmt(york.medianSoldPricePrevYear)}`}
        />
        <StatCard
          label="Homes Sold"
          value={String(york.homesSold)}
          change={york.salesChangeYoY}
          sub={`Jan 2025: ${york.homesSoldPrevYear}`}
        />
        <StatCard label="Pending Sales" value={String(york.pendingSales)} change={york.pendingSalesChangeYoY} />
        <StatCard label="New Listings" value={String(york.newListings)} />
        <StatCard
          label="Active Listings"
          value={String(york.activeListings)}
          sub={`Jan 2025: ${york.activeListingsPrevYear} (${pct(Math.round((york.activeListings / york.activeListingsPrevYear - 1) * 100))})`}
        />
        <StatCard label="Days on Market" value={`${york.daysOnMarket}`} />
        <StatCard label="Months Supply" value={york.monthsSupply.toFixed(2)} />
        <StatCard label="List Price Received" value={`${york.listPriceReceivedPct}%`} />
      </div>

      {/* York School District Median Prices */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
          York County — Median Sale Price by School District
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={yorkDistrictPriceData} layout="vertical" margin={{ left: 130, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v: number) => fmt(v)} />
            <YAxis type="category" dataKey="name" width={120} style={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => fmt(Number(v))} />
            <Legend />
            <Bar dataKey="2026" fill={COLORS.york} name="Jan 2026" radius={[0, 4, 4, 0]} />
            <Bar dataKey="2025" fill="#93c5fd" name="Jan 2025" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* York School District Sales Volume */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
          York County — Homes Sold by School District
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={yorkDistrictSalesData} layout="vertical" margin={{ left: 130, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={120} style={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="2026" fill={COLORS.york} name="Jan 2026" radius={[0, 4, 4, 0]} />
            <Bar dataKey="2025" fill="#93c5fd" name="Jan 2025" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* York School District Table */}
      <div
        style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, overflowX: "auto" }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
          York County — Statistics by School District
        </h3>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>
                School District
              </th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280" }}>2026 Median</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280" }}>2025 Median</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280" }}>% Change</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280" }}>2026 Sold</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280" }}>2025 Sold</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280" }}>% Change</th>
            </tr>
          </thead>
          <tbody>
            {york.schoolDistricts.map((d, i) => (
              <tr
                key={d.name}
                style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
              >
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>{d.name}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(d.medianPrice2026)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#6b7280" }}>{fmt(d.medianPrice2025)}</td>
                <td
                  style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: pctColor(d.priceChangeYoY) }}
                >
                  {pct(d.priceChangeYoY)}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.sold2026}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#6b7280" }}>{d.sold2025}</td>
                <td
                  style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: pctColor(d.salesChangeYoY) }}
                >
                  {pct(d.salesChangeYoY)}
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid #1e40af", fontWeight: 800 }}>
              <td style={{ padding: "6px 8px" }}>Total York County</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(york.medianSoldPrice)}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: "#6b7280" }}>
                {fmt(york.medianSoldPricePrevYear)}
              </td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: pctColor(york.priceChangeYoY) }}>
                {pct(york.priceChangeYoY)}
              </td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{york.homesSold}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: "#6b7280" }}>{york.homesSoldPrevYear}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: pctColor(york.salesChangeYoY) }}>
                {pct(york.salesChangeYoY)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══════ ADAMS COUNTY ═══════ */}
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: COLORS.adams,
          margin: "10px 0 0 0",
          borderBottom: "3px solid " + COLORS.adams,
          paddingBottom: 6,
        }}
      >
        Adams County
      </h2>

      {/* Adams Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <StatCard
          label="Median Sold Price"
          value={fmt(adams.medianSoldPrice)}
          change={adams.priceChangeYoY}
          sub={`Jan 2025: ${fmt(adams.medianSoldPricePrevYear)}`}
        />
        <StatCard
          label="Homes Sold"
          value={String(adams.homesSold)}
          change={adams.salesChangeYoY}
          sub={`Jan 2025: ${adams.homesSoldPrevYear}`}
        />
        <StatCard label="Pending Sales" value={String(adams.pendingSales)} change={adams.pendingSalesChangeYoY} />
        <StatCard label="New Listings" value={String(adams.newListings)} />
        <StatCard
          label="Active Listings"
          value={String(adams.activeListings)}
          sub={`Jan 2025: ${adams.activeListingsPrevYear} (${pct(Math.round((adams.activeListings / adams.activeListingsPrevYear - 1) * 100))})`}
        />
        <StatCard label="Days on Market" value={`${adams.daysOnMarket}`} />
        <StatCard label="Months Supply" value={adams.monthsSupply.toFixed(2)} />
        <StatCard label="List Price Received" value={`${adams.listPriceReceivedPct}%`} />
      </div>

      {/* Adams School District Prices */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
          Adams County — Median Sale Price by School District
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={adamsDistrictPriceData} layout="vertical" margin={{ left: 130, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v: number) => fmt(v)} />
            <YAxis type="category" dataKey="name" width={120} style={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => fmt(Number(v))} />
            <Legend />
            <Bar dataKey="2026" fill={COLORS.adams} name="Jan 2026" radius={[0, 4, 4, 0]} />
            <Bar dataKey="2025" fill="#fca5a5" name="Jan 2025" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Adams School District Table */}
      <div
        style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, overflowX: "auto" }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
          Adams County — Statistics by School District
        </h3>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>
                School District
              </th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280" }}>2026 Median</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280" }}>2025 Median</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280" }}>% Change</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280" }}>2026 Sold</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280" }}>2025 Sold</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280" }}>% Change</th>
            </tr>
          </thead>
          <tbody>
            {adams.schoolDistricts.map((d, i) => (
              <tr
                key={d.name}
                style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
              >
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>{d.name}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(d.medianPrice2026)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#6b7280" }}>{fmt(d.medianPrice2025)}</td>
                <td
                  style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: pctColor(d.priceChangeYoY) }}
                >
                  {pct(d.priceChangeYoY)}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.sold2026}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#6b7280" }}>{d.sold2025}</td>
                <td
                  style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: pctColor(d.salesChangeYoY) }}
                >
                  {pct(d.salesChangeYoY)}
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid #dc2626", fontWeight: 800 }}>
              <td style={{ padding: "6px 8px" }}>Total Adams County</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(adams.medianSoldPrice)}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: "#6b7280" }}>
                {fmt(adams.medianSoldPricePrevYear)}
              </td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: pctColor(adams.priceChangeYoY) }}>
                {pct(adams.priceChangeYoY)}
              </td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{adams.homesSold}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: "#6b7280" }}>{adams.homesSoldPrevYear}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: pctColor(adams.salesChangeYoY) }}>
                {pct(adams.salesChangeYoY)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══════ COUNTY COMPARISON ═══════ */}
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: "#374151",
          margin: "10px 0 0 0",
          borderBottom: "3px solid #374151",
          paddingBottom: 6,
        }}
      >
        County Comparison
      </h2>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
          York vs Adams — Key Metrics
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={countyCompare} margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric" style={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
            <Tooltip formatter={(v: any) => (Number(v) >= 1000 ? fmt(Number(v)) : v)} />
            <Legend />
            <Bar dataKey="york" fill={COLORS.york} name="York County" radius={[4, 4, 0, 0]} />
            <Bar dataKey="adams" fill={COLORS.adams} name="Adams County" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Source */}
      <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: 8 }}>
        Data source: RAYAC (REALTORS Association of York &amp; Adams Counties) &bull; Bright MLS &bull; {data.label}
      </div>
    </div>
  );
}
