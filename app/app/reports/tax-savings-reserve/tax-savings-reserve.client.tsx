"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

interface MonthlyData {
  month: string;
  grossCommission: number;
  businessExpenses: number;
  marketingBudget: number;
}

const SAMPLE_MONTHLY_DATA: MonthlyData[] = [
  { month: "2025-01", grossCommission: 18500, businessExpenses: 3200, marketingBudget: 1800 },
  { month: "2025-02", grossCommission: 12000, businessExpenses: 2900, marketingBudget: 1500 },
  { month: "2025-03", grossCommission: 24800, businessExpenses: 3400, marketingBudget: 2200 },
  { month: "2025-04", grossCommission: 31200, businessExpenses: 3800, marketingBudget: 2500 },
  { month: "2025-05", grossCommission: 22400, businessExpenses: 3100, marketingBudget: 1900 },
  { month: "2025-06", grossCommission: 28600, businessExpenses: 3600, marketingBudget: 2100 },
  { month: "2025-07", grossCommission: 35200, businessExpenses: 4100, marketingBudget: 2800 },
  { month: "2025-08", grossCommission: 19800, businessExpenses: 3000, marketingBudget: 1700 },
  { month: "2025-09", grossCommission: 26100, businessExpenses: 3300, marketingBudget: 2000 },
  { month: "2025-10", grossCommission: 41500, businessExpenses: 4500, marketingBudget: 3200 },
  { month: "2025-11", grossCommission: 15600, businessExpenses: 2800, marketingBudget: 1400 },
  { month: "2025-12", grossCommission: 33400, businessExpenses: 3900, marketingBudget: 2600 },
];

const TAX_RATE_LOW = 0.25;
const TAX_RATE_HIGH = 0.30;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function TaxSavingsReserveClient() {
  const [selectedMonth, setSelectedMonth] = useState("2025-10");
  const [taxRate, setTaxRate] = useState(0.275);
  const [useSampleData] = useState(true);

  const monthData = useMemo(() => {
    return SAMPLE_MONTHLY_DATA.find((m) => m.month === selectedMonth) || SAMPLE_MONTHLY_DATA[0];
  }, [selectedMonth]);

  const computed = useMemo(() => {
    const taxReserveLow = monthData.grossCommission * TAX_RATE_LOW;
    const taxReserveHigh = monthData.grossCommission * TAX_RATE_HIGH;
    const taxReserveSelected = monthData.grossCommission * taxRate;
    const netTakeHome = monthData.grossCommission - taxReserveSelected - monthData.businessExpenses - monthData.marketingBudget;
    const totalDeductions = taxReserveSelected + monthData.businessExpenses + monthData.marketingBudget;
    return { taxReserveLow, taxReserveHigh, taxReserveSelected, netTakeHome, totalDeductions };
  }, [monthData, taxRate]);

  const ytd = useMemo(() => {
    const selectedIdx = SAMPLE_MONTHLY_DATA.findIndex((m) => m.month === selectedMonth);
    const ytdData = SAMPLE_MONTHLY_DATA.slice(0, selectedIdx + 1);
    const grossCommission = ytdData.reduce((sum, m) => sum + m.grossCommission, 0);
    const businessExpenses = ytdData.reduce((sum, m) => sum + m.businessExpenses, 0);
    const marketingBudget = ytdData.reduce((sum, m) => sum + m.marketingBudget, 0);
    const taxReserve = grossCommission * taxRate;
    const netTakeHome = grossCommission - taxReserve - businessExpenses - marketingBudget;
    return { grossCommission, businessExpenses, marketingBudget, taxReserve, netTakeHome, months: ytdData.length };
  }, [selectedMonth, taxRate]);

  const breakdownSegments = useMemo(() => {
    if (monthData.grossCommission === 0) return [];
    const total = monthData.grossCommission;
    return [
      { label: "Tax Reserve", value: computed.taxReserveSelected, pct: (computed.taxReserveSelected / total) * 100, color: "#ef4444" },
      { label: "Business Expenses", value: monthData.businessExpenses, pct: (monthData.businessExpenses / total) * 100, color: "#f59e0b" },
      { label: "Marketing", value: monthData.marketingBudget, pct: (monthData.marketingBudget / total) * 100, color: "#8b5cf6" },
      { label: "Net Take-Home", value: computed.netTakeHome, pct: (computed.netTakeHome / total) * 100, color: "#10b981" },
    ];
  }, [monthData, computed]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const getMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Tax & Savings Reserve Report", pw / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${getMonthLabel(selectedMonth)} | Generated ${new Date().toLocaleDateString()}`, pw / 2, y, { align: "center" });
    y += 14;

    // Monthly breakdown
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Monthly Breakdown - ${getMonthLabel(selectedMonth)}`, 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const rows: [string, string][] = [
      ["Gross Commission Income:", fmt(monthData.grossCommission)],
      [`Tax Reserve (${(taxRate * 100).toFixed(1)}%):`, `-${fmt(computed.taxReserveSelected)}`],
      ["Business Expenses:", `-${fmt(monthData.businessExpenses)}`],
      ["Marketing Budget:", `-${fmt(monthData.marketingBudget)}`],
    ];
    rows.forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 6; });
    y += 2;
    doc.setLineWidth(1);
    doc.line(20, y, pw - 20, y);
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Net Take-Home:", 25, y);
    doc.text(fmt(computed.netTakeHome), pw - 25, y, { align: "right" });
    y += 14;

    // YTD
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Year-to-Date (${ytd.months} months)`, 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const ytdRows: [string, string][] = [
      ["YTD Gross Commission:", fmt(ytd.grossCommission)],
      ["YTD Tax Reserve:", fmt(ytd.taxReserve)],
      ["YTD Business Expenses:", fmt(ytd.businessExpenses)],
      ["YTD Marketing:", fmt(ytd.marketingBudget)],
      ["YTD Net Take-Home:", fmt(ytd.netTakeHome)],
    ];
    ytdRows.forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 6; });
    y += 8;

    // Recommendation
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Recommendation", 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Set aside ${fmt(computed.taxReserveSelected)} this month for taxes.`, 25, y); y += 6;
    doc.text(`Range: ${fmt(computed.taxReserveLow)} (25%) to ${fmt(computed.taxReserveHigh)} (30%)`, 25, y);

    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleDateString()} - RealEstateGenie`, pw / 2, footerY, { align: "center" });
    doc.save(`Tax_Savings_Reserve_${selectedMonth}.pdf`);
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
            <span style={{ fontSize: 13, opacity: 0.8, marginLeft: 8 }}>Connect Stripe + QuickBooks to see your real income data.</span>
          </div>
          <Link href="/app/integrations" style={{ padding: "6px 14px", background: "#f59e0b", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Connect Integration
          </Link>
        </div>
      )}

      {/* Month Selector & Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "#fff", cursor: "pointer" }}
          >
            {SAMPLE_MONTHLY_DATA.map((m) => (
              <option key={m.month} value={m.month}>{getMonthLabel(m.month)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Tax Rate</label>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { label: "25%", value: 0.25 },
              { label: "27.5%", value: 0.275 },
              { label: "30%", value: 0.30 },
            ].map((r) => (
              <button
                key={r.value}
                onClick={() => setTaxRate(r.value)}
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: taxRate === r.value ? "2px solid #3b82f6" : "1px solid #d1d5db",
                  borderRadius: 8,
                  background: taxRate === r.value ? "#dbeafe" : "#fff",
                  color: taxRate === r.value ? "#1d4ed8" : "#374151",
                  cursor: "pointer",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={exportToPDF}
          style={{ padding: "8px 20px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13, alignSelf: "flex-end" }}
        >
          Export PDF
        </button>
      </div>

      {/* Monthly Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, borderLeft: "4px solid #3b82f6" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Gross Commission Income</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{fmt(monthData.grossCommission)}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{getMonthLabel(selectedMonth)}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Net Take-Home</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: computed.netTakeHome >= 0 ? "#059669" : "#dc2626" }}>
            {fmt(computed.netTakeHome)}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>after tax reserve, expenses &amp; marketing</div>
        </div>
      </div>

      {/* Visual Breakdown Bar */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Income Breakdown - {getMonthLabel(selectedMonth)}</h3>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 40, marginBottom: 16 }}>
          {breakdownSegments.map((seg) => (
            <div
              key={seg.label}
              style={{
                width: `${Math.max(seg.pct, 2)}%`,
                background: seg.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "width 0.3s ease",
              }}
            >
              {seg.pct > 10 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", whiteSpace: "nowrap" }}>
                  {seg.pct.toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {breakdownSegments.map((seg) => (
            <div key={seg.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f9fafb", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: seg.color }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{seg.label}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(seg.value)}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{seg.pct.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Set Aside Recommendation */}
      <div style={{ padding: 24, background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", borderRadius: 12, color: "#fff", marginBottom: 24 }}>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Set Aside This Month</div>
        <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 4 }}>{fmt(computed.taxReserveSelected)}</div>
        <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 16 }}>
          Recommended tax reserve at {(taxRate * 100).toFixed(1)}% of {fmt(monthData.grossCommission)} gross
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.15)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Conservative (25%)</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{fmt(computed.taxReserveLow)}</div>
          </div>
          <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.15)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Aggressive (30%)</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{fmt(computed.taxReserveHigh)}</div>
          </div>
        </div>
      </div>

      {/* Year-to-Date Running Totals */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>Year-to-Date Totals</h3>
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#6b7280" }}>
          Through {getMonthLabel(selectedMonth)} ({ytd.months} month{ytd.months !== 1 ? "s" : ""})
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>YTD Gross Commission</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(ytd.grossCommission)}</div>
          </div>
          <div style={{ padding: 16, background: "#ecfdf5", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>YTD Net Take-Home</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#059669" }}>{fmt(ytd.netTakeHome)}</div>
          </div>
          <div style={{ padding: 16, background: "#fef2f2", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>YTD Tax Reserve</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#dc2626" }}>{fmt(ytd.taxReserve)}</div>
          </div>
          <div style={{ padding: 16, background: "#fffbeb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>YTD Expenses + Marketing</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#d97706" }}>{fmt(ytd.businessExpenses + ytd.marketingBudget)}</div>
          </div>
        </div>

        {/* Monthly bar chart */}
        <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Monthly Gross Commission</h4>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 120 }}>
          {SAMPLE_MONTHLY_DATA.map((m) => {
            const maxGross = Math.max(...SAMPLE_MONTHLY_DATA.map((d) => d.grossCommission));
            const heightPct = maxGross > 0 ? (m.grossCommission / maxGross) * 100 : 0;
            const isSelected = m.month === selectedMonth;
            const monthNum = parseInt(m.month.split("-")[1]);
            return (
              <div
                key={m.month}
                onClick={() => setSelectedMonth(m.month)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
                  {fmt(m.grossCommission).replace("$", "")}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: `${heightPct}%`,
                    minHeight: 4,
                    background: isSelected ? "#3b82f6" : "#dbeafe",
                    borderRadius: "4px 4px 0 0",
                    border: isSelected ? "2px solid #1d4ed8" : "none",
                    transition: "all 0.2s",
                  }}
                />
                <div style={{ fontSize: 10, marginTop: 4, fontWeight: isSelected ? 700 : 400, color: isSelected ? "#1d4ed8" : "#6b7280" }}>
                  {MONTH_NAMES[monthNum - 1].slice(0, 3)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
