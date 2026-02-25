"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type SortKey = "name" | "closings" | "callsMade" | "smsSent" | "showingsBooked" | "totalVolume" | "commissionEarned";
type SortDir = "asc" | "desc";
type Period = "this_month" | "last_30" | "this_quarter" | "ytd";

interface AgentRow {
  name: string;
  closings: number;
  callsMade: number;
  smsSent: number;
  showingsBooked: number;
  totalVolume: number;
  commissionEarned: number;
}

const FALLBACK_DATA: AgentRow[] = [
  { name: "Sarah Mitchell", closings: 6, callsMade: 312, smsSent: 580, showingsBooked: 28, totalVolume: 2340000, commissionEarned: 70200 },
  { name: "James Carter", closings: 4, callsMade: 245, smsSent: 410, showingsBooked: 19, totalVolume: 1520000, commissionEarned: 45600 },
  { name: "Maria Lopez", closings: 5, callsMade: 189, smsSent: 320, showingsBooked: 22, totalVolume: 1975000, commissionEarned: 59250 },
  { name: "David Kim", closings: 3, callsMade: 410, smsSent: 720, showingsBooked: 14, totalVolume: 1080000, commissionEarned: 32400 },
  { name: "Ashley Brown", closings: 7, callsMade: 275, smsSent: 490, showingsBooked: 31, totalVolume: 2870000, commissionEarned: 86100 },
  { name: "Tyler Nguyen", closings: 2, callsMade: 156, smsSent: 280, showingsBooked: 10, totalVolume: 640000, commissionEarned: 19200 },
];

const PERIOD_LABELS: Record<Period, string> = {
  this_month: "This Month",
  last_30: "Last 30 Days",
  this_quarter: "This Quarter",
  ytd: "Year to Date",
};

export default function AgentLeaderboardClient() {
  const [period, setPeriod] = useState<Period>("this_month");
  const [sortKey, setSortKey] = useState<SortKey>("closings");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [data, setData] = useState<AgentRow[]>(FALLBACK_DATA);
  const [isLive, setIsLive] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/agent-leaderboard");
      if (!res.ok) throw new Error("API request failed");
      const json: AgentRow[] = await res.json();
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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [data, sortKey, sortDir]);

  const topProducer = useMemo(() => [...data].sort((a, b) => b.totalVolume - a.totalVolume)[0], [data]);
  const mostActive = useMemo(() => [...data].sort((a, b) => (b.callsMade + b.smsSent) - (a.callsMade + a.smsSent))[0], [data]);
  const highestConversion = useMemo(() => {
    return [...data].sort((a, b) => {
      const rateA = a.showingsBooked > 0 ? a.closings / a.showingsBooked : 0;
      const rateB = b.showingsBooked > 0 ? b.closings / b.showingsBooked : 0;
      return rateB - rateA;
    })[0];
  }, [data]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Agent Leaderboard: Activity vs. Results", 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${PERIOD_LABELS[period]} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    doc.setFontSize(11);
    doc.text(`Top Producer: ${topProducer.name} (${fmt.format(topProducer.totalVolume)})`, 14, 42);
    doc.text(`Most Active: ${mostActive.name} (${mostActive.callsMade + mostActive.smsSent} touches)`, 14, 50);
    const convRate = highestConversion.showingsBooked > 0
      ? ((highestConversion.closings / highestConversion.showingsBooked) * 100).toFixed(1)
      : "0";
    doc.text(`Highest Conversion: ${highestConversion.name} (${convRate}%)`, 14, 58);

    const headers = ["Agent", "Closings", "Calls", "SMS", "Showings", "Volume", "Commission"];
    const colX = [14, 55, 75, 95, 115, 138, 170];
    let y = 72;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    doc.setFont("helvetica", "normal");

    sorted.forEach((row) => {
      y += 8;
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(row.name, colX[0], y);
      doc.text(String(row.closings), colX[1], y);
      doc.text(String(row.callsMade), colX[2], y);
      doc.text(String(row.smsSent), colX[3], y);
      doc.text(String(row.showingsBooked), colX[4], y);
      doc.text(fmt.format(row.totalVolume), colX[5], y);
      doc.text(fmt.format(row.commissionEarned), colX[6], y);
    });

    doc.save("agent-leaderboard.pdf");
  };

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: "10px 12px",
    textAlign: key === "name" ? "left" : "right",
    cursor: "pointer",
    userSelect: "none",
    fontWeight: 700,
    fontSize: 12,
    borderBottom: "2px solid #e5e7eb",
    background: sortKey === key ? "#f3f4f6" : "transparent",
    whiteSpace: "nowrap",
  });

  const tdStyle = (align: "left" | "right" = "right"): React.CSSProperties => ({
    padding: "10px 12px",
    textAlign: align,
    fontSize: 13,
    borderBottom: "1px solid #f3f4f6",
  });

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
            <><strong>Live Data</strong> -- Showing live data from your GHL integration.</>
          ) : (
            <><strong>Sample Data</strong> -- Connect your GHL integration to see live data.</>
          )}
        </span>
        {!isLive && (
          <Link href="/app/integrations" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
            Connect GHL &rarr;
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 18, borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Top Producer</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{topProducer.name}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {topProducer.closings} closings -- {fmt.format(topProducer.totalVolume)} volume
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 18, borderLeft: "4px solid #3b82f6" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Most Active</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{mostActive.name}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {mostActive.callsMade} calls + {mostActive.smsSent} SMS = {mostActive.callsMade + mostActive.smsSent} touches
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 18, borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Highest Conversion</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{highestConversion.name}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {highestConversion.showingsBooked > 0
              ? ((highestConversion.closings / highestConversion.showingsBooked) * 100).toFixed(1)
              : "0"}% showing-to-close rate
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle("name")} onClick={() => handleSort("name")}>Agent{arrow("name")}</th>
              <th style={thStyle("closings")} onClick={() => handleSort("closings")}>Closings{arrow("closings")}</th>
              <th style={thStyle("callsMade")} onClick={() => handleSort("callsMade")}>Calls Made{arrow("callsMade")}</th>
              <th style={thStyle("smsSent")} onClick={() => handleSort("smsSent")}>SMS Sent{arrow("smsSent")}</th>
              <th style={thStyle("showingsBooked")} onClick={() => handleSort("showingsBooked")}>Showings{arrow("showingsBooked")}</th>
              <th style={thStyle("totalVolume")} onClick={() => handleSort("totalVolume")}>Total Volume{arrow("totalVolume")}</th>
              <th style={thStyle("commissionEarned")} onClick={() => handleSort("commissionEarned")}>Commission{arrow("commissionEarned")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.name} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={tdStyle("left")}><strong>{row.name}</strong></td>
                <td style={tdStyle()}>{row.closings}</td>
                <td style={tdStyle()}>{row.callsMade}</td>
                <td style={tdStyle()}>{row.smsSent}</td>
                <td style={tdStyle()}>{row.showingsBooked}</td>
                <td style={tdStyle()}>{fmt.format(row.totalVolume)}</td>
                <td style={tdStyle()}>{fmt.format(row.commissionEarned)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
