"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

interface PipelineStage {
  name: string;
  avgDays: number;
  currentCount: number;
  conversionToNext: number;
}

interface StuckDeal {
  name: string;
  stage: string;
  daysInStage: number;
  avgForStage: number;
  source: string;
  value: number;
}

const SAMPLE_STAGES: PipelineStage[] = [
  { name: "New Lead", avgDays: 1.2, currentCount: 47, conversionToNext: 68 },
  { name: "Contacted", avgDays: 3.5, currentCount: 32, conversionToNext: 52 },
  { name: "Showing", avgDays: 8.2, currentCount: 18, conversionToNext: 44 },
  { name: "Under Contract", avgDays: 28.5, currentCount: 6, conversionToNext: 85 },
  { name: "Closed", avgDays: 0, currentCount: 53, conversionToNext: 100 },
];

const SAMPLE_STUCK_DEALS: StuckDeal[] = [
  { name: "Sarah Johnson", stage: "Contacted", daysInStage: 12, avgForStage: 3.5, source: "Zillow", value: 425000 },
  { name: "Michael Chen", stage: "Showing", daysInStage: 22, avgForStage: 8.2, source: "Google Ads", value: 380000 },
  { name: "Emily Rodriguez", stage: "Contacted", daysInStage: 9, avgForStage: 3.5, source: "Facebook", value: 295000 },
  { name: "David Kim", stage: "Showing", daysInStage: 19, avgForStage: 8.2, source: "Referral", value: 520000 },
  { name: "Amanda Torres", stage: "New Lead", daysInStage: 5, avgForStage: 1.2, source: "Realtor.com", value: 350000 },
  { name: "Robert Phillips", stage: "Showing", daysInStage: 18, avgForStage: 8.2, source: "Open House", value: 410000 },
];

const DATE_RANGES = [
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "Last 6 Months", value: "6m" },
  { label: "Year to Date", value: "ytd" },
  { label: "Last 12 Months", value: "12m" },
];

export default function PipelineVelocityClient() {
  const [dateRange, setDateRange] = useState("90d");
  const [useSampleData] = useState(true);

  const stages = useMemo(() => SAMPLE_STAGES, []);
  const stuckDeals = useMemo(() => SAMPLE_STUCK_DEALS, []);

  const bottleneckStage = useMemo(() => {
    const nonClosed = stages.filter((s) => s.name !== "Closed");
    return nonClosed.reduce((worst, s) => (s.avgDays > worst.avgDays ? s : worst), nonClosed[0]);
  }, [stages]);

  const totalAvgDays = useMemo(() => {
    return stages.filter((s) => s.name !== "Closed").reduce((sum, s) => sum + s.avgDays, 0);
  }, [stages]);

  const maxCount = useMemo(() => Math.max(...stages.map((s) => s.currentCount)), [stages]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Pipeline Velocity Report", pw / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString()} | Range: ${DATE_RANGES.find((d) => d.value === dateRange)?.label}`, pw / 2, y, { align: "center" });
    y += 14;

    // Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Pipeline Summary", 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Average Lead-to-Close: ${totalAvgDays.toFixed(1)} days`, 25, y); y += 6;
    doc.text(`Bottleneck Stage: ${bottleneckStage.name} (${bottleneckStage.avgDays} avg days)`, 25, y); y += 6;
    doc.text(`Stuck Deals: ${stuckDeals.length}`, 25, y); y += 12;

    // Stage table
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Stage Breakdown", 20, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const cols = [20, 65, 95, 130, 160];
    ["Stage", "Avg Days", "Current Leads", "Conv. to Next", "Status"].forEach((h, i) => doc.text(h, cols[i], y));
    y += 2;
    doc.line(20, y, pw - 20, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    stages.forEach((s) => {
      const isBottleneck = s.name === bottleneckStage.name;
      doc.text(s.name, cols[0], y);
      doc.text(s.name === "Closed" ? "-" : `${s.avgDays}d`, cols[1], y);
      doc.text(String(s.currentCount), cols[2], y);
      doc.text(s.name === "Closed" ? "-" : `${s.conversionToNext}%`, cols[3], y);
      doc.text(isBottleneck ? "BOTTLENECK" : "OK", cols[4], y);
      y += 6;
    });
    y += 8;

    // Stuck deals
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Stuck Deals (2x+ Average)", 20, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const sdCols = [20, 60, 95, 125, 155];
    ["Name", "Stage", "Days Stuck", "Avg for Stage", "Value"].forEach((h, i) => doc.text(h, sdCols[i], y));
    y += 2;
    doc.line(20, y, pw - 20, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    stuckDeals.forEach((d) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(d.name, sdCols[0], y);
      doc.text(d.stage, sdCols[1], y);
      doc.text(`${d.daysInStage}d`, sdCols[2], y);
      doc.text(`${d.avgForStage}d`, sdCols[3], y);
      doc.text(fmt(d.value), sdCols[4], y);
      y += 6;
    });

    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleDateString()} - RealEstateGenie`, pw / 2, footerY, { align: "center" });
    doc.save(`Pipeline_Velocity_${dateRange}.pdf`);
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
            <span style={{ fontSize: 13, opacity: 0.8, marginLeft: 8 }}>Connect GoHighLevel to see your real pipeline data.</span>
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
        <div style={{ ...cardStyle, borderLeft: "4px solid #3b82f6" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Avg Lead-to-Close</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totalAvgDays.toFixed(1)}d</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>across all stages</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #ef4444" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Bottleneck Stage</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#dc2626" }}>{bottleneckStage.name}</div>
          <div style={{ fontSize: 14, color: "#ef4444", fontWeight: 600 }}>{bottleneckStage.avgDays} avg days</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Stuck Deals</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#d97706" }}>{stuckDeals.length}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>leads in stage 2x+ longer than avg</div>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Pipeline Funnel</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {stages.map((s, idx) => {
            const widthPct = stages[0].currentCount > 0 ? Math.max(15, (s.currentCount / stages[0].currentCount) * 100) : 100;
            const isBottleneck = s.name === bottleneckStage.name;
            const colors = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#10b981"];
            return (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 120, fontSize: 13, fontWeight: 600, textAlign: "right", flexShrink: 0 }}>
                  {s.name}
                  {isBottleneck && <span style={{ display: "block", fontSize: 10, color: "#dc2626", fontWeight: 700 }}>BOTTLENECK</span>}
                </div>
                <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                  <div
                    style={{
                      width: `${widthPct}%`,
                      height: 44,
                      background: isBottleneck ? "#fef2f2" : "#f9fafb",
                      border: isBottleneck ? "2px solid #fca5a5" : `2px solid ${colors[idx]}33`,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${s.name === "Closed" ? 100 : s.conversionToNext}%`,
                        background: `${colors[idx]}20`,
                        borderRadius: 6,
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, zIndex: 1 }}>
                      {s.currentCount} leads
                    </span>
                  </div>
                </div>
                <div style={{ width: 100, fontSize: 12, color: "#6b7280", flexShrink: 0 }}>
                  {s.name === "Closed" ? (
                    <span style={{ color: "#059669", fontWeight: 600 }}>Complete</span>
                  ) : (
                    <>
                      <div>{s.avgDays}d avg</div>
                      <div>{s.conversionToNext}% conv.</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Detail Table */}
      <div style={{ ...cardStyle, marginBottom: 24, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Stage Metrics</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              {["Stage", "Avg Days in Stage", "Current Leads", "Conversion to Next", "Status"].map((h) => (
                <th key={h} style={{ padding: "10px 8px", textAlign: h === "Stage" ? "left" : "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stages.map((s) => {
              const isBottleneck = s.name === bottleneckStage.name;
              return (
                <tr key={s.name} style={{ borderBottom: "1px solid #f3f4f6", background: isBottleneck ? "#fef2f2" : "transparent" }}>
                  <td style={{ padding: "10px 8px", fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>
                    {s.name === "Closed" ? "-" : `${s.avgDays} days`}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(s.currentCount / maxCount) * 100}%`, background: isBottleneck ? "#ef4444" : "#3b82f6", borderRadius: 3 }} />
                      </div>
                      {s.currentCount}
                    </div>
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right", color: s.conversionToNext >= 70 ? "#059669" : s.conversionToNext >= 40 ? "#d97706" : "#dc2626", fontWeight: 600 }}>
                    {s.name === "Closed" ? "-" : `${s.conversionToNext}%`}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>
                    {isBottleneck ? (
                      <span style={{ padding: "3px 10px", background: "#fef2f2", color: "#dc2626", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Bottleneck</span>
                    ) : s.name === "Closed" ? (
                      <span style={{ padding: "3px 10px", background: "#ecfdf5", color: "#059669", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Complete</span>
                    ) : (
                      <span style={{ padding: "3px 10px", background: "#f0fdf4", color: "#16a34a", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Normal</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stuck Deals */}
      <div style={{ ...cardStyle, marginBottom: 24, borderLeft: "4px solid #f59e0b" }}>
        <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>Stuck Deals</h3>
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#6b7280" }}>
          Leads that have been in their current stage for 2x or longer than the average.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              {["Lead", "Stage", "Days in Stage", "Stage Avg", "Overdue By", "Source", "Est. Value"].map((h) => (
                <th key={h} style={{ padding: "8px 6px", textAlign: h === "Lead" || h === "Stage" || h === "Source" ? "left" : "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stuckDeals.map((d, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 6px", fontWeight: 600 }}>{d.name}</td>
                <td style={{ padding: "8px 6px" }}>{d.stage}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "#dc2626", fontWeight: 700 }}>{d.daysInStage}d</td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{d.avgForStage}d</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "#dc2626", fontWeight: 600 }}>
                  +{(d.daysInStage - d.avgForStage).toFixed(1)}d ({(d.daysInStage / d.avgForStage).toFixed(1)}x)
                </td>
                <td style={{ padding: "8px 6px" }}>{d.source}</td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{fmt(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
