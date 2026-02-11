"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

interface LeadSource {
  name: string;
  leads: number;
  closings: number;
  totalSpend: number;
  revenue: number;
}

const SAMPLE_DATA: LeadSource[] = [
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
  const [useSampleData] = useState(true);

  const sources = useMemo(() => {
    return SAMPLE_DATA.map((s) => {
      const conversionRate = s.leads > 0 ? (s.closings / s.leads) * 100 : 0;
      const costPerLead = s.leads > 0 ? s.totalSpend / s.leads : 0;
      const costPerClosing = s.closings > 0 ? s.totalSpend / s.closings : 0;
      const roi = s.totalSpend > 0 ? ((s.revenue - s.totalSpend) / s.totalSpend) * 100 : 0;
      return { ...s, conversionRate, costPerLead, costPerClosing, roi };
    });
  }, []);

  const bestConversion = useMemo(() => {
    return sources.reduce((best, s) => (s.conversionRate > best.conversionRate ? s : best), sources[0]);
  }, [sources]);

  const lowestCostPerClosing = useMemo(() => {
    const withClosings = sources.filter((s) => s.closings > 0);
    return withClosings.reduce((best, s) => (s.costPerClosing < best.costPerClosing ? s : best), withClosings[0]);
  }, [sources]);

  const highestROI = useMemo(() => {
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
    doc.text(`Best Conversion: ${bestConversion.name} (${bestConversion.conversionRate.toFixed(1)}%)`, 25, y); y += 6;
    doc.text(`Lowest Cost/Closing: ${lowestCostPerClosing.name} (${fmt(lowestCostPerClosing.costPerClosing)})`, 25, y); y += 6;
    doc.text(`Highest ROI: ${highestROI.name} (${highestROI.roi.toFixed(0)}%)`, 25, y); y += 12;

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
      {useSampleData && (
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
          <div style={{ fontSize: 24, fontWeight: 700 }}>{bestConversion.name}</div>
          <div style={{ fontSize: 14, color: "#10b981", fontWeight: 600 }}>{bestConversion.conversionRate.toFixed(1)}%</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #3b82f6" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Lowest Cost per Closing</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{lowestCostPerClosing.name}</div>
          <div style={{ fontSize: 14, color: "#3b82f6", fontWeight: 600 }}>{fmt(lowestCostPerClosing.costPerClosing)}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Highest ROI</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{highestROI.name}</div>
          <div style={{ fontSize: 14, color: "#8b5cf6", fontWeight: 600 }}>{highestROI.roi.toFixed(0)}%</div>
        </div>
      </div>

      {/* Bar Chart - Revenue by Source */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Revenue by Lead Source</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sources
            .sort((a, b) => b.revenue - a.revenue)
            .map((s) => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 120, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{s.name}</div>
                <div style={{ flex: 1, height: 28, background: "#f3f4f6", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(s.revenue / maxRevenue) * 100}%`,
                      background: s.roi > 500 ? "#10b981" : s.roi > 200 ? "#3b82f6" : s.roi > 0 ? "#f59e0b" : "#ef4444",
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 8,
                      transition: "width 0.3s ease",
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", whiteSpace: "nowrap" }}>
                      {fmt(s.revenue)}
                    </span>
                  </div>
                </div>
                <div style={{ width: 60, fontSize: 12, color: s.roi > 500 ? "#059669" : s.roi > 200 ? "#1d4ed8" : "#6b7280", fontWeight: 600, textAlign: "right" }}>
                  {s.roi.toFixed(0)}% ROI
                </div>
              </div>
            ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 16, fontSize: 11, color: "#6b7280" }}>
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
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{((totalClosings / totalLeads) * 100).toFixed(1)}%</td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(totalSpend)}</td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(totalRevenue)}</td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(totalSpend / totalLeads)}</td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(totalSpend / totalClosings)}</td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{(((totalRevenue - totalSpend) / totalSpend) * 100).toFixed(0)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
