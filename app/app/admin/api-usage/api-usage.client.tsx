"use client";

import { useState, useEffect } from "react";

const USER_PROJECTIONS = [10, 50, 100, 250, 500, 750, 1000];

const PROVIDER_LABELS: Record<string, string> = {
  rentcast: "RentCast",
  realie: "Realie",
  trestle: "Trestle (MLS)",
  ghl: "GoHighLevel",
  federal: "Federal Data",
  openai: "OpenAI / AI",
};

const PROVIDER_COLORS: Record<string, string> = {
  rentcast: "#059669",
  realie: "#7c3aed",
  trestle: "#1e40af",
  ghl: "#ea580c",
  federal: "#0891b2",
  openai: "#4f46e5",
};

interface UsageData {
  period: { days: number; since: string };
  activeUsers: number;
  totalCalls: number;
  cacheHits: number;
  cacheHitRate: number;
  byProvider: Record<string, number>;
  byEndpoint: Record<string, Record<string, number>>;
  dailyByProvider: Record<string, Record<string, number>>;
  avgResponseByProvider: Record<string, number>;
  ai: {
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
    byModel: Record<string, { calls: number; promptTokens: number; completionTokens: number; totalTokens: number; totalCost: number }>;
    bySource: Record<string, { calls: number; totalTokens: number; totalCost: number }>;
    costPerUser: number;
  };
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function ApiUsageDashboard() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/api-usage?days=${days}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Loading API usage data...</div>;
  if (!data) return <div style={{ textAlign: "center", padding: 40, color: "#dc2626" }}>Failed to load usage data.</div>;

  const providers = Object.keys(data.byProvider).sort((a, b) => data.byProvider[b] - data.byProvider[a]);
  const perUserPerDay = data.activeUsers > 0 && data.period.days > 0
    ? data.totalCalls / data.activeUsers / data.period.days
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Period Selector */}
      <div style={{ display: "flex", gap: 4 }}>
        {[7, 14, 30, 60, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 600,
              borderRadius: 6, border: "1px solid #d1d5db", cursor: "pointer",
              background: days === d ? "#1e40af" : "#fff",
              color: days === d ? "#fff" : "#374151",
            }}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>{fmtNum(data.totalCalls)}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Total API Calls ({days}d)</div>
        </div>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#059669" }}>{data.cacheHitRate}%</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Cache Hit Rate</div>
        </div>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1e40af" }}>{data.activeUsers}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Active Users</div>
        </div>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#7c3aed" }}>{perUserPerDay.toFixed(1)}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Calls/User/Day</div>
        </div>
      </div>

      {/* Per-Provider Breakdown */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 }}>API Calls by Provider</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>Provider</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>Calls ({days}d)</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>Calls/Day</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>Avg Response</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider, i) => {
                const count = data.byProvider[provider];
                const callsPerDay = Math.round(count / data.period.days);
                const pct = Math.round((count / data.totalCalls) * 100);
                const avgMs = data.avgResponseByProvider[provider];
                const color = PROVIDER_COLORS[provider] || "#374151";
                return (
                  <tr
                    key={provider}
                    onClick={() => setExpandedProvider(expandedProvider === provider ? null : provider)}
                    style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb", cursor: "pointer" }}
                  >
                    <td style={{ padding: "8px 10px", fontWeight: 600, color }}>
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 8 }} />
                      {PROVIDER_LABELS[provider] || provider}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmtNum(count)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{callsPerDay}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{avgMs ? `${avgMs}ms` : "—"}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                        <div style={{ width: 60, height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                          <div style={{ width: `${pct}%`, height: 6, background: color, borderRadius: 3 }} />
                        </div>
                        {pct}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Expanded endpoint breakdown */}
        {expandedProvider && data.byEndpoint[expandedProvider] && (
          <div style={{ marginTop: 10, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
              {PROVIDER_LABELS[expandedProvider] || expandedProvider} — Endpoints
            </div>
            {Object.entries(data.byEndpoint[expandedProvider])
              .sort(([, a], [, b]) => b - a)
              .map(([endpoint, count]) => (
                <div key={endpoint} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
                  <code style={{ color: "#6b7280" }}>{endpoint}</code>
                  <span style={{ fontWeight: 600 }}>{fmtNum(count)}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Projection Table */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
          API Call Projections by User Scale
        </h3>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
          Based on {perUserPerDay.toFixed(1)} API calls/user/day average over {days} days with {data.activeUsers} active user{data.activeUsers !== 1 ? "s" : ""}
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>Users</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>Calls/Day</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>Calls/Week</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>Calls/Month</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>Calls/Year</th>
                {providers.map(p => (
                  <th key={p} style={{ textAlign: "right", padding: "8px 10px", color: PROVIDER_COLORS[p] || "#6b7280", fontWeight: 600 }}>
                    {(PROVIDER_LABELS[p] || p).split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Current actual usage row */}
              <tr style={{ borderBottom: "2px solid #1e40af", background: "#eff6ff" }}>
                <td style={{ padding: "8px 10px", fontWeight: 700, color: "#1e40af" }}>
                  {data.activeUsers} (actual)
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>
                  {fmtNum(Math.round(data.totalCalls / data.period.days))}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                  {fmtNum(Math.round(data.totalCalls / data.period.days * 7))}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                  {fmtNum(Math.round(data.totalCalls / data.period.days * 30))}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                  {fmtNum(Math.round(data.totalCalls / data.period.days * 365))}
                </td>
                {providers.map(p => {
                  const providerDaily = Math.round(data.byProvider[p] / data.period.days);
                  return (
                    <td key={p} style={{ padding: "8px 10px", textAlign: "right" }}>
                      {fmtNum(Math.round(providerDaily * 30))}
                    </td>
                  );
                })}
              </tr>

              {/* Projection rows */}
              {USER_PROJECTIONS.map((users, i) => {
                const scaleFactor = data.activeUsers > 0 ? users / data.activeUsers : users;
                const dailyCalls = Math.round(perUserPerDay * users);
                return (
                  <tr key={users} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{users.toLocaleString()}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmtNum(dailyCalls)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmtNum(dailyCalls * 7)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmtNum(dailyCalls * 30)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmtNum(dailyCalls * 365)}</td>
                    {providers.map(p => {
                      const providerShare = data.totalCalls > 0 ? data.byProvider[p] / data.totalCalls : 0;
                      const projected = Math.round(dailyCalls * 30 * providerShare);
                      return (
                        <td key={p} style={{ padding: "8px 10px", textAlign: "right" }}>{fmtNum(projected)}</td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
          Projections assume linear scaling. Actual usage may vary with caching efficiency at scale.
          Cache hit rate ({data.cacheHitRate}%) reduces real API calls — projections show gross calls before caching.
        </div>
      </div>

      {/* AI Token Usage & Cost */}
      {data.ai && data.ai.totalCalls > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
            AI Token Usage & Cost
          </h3>
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
            Vercel AI Gateway — OpenAI & Anthropic
          </p>

          {/* AI Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
            <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>{fmtNum(data.ai.totalCalls)}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>AI Calls</div>
            </div>
            <div style={{ padding: 12, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1e40af" }}>{fmtNum(data.ai.totalTokens)}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Total Tokens</div>
            </div>
            <div style={{ padding: 12, background: "#faf5ff", borderRadius: 8, border: "1px solid #d8b4fe" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#7c3aed" }}>${data.ai.totalCost.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Est. Cost ({days}d)</div>
            </div>
            <div style={{ padding: 12, background: "#fff7ed", borderRadius: 8, border: "1px solid #fed7aa" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#ea580c" }}>${data.ai.costPerUser.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Cost/User ({days}d)</div>
            </div>
          </div>

          {/* By Model */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>By Model</div>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Model</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Calls</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Prompt Tokens</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Completion</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Total Tokens</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.ai.byModel)
                  .sort(([, a], [, b]) => b.totalCost - a.totalCost)
                  .map(([model, stats], i) => (
                    <tr key={model} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 500 }}><code>{model}</code></td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(stats.calls)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(stats.promptTokens)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(stats.completionTokens)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{fmtNum(stats.totalTokens)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "#7c3aed" }}>${stats.totalCost.toFixed(4)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* By Feature/Source */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>By Feature</div>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Feature</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Calls</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Total Tokens</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.ai.bySource)
                  .sort(([, a], [, b]) => b.totalCost - a.totalCost)
                  .map(([source, stats], i) => (
                    <tr key={source} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 500 }}>{source}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(stats.calls)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(stats.totalTokens)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "#7c3aed" }}>${stats.totalCost.toFixed(4)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* AI Cost Projection */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>AI Cost Projections</div>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Users</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Tokens/Month</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Cost/Month</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Cost/Year</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Cost/User/Mo</th>
                </tr>
              </thead>
              <tbody>
                {/* Actual row */}
                <tr style={{ borderBottom: "2px solid #7c3aed", background: "#faf5ff" }}>
                  <td style={{ padding: "6px 8px", fontWeight: 700, color: "#7c3aed" }}>{data.activeUsers} (actual)</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(Math.round(data.ai.totalTokens / days * 30))}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>${(data.ai.totalCost / days * 30).toFixed(2)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>${(data.ai.totalCost / days * 365).toFixed(2)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>${data.ai.costPerUser > 0 ? (data.ai.costPerUser / days * 30).toFixed(2) : "—"}</td>
                </tr>
                {USER_PROJECTIONS.map((users, i) => {
                  const scale = data.activeUsers > 0 ? users / data.activeUsers : users;
                  const monthlyTokens = Math.round(data.ai.totalTokens / days * 30 * scale);
                  const monthlyCost = data.ai.totalCost / days * 30 * scale;
                  return (
                    <tr key={users} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 600 }}>{users.toLocaleString()}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(monthlyTokens)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "#7c3aed" }}>${monthlyCost.toFixed(2)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>${(monthlyCost * 12).toFixed(2)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>${(monthlyCost / users).toFixed(4)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
              Pricing: GPT-4o-mini ($0.15/$0.60 per 1M tokens), GPT-4-turbo ($10/$30), Claude Opus ($15/$75). Actual costs depend on model mix.
            </div>
          </div>
        </div>
      )}

      {/* Daily Trend (simple text-based) */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Daily API Call Trend</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "4px 8px", color: "#6b7280", fontWeight: 600 }}>Date</th>
                {providers.map(p => (
                  <th key={p} style={{ textAlign: "right", padding: "4px 8px", color: PROVIDER_COLORS[p] || "#6b7280", fontWeight: 600 }}>
                    {(PROVIDER_LABELS[p] || p).split(" ")[0]}
                  </th>
                ))}
                <th style={{ textAlign: "right", padding: "4px 8px", color: "#111827", fontWeight: 700 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Get all unique dates across providers
                const allDates = new Set<string>();
                for (const dailys of Object.values(data.dailyByProvider)) {
                  for (const date of Object.keys(dailys)) allDates.add(date);
                }
                const sortedDates = [...allDates].sort().reverse().slice(0, 30);

                return sortedDates.map((date, i) => {
                  let dayTotal = 0;
                  return (
                    <tr key={date} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                      <td style={{ padding: "4px 8px", fontWeight: 500 }}>{date}</td>
                      {providers.map(p => {
                        const count = data.dailyByProvider[p]?.[date] || 0;
                        dayTotal += count;
                        return (
                          <td key={p} style={{ padding: "4px 8px", textAlign: "right" }}>{count || "—"}</td>
                        );
                      })}
                      <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 600 }}>{dayTotal}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
