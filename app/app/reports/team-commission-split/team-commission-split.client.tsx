"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtPrecise = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Period = "this_month" | "last_30" | "this_quarter" | "ytd";

interface Deal {
  propertyAddress: string;
  salePrice: number;
  commission: number;
  agentName: string;
  agentSplitPct: number;
  closeDate: string;
}

const FALLBACK_DATA: Deal[] = [
  { propertyAddress: "1234 Oak Ridge Dr", salePrice: 425000, commission: 12750, agentName: "Sarah Mitchell", agentSplitPct: 70, closeDate: "2025-01-15" },
  { propertyAddress: "567 Maple Ave #202", salePrice: 310000, commission: 9300, agentName: "James Carter", agentSplitPct: 65, closeDate: "2025-01-18" },
  { propertyAddress: "890 Pine Valley Ct", salePrice: 575000, commission: 17250, agentName: "Ashley Brown", agentSplitPct: 75, closeDate: "2025-01-22" },
  { propertyAddress: "2100 Sunset Blvd", salePrice: 380000, commission: 11400, agentName: "Maria Lopez", agentSplitPct: 70, closeDate: "2025-01-25" },
  { propertyAddress: "45 Lakeview Terrace", salePrice: 695000, commission: 20850, agentName: "Ashley Brown", agentSplitPct: 75, closeDate: "2025-02-01" },
  { propertyAddress: "333 Elm Street", salePrice: 260000, commission: 7800, agentName: "Tyler Nguyen", agentSplitPct: 60, closeDate: "2025-02-04" },
  { propertyAddress: "1678 Birch Lane", salePrice: 440000, commission: 13200, agentName: "Sarah Mitchell", agentSplitPct: 70, closeDate: "2025-02-08" },
  { propertyAddress: "912 Willow Creek Rd", salePrice: 520000, commission: 15600, agentName: "David Kim", agentSplitPct: 65, closeDate: "2025-02-12" },
];

const PERIOD_LABELS: Record<Period, string> = {
  this_month: "This Month",
  last_30: "Last 30 Days",
  this_quarter: "This Quarter",
  ytd: "Year to Date",
};

export default function TeamCommissionSplitClient() {
  const [period, setPeriod] = useState<Period>("this_quarter");
  const [data, setData] = useState<Deal[]>(FALLBACK_DATA);
  const [isLive, setIsLive] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/team-commission-split");
      if (!res.ok) throw new Error("API request failed");
      const json: Deal[] = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        setData(json);
        setIsLive(true);
      }
    } catch {
      // Fall back to sample data (already set as initial state)
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const agentPortion = (deal: Deal) => deal.commission * (deal.agentSplitPct / 100);
  const housePortion = (deal: Deal) => deal.commission - agentPortion(deal);

  const totals = useMemo(() => {
    const totalComm = data.reduce((s, d) => s + d.commission, 0);
    const totalAgent = data.reduce((s, d) => s + agentPortion(d), 0);
    const totalHouse = data.reduce((s, d) => s + housePortion(d), 0);
    const housePct = totalComm > 0 ? (totalHouse / totalComm) * 100 : 0;
    return { totalComm, totalAgent, totalHouse, housePct };
  }, [data]);

  const topAgentByVolume = useMemo(() => {
    const agentTotals: Record<string, number> = {};
    data.forEach((d) => {
      agentTotals[d.agentName] = (agentTotals[d.agentName] || 0) + d.commission;
    });
    const sorted = Object.entries(agentTotals).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? { name: sorted[0][0], total: sorted[0][1] } : null;
  }, [data]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Team Commission Split Tracker", 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${PERIOD_LABELS[period]} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    doc.setFontSize(11);
    doc.text(`Total Commission: ${fmt.format(totals.totalComm)}`, 14, 42);
    doc.text(`Total Agent Portion: ${fmt.format(totals.totalAgent)}`, 14, 50);
    doc.text(`Total House Portion: ${fmt.format(totals.totalHouse)} (${totals.housePct.toFixed(1)}%)`, 14, 58);
    if (topAgentByVolume) {
      doc.text(`Top Agent: ${topAgentByVolume.name} (${fmt.format(topAgentByVolume.total)})`, 14, 66);
    }

    const headers = ["Property", "Sale Price", "Comm.", "Agent", "Split%", "Agent $", "House $"];
    const colX = [14, 62, 90, 115, 148, 165, 185];
    let y = 80;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    doc.setFont("helvetica", "normal");

    data.forEach((deal) => {
      y += 7;
      if (y > 280) { doc.addPage(); y = 20; }
      const addr = deal.propertyAddress.length > 22 ? deal.propertyAddress.substring(0, 22) + "..." : deal.propertyAddress;
      doc.text(addr, colX[0], y);
      doc.text(fmt.format(deal.salePrice), colX[1], y);
      doc.text(fmt.format(deal.commission), colX[2], y);
      doc.text(deal.agentName.split(" ")[0], colX[3], y);
      doc.text(`${deal.agentSplitPct}%`, colX[4], y);
      doc.text(fmt.format(agentPortion(deal)), colX[5], y);
      doc.text(fmt.format(housePortion(deal)), colX[6], y);
    });

    doc.save("team-commission-split.pdf");
  };

  return (
    <div>
      {/* Integration Notice */}
      <div style={{
        background: isLive ? "#f0fdf4" : "#eff6ff",
        border: isLive ? "1px solid #bbf7d0" : "1px solid #bfdbfe",
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 13,
      }}>
        <span>
          {isLive ? (
            <><strong>Live Data</strong> -- Showing live data from your QuickBooks Online integration.</>
          ) : (
            <><strong>Sample Data</strong> -- Connect your QuickBooks Online integration to see live data.</>
          )}
        </span>
        {!isLive && (
          <Link href="/app/integrations" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
            Connect QBO &rarr;
          </Link>
        )}
      </div>

      {/* Period Selector + Export */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: period === p ? "2px solid #8b5cf6" : "1px solid #d1d5db",
                background: period === p ? "#f5f3ff" : "#fff",
                color: period === p ? "#7c3aed" : "#374151",
                fontWeight: period === p ? 700 : 500,
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
          style={{
            padding: "8px 18px",
            borderRadius: 6,
            border: "none",
            background: "#7c3aed",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Export PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, borderTop: "3px solid #8b5cf6" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Total Commission</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt.format(totals.totalComm)}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, borderTop: "3px solid #10b981" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Agent Portion</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#059669" }}>{fmt.format(totals.totalAgent)}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, borderTop: "3px solid #3b82f6" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>House Portion</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#2563eb" }}>{fmt.format(totals.totalHouse)}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, borderTop: "3px solid #f59e0b" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>House %</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#d97706" }}>{totals.housePct.toFixed(1)}%</div>
        </div>
      </div>

      {/* Top Agent */}
      {topAgentByVolume && (
        <div style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 10,
          padding: "14px 20px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#166534" }}>Top Agent by Commission Volume</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#14532d" }}>{topAgentByVolume.name}</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#059669" }}>{fmt.format(topAgentByVolume.total)}</div>
        </div>
      )}

      {/* Deals Table */}
      <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Property</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Sale Price</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Commission</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Agent</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Split %</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Agent Portion</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>House Portion</th>
            </tr>
          </thead>
          <tbody>
            {data.map((deal, i) => (
              <tr key={deal.propertyAddress} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                  <strong>{deal.propertyAddress}</strong>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{deal.closeDate}</div>
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                  {fmt.format(deal.salePrice)}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>
                  {fmtPrecise.format(deal.commission)}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                  {deal.agentName}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                  {deal.agentSplitPct}%
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, borderBottom: "1px solid #f3f4f6", color: "#059669", fontWeight: 600 }}>
                  {fmtPrecise.format(agentPortion(deal))}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, borderBottom: "1px solid #f3f4f6", color: "#2563eb", fontWeight: 600 }}>
                  {fmtPrecise.format(housePortion(deal))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: "#f9fafb", fontWeight: 700 }}>
              <td style={{ padding: "12px 12px", fontSize: 13, borderTop: "2px solid #e5e7eb" }}>
                Totals ({data.length} deals)
              </td>
              <td style={{ padding: "12px 12px", textAlign: "right", fontSize: 13, borderTop: "2px solid #e5e7eb" }}>
                {fmt.format(data.reduce((s, d) => s + d.salePrice, 0))}
              </td>
              <td style={{ padding: "12px 12px", textAlign: "right", fontSize: 13, borderTop: "2px solid #e5e7eb" }}>
                {fmtPrecise.format(totals.totalComm)}
              </td>
              <td style={{ padding: "12px 12px", borderTop: "2px solid #e5e7eb" }} />
              <td style={{ padding: "12px 12px", borderTop: "2px solid #e5e7eb" }} />
              <td style={{ padding: "12px 12px", textAlign: "right", fontSize: 13, borderTop: "2px solid #e5e7eb", color: "#059669" }}>
                {fmtPrecise.format(totals.totalAgent)}
              </td>
              <td style={{ padding: "12px 12px", textAlign: "right", fontSize: 13, borderTop: "2px solid #e5e7eb", color: "#2563eb" }}>
                {fmtPrecise.format(totals.totalHouse)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
