"use client";

import { useState } from "react";

interface UsageRow {
  agentId: string;
  agentEmail?: string;
  agentName?: string;
  billableTraces: number;
  cachedTraces: number;
  totalCents: number;
  totalDollars: number;
}

export default function SkipTraceBillingClient({
  initialUsage,
  currentMonth,
}: {
  initialUsage: UsageRow[];
  currentMonth: string;
}) {
  const [usage, setUsage] = useState(initialUsage);
  const [month, setMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(false);

  const totalTraces = usage.reduce((s, u) => s + u.billableTraces, 0);
  const totalCached = usage.reduce((s, u) => s + u.cachedTraces, 0);
  const totalRevenue = usage.reduce((s, u) => s + u.totalDollars, 0);
  const totalCost = totalTraces * 0.05; // REAPI cost
  const totalProfit = totalRevenue - totalCost;

  const loadMonth = async (m: string) => {
    setMonth(m);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/skip-trace-billing?month=${m}`);
      const data = await res.json();
      setUsage(data.usage || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  // Generate last 6 months
  const months: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Skip Trace Billing</h1>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
        Track skip trace usage and revenue across all agents. Agents are charged $0.10/trace, REAPI costs $0.05/trace.
      </p>

      {/* Month selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {months.map((m) => (
          <button
            key={m}
            onClick={() => loadMonth(m)}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: month === m ? "2px solid #2563eb" : "1px solid #d1d5db",
              background: month === m ? "#eff6ff" : "#fff",
              color: month === m ? "#2563eb" : "#6b7280",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <SummaryCard label="Billable Traces" value={totalTraces.toLocaleString()} color="#2563eb" />
        <SummaryCard label="Cached (no charge)" value={totalCached.toLocaleString()} color="#6b7280" />
        <SummaryCard label="Revenue ($0.10/ea)" value={`$${totalRevenue.toFixed(2)}`} color="#059669" />
        <SummaryCard label="REAPI Cost ($0.05/ea)" value={`$${totalCost.toFixed(2)}`} color="#dc2626" />
        <SummaryCard label="Profit" value={`$${totalProfit.toFixed(2)}`} color={totalProfit >= 0 ? "#059669" : "#dc2626"} />
        <SummaryCard label="Active Agents" value={String(usage.length)} color="#8b5cf6" />
      </div>

      {/* Agent table */}
      {loading ? (
        <p style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>Loading...</p>
      ) : usage.length === 0 ? (
        <p style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>No skip trace usage for {month}</p>
      ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={thStyle}>Agent</th>
                <th style={thStyle}>Email</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Billable</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cached</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cost</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Profit</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u, i) => {
                const cost = u.billableTraces * 0.05;
                const profit = u.totalDollars - cost;
                return (
                  <tr key={u.agentId} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{u.agentName || "Unknown"}</td>
                    <td style={{ padding: "8px 12px", color: "#6b7280" }}>{u.agentEmail}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{u.billableTraces}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#6b7280" }}>{u.cachedTraces}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#059669", fontWeight: 600 }}>${u.totalDollars.toFixed(2)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#dc2626" }}>${cost.toFixed(2)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: profit >= 0 ? "#059669" : "#dc2626" }}>${profit.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, borderBottom: "2px solid #e5e7eb",
};

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: "12px 20px", background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", minWidth: 120 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
