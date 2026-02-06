"use client";

import { useState } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

/* ---------- helpers ---------- */
const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (n: number) => `${n.toFixed(1)}%`;

/* ---------- sample data ---------- */
type Period = "this_quarter" | "this_year" | "last_year";

interface MonthRow {
  month: string;
  grossRevenue: number;
  agentSplits: number;
  fees: number;
  opEx: number;
  companyDollar: number;
}

const DATA: Record<Period, MonthRow[]> = {
  this_quarter: [
    { month: "Oct 2025", grossRevenue: 187500, agentSplits: 131250, fees: 8400, opEx: 18200, companyDollar: 29650 },
    { month: "Nov 2025", grossRevenue: 162300, agentSplits: 113610, fees: 7200, opEx: 17800, companyDollar: 23690 },
    { month: "Dec 2025", grossRevenue: 204800, agentSplits: 143360, fees: 9600, opEx: 19100, companyDollar: 32740 },
  ],
  this_year: [
    { month: "Jan 2025", grossRevenue: 145200, agentSplits: 101640, fees: 6300, opEx: 16500, companyDollar: 20760 },
    { month: "Feb 2025", grossRevenue: 138700, agentSplits: 97090, fees: 5800, opEx: 16200, companyDollar: 19610 },
    { month: "Mar 2025", grossRevenue: 172400, agentSplits: 120680, fees: 7600, opEx: 17100, companyDollar: 27020 },
    { month: "Apr 2025", grossRevenue: 198300, agentSplits: 138810, fees: 8800, opEx: 18400, companyDollar: 32290 },
    { month: "May 2025", grossRevenue: 215600, agentSplits: 150920, fees: 9400, opEx: 19000, companyDollar: 36280 },
    { month: "Jun 2025", grossRevenue: 232100, agentSplits: 162470, fees: 10200, opEx: 19800, companyDollar: 39630 },
    { month: "Jul 2025", grossRevenue: 221400, agentSplits: 154980, fees: 9800, opEx: 19500, companyDollar: 37120 },
    { month: "Aug 2025", grossRevenue: 209800, agentSplits: 146860, fees: 9200, opEx: 18900, companyDollar: 34840 },
    { month: "Sep 2025", grossRevenue: 195600, agentSplits: 136920, fees: 8600, opEx: 18500, companyDollar: 31580 },
    { month: "Oct 2025", grossRevenue: 187500, agentSplits: 131250, fees: 8400, opEx: 18200, companyDollar: 29650 },
    { month: "Nov 2025", grossRevenue: 162300, agentSplits: 113610, fees: 7200, opEx: 17800, companyDollar: 23690 },
    { month: "Dec 2025", grossRevenue: 204800, agentSplits: 143360, fees: 9600, opEx: 19100, companyDollar: 32740 },
  ],
  last_year: [
    { month: "Jan 2024", grossRevenue: 128400, agentSplits: 89880, fees: 5400, opEx: 15200, companyDollar: 17920 },
    { month: "Feb 2024", grossRevenue: 121900, agentSplits: 85330, fees: 4900, opEx: 14800, companyDollar: 16870 },
    { month: "Mar 2024", grossRevenue: 155300, agentSplits: 108710, fees: 6700, opEx: 15900, companyDollar: 23990 },
    { month: "Apr 2024", grossRevenue: 174600, agentSplits: 122220, fees: 7800, opEx: 16800, companyDollar: 27780 },
    { month: "May 2024", grossRevenue: 192400, agentSplits: 134680, fees: 8500, opEx: 17300, companyDollar: 31920 },
    { month: "Jun 2024", grossRevenue: 208700, agentSplits: 146090, fees: 9200, opEx: 18000, companyDollar: 35410 },
    { month: "Jul 2024", grossRevenue: 198500, agentSplits: 138950, fees: 8800, opEx: 17600, companyDollar: 33150 },
    { month: "Aug 2024", grossRevenue: 186200, agentSplits: 130340, fees: 8200, opEx: 17200, companyDollar: 30460 },
    { month: "Sep 2024", grossRevenue: 171800, agentSplits: 120260, fees: 7500, opEx: 16700, companyDollar: 27340 },
    { month: "Oct 2024", grossRevenue: 163400, agentSplits: 114380, fees: 7100, opEx: 16400, companyDollar: 25520 },
    { month: "Nov 2024", grossRevenue: 142600, agentSplits: 99820, fees: 6100, opEx: 15700, companyDollar: 20980 },
    { month: "Dec 2024", grossRevenue: 178900, agentSplits: 125230, fees: 7900, opEx: 16300, companyDollar: 29470 },
  ],
};

const PERIOD_LABELS: Record<Period, string> = {
  this_quarter: "This Quarter",
  this_year: "This Year",
  last_year: "Last Year",
};

/* ---------- component ---------- */
export default function CompanyDollarClient() {
  const [period, setPeriod] = useState<Period>("this_year");
  const rows = DATA[period];

  /* derived stats */
  const ytdCompanyDollar = rows.reduce((s, r) => s + r.companyDollar, 0);
  const ytdGross = rows.reduce((s, r) => s + r.grossRevenue, 0);
  const thisMonth = rows[rows.length - 1].companyDollar;
  const avgMonthly = Math.round(ytdCompanyDollar / rows.length);
  const companyDollarPct = ytdGross > 0 ? (ytdCompanyDollar / ytdGross) * 100 : 0;

  /* chart helpers */
  const maxCD = Math.max(...rows.map((r) => r.companyDollar));

  /* PDF export */
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Company Dollar Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${PERIOD_LABELS[period]}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);

    /* summary */
    doc.setFontSize(12);
    doc.text(`YTD Company Dollar: ${fmt.format(ytdCompanyDollar)}`, 14, 46);
    doc.text(`This Month: ${fmt.format(thisMonth)}`, 14, 53);
    doc.text(`Avg Monthly: ${fmt.format(avgMonthly)}`, 14, 60);
    doc.text(`Company Dollar %: ${pct(companyDollarPct)}`, 14, 67);

    /* table header */
    let y = 80;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const cols = [14, 44, 80, 110, 140, 168];
    ["Month", "Gross Revenue", "Agent Splits", "Fees", "OpEx", "Company $"].forEach((h, i) => doc.text(h, cols[i], y));
    doc.setFont("helvetica", "normal");

    rows.forEach((r) => {
      y += 7;
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(r.month, cols[0], y);
      doc.text(fmt.format(r.grossRevenue), cols[1], y);
      doc.text(fmt.format(r.agentSplits), cols[2], y);
      doc.text(fmt.format(r.fees), cols[3], y);
      doc.text(fmt.format(r.opEx), cols[4], y);
      doc.text(fmt.format(r.companyDollar), cols[5], y);
    });

    doc.save("company-dollar-report.pdf");
  };

  /* ---------- styles ---------- */
  const card = (bg: string): React.CSSProperties => ({
    background: bg,
    borderRadius: 12,
    padding: "18px 20px",
    flex: "1 1 0",
    minWidth: 180,
  });

  return (
    <div>
      {/* integration banner */}
      <div style={{ background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 10, padding: "12px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>&#9888;</span>
        <span style={{ fontSize: 14 }}>
          This report uses <strong>sample data</strong>. Connect your QuickBooks Online account to see real numbers.{" "}
          <Link href="/app/integrations" style={{ color: "#1565C0", fontWeight: 600 }}>Set up integrations &rarr;</Link>
        </span>
      </div>

      {/* toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: period === p ? "#111" : "#fff",
                color: period === p ? "#fff" : "#333",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          onClick={exportPDF}
          style={{ padding: "7px 18px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Export PDF
        </button>
      </div>

      {/* summary cards */}
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={card("#F1F8E9")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>YTD Company Dollar</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt.format(ytdCompanyDollar)}</div>
        </div>
        <div style={card("#E3F2FD")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>This Month</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt.format(thisMonth)}</div>
        </div>
        <div style={card("#FFF3E0")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Avg Monthly</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt.format(avgMonthly)}</div>
        </div>
        <div style={card("#F3E5F5")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Company Dollar %</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{pct(companyDollarPct)}</div>
        </div>
      </div>

      {/* bar chart */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Monthly Company Dollar Trend</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 180 }}>
          {rows.map((r) => {
            const h = maxCD > 0 ? (r.companyDollar / maxCD) * 160 : 0;
            return (
              <div key={r.month} style={{ flex: "1 1 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{fmt.format(r.companyDollar)}</div>
                <div style={{ width: "80%", height: h, background: "linear-gradient(180deg, #43A047, #66BB6A)", borderRadius: "6px 6px 0 0" }} />
                <div style={{ fontSize: 9, marginTop: 4, textAlign: "center", opacity: 0.7 }}>{r.month.slice(0, 3)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* data table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              {["Month", "Gross Revenue", "Agent Splits", "Fees", "OpEx", "Company Dollar"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, borderBottom: "2px solid #e0e0e0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{r.month}</td>
                <td style={{ padding: "10px 12px" }}>{fmt.format(r.grossRevenue)}</td>
                <td style={{ padding: "10px 12px" }}>{fmt.format(r.agentSplits)}</td>
                <td style={{ padding: "10px 12px" }}>{fmt.format(r.fees)}</td>
                <td style={{ padding: "10px 12px" }}>{fmt.format(r.opEx)}</td>
                <td style={{ padding: "10px 12px", fontWeight: 700, color: "#2E7D32" }}>{fmt.format(r.companyDollar)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: "#f5f5f5", fontWeight: 700 }}>
              <td style={{ padding: "10px 12px" }}>Total</td>
              <td style={{ padding: "10px 12px" }}>{fmt.format(rows.reduce((s, r) => s + r.grossRevenue, 0))}</td>
              <td style={{ padding: "10px 12px" }}>{fmt.format(rows.reduce((s, r) => s + r.agentSplits, 0))}</td>
              <td style={{ padding: "10px 12px" }}>{fmt.format(rows.reduce((s, r) => s + r.fees, 0))}</td>
              <td style={{ padding: "10px 12px" }}>{fmt.format(rows.reduce((s, r) => s + r.opEx, 0))}</td>
              <td style={{ padding: "10px 12px", color: "#2E7D32" }}>{fmt.format(ytdCompanyDollar)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
