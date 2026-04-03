"use client";

import { useState, useEffect } from "react";
import {
  ValueCard,
  ReportSection,
  ComparisonTable,
  HorizontalBarChart,
  REPORT_COLORS,
  fmt$,
} from "@/components/reports/report-components";

interface AgentMetric {
  id: string;
  name: string;
  email: string;
  role: string;
  office?: string;
  leadsCaptured: number;
  hotLeads: number;
  openHouses: number;
  checkinsPerOH: number;
  pipelineDeals: number;
  closingsMTD: number;
  volumeMTD: number;
  speedToLead: number;
  lastActivity: string;
  reportsGenerated: number;
  mlsSearches: number;
  conversionRate: number;
  isAtRisk: boolean;
}

interface DashboardData {
  overview: {
    totalAgents: number;
    activeAgents: number;
    totalLeads: number;
    hotLeads: number;
    totalOpenHouses: number;
    totalCheckins: number;
    closingsMTD: number;
    closingsYTD: number;
    pipelineValue: number;
  };
  agents: AgentMetric[];
  leadFunnel: Array<{ stage: string; count: number; conversionPct: number }>;
  leadsBySource: Array<{ source: string; count: number; converted: number }>;
  leadAging: { notContacted3d: number; notContacted7d: number; notContacted14d: number };
  monthlyTrend: Array<{ month: string; leads: number; closings: number; revenue: number }>;
}

const tabStyle = (active: boolean) => ({
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: active ? 700 : 500,
  color: active ? "#1e40af" : "#6b7280",
  borderBottom: active ? "2px solid #1e40af" : "2px solid transparent",
  cursor: "pointer",
  background: "none",
  border: "none",
  borderBottomWidth: 2,
  borderBottomStyle: "solid" as const,
  borderBottomColor: active ? "#1e40af" : "transparent",
});

export default function AgencyDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [sortField, setSortField] = useState<keyof AgentMetric>("volumeMTD");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetch("/api/reports/agency-dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading agency dashboard...</div>;
  if (error) return <div style={{ padding: 20, background: "#fef2f2", borderRadius: 8, color: "#dc2626" }}>{error}</div>;
  if (!data) return null;

  const o = data.overview;
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "agents", label: "Agent Performance" },
    { id: "leads", label: "Lead Performance" },
    { id: "openhouses", label: "Open Houses" },
    { id: "financial", label: "Financial" },
    { id: "activity", label: "Activity & Risk" },
  ];

  const sortedAgents = [...data.agents].sort((a, b) => {
    const av = a[sortField];
    const bv = b[sortField];
    if (typeof av === "number" && typeof bv === "number") return sortDir === "desc" ? bv - av : av - bv;
    return sortDir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });

  const handleSort = (field: keyof AgentMetric) => {
    if (sortField === field) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortHeader = ({ field, children }: { field: keyof AgentMetric; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(field)}
      style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "#374151", cursor: "pointer", fontSize: 11, borderBottom: "2px solid #e5e7eb", userSelect: "none" }}
    >
      {children} {sortField === field ? (sortDir === "desc" ? "v" : "^") : ""}
    </th>
  );

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: 24, overflowX: "auto" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(activeTab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === "overview" && (
        <div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <ValueCard label="Total Agents" value={String(o.totalAgents)} sub={`${o.activeAgents} active this week`} />
            <ValueCard label="Active Leads" value={String(o.totalLeads)} color="#eff6ff" />
            <ValueCard label="Hot Leads" value={String(o.hotLeads)} color="#fef2f2" />
            <ValueCard label="Open Houses" value={String(o.totalOpenHouses)} color="#f5f3ff" />
            <ValueCard label="Closings MTD" value={String(o.closingsMTD)} sub={`${o.closingsYTD} YTD`} color="#ecfdf5" />
            <ValueCard label="Pipeline Value" value={fmt$(o.pipelineValue) || "$0"} color="#fffbeb" />
          </div>

          {/* Monthly Trend */}
          <ReportSection title="Monthly Trend (Last 6 Months)">
            <ComparisonTable
              headers={["Month", ...data.monthlyTrend.map((m) => m.month)]}
              rows={[
                { label: "Leads", values: data.monthlyTrend.map((m) => String(m.leads)) },
                { label: "Closings", values: data.monthlyTrend.map((m) => String(m.closings)) },
                { label: "Revenue", values: data.monthlyTrend.map((m) => fmt$(m.revenue) || "$0") },
              ]}
            />
          </ReportSection>

          {/* Alerts */}
          {(data.leadAging.notContacted7d > 0 || data.agents.some((a) => a.isAtRisk)) && (
            <ReportSection title="Alerts">
              {data.leadAging.notContacted7d > 0 && (
                <div style={{ padding: "10px 14px", background: "#fffbeb", borderLeft: "4px solid #eab308", borderRadius: 6, marginBottom: 8, fontSize: 13 }}>
                  <strong>{data.leadAging.notContacted7d}</strong> leads not contacted in 7+ days
                  {data.leadAging.notContacted14d > 0 && <span style={{ color: "#dc2626" }}> ({data.leadAging.notContacted14d} over 14 days)</span>}
                </div>
              )}
              {data.agents.filter((a) => a.isAtRisk).map((a) => (
                <div key={a.id} style={{ padding: "10px 14px", background: "#fef2f2", borderLeft: "4px solid #dc2626", borderRadius: 6, marginBottom: 8, fontSize: 13 }}>
                  <strong>{a.name}</strong> -- activity dropped 40%+ from previous period (retention risk)
                </div>
              ))}
            </ReportSection>
          )}
        </div>
      )}

      {/* ═══ AGENT PERFORMANCE TAB ═══ */}
      {activeTab === "agents" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "2px solid #e5e7eb", fontSize: 11 }}>Agent</th>
                <SortHeader field="leadsCaptured">Leads</SortHeader>
                <SortHeader field="hotLeads">Hot</SortHeader>
                <SortHeader field="openHouses">OHs</SortHeader>
                <SortHeader field="pipelineDeals">Pipeline</SortHeader>
                <SortHeader field="closingsMTD">Closings</SortHeader>
                <SortHeader field="volumeMTD">Volume</SortHeader>
                <SortHeader field="speedToLead">Speed</SortHeader>
                <SortHeader field="conversionRate">Conv %</SortHeader>
                <SortHeader field="mlsSearches">Searches</SortHeader>
                <SortHeader field="reportsGenerated">Reports</SortHeader>
                <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, color: "#374151", borderBottom: "2px solid #e5e7eb", fontSize: 11 }}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {sortedAgents.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ fontWeight: 600, color: "#111827" }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{a.role}{a.office ? ` - ${a.office}` : ""}</div>
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{a.leadsCaptured}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: a.hotLeads > 0 ? "#dc2626" : undefined, fontWeight: a.hotLeads > 0 ? 700 : 400 }}>{a.hotLeads}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{a.openHouses}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{a.pipelineDeals}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{a.closingsMTD}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmt$(a.volumeMTD)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: a.speedToLead > 60 ? "#dc2626" : a.speedToLead > 15 ? "#d97706" : "#15803d" }}>
                    {a.speedToLead > 0 ? `${a.speedToLead}m` : "-"}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{a.conversionRate}%</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{a.mlsSearches}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{a.reportsGenerated}</td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                    {a.isAtRisk ? (
                      <span style={{ padding: "2px 8px", background: "#fef2f2", color: "#dc2626", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>AT RISK</span>
                    ) : (
                      <span style={{ padding: "2px 8px", background: "#ecfdf5", color: "#15803d", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ LEAD PERFORMANCE TAB ═══ */}
      {activeTab === "leads" && (
        <div>
          {/* Lead Funnel */}
          <ReportSection title="Lead Funnel">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {data.leadFunnel.filter((s) => s.count > 0).map((stage, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 180, fontSize: 12, color: "#374151", textAlign: "right" }}>{stage.stage}</div>
                  <div style={{ flex: 1, height: 24, background: "#f3f4f6", borderRadius: 4, position: "relative" }}>
                    <div style={{ width: `${Math.max((stage.count / (data.leadFunnel[0]?.count || 1)) * 100, 2)}%`, height: "100%", background: "#3b82f6", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>{stage.count}</span>
                    </div>
                  </div>
                  <div style={{ width: 50, fontSize: 11, color: "#6b7280", textAlign: "right" }}>{stage.conversionPct}%</div>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* Lead Source Breakdown */}
          <ReportSection title="Leads by Source">
            <HorizontalBarChart
              data={data.leadsBySource.map((s) => ({
                label: s.source,
                value: s.count,
                displayValue: `${s.count} leads (${s.converted} converted)`,
              }))}
              labelWidth={120}
            />
          </ReportSection>

          {/* Lead Aging */}
          <ReportSection title="Lead Aging Warnings">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <ValueCard label="Not Contacted 3+ Days" value={String(data.leadAging.notContacted3d)} color={data.leadAging.notContacted3d > 0 ? "#fffbeb" : "#ecfdf5"} />
              <ValueCard label="Not Contacted 7+ Days" value={String(data.leadAging.notContacted7d)} color={data.leadAging.notContacted7d > 0 ? "#fef2f2" : "#ecfdf5"} />
              <ValueCard label="Not Contacted 14+ Days" value={String(data.leadAging.notContacted14d)} color={data.leadAging.notContacted14d > 0 ? "#fef2f2" : "#ecfdf5"} />
            </div>
          </ReportSection>

          {/* Speed-to-Lead Leaderboard */}
          <ReportSection title="Speed-to-Lead Leaderboard">
            <ComparisonTable
              headers={["Agent", "Avg Response", "Leads", "Hot Leads", "Conversion"]}
              rows={[...data.agents].sort((a, b) => {
                if (a.speedToLead === 0) return 1;
                if (b.speedToLead === 0) return -1;
                return a.speedToLead - b.speedToLead;
              }).map((a) => ({
                label: a.name,
                values: [
                  a.speedToLead > 0 ? `${a.speedToLead} min` : "No data",
                  String(a.leadsCaptured),
                  String(a.hotLeads),
                  `${a.conversionRate}%`,
                ],
              }))}
            />
          </ReportSection>
        </div>
      )}

      {/* ═══ OPEN HOUSE TAB ═══ */}
      {activeTab === "openhouses" && (
        <div>
          <ReportSection title="Open House Performance by Agent">
            <ComparisonTable
              headers={["Agent", "Events (30d)", "Total Check-ins", "Avg/OH", "Hot Leads", "Conversion"]}
              rows={[...data.agents].sort((a, b) => b.openHouses - a.openHouses).map((a) => ({
                label: a.name,
                values: [
                  String(a.openHouses),
                  String(Math.round(a.checkinsPerOH * a.openHouses)),
                  a.checkinsPerOH.toFixed(1),
                  String(a.hotLeads),
                  `${a.conversionRate}%`,
                ],
              }))}
            />
          </ReportSection>
        </div>
      )}

      {/* ═══ FINANCIAL TAB ═══ */}
      {activeTab === "financial" && (
        <div>
          {/* Commission by Agent */}
          <ReportSection title="Commission by Agent (MTD)">
            <ComparisonTable
              headers={["Agent", "Closings", "Volume", "Commission (est)", "Pipeline Deals"]}
              rows={sortedAgents.map((a) => ({
                label: a.name,
                values: [
                  String(a.closingsMTD),
                  fmt$(a.volumeMTD) || "$0",
                  fmt$(a.closingsMTD * 8500) || "$0",
                  String(a.pipelineDeals),
                ],
              }))}
            />
          </ReportSection>

          {/* Revenue Trend */}
          <ReportSection title="Revenue Trend">
            <ComparisonTable
              headers={["Metric", ...data.monthlyTrend.map((m) => m.month)]}
              rows={[
                { label: "Closings", values: data.monthlyTrend.map((m) => String(m.closings)) },
                { label: "Revenue", values: data.monthlyTrend.map((m) => fmt$(m.revenue) || "$0") },
                { label: "New Leads", values: data.monthlyTrend.map((m) => String(m.leads)) },
              ]}
            />
          </ReportSection>

          {/* Totals */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <ValueCard label="Total Revenue MTD" value={fmt$(data.agents.reduce((s, a) => s + a.closingsMTD * 8500, 0)) || "$0"} color="#ecfdf5" />
            <ValueCard label="Total Volume MTD" value={fmt$(data.agents.reduce((s, a) => s + a.volumeMTD, 0)) || "$0"} />
            <ValueCard label="Pipeline Value" value={fmt$(o.pipelineValue) || "$0"} color="#fffbeb" />
          </div>
        </div>
      )}

      {/* ═══ ACTIVITY & RISK TAB ═══ */}
      {activeTab === "activity" && (
        <div>
          {/* Activity Summary */}
          <ReportSection title="Agent Activity (Last 30 Days)">
            <ComparisonTable
              headers={["Agent", "MLS Searches", "Reports", "Last Active", "Status"]}
              rows={[...data.agents].sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()).map((a) => {
                const lastActive = a.lastActivity ? new Date(a.lastActivity) : null;
                const daysSince = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / 86400000) : 999;
                return {
                  label: a.name,
                  values: [
                    String(a.mlsSearches),
                    String(a.reportsGenerated),
                    lastActive ? (daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : `${daysSince}d ago`) : "Never",
                    a.isAtRisk ? "AT RISK" : daysSince > 7 ? "Inactive" : "Active",
                  ],
                  changeValues: [0, 0, 0, a.isAtRisk ? -1 : daysSince > 7 ? -1 : 1],
                };
              })}
            />
          </ReportSection>

          {/* Retention Risk Agents */}
          {data.agents.some((a) => a.isAtRisk) && (
            <ReportSection title="Retention Risk">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.agents.filter((a) => a.isAtRisk).map((a) => (
                  <div key={a.id} style={{ padding: "12px 16px", background: "#fef2f2", borderLeft: "4px solid #dc2626", borderRadius: 6 }}>
                    <div style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      Activity dropped 40%+ from previous 30-day period. Current: {a.leadsCaptured} leads, {a.openHouses} OHs, {a.mlsSearches} searches.
                    </div>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}
        </div>
      )}
    </div>
  );
}
