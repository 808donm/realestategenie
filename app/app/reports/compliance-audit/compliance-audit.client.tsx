"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

/* ---------- types ---------- */
type EventType = "Document Signed" | "ID Verified" | "Wire Instructions Sent" | "Disclosure Submitted";
type Status = "Complete" | "Pending" | "Missing";

interface AuditEvent {
  id: number;
  date: string;
  eventType: EventType;
  property: string;
  agent: string;
  status: Status;
}

/* ---------- fallback sample data ---------- */
const FALLBACK_DATA: AuditEvent[] = [
  { id: 1, date: "2025-12-18", eventType: "Document Signed", property: "742 Evergreen Terrace", agent: "Sarah Chen", status: "Complete" },
  { id: 2, date: "2025-12-18", eventType: "ID Verified", property: "742 Evergreen Terrace", agent: "Sarah Chen", status: "Complete" },
  { id: 3, date: "2025-12-17", eventType: "Wire Instructions Sent", property: "1600 Pennsylvania Ave", agent: "James Rivera", status: "Pending" },
  { id: 4, date: "2025-12-17", eventType: "Disclosure Submitted", property: "221B Baker Street", agent: "Maria Lopez", status: "Complete" },
  { id: 5, date: "2025-12-16", eventType: "Document Signed", property: "1600 Pennsylvania Ave", agent: "James Rivera", status: "Complete" },
  { id: 6, date: "2025-12-16", eventType: "ID Verified", property: "350 Fifth Avenue", agent: "Kevin Patel", status: "Missing" },
  { id: 7, date: "2025-12-15", eventType: "Wire Instructions Sent", property: "221B Baker Street", agent: "Maria Lopez", status: "Complete" },
  { id: 8, date: "2025-12-15", eventType: "Disclosure Submitted", property: "742 Evergreen Terrace", agent: "Sarah Chen", status: "Pending" },
  { id: 9, date: "2025-12-14", eventType: "Document Signed", property: "350 Fifth Avenue", agent: "Kevin Patel", status: "Missing" },
  { id: 10, date: "2025-12-14", eventType: "ID Verified", property: "10 Downing Street", agent: "Aisha Johnson", status: "Complete" },
  { id: 11, date: "2025-12-13", eventType: "Wire Instructions Sent", property: "10 Downing Street", agent: "Aisha Johnson", status: "Complete" },
  { id: 12, date: "2025-12-13", eventType: "Disclosure Submitted", property: "1600 Pennsylvania Ave", agent: "James Rivera", status: "Missing" },
  { id: 13, date: "2025-12-12", eventType: "Document Signed", property: "4 Privet Drive", agent: "Tom Bradley", status: "Complete" },
  { id: 14, date: "2025-12-12", eventType: "ID Verified", property: "4 Privet Drive", agent: "Tom Bradley", status: "Pending" },
  { id: 15, date: "2025-12-11", eventType: "Wire Instructions Sent", property: "350 Fifth Avenue", agent: "Kevin Patel", status: "Missing" },
  { id: 16, date: "2025-12-11", eventType: "Disclosure Submitted", property: "4 Privet Drive", agent: "Tom Bradley", status: "Complete" },
  { id: 17, date: "2025-12-10", eventType: "Document Signed", property: "10 Downing Street", agent: "Aisha Johnson", status: "Complete" },
  { id: 18, date: "2025-12-10", eventType: "ID Verified", property: "1600 Pennsylvania Ave", agent: "James Rivera", status: "Complete" },
  { id: 19, date: "2025-12-09", eventType: "Wire Instructions Sent", property: "742 Evergreen Terrace", agent: "Sarah Chen", status: "Complete" },
  { id: 20, date: "2025-12-09", eventType: "Disclosure Submitted", property: "350 Fifth Avenue", agent: "Kevin Patel", status: "Pending" },
];

const EVENT_TYPES: EventType[] = ["Document Signed", "ID Verified", "Wire Instructions Sent", "Disclosure Submitted"];
const STATUSES: Status[] = ["Complete", "Pending", "Missing"];

/* ---------- status badge colors ---------- */
const statusColor: Record<Status, { bg: string; color: string }> = {
  Complete: { bg: "#E8F5E9", color: "#2E7D32" },
  Pending: { bg: "#FFF8E1", color: "#F57F17" },
  Missing: { bg: "#FFEBEE", color: "#C62828" },
};

/* ---------- component ---------- */
export default function ComplianceAuditClient() {
  const [events, setEvents] = useState<AuditEvent[]>(FALLBACK_DATA);
  const [isLive, setIsLive] = useState(false);
  const [filterType, setFilterType] = useState<EventType | "All">("All");
  const [filterAgent, setFilterAgent] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<Status | "All">("All");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/compliance-audit");
      if (!res.ok) throw new Error("API error");
      const json: AuditEvent[] = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        setEvents(json);
        setIsLive(true);
      }
    } catch {
      // keep fallback data
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const AGENTS = useMemo(() => Array.from(new Set(events.map((e) => e.agent))).sort(), [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filterType !== "All" && e.eventType !== filterType) return false;
      if (filterAgent !== "All" && e.agent !== filterAgent) return false;
      if (filterStatus !== "All" && e.status !== filterStatus) return false;
      return true;
    });
  }, [events, filterType, filterAgent, filterStatus]);

  /* summary stats */
  const totalEvents = events.length;
  const completeCount = events.filter((e) => e.status === "Complete").length;
  const completePct = totalEvents > 0 ? (completeCount / totalEvents) * 100 : 0;
  const pendingCount = events.filter((e) => e.status === "Pending").length;
  const missingCount = events.filter((e) => e.status === "Missing").length;

  /* PDF export */
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Compliance & Audit Log", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    doc.setFontSize(11);
    doc.text(`Total Events: ${totalEvents}  |  Complete: ${completePct.toFixed(1)}%  |  Pending: ${pendingCount}  |  Missing: ${missingCount}`, 14, 38);

    let y = 50;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const cols = [14, 38, 72, 112, 146, 174];
    ["Date", "Event Type", "Property", "Agent", "Status"].forEach((h, i) => doc.text(h, cols[i], y));
    doc.setFont("helvetica", "normal");

    filtered.forEach((e) => {
      y += 6;
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(e.date, cols[0], y);
      doc.text(e.eventType, cols[1], y);
      doc.text(e.property, cols[2], y);
      doc.text(e.agent, cols[3], y);
      doc.text(e.status, cols[4], y);
    });

    doc.save("compliance-audit-log.pdf");
  };

  const card = (bg: string): React.CSSProperties => ({
    background: bg,
    borderRadius: 12,
    padding: "18px 20px",
    flex: "1 1 0",
    minWidth: 160,
  });

  const selectStyle: React.CSSProperties = {
    padding: "7px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 13,
    fontWeight: 500,
    background: "#fff",
    cursor: "pointer",
  };

  return (
    <div>
      {/* integration banner */}
      <div style={{ background: isLive ? "#E8F5E9" : "#FFF8E1", border: `1px solid ${isLive ? "#A5D6A7" : "#FFE082"}`, borderRadius: 10, padding: "12px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{isLive ? "\u2705" : "\u26A0"}</span>
        <span style={{ fontSize: 14 }}>
          {isLive ? (
            <>This report is showing <strong>live data</strong> from your connected integrations.</>
          ) : (
            <>This report uses <strong>sample data</strong>. Connect GHL and configure your brokerage to see live compliance events.{" "}
              <Link href="/app/integrations" style={{ color: "#1565C0", fontWeight: 600 }}>Set up integrations &rarr;</Link>
            </>
          )}
        </span>
      </div>

      {/* summary cards */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={card("#E3F2FD")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Total Events</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{totalEvents}</div>
        </div>
        <div style={card("#E8F5E9")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Complete %</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{completePct.toFixed(1)}%</div>
        </div>
        <div style={card("#FFF8E1")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Pending Items</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{pendingCount}</div>
        </div>
        <div style={card("#FFEBEE")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Missing / Overdue</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#C62828" }}>{missingCount}</div>
        </div>
      </div>

      {/* filters + export */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <select style={selectStyle} value={filterType} onChange={(e) => setFilterType(e.target.value as EventType | "All")}>
          <option value="All">All Event Types</option>
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={selectStyle} value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}>
          <option value="All">All Agents</option>
          {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select style={selectStyle} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as Status | "All")}>
          <option value="All">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ flex: 1 }} />
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
              {["Date", "Event Type", "Property", "Agent", "Status"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, borderBottom: "2px solid #e0e0e0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr
                key={e.id}
                style={{
                  borderBottom: "1px solid #eee",
                  background: e.status === "Missing" ? "#FFF5F5" : "transparent",
                }}
              >
                <td style={{ padding: "10px 12px" }}>{e.date}</td>
                <td style={{ padding: "10px 12px" }}>{e.eventType}</td>
                <td style={{ padding: "10px 12px", fontWeight: 500 }}>{e.property}</td>
                <td style={{ padding: "10px 12px" }}>{e.agent}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    background: statusColor[e.status].bg,
                    color: statusColor[e.status].color,
                  }}>
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: "center", opacity: 0.5 }}>No events match current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, opacity: 0.5, marginTop: 10 }}>
        Showing {filtered.length} of {totalEvents} events
      </div>
    </div>
  );
}
