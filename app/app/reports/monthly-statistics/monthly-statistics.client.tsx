"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  LineChart, Line,
  PieChart, Pie,
} from "recharts";
import { OAHU_MONTHLY_DATA, JAN_2026_PRICE_RANGES } from "@/lib/data/oahu-monthly-data";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const COLORS = {
  sf: "#dc2626",
  sfLight: "#fca5a5",
  condo: "#3b82f6",
  condoLight: "#93c5fd",
  green: "#10b981",
  amber: "#f59e0b",
  purple: "#8b5cf6",
};

export default function MonthlyStatisticsClient() {
  const [selectedMonth] = useState("2026-01");

  const data = useMemo(() => {
    return OAHU_MONTHLY_DATA.find((m) => m.month === selectedMonth) ?? OAHU_MONTHLY_DATA[0];
  }, [selectedMonth]);

  const sf = data.singleFamily;
  const cd = data.condo;

  // Comparison data for bar charts
  const salesComparison = [
    {
      category: "Sales",
      "Single-Family": sf.sales,
      Condo: cd.sales,
    },
    {
      category: "Pending Sales",
      "Single-Family": sf.pendingSales,
      Condo: cd.pendingSales,
    },
    {
      category: "New Listings",
      "Single-Family": sf.newListings,
      Condo: cd.newListings,
    },
    {
      category: "Active Inventory",
      "Single-Family": sf.activeInventory,
      Condo: cd.activeInventory,
    },
  ];

  const yoyChanges = [
    { metric: "Sales", sf: sf.salesYoY, condo: cd.salesYoY },
    { metric: "Median Price", sf: sf.medianPriceYoY, condo: cd.medianPriceYoY },
    { metric: "Pending", sf: sf.pendingSalesYoY, condo: cd.pendingSalesYoY },
    { metric: "New Listings", sf: sf.newListingsYoY, condo: cd.newListingsYoY },
    { metric: "Inventory", sf: sf.activeInventoryYoY, condo: cd.activeInventoryYoY },
  ];

  const domComparison = [
    { label: "SF Current", value: sf.medianDOM, color: COLORS.sf },
    { label: "SF Last Year", value: sf.prevYearMedianDOM, color: COLORS.sfLight },
    { label: "Condo Current", value: cd.medianDOM, color: COLORS.condo },
    { label: "Condo Last Year", value: cd.prevYearMedianDOM, color: COLORS.condoLight },
  ];

  const aboveAskingData = [
    { name: "SF Current", value: sf.aboveAskingPct, color: COLORS.sf },
    { name: "SF Last Year", value: sf.prevYearAboveAskingPct, color: COLORS.sfLight },
    { name: "Condo Current", value: cd.aboveAskingPct, color: COLORS.condo },
    { name: "Condo Last Year", value: cd.prevYearAboveAskingPct, color: COLORS.condoLight },
  ];

  const inventoryPie = [
    { name: "Single-Family", value: sf.activeInventory, color: COLORS.sf },
    { name: "Condo", value: cd.activeInventory, color: COLORS.condo },
  ];

  const cardStyle: React.CSSProperties = {
    padding: 20,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  };

  return (
    <div>
      {/* Month Header */}
      <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)", borderRadius: 12, color: "#fff", marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{data.label}</div>
        <div style={{ fontSize: 14, opacity: 0.9 }}>
          Oahu Housing Market: Stable single-family sales, softer condo activity
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.sf}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>SF Median Price</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(sf.medianPrice)}</div>
          <div style={{ fontSize: 13, color: sf.medianPriceYoY >= 0 ? "#059669" : "#dc2626", fontWeight: 600 }}>
            {sf.medianPriceYoY >= 0 ? "+" : ""}{sf.medianPriceYoY}% YoY
          </div>
        </div>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.condo}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Condo Median Price</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(cd.medianPrice)}</div>
          <div style={{ fontSize: 13, color: cd.medianPriceYoY >= 0 ? "#059669" : "#dc2626", fontWeight: 600 }}>
            {cd.medianPriceYoY >= 0 ? "+" : ""}{cd.medianPriceYoY}% YoY
          </div>
        </div>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.green}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Total Sales</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{sf.sales + cd.sales}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>SF: {sf.sales} | Condo: {cd.sales}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.purple}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Pending Sales</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{sf.pendingSales + cd.pendingSales}</div>
          <div style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
            SF +{sf.pendingSalesYoY}% | Condo +{cd.pendingSalesYoY}%
          </div>
        </div>
      </div>

      {/* Sales & Inventory Bar Chart */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Sales, Pending, Listings & Inventory</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={salesComparison} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Single-Family" fill={COLORS.sf} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Condo" fill={COLORS.condo} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Year-over-Year Changes */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Year-over-Year Changes (%)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={yoyChanges} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
            <Legend />
            <Bar dataKey="sf" name="Single-Family" fill={COLORS.sf} radius={[4, 4, 0, 0]} />
            <Bar dataKey="condo" name="Condo" fill={COLORS.condo} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Price Range Distribution */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Sales by Price Range</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={JAN_2026_PRICE_RANGES} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="range" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="sfSales" name="Single-Family" fill={COLORS.sf} radius={[4, 4, 0, 0]} />
            <Bar dataKey="condoSales" name="Condo" fill={COLORS.condo} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Days on Market & Above Asking */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Median Days on Market</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={domComparison} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => `${value} days`} />
              <Bar dataKey="value" name="Days" radius={[6, 6, 0, 0]}>
                {domComparison.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Sales Above Asking Price (%)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={aboveAskingData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 40]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip formatter={(value: any) => `${value}%`} />
              <Bar dataKey="value" name="% Above Asking" radius={[6, 6, 0, 0]}>
                {aboveAskingData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inventory Pie Chart */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: "1 1 300px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Active Inventory Split</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={inventoryPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={45}
                label={(props: any) => `${props.name}: ${props.value.toLocaleString()}`}
                labelLine
              >
                {inventoryPie.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 13, color: "#6b7280" }}>
            Total: {(sf.activeInventory + cd.activeInventory).toLocaleString()} active listings
          </div>
        </div>
        <div style={{ ...cardStyle, flex: "2 1 500px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Market Highlights</h3>
          <ul style={{ margin: 0, padding: "0 0 0 20px", fontSize: 14, lineHeight: 2, color: "#374151" }}>
            {data.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Detailed Data Table */}
      <div style={{ ...cardStyle, marginBottom: 24, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Detailed Statistics — {data.label}</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Metric</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.sf }}>Single-Family</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>YoY Change</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.condo }}>Condo</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>YoY Change</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "Number of Sales", sfVal: sf.sales.toString(), sfYoY: sf.salesYoY, cdVal: cd.sales.toString(), cdYoY: cd.salesYoY },
              { label: "Median Sales Price", sfVal: fmt(sf.medianPrice), sfYoY: sf.medianPriceYoY, cdVal: fmt(cd.medianPrice), cdYoY: cd.medianPriceYoY },
              { label: "Median Days on Market", sfVal: `${sf.medianDOM} days`, sfYoY: null, cdVal: `${cd.medianDOM} days`, cdYoY: null },
              { label: "Pending Sales", sfVal: sf.pendingSales.toString(), sfYoY: sf.pendingSalesYoY, cdVal: cd.pendingSales.toString(), cdYoY: cd.pendingSalesYoY },
              { label: "New Listings", sfVal: sf.newListings.toString(), sfYoY: sf.newListingsYoY, cdVal: cd.newListings.toString(), cdYoY: cd.newListingsYoY },
              { label: "Active Inventory", sfVal: sf.activeInventory.toString(), sfYoY: sf.activeInventoryYoY, cdVal: cd.activeInventory.toLocaleString(), cdYoY: cd.activeInventoryYoY },
              { label: "% Above Asking", sfVal: `${sf.aboveAskingPct}%`, sfYoY: null, cdVal: `${cd.aboveAskingPct}%`, cdYoY: null },
            ].map((row, i) => (
              <tr key={row.label} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.label}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{row.sfVal}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: row.sfYoY !== null ? (row.sfYoY >= 0 ? "#059669" : "#dc2626") : "#6b7280", fontWeight: 600 }}>
                  {row.sfYoY !== null ? `${row.sfYoY >= 0 ? "+" : ""}${row.sfYoY}%` : `vs ${sf.prevYearMedianDOM ?? sf.prevYearAboveAskingPct}`}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{row.cdVal}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: row.cdYoY !== null ? (row.cdYoY >= 0 ? "#059669" : "#dc2626") : "#6b7280", fontWeight: 600 }}>
                  {row.cdYoY !== null ? `${row.cdYoY >= 0 ? "+" : ""}${row.cdYoY}%` : `vs ${cd.prevYearMedianDOM ?? cd.prevYearAboveAskingPct}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Source Attribution */}
      <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "12px 0" }}>
        Source: Honolulu Board of REALTORS® / HiCentral MLS, Ltd. &middot; Resales of existing properties only &middot; Does not include new home sales
      </div>
    </div>
  );
}
