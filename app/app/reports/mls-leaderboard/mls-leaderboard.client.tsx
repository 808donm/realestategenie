"use client";

import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const fmt = (n: number) => "$" + n.toLocaleString();
const fmtM = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;

type Tab = "agents" | "offices";
type SortKey = "totalSales" | "totalVolume" | "listingSales" | "buyerSales" | "avgPrice" | "avgDOM";
type AgentType = "both" | "listing" | "buyer";

const PROPERTY_TYPE_OPTIONS = [
  { value: "Residential", label: "SFR / Condo / Townhouse" },
  { value: "Land", label: "Land" },
  { value: "Commercial", label: "Commercial" },
  { value: "MultiFamily", label: "Multi-Family" },
  { value: "ResidentialLease", label: "Residential Lease" },
];

interface AgentRow {
  rank: number;
  name: string;
  email: string;
  phone: string;
  office: string;
  listingSales: number;
  buyerSales: number;
  totalSales: number;
  listingVolume: number;
  buyerVolume: number;
  totalVolume: number;
  avgPrice: number;
  avgDOM: number;
  topCity: string;
  topPropertyType: string;
}

interface OfficeRow {
  rank: number;
  name: string;
  sales: number;
  volume: number;
  agentCount: number;
  avgPerAgent: number;
}

export default function MlsLeaderboardClient() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [offices, setOffices] = useState<OfficeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("agents");
  const [sortKey, setSortKey] = useState<SortKey>("totalSales");
  const [sortAsc, setSortAsc] = useState(false);
  const [months, setMonths] = useState(12);
  const [agentType, setAgentType] = useState<AgentType>("both");
  const [topN, setTopN] = useState(100);
  const [selectedPropTypes, setSelectedPropTypes] = useState<string[]>(["Residential", "Land"]);
  const [totalTx, setTotalTx] = useState(0);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);

  const exportToCRM = async () => {
    if (agents.length === 0) return;
    setExporting(true);
    setExportResult(null);
    try {
      const res = await fetch("/api/mls/agent-leaderboard/export-crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agents: sorted.map((a) => ({
            name: a.name, email: a.email, phone: a.phone,
            office: a.office, rank: a.rank, totalSales: a.totalSales,
            topPropertyType: a.topPropertyType,
          })),
        }),
      });
      const data = await res.json();
      setExportResult(data);
    } catch (err: any) {
      setExportResult({ error: err.message });
    }
    setExporting(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const propTypeParam = selectedPropTypes.length > 0 ? `&propertyTypes=${selectedPropTypes.join(",")}` : "";
      const res = await fetch(`/api/mls/agent-leaderboard?months=${months}&limit=${topN}&type=${agentType}${propTypeParam}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAgents(data.agents || []);
      setOffices(data.offices || []);
      setTotalTx(data.totalTransactions || 0);
      setDateRange(data.dateRange);
      setHasLoaded(true);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, [months, topN, agentType, selectedPropTypes]);

  const sorted = [...agents].sort((a, b) => {
    const va = a[sortKey] as number;
    const vb = b[sortKey] as number;
    return sortAsc ? va - vb : vb - va;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Agent sheet
    const agentRows = sorted.map((a) => ({
      Rank: a.rank,
      "Agent Name": a.name,
      Email: a.email,
      Phone: a.phone,
      Office: a.office,
      "Total Sales": a.totalSales,
      "Listing Sales": a.listingSales,
      "Buyer Sales": a.buyerSales,
      "Total Volume": a.totalVolume,
      "Listing Volume": a.listingVolume,
      "Buyer Volume": a.buyerVolume,
      "Avg Price": a.avgPrice,
      "Avg DOM": a.avgDOM,
      "Top City": a.topCity,
      "Top Property Type": a.topPropertyType,
    }));
    const agentWs = XLSX.utils.json_to_sheet(agentRows);

    // Set column widths
    agentWs["!cols"] = [
      { wch: 6 }, { wch: 30 }, { wch: 35 }, { wch: 12 }, { wch: 14 },
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 14 }, { wch: 12 },
      { wch: 10 }, { wch: 15 }, { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, agentWs, "Top Agents");

    // Office sheet
    const officeRows = offices.map((o) => ({
      Rank: o.rank,
      Office: o.name,
      "Total Sales": o.sales,
      "Total Volume": o.volume,
      "Agent Count": o.agentCount,
      "Avg Sales/Agent": o.avgPerAgent,
    }));
    const officeWs = XLSX.utils.json_to_sheet(officeRows);
    officeWs["!cols"] = [
      { wch: 6 }, { wch: 40 }, { wch: 12 }, { wch: 15 }, { wch: 14 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, officeWs, "Top Offices");

    // Summary sheet
    const summaryRows = [
      { Metric: "Report", Value: "MLS Agent Leaderboard" },
      { Metric: "Date Range", Value: dateRange ? `${dateRange.from} to ${dateRange.to}` : "" },
      { Metric: "Period", Value: `${months} months` },
      { Metric: "Total Transactions", Value: totalTx },
      { Metric: "Agents Ranked", Value: agents.length },
      { Metric: "Offices", Value: offices.length },
      { Metric: "Side", Value: agentType === "both" ? "Listing + Buyer" : agentType === "listing" ? "Listing Only" : "Buyer Only" },
      { Metric: "Generated", Value: new Date().toLocaleString() },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    summaryWs["!cols"] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    const filename = `MLS_Agent_Leaderboard_${months}mo_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: "10px 12px", textAlign: "right" as const, fontSize: 12, fontWeight: 700,
    cursor: "pointer", whiteSpace: "nowrap" as const, userSelect: "none" as const,
    color: sortKey === key ? "#2563eb" : "#374151",
    borderBottom: "2px solid #e5e7eb",
  });

  const chartData = sorted.slice(0, 20).map((a) => ({
    name: a.name.length > 20 ? a.name.slice(0, 18) + "..." : a.name,
    "Listing Sales": a.listingSales,
    "Buyer Sales": a.buyerSales,
  }));

  const volumeChartData = sorted.slice(0, 15).map((a) => ({
    name: a.name.length > 20 ? a.name.slice(0, 18) + "..." : a.name,
    Volume: a.totalVolume,
  }));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>MLS Agent Leaderboard</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6b7280" }}>
          Market-wide agent rankings from MLS closed transactions
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Period</label>
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} style={selectStyle}>
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Side</label>
          <select value={agentType} onChange={(e) => setAgentType(e.target.value as AgentType)} style={selectStyle}>
            <option value="both">Both (Listing + Buyer)</option>
            <option value="listing">Listing Agents Only</option>
            <option value="buyer">Buyer Agents Only</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Top N</label>
          <select value={topN} onChange={(e) => setTopN(Number(e.target.value))} style={selectStyle}>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
            <option value={250}>Top 250</option>
            <option value={500}>Top 500</option>
            <option value={1000}>Top 1000</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Property Types</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PROPERTY_TYPE_OPTIONS.map((t) => {
              const sel = selectedPropTypes.includes(t.value);
              return (
                <button key={t.value} type="button" onClick={() => setSelectedPropTypes(sel ? selectedPropTypes.filter((x) => x !== t.value) : [...selectedPropTypes, t.value])} style={{ padding: "6px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: "pointer", border: sel ? "2px solid #2563eb" : "1px solid #d1d5db", background: sel ? "#eff6ff" : "#fff", color: sel ? "#2563eb" : "#6b7280" }}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: "10px 24px", borderRadius: 8, border: "none",
            background: "#2563eb", color: "#fff", fontWeight: 600,
            cursor: loading ? "wait" : "pointer", fontSize: 14,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading MLS data..." : hasLoaded ? "Refresh" : "Generate Leaderboard"}
        </button>
        {hasLoaded && (
          <>
            <button
              onClick={exportToExcel}
              style={{
                padding: "10px 24px", borderRadius: 8, border: "1px solid #059669",
                background: "#fff", color: "#059669", fontWeight: 600,
                cursor: "pointer", fontSize: 14,
              }}
            >
              Export to Excel
            </button>
            <button
              onClick={exportToCRM}
              disabled={exporting}
              style={{
                padding: "10px 24px", borderRadius: 8, border: "1px solid #8b5cf6",
                background: "#fff", color: "#8b5cf6", fontWeight: 600,
                cursor: exporting ? "wait" : "pointer", fontSize: 14,
                opacity: exporting ? 0.6 : 1,
              }}
            >
              {exporting ? "Exporting to CRM..." : "Export to CRM"}
            </button>
          </>
        )}
      </div>

      {error && (
        <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {exportResult && (
        <div style={{ padding: 16, background: exportResult.error ? "#fef2f2" : "#f0fdf4", border: `1px solid ${exportResult.error ? "#fecaca" : "#bbf7d0"}`, borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
          {exportResult.error ? (
            <span style={{ color: "#dc2626" }}>CRM export failed: {exportResult.error}</span>
          ) : (
            <span style={{ color: "#166534" }}>
              <strong>CRM Export:</strong> {exportResult.created} created, {exportResult.updated} updated, {exportResult.skipped} skipped (no email/phone)
              {exportResult.errors?.length > 0 && <span style={{ color: "#dc2626", display: "block", marginTop: 4 }}>{exportResult.errors.join("; ")}</span>}
            </span>
          )}
          <button onClick={() => setExportResult(null)} style={{ marginLeft: 12, fontSize: 12, cursor: "pointer", background: "none", border: "none", color: "#6b7280" }}>Dismiss</button>
        </div>
      )}

      {!hasLoaded && !loading && (
        <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Click "Generate Leaderboard" to fetch MLS data</p>
          <p style={{ fontSize: 14 }}>This queries all closed transactions on Oahu and ranks agents by sales volume.</p>
        </div>
      )}

      {hasLoaded && (
        <>
          {/* Stats bar */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { label: "Total Transactions", value: totalTx.toLocaleString() },
              { label: "Agents Ranked", value: agents.length.toLocaleString() },
              { label: "Offices", value: offices.length.toLocaleString() },
              { label: "Date Range", value: dateRange ? `${dateRange.from} to ${dateRange.to}` : "" },
            ].map((s) => (
              <div key={s.label} style={{ padding: "12px 20px", background: "#f0f9ff", borderRadius: 8, border: "1px solid #bae6fd" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#0369a1", textTransform: "uppercase" }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0c4a6e" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {(["agents", "offices"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  border: tab === t ? "2px solid #2563eb" : "1px solid #d1d5db",
                  background: tab === t ? "#eff6ff" : "#fff",
                  color: tab === t ? "#2563eb" : "#6b7280",
                }}
              >
                {t === "agents" ? "Top Agents" : "Top Offices"}
              </button>
            ))}
          </div>

          {/* Agent Tab */}
          {tab === "agents" && (
            <>
              {/* Charts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Top 20 - Sales Count</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Listing Sales" fill="#2563eb" stackId="sales" />
                      <Bar dataKey="Buyer Sales" fill="#10b981" stackId="sales" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Top 15 - Total Volume</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={volumeChartData} layout="vertical" margin={{ left: 100, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => fmtM(v)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(v) => fmt(Number(v))} />
                      <Bar dataKey="Volume" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ ...thStyle("totalSales"), textAlign: "center", width: 50 }}>#</th>
                      <th style={{ ...thStyle("totalSales"), textAlign: "left" }}>Agent</th>
                      <th style={{ ...thStyle("totalSales"), textAlign: "left" }}>Email</th>
                      <th style={{ ...thStyle("totalSales"), textAlign: "left" }}>Phone</th>
                      <th style={{ ...thStyle("totalSales"), textAlign: "left" }}>Office</th>
                      <th style={thStyle("totalSales")} onClick={() => handleSort("totalSales")}>Total Sales {sortKey === "totalSales" ? (sortAsc ? "^" : "v") : ""}</th>
                      <th style={thStyle("listingSales")} onClick={() => handleSort("listingSales")}>Listings {sortKey === "listingSales" ? (sortAsc ? "^" : "v") : ""}</th>
                      <th style={thStyle("buyerSales")} onClick={() => handleSort("buyerSales")}>Buyer {sortKey === "buyerSales" ? (sortAsc ? "^" : "v") : ""}</th>
                      <th style={thStyle("totalVolume")} onClick={() => handleSort("totalVolume")}>Volume {sortKey === "totalVolume" ? (sortAsc ? "^" : "v") : ""}</th>
                      <th style={thStyle("avgPrice")} onClick={() => handleSort("avgPrice")}>Avg Price {sortKey === "avgPrice" ? (sortAsc ? "^" : "v") : ""}</th>
                      <th style={thStyle("avgDOM")} onClick={() => handleSort("avgDOM")}>Avg DOM {sortKey === "avgDOM" ? (sortAsc ? "^" : "v") : ""}</th>
                      <th style={{ ...thStyle("totalSales"), cursor: "default" }}>Top City</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((a, i) => (
                      <tr key={a.name} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: a.rank <= 3 ? "#d97706" : "#6b7280" }}>{a.rank}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{a.name}</td>
                        <td style={{ padding: "8px 12px", color: "#6b7280", fontSize: 12 }}>{a.email}</td>
                        <td style={{ padding: "8px 12px", color: "#6b7280", fontSize: 12 }}>{a.phone}</td>
                        <td style={{ padding: "8px 12px", color: "#6b7280", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.office}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{a.totalSales}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#2563eb" }}>{a.listingSales}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#10b981" }}>{a.buyerSales}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{fmtM(a.totalVolume)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmtM(a.avgPrice)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{a.avgDOM}</td>
                        <td style={{ padding: "8px 12px", color: "#6b7280" }}>{a.topCity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Office Tab */}
          {tab === "offices" && (
            <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, fontWeight: 700, borderBottom: "2px solid #e5e7eb" }}>#</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, borderBottom: "2px solid #e5e7eb" }}>Office</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 700, borderBottom: "2px solid #e5e7eb" }}>Total Sales</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 700, borderBottom: "2px solid #e5e7eb" }}>Volume</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 700, borderBottom: "2px solid #e5e7eb" }}>Agents</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 700, borderBottom: "2px solid #e5e7eb" }}>Avg/Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {offices.map((o, i) => (
                    <tr key={o.name} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: o.rank <= 3 ? "#d97706" : "#6b7280" }}>{o.rank}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>{o.name}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{o.sales}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{fmtM(o.volume)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>{o.agentCount}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>{o.avgPerAgent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db",
  fontSize: 14, outline: "none", background: "#fff",
};
