"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ScatterChart, Scatter, ZAxis, Cell,
} from "recharts";

interface LeadSource {
  name: string;
  leads: number;
  closings: number;
  totalSpend: number;
  revenue: number;
}

const FALLBACK_DATA: LeadSource[] = [
  { name: "Zillow", leads: 124, closings: 8, totalSpend: 4200, revenue: 52000 },
  { name: "Realtor.com", leads: 98, closings: 5, totalSpend: 3100, revenue: 31500 },
  { name: "Referral", leads: 34, closings: 12, totalSpend: 600, revenue: 89000 },
  { name: "Facebook Ads", leads: 210, closings: 6, totalSpend: 5800, revenue: 38400 },
  { name: "Google Ads", leads: 156, closings: 7, totalSpend: 6200, revenue: 46200 },
  { name: "Open Houses", leads: 45, closings: 4, totalSpend: 1200, revenue: 28800 },
  { name: "Sphere of Influence", leads: 22, closings: 9, totalSpend: 300, revenue: 67500 },
  { name: "Cold Calling", leads: 68, closings: 2, totalSpend: 1800, revenue: 13000 },
];

const DATE_RANGES = [
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "Last 6 Months", value: "6m" },
  { label: "Year to Date", value: "ytd" },
  { label: "Last 12 Months", value: "12m" },
];

export default function LeadSourceROIClient() {
  const [dateRange, setDateRange] = useState("12m");
  const [data, setData] = useState<LeadSource[]>(FALLBACK_DATA);
  const [isLive, setIsLive] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/lead-source-roi");
      if (!res.ok) throw new Error("API request failed");
      const json: LeadSource[] = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        setData(json);
        setIsLive(true);
      }
    } catch {
      // Keep fallback data
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sources = useMemo(() => {
    return data.map((s) => {
      const conversionRate = s.leads > 0 ? (s.closings / s.leads) * 100 : 0;
      const costPerLead = s.leads > 0 ? s.totalSpend / s.leads : 0;
      const costPerClosing = s.closings > 0 ? s.totalSpend / s.closings : 0;
      const roi = s.totalSpend > 0 ? ((s.revenue - s.totalSpend) / s.totalSpend) * 100 : 0;
      return { ...s, conversionRate, costPerLead, costPerClosing, roi };
    });
  }, [data]);

  const bestConversion = useMemo(() => {
    if (sources.length === 0) return null;
    return sources.reduce((best, s) => (s.conversionRate > best.conversionRate ? s : best), sources[0]);
  }, [sources]);

  const lowestCostPerClosing = useMemo(() => {
    const withClosings = sources.filter((s) => s.closings > 0);
    if (withClosings.length === 0) return null;
    return withClosings.reduce((best, s) => (s.costPerClosing < best.costPerClosing ? s : best), withClosings[0]);
  }, [sources]);

  const highestROI = useMemo(() => {
    if (sources.length === 0) return null;
    return sources.reduce((best, s) => (s.roi > best.roi ? s : best), sources[0]);
  }, [sources]);

  const maxRevenue = useMemo(() => Math.max(...sources.map((s) => s.revenue)), [sources]);

  const totalLeads = useMemo(() => sources.reduce((sum, s) => sum + s.leads, 0), [sources]);
  const totalClosings = useMemo(() => sources.reduce((sum, s) => sum + s.closings, 0), [sources]);
  const totalSpend = useMemo(() => sources.reduce((sum, s) => sum + s.totalSpend, 0), [sources]);
  const totalRevenue = useMemo(() => sources.reduce((sum, s) => sum + s.revenue, 0), [sources]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Lead Source ROI Report", pw / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString()} | Range: ${DATE_RANGES.find((d) => d.value === dateRange)?.label}`, pw / 2, y, { align: "center" });
    y += 14;

    // Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Best Conversion: ${bestConversion ? `${bestConversion.name} (${bestConversion.conversionRate.toFixed(1)}%)` : "N/A"}`, 25, y); y += 6;
    doc.text(`Lowest Cost/Closing: ${lowestCostPerClosing ? `${lowestCostPerClosing.name} (${fmt(lowestCostPerClosing.costPerClosing)})` : "N/A"}`, 25, y); y += 6;
    doc.text(`Highest ROI: ${highestROI ? `${highestROI.name} (${highestROI.roi.toFixed(0)}%)` : "N/A"}`, 25, y); y += 12;

    // Table header
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const cols = [20, 55, 72, 89, 108, 132, 153, 173];
    const headers = ["Source", "Leads", "Close", "Conv%", "Spend", "Revenue", "CPL", "ROI%"];
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(20, y, pw - 20, y);
    y += 6;

    // Table rows
    doc.setFont("helvetica", "normal");
    sources.forEach((s) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const row = [
        s.name,
        String(s.leads),
        String(s.closings),
        s.conversionRate.toFixed(1) + "%",
        fmt(s.totalSpend),
        fmt(s.revenue),
        fmt(s.costPerLead),
        s.roi.toFixed(0) + "%",
      ];
      row.forEach((val, i) => doc.text(val, cols[i], y));
      y += 6;
    });

    y += 4;
    doc.setLineWidth(0.5);
    doc.line(20, y, pw - 20, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    const totals = ["TOTAL", String(totalLeads), String(totalClosings), ((totalClosings / totalLeads) * 100).toFixed(1) + "%", fmt(totalSpend), fmt(totalRevenue), fmt(totalSpend / totalLeads), (((totalRevenue - totalSpend) / totalSpend) * 100).toFixed(0) + "%"];
    totals.forEach((val, i) => doc.text(val, cols[i], y));

    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${new Date().toLocaleDateString()} - RealEstateGenie`, pw / 2, footerY, { align: "center" });

    doc.save(`Lead_Source_ROI_${dateRange}.pdf`);
  };

  const cardStyle: React.CSSProperties = {
    padding: 20,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  };

  return (
    <div>
      {/* Integration Notice */}
      {isLive ? (
        <div style={{ padding: 16, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 10, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ fontSize: 14 }}>Live Data</strong>
            <span style={{ fontSize: 13, opacity: 0.8, marginLeft: 8 }}>Showing real lead source ROI from your integrations.</span>
          </div>
        </div>
      ) : (
        <div style={{ padding: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ fontSize: 14 }}>Sample Data</strong>
            <span style={{ fontSize: 13, opacity: 0.8, marginLeft: 8 }}>Connect GHL + QuickBooks to see your real lead source ROI.</span>
          </div>
          <Link href="/app/integrations" style={{ padding: "6px 14px", background: "#f59e0b", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Connect Integration
          </Link>
        </div>
      )}

      {/* Date Range Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        {DATE_RANGES.map((d) => (
          <button
            key={d.value}
            onClick={() => setDateRange(d.value)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              border: dateRange === d.value ? "2px solid #3b82f6" : "1px solid #d1d5db",
              borderRadius: 8,
              background: dateRange === d.value ? "#dbeafe" : "#fff",
              color: dateRange === d.value ? "#1d4ed8" : "#374151",
              cursor: "pointer",
            }}
          >
            {d.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={exportToPDF}
          style={{ padding: "8px 20px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13 }}
        >
          Export PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Best Conversion Rate</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{bestConversion?.name ?? "N/A"}</div>
          <div style={{ fontSize: 14, color: "#10b981", fontWeight: 600 }}>{bestConversion ? `${bestConversion.conversionRate.toFixed(1)}%` : "—"}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #3b82f6" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Lowest Cost per Closing</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{lowestCostPerClosing?.name ?? "N/A"}</div>
          <div style={{ fontSize: 14, color: "#3b82f6", fontWeight: 600 }}>{lowestCostPerClosing ? fmt(lowestCostPerClosing.costPerClosing) : "—"}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Highest ROI</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{highestROI?.name ?? "N/A"}</div>
          <div style={{ fontSize: 14, color: "#8b5cf6", fontWeight: 600 }}>{highestROI ? `${highestROI.roi.toFixed(0)}%` : "—"}</div>
        </div>
      </div>

      {/* Revenue vs Spend Bar Chart */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Revenue vs Spend by Lead Source</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={[...sources].sort((a, b) => b.revenue - a.revenue)} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: any) => fmt(value)} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="totalSpend" name="Spend" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ROI Bubble Chart */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>ROI vs Conversion Rate</h3>
        <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "#6b7280" }}>Bubble size = revenue generated</p>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="conversionRate" name="Conversion %" unit="%" tick={{ fontSize: 11 }} />
            <YAxis dataKey="roi" name="ROI" unit="%" tick={{ fontSize: 11 }} />
            <ZAxis dataKey="revenue" range={[60, 400]} />
            <Tooltip
              formatter={(value: any, name: any) => {
                if (name === "ROI") return `${value.toFixed(0)}%`;
                if (name === "Conversion %") return `${value.toFixed(1)}%`;
                return fmt(value);
              }}
              labelFormatter={() => ""}
            />
            <Scatter name="Lead Sources" data={sources}>
              {sources.map((s, i) => (
                <Cell key={i} fill={s.roi > 500 ? "#10b981" : s.roi > 200 ? "#3b82f6" : s.roi > 0 ? "#f59e0b" : "#ef4444"} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: "#6b7280" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "#10b981" }} /> ROI &gt; 500%
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "#3b82f6" }} /> ROI 200-500%
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b" }} /> ROI 0-200%
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "#ef4444" }} /> Negative ROI
          </div>
        </div>
      </div>

      {/* Full Data Table */}
      <div style={{ ...cardStyle, marginBottom: 24, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>All Sources &amp; Metrics</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              {["Source", "Leads", "Closings", "Conv %", "Total Spend", "Revenue", "Cost/Lead", "Cost/Close", "ROI %"].map((h) => (
                <th key={h} style={{ padding: "10px 8px", textAlign: h === "Source" ? "left" : "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sources
              .sort((a, b) => b.roi - a.roi)
              .map((s) => (
                <tr key={s.name} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 8px", fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>{s.leads}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>{s.closings}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right", color: s.conversionRate > 20 ? "#059669" : s.conversionRate > 5 ? "#1d4ed8" : "#dc2626" }}>
                    {s.conversionRate.toFixed(1)}%
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>{fmt(s.totalSpend)}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600 }}>{fmt(s.revenue)}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>{fmt(s.costPerLead)}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>{fmt(s.costPerClosing)}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: s.roi > 500 ? "#059669" : s.roi > 200 ? "#1d4ed8" : "#dc2626" }}>
                    {s.roi.toFixed(0)}%
                  </td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #e5e7eb", background: "#f9fafb" }}>
              <td style={{ padding: "10px 8px", fontWeight: 700 }}>TOTAL</td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{totalLeads}</td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{totalClosings}</td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{totalLeads > 0 ? ((totalClosings / totalLeads) * 100).toFixed(1) + "%" : "—"}</td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(totalSpend)}</td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(totalRevenue)}</td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{totalLeads > 0 ? fmt(totalSpend / totalLeads) : "—"}</td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{totalClosings > 0 ? fmt(totalSpend / totalClosings) : "—"}</td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{totalSpend > 0 ? (((totalRevenue - totalSpend) / totalSpend) * 100).toFixed(0) + "%" : "—"}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
