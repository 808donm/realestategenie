"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

/* ---------- types ---------- */
type RiskLevel = "Low" | "Medium" | "High" | "Critical";

interface AgentRisk {
  name: string;
  currentScore: number;   // 30-day activity score (0-100)
  previousScore: number;  // previous 30-day score
  logins: number;
  calls: number;
  emails: number;
  dealsStarted: number;
}

/* ---------- helpers ---------- */
const changePct = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : 0;

const riskLevel = (curr: number, prev: number): RiskLevel => {
  const drop = changePct(curr, prev);
  if (drop <= -40) return "Critical";
  if (drop <= -25) return "High";
  if (drop <= -10) return "Medium";
  return "Low";
};

const riskColor: Record<RiskLevel, { bg: string; color: string }> = {
  Low: { bg: "#E8F5E9", color: "#2E7D32" },
  Medium: { bg: "#FFF8E1", color: "#F57F17" },
  High: { bg: "#FFF3E0", color: "#E65100" },
  Critical: { bg: "#FFEBEE", color: "#C62828" },
};

const RISK_ORDER: Record<RiskLevel, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/* ---------- fallback sample data ---------- */
const FALLBACK_DATA: AgentRisk[] = [
  { name: "Sarah Chen",     currentScore: 88, previousScore: 91, logins: 24, calls: 38, emails: 62, dealsStarted: 3 },
  { name: "James Rivera",   currentScore: 72, previousScore: 84, logins: 18, calls: 22, emails: 41, dealsStarted: 2 },
  { name: "Maria Lopez",    currentScore: 94, previousScore: 90, logins: 28, calls: 45, emails: 78, dealsStarted: 4 },
  { name: "Kevin Patel",    currentScore: 41, previousScore: 78, logins: 6,  calls: 8,  emails: 14, dealsStarted: 0 },
  { name: "Aisha Johnson",  currentScore: 65, previousScore: 71, logins: 14, calls: 19, emails: 33, dealsStarted: 1 },
  { name: "Tom Bradley",    currentScore: 33, previousScore: 82, logins: 4,  calls: 5,  emails: 9,  dealsStarted: 0 },
  { name: "Lisa Park",      currentScore: 91, previousScore: 88, logins: 26, calls: 42, emails: 70, dealsStarted: 3 },
  { name: "David Kim",      currentScore: 56, previousScore: 74, logins: 10, calls: 14, emails: 25, dealsStarted: 1 },
  { name: "Rachel Green",   currentScore: 78, previousScore: 80, logins: 20, calls: 30, emails: 52, dealsStarted: 2 },
  { name: "Marcus Williams", currentScore: 48, previousScore: 86, logins: 7, calls: 10, emails: 18, dealsStarted: 0 },
  { name: "Jennifer Wu",    currentScore: 85, previousScore: 83, logins: 22, calls: 35, emails: 60, dealsStarted: 3 },
  { name: "Anthony Torres", currentScore: 62, previousScore: 68, logins: 13, calls: 17, emails: 28, dealsStarted: 1 },
];

/* ---------- component ---------- */
export default function AgentRetentionRiskClient() {
  const [agents, setAgents] = useState<AgentRisk[]>(FALLBACK_DATA);
  const [isLive, setIsLive] = useState(false);
  const [sortBy, setSortBy] = useState<"risk" | "name" | "score" | "change">("risk");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/agent-retention-risk");
      if (!res.ok) throw new Error("API error");
      const json: AgentRisk[] = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        setAgents(json);
        setIsLive(true);
      }
    } catch {
      // keep fallback data
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const enriched = useMemo(() => {
    return agents.map((a) => ({
      ...a,
      change: changePct(a.currentScore, a.previousScore),
      risk: riskLevel(a.currentScore, a.previousScore),
    }));
  }, [agents]);

  const sorted = useMemo(() => {
    const copy = [...enriched];
    switch (sortBy) {
      case "risk":
        return copy.sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk]);
      case "name":
        return copy.sort((a, b) => a.name.localeCompare(b.name));
      case "score":
        return copy.sort((a, b) => a.currentScore - b.currentScore);
      case "change":
        return copy.sort((a, b) => a.change - b.change);
      default:
        return copy;
    }
  }, [enriched, sortBy]);

  /* summary stats */
  const totalAgents = enriched.length;
  const atRisk = enriched.filter((a) => a.risk === "High" || a.risk === "Critical").length;
  const avgScore = Math.round(enriched.reduce((s, a) => s + a.currentScore, 0) / totalAgents);
  const biggestDrop = enriched.reduce((min, a) => a.change < min.change ? a : min, enriched[0]);

  /* PDF export */
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Agent Retention Risk Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    doc.setFontSize(11);
    doc.text(`Total Agents: ${totalAgents}  |  At Risk: ${atRisk}  |  Avg Score: ${avgScore}  |  Biggest Drop: ${biggestDrop.name} (${biggestDrop.change.toFixed(1)}%)`, 14, 40);

    let y = 54;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const cols = [14, 52, 80, 104, 128, 148, 164, 180];
    ["Agent", "30-Day Score", "Prev Score", "Change %", "Risk", "Logins", "Calls", "Emails"].forEach((h, i) => doc.text(h, cols[i], y));
    doc.setFont("helvetica", "normal");

    sorted.forEach((a) => {
      y += 7;
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(a.name, cols[0], y);
      doc.text(String(a.currentScore), cols[1], y);
      doc.text(String(a.previousScore), cols[2], y);
      doc.text(`${a.change >= 0 ? "+" : ""}${a.change.toFixed(1)}%`, cols[3], y);
      doc.text(a.risk, cols[4], y);
      doc.text(String(a.logins), cols[5], y);
      doc.text(String(a.calls), cols[6], y);
      doc.text(String(a.emails), cols[7], y);
    });

    doc.save("agent-retention-risk.pdf");
  };

  const card = (bg: string): React.CSSProperties => ({
    background: bg,
    borderRadius: 12,
    padding: "18px 20px",
    flex: "1 1 0",
    minWidth: 170,
  });

  const sortBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#333",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer",
  });

  return (
    <div>
      {/* integration banner */}
      <div style={{ background: isLive ? "#E8F5E9" : "#FFF8E1", border: `1px solid ${isLive ? "#A5D6A7" : "#FFE082"}`, borderRadius: 10, padding: "12px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{isLive ? "\u2705" : "\u26A0"}</span>
        <span style={{ fontSize: 14 }}>
          {isLive ? (
            <>This report is showing <strong>live data</strong> from your connected integrations.</>
          ) : (
            <>This report uses <strong>sample data</strong>. Connect your GHL account to track real agent activity signals.{" "}
              <Link href="/app/integrations" style={{ color: "#1565C0", fontWeight: 600 }}>Set up integrations &rarr;</Link>
            </>
          )}
        </span>
      </div>

      {/* summary cards */}
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={card("#E3F2FD")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Total Agents</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{totalAgents}</div>
        </div>
        <div style={card("#FFEBEE")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>At Risk (High + Critical)</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#C62828" }}>{atRisk}</div>
        </div>
        <div style={card("#FFF3E0")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Avg Activity Score</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{avgScore}</div>
        </div>
        <div style={card("#F3E5F5")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Biggest Drop</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{biggestDrop.name}</div>
          <div style={{ fontSize: 13, color: "#C62828", fontWeight: 700 }}>{biggestDrop.change.toFixed(1)}%</div>
        </div>
      </div>

      {/* toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.6 }}>Sort by:</span>
          {([["risk", "Risk Level"], ["name", "Name"], ["score", "Score"], ["change", "Change %"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setSortBy(key)} style={sortBtnStyle(sortBy === key)}>{label}</button>
          ))}
        </div>
        <button
          onClick={exportPDF}
          style={{ padding: "7px 18px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Export PDF
        </button>
      </div>

      {/* table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              {["Agent Name", "30-Day Score", "Prev 30-Day", "Change %", "Risk Level", "Logins", "Calls", "Emails", "Deals"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 10px", fontWeight: 700, borderBottom: "2px solid #e0e0e0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              const isCritical = a.risk === "Critical";
              const isHigh = a.risk === "High";
              return (
                <tr
                  key={a.name}
                  style={{
                    borderBottom: "1px solid #eee",
                    background: isCritical ? "#FFF5F5" : isHigh ? "#FFF9F0" : "transparent",
                  }}
                >
                  <td style={{ padding: "10px 10px", fontWeight: 600 }}>{a.name}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 48, height: 6, background: "#e0e0e0", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          width: `${a.currentScore}%`,
                          height: "100%",
                          background: a.currentScore >= 70 ? "#43A047" : a.currentScore >= 50 ? "#FB8C00" : "#E53935",
                          borderRadius: 3,
                        }} />
                      </div>
                      <span>{a.currentScore}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 10px" }}>{a.previousScore}</td>
                  <td style={{ padding: "10px 10px", fontWeight: 600, color: a.change >= 0 ? "#2E7D32" : "#C62828" }}>
                    {a.change >= 0 ? "+" : ""}{a.change.toFixed(1)}%
                  </td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      background: riskColor[a.risk].bg,
                      color: riskColor[a.risk].color,
                    }}>
                      {a.risk}
                    </span>
                  </td>
                  <td style={{ padding: "10px 10px" }}>{a.logins}</td>
                  <td style={{ padding: "10px 10px" }}>{a.calls}</td>
                  <td style={{ padding: "10px 10px" }}>{a.emails}</td>
                  <td style={{ padding: "10px 10px" }}>{a.dealsStarted}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* legend */}
      <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
        {(["Low", "Medium", "High", "Critical"] as RiskLevel[]).map((level) => (
          <div key={level} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: riskColor[level].bg, border: `1px solid ${riskColor[level].color}` }} />
            <span style={{ fontWeight: 600, color: riskColor[level].color }}>{level}</span>
            <span style={{ opacity: 0.6 }}>
              {level === "Critical" && "(40%+ drop)"}
              {level === "High" && "(25-40% drop)"}
              {level === "Medium" && "(10-25% drop)"}
              {level === "Low" && "(<10% drop)"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
