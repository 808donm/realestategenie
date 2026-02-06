"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

type Period = "this_month" | "last_30" | "this_quarter" | "ytd";

interface AgentAssignment {
  name: string;
  leadsReceived: number;
  leadsContacted: number;
  leadsConverted: number;
  avgResponseTime: number; // minutes
}

const SAMPLE_DATA: AgentAssignment[] = [
  { name: "Sarah Mitchell", leadsReceived: 42, leadsContacted: 38, leadsConverted: 8, avgResponseTime: 4.2 },
  { name: "James Carter", leadsReceived: 35, leadsContacted: 30, leadsConverted: 5, avgResponseTime: 7.8 },
  { name: "Maria Lopez", leadsReceived: 28, leadsContacted: 26, leadsConverted: 6, avgResponseTime: 3.1 },
  { name: "David Kim", leadsReceived: 48, leadsContacted: 40, leadsConverted: 4, avgResponseTime: 12.5 },
  { name: "Ashley Brown", leadsReceived: 31, leadsContacted: 29, leadsConverted: 7, avgResponseTime: 2.8 },
  { name: "Tyler Nguyen", leadsReceived: 22, leadsContacted: 18, leadsConverted: 3, avgResponseTime: 9.4 },
];

const PERIOD_LABELS: Record<Period, string> = {
  this_month: "This Month",
  last_30: "Last 30 Days",
  this_quarter: "This Quarter",
  ytd: "Year to Date",
};

export default function LeadAssignmentClient() {
  const [period, setPeriod] = useState<Period>("this_month");

  const totalLeads = useMemo(() => SAMPLE_DATA.reduce((s, a) => s + a.leadsReceived, 0), []);
  const avgLeads = totalLeads / SAMPLE_DATA.length;
  const maxLeads = Math.max(...SAMPLE_DATA.map((a) => a.leadsReceived));

  const fairnessIssues = useMemo(() => {
    const threshold = avgLeads * 0.25;
    return SAMPLE_DATA.filter(
      (a) => Math.abs(a.leadsReceived - avgLeads) > threshold
    ).map((a) => ({
      name: a.name,
      leads: a.leadsReceived,
      deviation: a.leadsReceived - avgLeads,
      direction: a.leadsReceived > avgLeads ? "over" : "under",
    }));
  }, []);

  const topConverter = useMemo(() => {
    return [...SAMPLE_DATA].sort((a, b) => {
      const rateA = a.leadsReceived > 0 ? a.leadsConverted / a.leadsReceived : 0;
      const rateB = b.leadsReceived > 0 ? b.leadsConverted / b.leadsReceived : 0;
      return rateB - rateA;
    })[0];
  }, []);

  const conversionRate = (a: AgentAssignment) =>
    a.leadsReceived > 0 ? ((a.leadsConverted / a.leadsReceived) * 100).toFixed(1) : "0.0";

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Lead Assignment Fairness Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${PERIOD_LABELS[period]} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    doc.setFontSize(11);
    doc.text(`Total Leads Distributed: ${totalLeads}`, 14, 42);
    doc.text(`Average Per Agent: ${avgLeads.toFixed(1)}`, 14, 50);
    doc.text(`Top Converter: ${topConverter.name} (${conversionRate(topConverter)}%)`, 14, 58);

    if (fairnessIssues.length > 0) {
      doc.text("Fairness Alerts:", 14, 70);
      fairnessIssues.forEach((issue, i) => {
        const sign = issue.deviation > 0 ? "+" : "";
        doc.text(
          `  - ${issue.name}: ${issue.leads} leads (${sign}${issue.deviation.toFixed(1)} from avg)`,
          14,
          78 + i * 8
        );
      });
    }

    const headers = ["Agent", "Received", "Contacted", "Converted", "Conv %", "Avg Resp (min)"];
    const colX = [14, 60, 85, 115, 142, 165];
    let y = fairnessIssues.length > 0 ? 78 + fairnessIssues.length * 8 + 12 : 74;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    doc.setFont("helvetica", "normal");

    SAMPLE_DATA.forEach((row) => {
      y += 8;
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(row.name, colX[0], y);
      doc.text(String(row.leadsReceived), colX[1], y);
      doc.text(String(row.leadsContacted), colX[2], y);
      doc.text(String(row.leadsConverted), colX[3], y);
      doc.text(`${conversionRate(row)}%`, colX[4], y);
      doc.text(`${row.avgResponseTime} min`, colX[5], y);
    });

    doc.save("lead-assignment-fairness.pdf");
  };

  const barColor = (agent: AgentAssignment): string => {
    const deviation = Math.abs(agent.leadsReceived - avgLeads);
    if (deviation > avgLeads * 0.25) return "#ef4444";
    if (deviation > avgLeads * 0.15) return "#f59e0b";
    return "#10b981";
  };

  return (
    <div>
      {/* Integration Notice */}
      <div style={{
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 13,
      }}>
        <span>
          <strong>Sample Data</strong> -- Connect your GHL integration to see live data.
        </span>
        <Link href="/app/integrations" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
          Connect GHL &rarr;
        </Link>
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

      {/* Distribution Bar Chart */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700 }}>Lead Distribution</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SAMPLE_DATA.map((agent) => (
            <div key={agent.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 120, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{agent.name.split(" ")[0]}</div>
              <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 24, position: "relative" }}>
                <div
                  style={{
                    width: `${(agent.leadsReceived / maxLeads) * 100}%`,
                    background: barColor(agent),
                    height: "100%",
                    borderRadius: 4,
                    transition: "width 0.3s ease",
                    minWidth: 2,
                  }}
                />
                {/* Average line */}
                <div
                  style={{
                    position: "absolute",
                    left: `${(avgLeads / maxLeads) * 100}%`,
                    top: -2,
                    bottom: -2,
                    width: 2,
                    background: "#6b7280",
                    borderRadius: 1,
                  }}
                />
              </div>
              <div style={{ width: 60, fontSize: 13, fontWeight: 600, textAlign: "right" }}>
                {agent.leadsReceived}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 11, color: "#6b7280" }}>
          <div style={{ width: 16, height: 2, background: "#6b7280" }} />
          Average: {avgLeads.toFixed(1)} leads
          <span style={{ marginLeft: 16, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#10b981", display: "inline-block" }} /> Fair
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b", display: "inline-block" }} /> Slight skew
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#ef4444", display: "inline-block" }} /> Significant skew
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Agent</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Leads Received</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Contacted</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Converted</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Conv. Rate</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Avg Response</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_DATA.map((row, i) => (
              <tr key={row.name} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                  <strong>{row.name}</strong>
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{
                    fontWeight: 600,
                    color: Math.abs(row.leadsReceived - avgLeads) > avgLeads * 0.25 ? "#ef4444" : "inherit",
                  }}>
                    {row.leadsReceived}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                  {row.leadsContacted}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                  {row.leadsConverted}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>
                  {conversionRate(row)}%
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{ color: row.avgResponseTime > 10 ? "#ef4444" : row.avgResponseTime > 5 ? "#f59e0b" : "#10b981", fontWeight: 600 }}>
                    {row.avgResponseTime} min
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fairness Alert / Recommendation */}
      {fairnessIssues.length > 0 && (
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 10,
          padding: 20,
          marginBottom: 20,
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 15, fontWeight: 700, color: "#92400e" }}>
            Fairness Alerts
          </h3>
          <ul style={{ margin: "0 0 12px 0", padding: "0 0 0 18px", fontSize: 13, lineHeight: 1.8 }}>
            {fairnessIssues.map((issue) => (
              <li key={issue.name} style={{ color: "#78350f" }}>
                <strong>{issue.name}</strong> received{" "}
                {issue.direction === "over" ? (
                  <span style={{ color: "#dc2626" }}>
                    {issue.leads} leads (+{issue.deviation.toFixed(0)} above avg)
                  </span>
                ) : (
                  <span style={{ color: "#dc2626" }}>
                    {issue.leads} leads ({issue.deviation.toFixed(0)} below avg)
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation Card */}
      <div style={{
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: 10,
        padding: 20,
      }}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: 15, fontWeight: 700, color: "#166534" }}>
          Recommendation
        </h3>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#14532d" }}>
          Consider enabling round-robin lead assignment in GHL to ensure equal distribution.
          <strong> {topConverter.name}</strong> has the highest conversion rate at{" "}
          <strong>{conversionRate(topConverter)}%</strong> -- routing higher-intent leads to top converters
          while maintaining base fairness can optimize team outcomes. Agents with response times
          above 5 minutes should be coached on speed-to-lead best practices.
        </p>
      </div>
    </div>
  );
}
