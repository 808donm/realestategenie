"use client";

import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  LineChart, Line,
  PieChart, Pie,
} from "recharts";
import {
  MAUI_MONTHLY_DATA,
  MAUI_MONTHLY_TRENDS,
  MAUI_AFFORDABILITY_TRENDS,
  MAUI_AREA_SALES_FEB2026,
  MAUI_CONDO_AREA_SALES_FEB2026,
} from "@/lib/data/maui-monthly-data";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const COLORS = {
  sf: "#0284c7", // sky-600
  sfLight: "#7dd3fc",
  condo: "#1e3a5f",
  condoLight: "#93c5fd",
  green: "#10b981",
  red: "#dc2626",
  amber: "#f59e0b",
  purple: "#8b5cf6",
};

export default function MauiStatisticsClient() {
  const [selectedMonth, setSelectedMonth] = useState(
    MAUI_MONTHLY_DATA[MAUI_MONTHLY_DATA.length - 1].month
  );

  const data = useMemo(() => {
    return MAUI_MONTHLY_DATA.find((m) => m.month === selectedMonth) ?? MAUI_MONTHLY_DATA[MAUI_MONTHLY_DATA.length - 1];
  }, [selectedMonth]);

  const hasMultipleMonths = MAUI_MONTHLY_DATA.length > 1;

  const sf = data.singleFamily;
  const cd = data.condo;

  const yoyColor = (val: number) => (val >= 0 ? "#059669" : "#dc2626");
  const yoyText = (val: number) => `${val >= 0 ? "+" : ""}${val}%`;

  // --- Chart data ---
  const salesComparison = [
    { category: "Closed Sales", "Single-Family": sf.closedSales, Condo: cd.closedSales },
    { category: "Pending Sales", "Single-Family": sf.pendingSales, Condo: cd.pendingSales },
    { category: "New Listings", "Single-Family": sf.newListings, Condo: cd.newListings },
  ];

  const yoyChanges = [
    { metric: "Closed Sales", sf: sf.closedSalesYoY, condo: cd.closedSalesYoY },
    { metric: "Median Price", sf: sf.medianPriceYoY, condo: cd.medianPriceYoY },
    { metric: "Pending", sf: sf.pendingSalesYoY, condo: cd.pendingSalesYoY },
    { metric: "New Listings", sf: sf.newListingsYoY, condo: cd.newListingsYoY },
    { metric: "Inventory", sf: sf.inventoryYoY, condo: cd.inventoryYoY },
    { metric: "DOM", sf: sf.domYoY, condo: cd.domYoY },
  ];

  const inventoryPie = [
    { name: "Single-Family", value: sf.inventory, color: COLORS.sf },
    { name: "Condo", value: cd.inventory, color: COLORS.condo },
  ];

  const monthsSupplyData = [
    { name: "SF", value: sf.monthsSupply, color: COLORS.sf },
    { name: "Condo", value: cd.monthsSupply, color: COLORS.condo },
  ];

  const pctListPriceData = [
    { name: "SF Current", value: sf.pctListPriceReceived, color: COLORS.sf },
    { name: "Condo Current", value: cd.pctListPriceReceived, color: COLORS.condo },
  ];

  // Area sales for horizontal bar charts (only areas with sales)
  const areaSalesData = useMemo(() =>
    MAUI_AREA_SALES_FEB2026
      .filter((a) => a.feb2026Units > 0)
      .sort((a, b) => (b.feb2026Volume ?? 0) - (a.feb2026Volume ?? 0)),
  []);

  const condoAreaSalesData = useMemo(() =>
    MAUI_CONDO_AREA_SALES_FEB2026
      .filter((a) => a.feb2026Units > 0)
      .sort((a, b) => (b.feb2026Volume ?? 0) - (a.feb2026Volume ?? 0)),
  []);

  const exportReport = (format: "pdf" | "xlsx") => {
    const exportData = [
      { Metric: "Closed Sales", "Single-Family": sf.closedSales, "SF YoY": `${sf.closedSalesYoY}%`, Condo: cd.closedSales, "Condo YoY": `${cd.closedSalesYoY}%` },
      { Metric: "Median Sales Price", "Single-Family": sf.medianPrice, "SF YoY": `${sf.medianPriceYoY}%`, Condo: cd.medianPrice, "Condo YoY": `${cd.medianPriceYoY}%` },
      { Metric: "Average Sales Price", "Single-Family": sf.avgPrice, "SF YoY": `${sf.avgPriceYoY}%`, Condo: cd.avgPrice, "Condo YoY": `${cd.avgPriceYoY}%` },
      { Metric: "Days on Market", "Single-Family": sf.dom, "SF YoY": `${sf.domYoY}%`, Condo: cd.dom, "Condo YoY": `${cd.domYoY}%` },
      { Metric: "Pending Sales", "Single-Family": sf.pendingSales, "SF YoY": `${sf.pendingSalesYoY}%`, Condo: cd.pendingSales, "Condo YoY": `${cd.pendingSalesYoY}%` },
      { Metric: "New Listings", "Single-Family": sf.newListings, "SF YoY": `${sf.newListingsYoY}%`, Condo: cd.newListings, "Condo YoY": `${cd.newListingsYoY}%` },
      { Metric: "Active Inventory", "Single-Family": sf.inventory, "SF YoY": `${sf.inventoryYoY}%`, Condo: cd.inventory, "Condo YoY": `${cd.inventoryYoY}%` },
      { Metric: "Months Supply", "Single-Family": sf.monthsSupply, "SF YoY": `${sf.monthsSupplyYoY}%`, Condo: cd.monthsSupply, "Condo YoY": `${cd.monthsSupplyYoY}%` },
      { Metric: "% List Price Received", "Single-Family": `${sf.pctListPriceReceived}%`, "SF YoY": `${sf.pctListPriceReceivedYoY}%`, Condo: `${cd.pctListPriceReceived}%`, "Condo YoY": `${cd.pctListPriceReceivedYoY}%` },
    ];

    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Maui Statistics");
      XLSX.writeFile(wb, "Maui_Statistics.xlsx");
    } else {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      let y = 20;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Maui Statistics", pw / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${data.label} — Generated ${new Date().toLocaleDateString()}`, pw / 2, y, { align: "center" });
      y += 14;

      doc.setFontSize(8);
      const headers = ["Metric", "Single-Family", "SF YoY", "Condo", "Condo YoY"];
      const colW = (pw - 20) / headers.length;
      doc.setFont("helvetica", "bold");
      headers.forEach((h, i) => doc.text(h, 10 + i * colW, y));
      y += 6;
      doc.setFont("helvetica", "normal");

      exportData.forEach((row) => {
        if (y > 280) { doc.addPage(); y = 20; }
        const vals = [row.Metric, String(row["Single-Family"]), row["SF YoY"], String(row.Condo), row["Condo YoY"]];
        vals.forEach((v, i) => doc.text(v, 10 + i * colW, y));
        y += 5;
      });

      doc.save("Maui_Statistics.pdf");
    }
  };

  const cardStyle: React.CSSProperties = {
    padding: 20,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)", borderRadius: 12, color: "#fff", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{data.label}</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>
            Maui County Housing Market: {data.headline}
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
            Source: REALTORS® Association of Maui, Inc. / ShowingTime Plus, LLC
          </div>
        </div>
        {hasMultipleMonths && (
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.2)", color: "#fff" }}
          >
            {MAUI_MONTHLY_DATA.map((m) => (
              <option key={m.month} value={m.month} style={{ color: "#0c4a6e" }}>{m.label}</option>
            ))}
          </select>
        )}
      </div>

      <div className="noprint" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => exportReport("xlsx")} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", color: "#374151", cursor: "pointer" }}>Export Excel</button>
        <button onClick={() => exportReport("pdf")} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, background: "#dc2626", color: "#fff", cursor: "pointer" }}>Export PDF</button>
      </div>

      {/* KPI Cards — Row 1: Prices */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.sf}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>SF Median Price</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(sf.medianPrice)}</div>
          <div style={{ fontSize: 13, color: yoyColor(sf.medianPriceYoY), fontWeight: 600 }}>{yoyText(sf.medianPriceYoY)} YoY</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.condo}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Condo Median Price</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(cd.medianPrice)}</div>
          <div style={{ fontSize: 13, color: yoyColor(cd.medianPriceYoY), fontWeight: 600 }}>{yoyText(cd.medianPriceYoY)} YoY</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.green}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Total Closed Sales</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{sf.closedSales + cd.closedSales}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>SF: {sf.closedSales} | Condo: {cd.closedSales}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.purple}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Total Pending Sales</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{sf.pendingSales + cd.pendingSales}</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <span style={{ color: yoyColor(sf.pendingSalesYoY) }}>SF {yoyText(sf.pendingSalesYoY)}</span>
            {" | "}
            <span style={{ color: yoyColor(cd.pendingSalesYoY) }}>Condo {yoyText(cd.pendingSalesYoY)}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards — Row 2: Market Conditions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.amber}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>SF Days on Market</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{sf.dom} days</div>
          <div style={{ fontSize: 13, color: yoyColor(sf.domYoY), fontWeight: 600 }}>{yoyText(sf.domYoY)} YoY</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.amber}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Condo Days on Market</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{cd.dom} days</div>
          <div style={{ fontSize: 13, color: yoyColor(cd.domYoY), fontWeight: 600 }}>{yoyText(cd.domYoY)} YoY</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #6366f1" }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>SF Months Supply</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{sf.monthsSupply}</div>
          <div style={{ fontSize: 13, color: yoyColor(sf.monthsSupplyYoY), fontWeight: 600 }}>{yoyText(sf.monthsSupplyYoY)} YoY</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #6366f1" }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Condo Months Supply</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{cd.monthsSupply}</div>
          <div style={{ fontSize: 13, color: yoyColor(cd.monthsSupplyYoY), fontWeight: 600 }}>{yoyText(cd.monthsSupplyYoY)} YoY</div>
        </div>
      </div>

      {/* Market Highlights */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Market Highlights</h3>
        <ul style={{ margin: 0, padding: "0 0 0 20px", fontSize: 14, lineHeight: 2, color: "#374151" }}>
          {data.highlights.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      </div>

      {/* Median Price Trend Line Chart */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Median Sales Price Trend (12 Months)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={MAUI_MONTHLY_TRENDS} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: any) => fmt(value)} />
            <Legend />
            <Line type="monotone" dataKey="sfMedianPrice" name="Single-Family" stroke={COLORS.sf} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
            <Line type="monotone" dataKey="condoMedianPrice" name="Condo" stroke={COLORS.condo} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sales & Activity Bar Chart */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Sales, Pending & New Listings — {data.label}</h3>
        <ResponsiveContainer width="100%" height={300}>
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

      {/* Year-over-Year Changes Bar Chart */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Year-over-Year Changes (%)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={yoyChanges} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
            <Legend />
            <Bar dataKey="sf" name="Single-Family" fill={COLORS.sf} radius={[4, 4, 0, 0]} />
            <Bar dataKey="condo" name="Condo" fill={COLORS.condo} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Closed Sales & Pending Trend Line Charts */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Closed Sales Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={MAUI_MONTHLY_TRENDS} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sfClosedSales" name="SF Sales" stroke={COLORS.sf} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="condoClosedSales" name="Condo Sales" stroke={COLORS.condo} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Pending Sales Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={MAUI_MONTHLY_TRENDS} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sfPendingSales" name="SF Pending" stroke={COLORS.sf} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="condoPendingSales" name="Condo Pending" stroke={COLORS.condo} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Days on Market & New Listings Trend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Days on Market Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={MAUI_MONTHLY_TRENDS} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => `${value} days`} />
              <Legend />
              <Line type="monotone" dataKey="sfDOM" name="SF DOM" stroke={COLORS.sf} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="condoDOM" name="Condo DOM" stroke={COLORS.condo} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>New Listings Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={MAUI_MONTHLY_TRENDS} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sfNewListings" name="SF Listings" stroke={COLORS.sf} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="condoNewListings" name="Condo Listings" stroke={COLORS.condo} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inventory Donut + Months Supply + List Price */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: "1 1 300px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Active Inventory Split</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={inventoryPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                innerRadius={40}
                label={(props: any) => `${props.name}: ${props.value.toLocaleString()}`}
                labelLine
              >
                {inventoryPie.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 13, color: "#6b7280" }}>
            Total: {(sf.inventory + cd.inventory).toLocaleString()} active listings
          </div>
        </div>
        <div style={{ ...cardStyle, flex: "1 1 300px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Months Supply of Inventory</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthsSupplyData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => `${value} months`} />
              <Bar dataKey="value" name="Months" radius={[6, 6, 0, 0]}>
                {monthsSupplyData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 12, color: "#6b7280" }}>
            6 months = balanced market
          </div>
        </div>
        <div style={{ ...cardStyle, flex: "1 1 300px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>% of List Price Received</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pctListPriceData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[90, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip formatter={(value: any) => `${value}%`} />
              <Bar dataKey="value" name="% Received" radius={[6, 6, 0, 0]}>
                {pctListPriceData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 12, color: "#6b7280" }}>
            SF {yoyText(sf.pctListPriceReceivedYoY)} | Condo {yoyText(cd.pctListPriceReceivedYoY)} YoY
          </div>
        </div>
      </div>

      {/* Affordability Index Trend */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>Housing Affordability Index Trend</h3>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Higher = more affordable. An index of 120 means median household income is 120% of what&apos;s needed to qualify.</div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={MAUI_AFFORDABILITY_TRENDS} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="sfIndex" name="Single-Family" stroke={COLORS.sf} strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="condoIndex" name="Condo" stroke={COLORS.condo} strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* % List Price Received Trend */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>% of List Price Received Trend</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={MAUI_MONTHLY_TRENDS} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis domain={[92, 98]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip formatter={(value: any) => `${value}%`} />
            <Legend />
            <Line type="monotone" dataKey="sfPctListPrice" name="Single-Family" stroke={COLORS.sf} strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="condoPctListPrice" name="Condo" stroke={COLORS.condo} strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* SF Sales Volume by Area — Bar Chart */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>SF Sales Volume by Area — {data.label}</h3>
        <ResponsiveContainer width="100%" height={Math.max(300, areaSalesData.length * 35)}>
          <BarChart data={areaSalesData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="area" tick={{ fontSize: 11 }} width={110} />
            <Tooltip formatter={(value: any) => fmt(value)} />
            <Bar dataKey="feb2026Volume" name="Dollar Volume" fill={COLORS.sf} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Area Sales Data Table */}
      <div style={{ ...cardStyle, marginBottom: 24, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>SF Sales by Area — February vs January 2026</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Area</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.sf }}>Feb Units</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.sf }}>Feb Volume</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.sf }}>Feb Median</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Jan Units</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Jan Volume</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Jan Median</th>
            </tr>
          </thead>
          <tbody>
            {MAUI_AREA_SALES_FEB2026.map((row, i) => (
              <tr key={row.area} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.area}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.feb2026Units}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.feb2026Volume ? fmt(row.feb2026Volume) : "—"}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.feb2026MedianPrice ? fmt(row.feb2026MedianPrice) : "—"}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.jan2026Units}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.jan2026Volume ? fmt(row.jan2026Volume) : "—"}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.jan2026MedianPrice ? fmt(row.jan2026MedianPrice) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Condo Sales Volume by Area — Bar Chart */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Condo Sales Volume by Area — {data.label}</h3>
        <ResponsiveContainer width="100%" height={Math.max(280, condoAreaSalesData.length * 35)}>
          <BarChart data={condoAreaSalesData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="area" tick={{ fontSize: 11 }} width={110} />
            <Tooltip formatter={(value: any) => fmt(value)} />
            <Bar dataKey="feb2026Volume" name="Dollar Volume" fill={COLORS.condo} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Condo Area Sales Data Table */}
      <div style={{ ...cardStyle, marginBottom: 24, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Condo Sales by Area — February vs January 2026</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Area</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.condo }}>Feb Units</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.condo }}>Feb Volume</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.condo }}>Feb Median</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Jan Units</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Jan Volume</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Jan Median</th>
            </tr>
          </thead>
          <tbody>
            {MAUI_CONDO_AREA_SALES_FEB2026.map((row, i) => (
              <tr key={row.area} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.area}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.feb2026Units}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.feb2026Volume ? fmt(row.feb2026Volume) : "—"}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.feb2026MedianPrice ? fmt(row.feb2026MedianPrice) : "—"}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.jan2026Units}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.jan2026Volume ? fmt(row.jan2026Volume) : "—"}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.jan2026MedianPrice ? fmt(row.jan2026MedianPrice) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Statistics Table */}
      <div style={{ ...cardStyle, marginBottom: 24, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Detailed Statistics — {data.label}</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Metric</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.sf }}>Single-Family</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>YoY</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.condo }}>Condo</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>YoY</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "Closed Sales", sfVal: sf.closedSales.toString(), sfYoY: sf.closedSalesYoY, cdVal: cd.closedSales.toString(), cdYoY: cd.closedSalesYoY },
              { label: "Median Sales Price", sfVal: fmt(sf.medianPrice), sfYoY: sf.medianPriceYoY, cdVal: fmt(cd.medianPrice), cdYoY: cd.medianPriceYoY },
              { label: "Average Sales Price", sfVal: fmt(sf.avgPrice), sfYoY: sf.avgPriceYoY, cdVal: fmt(cd.avgPrice), cdYoY: cd.avgPriceYoY },
              { label: "Days on Market", sfVal: `${sf.dom} days`, sfYoY: sf.domYoY, cdVal: `${cd.dom} days`, cdYoY: cd.domYoY },
              { label: "Pending Sales", sfVal: sf.pendingSales.toString(), sfYoY: sf.pendingSalesYoY, cdVal: cd.pendingSales.toString(), cdYoY: cd.pendingSalesYoY },
              { label: "New Listings", sfVal: sf.newListings.toString(), sfYoY: sf.newListingsYoY, cdVal: cd.newListings.toString(), cdYoY: cd.newListingsYoY },
              { label: "Active Inventory", sfVal: sf.inventory.toString(), sfYoY: sf.inventoryYoY, cdVal: cd.inventory.toString(), cdYoY: cd.inventoryYoY },
              { label: "Months Supply", sfVal: sf.monthsSupply.toString(), sfYoY: sf.monthsSupplyYoY, cdVal: cd.monthsSupply.toString(), cdYoY: cd.monthsSupplyYoY },
              { label: "% List Price Received", sfVal: `${sf.pctListPriceReceived}%`, sfYoY: sf.pctListPriceReceivedYoY, cdVal: `${cd.pctListPriceReceived}%`, cdYoY: cd.pctListPriceReceivedYoY },
            ].map((row, i) => (
              <tr key={row.label} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.label}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{row.sfVal}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: yoyColor(row.sfYoY), fontWeight: 600 }}>{yoyText(row.sfYoY)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{row.cdVal}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: yoyColor(row.cdYoY), fontWeight: 600 }}>{yoyText(row.cdYoY)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Source Attribution */}
      <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "12px 0" }}>
        Source: REALTORS® Association of Maui, Inc. &middot; All data from RAM MLS &middot; Report &copy; 2026 ShowingTime Plus, LLC &middot; Current as of March 2, 2026
      </div>
    </div>
  );
}
