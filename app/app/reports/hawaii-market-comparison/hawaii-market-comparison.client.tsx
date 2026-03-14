"use client";

import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  LineChart, Line,
  PieChart, Pie,
} from "recharts";
import { STATEWIDE_MONTHLY_DATA } from "@/lib/data/statewide-monthly-data";
import { OAHU_MONTHLY_DATA } from "@/lib/data/oahu-monthly-data";
import { MAUI_MONTHLY_DATA } from "@/lib/data/maui-monthly-data";
import { HAWAII_ISLAND_MONTHLY_DATA } from "@/lib/data/hawaii-island-monthly-data";
import { KAUAI_MONTHLY_DATA } from "@/lib/data/kauai-monthly-data";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const COLORS = {
  oahu: "#dc2626",
  maui: "#0284c7",
  hawaii: "#059669",
  kauai: "#8b5cf6",
};

const yoyColor = (val: number) => (val >= 0 ? "#059669" : "#dc2626");
const yoyText = (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;

export default function HawaiiMarketComparisonClient() {
  const [selectedMonth, setSelectedMonth] = useState(
    STATEWIDE_MONTHLY_DATA[STATEWIDE_MONTHLY_DATA.length - 1].month
  );

  const statewide = useMemo(() => {
    return STATEWIDE_MONTHLY_DATA.find((m) => m.month === selectedMonth) ?? STATEWIDE_MONTHLY_DATA[STATEWIDE_MONTHLY_DATA.length - 1];
  }, [selectedMonth]);

  const hasMultipleMonths = STATEWIDE_MONTHLY_DATA.length > 1;

  // Get matching per-island data for the selected month
  const oahu = useMemo(() => {
    return OAHU_MONTHLY_DATA.find((m) => m.month === selectedMonth) ?? OAHU_MONTHLY_DATA[OAHU_MONTHLY_DATA.length - 1];
  }, [selectedMonth]);

  const maui = useMemo(() => {
    return MAUI_MONTHLY_DATA.find((m) => m.month === selectedMonth) ?? MAUI_MONTHLY_DATA[MAUI_MONTHLY_DATA.length - 1];
  }, [selectedMonth]);

  const hi = useMemo(() => {
    return HAWAII_ISLAND_MONTHLY_DATA.find((m) => m.month === selectedMonth) ?? HAWAII_ISLAND_MONTHLY_DATA[HAWAII_ISLAND_MONTHLY_DATA.length - 1];
  }, [selectedMonth]);

  const kauai = useMemo(() => {
    return KAUAI_MONTHLY_DATA.find((m) => m.month === selectedMonth) ?? KAUAI_MONTHLY_DATA[KAUAI_MONTHLY_DATA.length - 1];
  }, [selectedMonth]);

  // Trend data for line charts (across all available months)
  const trendData = useMemo(() => {
    return STATEWIDE_MONTHLY_DATA.map((m) => ({
      month: m.label.replace(/\s\d{4}$/, "").slice(0, 3),
      sfSales: m.singleFamily.totalSales2026,
      condoSales: m.condo.totalSales2026,
      sfMedianPrice: m.singleFamily.totalMedianPrice2026,
      condoMedianPrice: m.condo.totalMedianPrice2026,
    }));
  }, []);

  const sw = statewide;

  // SF Median Price Comparison
  const sfMedianPriceData = sw.singleFamily.counties.map((c) => ({
    island: c.county,
    value: c.medianPrice2026,
    color: c.county === "O'ahu" ? COLORS.oahu : c.county === "Maui" ? COLORS.maui : c.county === "Hawai'i" ? COLORS.hawaii : COLORS.kauai,
  }));

  // Condo Median Price Comparison
  const condoMedianPriceData = sw.condo.counties.map((c) => ({
    island: c.county,
    value: c.medianPrice2026,
    color: c.county === "O'ahu" ? COLORS.oahu : c.county === "Maui" ? COLORS.maui : c.county === "Hawai'i" ? COLORS.hawaii : COLORS.kauai,
  }));

  // SF Sales Volume
  const sfSalesData = sw.singleFamily.counties.map((c) => ({
    island: c.county,
    value: c.sales2026,
    color: c.county === "O'ahu" ? COLORS.oahu : c.county === "Maui" ? COLORS.maui : c.county === "Hawai'i" ? COLORS.hawaii : COLORS.kauai,
  }));

  // Condo Sales Volume
  const condoSalesData = sw.condo.counties.map((c) => ({
    island: c.county,
    value: c.sales2026,
    color: c.county === "O'ahu" ? COLORS.oahu : c.county === "Maui" ? COLORS.maui : c.county === "Hawai'i" ? COLORS.hawaii : COLORS.kauai,
  }));

  // YoY Sales Changes
  const salesYoYData = [
    ...sw.singleFamily.counties.map((c) => ({
      county: c.county,
      sfChange: c.salesChange,
      condoChange: sw.condo.counties.find((cc) => cc.county === c.county)?.salesChange ?? 0,
    })),
  ];

  // YoY Median Price Changes
  const priceYoYData = [
    ...sw.singleFamily.counties.map((c) => ({
      county: c.county,
      sfChange: c.medianPriceChange,
      condoChange: sw.condo.counties.find((cc) => cc.county === c.county)?.medianPriceChange ?? 0,
    })),
  ];

  const exportReport = (format: "pdf" | "xlsx") => {
    const sfRows = sw.singleFamily.counties.map((c) => {
      const cd = sw.condo.counties.find((cc) => cc.county === c.county);
      return {
        County: c.county,
        "SF Sales 2026": c.sales2026,
        "SF Sales 2025": c.sales2025,
        "SF Sales Change": `${c.salesChange}%`,
        "SF Median 2026": c.medianPrice2026,
        "SF Median 2025": c.medianPrice2025,
        "SF Median Change": `${c.medianPriceChange}%`,
        "Condo Sales 2026": cd?.sales2026 ?? "",
        "Condo Sales 2025": cd?.sales2025 ?? "",
        "Condo Sales Change": cd ? `${cd.salesChange}%` : "",
        "Condo Median 2026": cd?.medianPrice2026 ?? "",
        "Condo Median 2025": cd?.medianPrice2025 ?? "",
        "Condo Median Change": cd ? `${cd.medianPriceChange}%` : "",
      };
    });

    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(sfRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Hawaii Market Comparison");
      XLSX.writeFile(wb, "Hawaii_Market_Comparison.xlsx");
    } else {
      const doc = new jsPDF({ orientation: "landscape" });
      const pw = doc.internal.pageSize.getWidth();
      let y = 20;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Hawaii Market Comparison", pw / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${statewide.label} — Generated ${new Date().toLocaleDateString()}`, pw / 2, y, { align: "center" });
      y += 14;

      doc.setFontSize(8);
      const headers = ["County", "SF Sales '26", "SF Sales '25", "SF Chg", "SF Med '26", "Condo Sales '26", "Condo Sales '25", "Condo Chg", "Condo Med '26"];
      const colW = (pw - 20) / headers.length;
      doc.setFont("helvetica", "bold");
      headers.forEach((h, i) => doc.text(h, 10 + i * colW, y));
      y += 6;
      doc.setFont("helvetica", "normal");

      sfRows.forEach((row) => {
        if (y > 190) { doc.addPage(); y = 20; }
        const vals = [
          row.County,
          String(row["SF Sales 2026"]),
          String(row["SF Sales 2025"]),
          row["SF Sales Change"],
          `$${(Number(row["SF Median 2026"]) / 1000).toFixed(0)}K`,
          String(row["Condo Sales 2026"]),
          String(row["Condo Sales 2025"]),
          String(row["Condo Sales Change"]),
          row["Condo Median 2026"] ? `$${(Number(row["Condo Median 2026"]) / 1000).toFixed(0)}K` : "",
        ];
        vals.forEach((v, i) => doc.text(v, 10 + i * colW, y));
        y += 5;
      });

      doc.save("Hawaii_Market_Comparison.pdf");
    }
  };

  const cardStyle: React.CSSProperties = {
    padding: 20,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  };

  const colorForCounty = (county: string) =>
    county === "O'ahu" ? COLORS.oahu : county === "Maui" ? COLORS.maui : county === "Hawai'i" ? COLORS.hawaii : COLORS.kauai;

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", borderRadius: 12, color: "#fff", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{statewide.label} — All Islands</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>
            Official statewide statistics from Hawai&apos;i Realtors®
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            {[
              { label: "O'ahu", color: COLORS.oahu },
              { label: "Maui", color: COLORS.maui },
              { label: "Hawai'i Island", color: COLORS.hawaii },
              { label: "Kaua'i", color: COLORS.kauai },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                {s.label}
              </div>
            ))}
          </div>
        </div>
        {hasMultipleMonths && (
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.2)", color: "#fff" }}
          >
            {STATEWIDE_MONTHLY_DATA.map((m) => (
              <option key={m.month} value={m.month} style={{ color: "#1e293b" }}>{m.label}</option>
            ))}
          </select>
        )}
      </div>

      <div className="noprint" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => exportReport("xlsx")} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", color: "#374151", cursor: "pointer" }}>Export Excel</button>
        <button onClick={() => exportReport("pdf")} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, background: "#dc2626", color: "#fff", cursor: "pointer" }}>Export PDF</button>
      </div>

      {/* Statewide Totals Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={{ ...cardStyle, borderTop: "4px solid #1e293b" }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Statewide SF Median</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(sw.singleFamily.totalMedianPrice2026)}</div>
          <div style={{ fontSize: 13, color: yoyColor(sw.singleFamily.totalMedianPriceChange), fontWeight: 600 }}>
            {yoyText(sw.singleFamily.totalMedianPriceChange)} YoY
          </div>
        </div>
        <div style={{ ...cardStyle, borderTop: "4px solid #475569" }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Statewide Condo Median</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(sw.condo.totalMedianPrice2026)}</div>
          <div style={{ fontSize: 13, color: yoyColor(sw.condo.totalMedianPriceChange), fontWeight: 600 }}>
            {yoyText(sw.condo.totalMedianPriceChange)} YoY
          </div>
        </div>
        <div style={{ ...cardStyle, borderTop: "4px solid #64748b" }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Total SF Sales</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{sw.singleFamily.totalSales2026}</div>
          <div style={{ fontSize: 13, color: yoyColor(sw.singleFamily.totalSalesChange), fontWeight: 600 }}>
            {yoyText(sw.singleFamily.totalSalesChange)} YoY ({sw.singleFamily.totalSales2025} prev)
          </div>
        </div>
        <div style={{ ...cardStyle, borderTop: "4px solid #94a3b8" }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Total Condo Sales</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{sw.condo.totalSales2026}</div>
          <div style={{ fontSize: 13, color: yoyColor(sw.condo.totalSalesChange), fontWeight: 600 }}>
            {yoyText(sw.condo.totalSalesChange)} YoY ({sw.condo.totalSales2025} prev)
          </div>
        </div>
      </div>

      {/* Island KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        {sw.singleFamily.counties.map((sfCounty) => {
          const cdCounty = sw.condo.counties.find((c) => c.county === sfCounty.county)!;
          const color = colorForCounty(sfCounty.county);
          return (
            <div key={sfCounty.county} style={{ ...cardStyle, borderTop: `4px solid ${color}` }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color }}>{sfCounty.county}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>SF Median</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(sfCounty.medianPrice2026)}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: yoyColor(sfCounty.medianPriceChange) }}>{yoyText(sfCounty.medianPriceChange)}</div>
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8, marginBottom: 2 }}>Condo Median</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(cdCounty.medianPrice2026)}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: yoyColor(cdCounty.medianPriceChange) }}>{yoyText(cdCounty.medianPriceChange)}</div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "#6b7280" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#374151" }}>{sfCounty.sales2026} / {cdCounty.sales2026}</div>
                  <div>SF / Condo Sales</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: yoyColor(sfCounty.salesChange) }}>{yoyText(sfCounty.salesChange)}</div>
                  <div>SF Sales YoY</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Market Highlights */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Market Highlights</h3>
        <ul style={{ margin: 0, padding: "0 0 0 20px", fontSize: 14, lineHeight: 2, color: "#374151" }}>
          {statewide.highlights.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      </div>

      {/* Trend Line Charts */}
      {hasMultipleMonths && (
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ ...cardStyle, flex: "1 1 380px" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Statewide Median Price Trend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => fmt(value)} />
                <Legend />
                <Line type="monotone" dataKey="sfMedianPrice" name="SF Median" stroke="#1e293b" strokeWidth={3} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="condoMedianPrice" name="Condo Median" stroke="#94a3b8" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ ...cardStyle, flex: "1 1 380px" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Statewide Sales Trend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sfSales" name="SF Sales" stroke="#1e293b" strokeWidth={3} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="condoSales" name="Condo Sales" stroke="#94a3b8" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* SF Median Price Comparison */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Single-Family Median Price by County</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sfMedianPriceData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="island" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: any) => fmt(value)} />
            <Bar dataKey="value" name="Median Price" radius={[6, 6, 0, 0]}>
              {sfMedianPriceData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Condo Median Price Comparison */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Condo Median Price by County</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={condoMedianPriceData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="island" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: any) => fmt(value)} />
            <Bar dataKey="value" name="Median Price" radius={[6, 6, 0, 0]}>
              {condoMedianPriceData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* YoY Changes: Sales + Price */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Sales Volume YoY Change (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesYoYData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="county" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="sfChange" name="SF Sales" fill="#1e293b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="condoChange" name="Condo Sales" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Median Price YoY Change (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={priceYoYData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="county" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="sfChange" name="SF Price" fill="#1e293b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="condoChange" name="Condo Price" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales Volume: SF + Condo Pies */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>SF Sales by County</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={sfSalesData}
                dataKey="value"
                nameKey="island"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={40}
                label={(props: any) => `${props.island}: ${props.value}`}
                labelLine
              >
                {sfSalesData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 13, color: "#6b7280" }}>Total: {sw.singleFamily.totalSales2026} SF sales statewide</div>
        </div>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Condo Sales by County</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={condoSalesData}
                dataKey="value"
                nameKey="island"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={40}
                label={(props: any) => `${props.island}: ${props.value}`}
                labelLine
              >
                {condoSalesData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 13, color: "#6b7280" }}>Total: {sw.condo.totalSales2026} condo sales statewide</div>
        </div>
      </div>

      {/* Days on Market Comparison (from per-island data) */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>SF Days on Market</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                { island: "O'ahu", value: oahu.singleFamily.medianDOM, color: COLORS.oahu },
                { island: "Maui", value: maui.singleFamily.dom, color: COLORS.maui },
                { island: "Hawai'i", value: hi.singleFamily.dom, color: COLORS.hawaii },
                { island: "Kaua'i", value: kauai.singleFamily.dom, color: COLORS.kauai },
              ]}
              margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="island" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => `${value} days`} />
              <Bar dataKey="value" name="Days" radius={[6, 6, 0, 0]}>
                {[COLORS.oahu, COLORS.maui, COLORS.hawaii, COLORS.kauai].map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Condo Days on Market</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                { island: "O'ahu", value: oahu.condo.medianDOM, color: COLORS.oahu },
                { island: "Maui", value: maui.condo.dom, color: COLORS.maui },
                { island: "Hawai'i", value: hi.condo.dom, color: COLORS.hawaii },
                { island: "Kaua'i", value: kauai.condo.dom, color: COLORS.kauai },
              ]}
              margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="island" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => `${value} days`} />
              <Bar dataKey="value" name="Days" radius={[6, 6, 0, 0]}>
                {[COLORS.oahu, COLORS.maui, COLORS.hawaii, COLORS.kauai].map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inventory Comparison */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>SF Active Inventory</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                { island: "O'ahu", value: oahu.singleFamily.activeInventory, color: COLORS.oahu },
                { island: "Maui", value: maui.singleFamily.inventory, color: COLORS.maui },
                { island: "Hawai'i", value: hi.singleFamily.activeListings, color: COLORS.hawaii },
                { island: "Kaua'i", value: kauai.singleFamily.activeListings, color: COLORS.kauai },
              ]}
              margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="island" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Active Listings" radius={[6, 6, 0, 0]}>
                {[COLORS.oahu, COLORS.maui, COLORS.hawaii, COLORS.kauai].map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Condo Active Inventory</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                { island: "O'ahu", value: oahu.condo.activeInventory, color: COLORS.oahu },
                { island: "Maui", value: maui.condo.inventory, color: COLORS.maui },
                { island: "Hawai'i", value: hi.condo.activeListings, color: COLORS.hawaii },
                { island: "Kaua'i", value: kauai.condo.activeListings, color: COLORS.kauai },
              ]}
              margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="island" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Active Listings" radius={[6, 6, 0, 0]}>
                {[COLORS.oahu, COLORS.maui, COLORS.hawaii, COLORS.kauai].map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Official Statewide Data Tables */}
      <div style={{ ...cardStyle, marginBottom: 24, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>Single-Family Homes — {statewide.label}</h3>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Source: Hawai&apos;i Realtors® Statewide Real Estate Statistics</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>County</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>2026 Sales</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>2025 Sales</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>% Change</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>2026 Median</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>2025 Median</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>% Change</th>
            </tr>
          </thead>
          <tbody>
            {sw.singleFamily.counties.map((c, i) => (
              <tr key={c.county} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: colorForCounty(c.county) }}>{c.county}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{c.sales2026}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280" }}>{c.sales2025}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: yoyColor(c.salesChange) }}>{yoyText(c.salesChange)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{fmt(c.medianPrice2026)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280" }}>{fmt(c.medianPrice2025)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: yoyColor(c.medianPriceChange) }}>{yoyText(c.medianPriceChange)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 800, background: "#f8fafc" }}>
              <td style={{ padding: "10px 12px" }}>Total</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{sw.singleFamily.totalSales2026}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280" }}>{sw.singleFamily.totalSales2025}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: yoyColor(sw.singleFamily.totalSalesChange) }}>{yoyText(sw.singleFamily.totalSalesChange)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmt(sw.singleFamily.totalMedianPrice2026)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280" }}>{fmt(sw.singleFamily.totalMedianPrice2025)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: yoyColor(sw.singleFamily.totalMedianPriceChange) }}>{yoyText(sw.singleFamily.totalMedianPriceChange)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ ...cardStyle, marginBottom: 24, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>Condominiums — {statewide.label}</h3>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Source: Hawai&apos;i Realtors® Statewide Real Estate Statistics</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>County</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>2026 Sales</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>2025 Sales</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>% Change</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>2026 Median</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>2025 Median</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>% Change</th>
            </tr>
          </thead>
          <tbody>
            {sw.condo.counties.map((c, i) => (
              <tr key={c.county} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: colorForCounty(c.county) }}>{c.county}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{c.sales2026}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280" }}>{c.sales2025}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: yoyColor(c.salesChange) }}>{yoyText(c.salesChange)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{fmt(c.medianPrice2026)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280" }}>{fmt(c.medianPrice2025)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: yoyColor(c.medianPriceChange) }}>{yoyText(c.medianPriceChange)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 800, background: "#f8fafc" }}>
              <td style={{ padding: "10px 12px" }}>Total</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{sw.condo.totalSales2026}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280" }}>{sw.condo.totalSales2025}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: yoyColor(sw.condo.totalSalesChange) }}>{yoyText(sw.condo.totalSalesChange)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmt(sw.condo.totalMedianPrice2026)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280" }}>{fmt(sw.condo.totalMedianPrice2025)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: yoyColor(sw.condo.totalMedianPriceChange) }}>{yoyText(sw.condo.totalMedianPriceChange)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* YTD Table (if available) */}
      {sw.ytd && (
        <div style={{ ...cardStyle, marginBottom: 24, overflowX: "auto" }}>
          <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>Year-to-Date Through {statewide.label}</h3>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Cumulative sales and median prices for 2026 vs 2025</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>County</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>SF Sales</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>SF Sales YoY</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>SF Median</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>Condo Sales</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>Condo Sales YoY</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>Condo Median</th>
              </tr>
            </thead>
            <tbody>
              {sw.ytd.singleFamily.counties.map((sfC, i) => {
                const cdC = sw.ytd!.condo.counties.find((c) => c.county === sfC.county)!;
                return (
                  <tr key={sfC.county} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: colorForCounty(sfC.county) }}>{sfC.county}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{sfC.sales2026}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: yoyColor(sfC.salesChange) }}>{yoyText(sfC.salesChange)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{fmt(sfC.medianPrice2026)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{cdC.sales2026}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: yoyColor(cdC.salesChange) }}>{yoyText(cdC.salesChange)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{fmt(cdC.medianPrice2026)}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 800, background: "#f8fafc" }}>
                <td style={{ padding: "10px 12px" }}>Total</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{sw.ytd.singleFamily.totalSales2026}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: yoyColor(sw.ytd.singleFamily.totalSalesChange) }}>{yoyText(sw.ytd.singleFamily.totalSalesChange)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmt(sw.ytd.singleFamily.totalMedianPrice2026)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{sw.ytd.condo.totalSales2026}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: yoyColor(sw.ytd.condo.totalSalesChange) }}>{yoyText(sw.ytd.condo.totalSalesChange)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmt(sw.ytd.condo.totalMedianPrice2026)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Source Attribution */}
      <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "12px 0", lineHeight: 1.8 }}>
        Source: Hawai&apos;i Realtors® &middot; Statewide Real Estate Statistics
        <br />
        &ldquo;Total&rdquo; price reflects a statewide median sales price based on a calculation of sales prices for all counties.
        <br />
        Information is deemed reliable but not guaranteed.
      </div>
    </div>
  );
}
