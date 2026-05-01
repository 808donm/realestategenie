"use client";

import { useState, useEffect } from "react";

const USER_PROJECTIONS = [10, 50, 100, 250, 500, 750, 1000];

// Provider pricing tiers (monthly plans, calls/month, cost/month)
const PROVIDER_PRICING: Record<
  string,
  { tiers: Array<{ name: string; calls: number; cost: number }>; perCallOverage?: number }
> = {
  rentcast: {
    tiers: [
      { name: "Free", calls: 100, cost: 0 },
      { name: "Starter", calls: 1000, cost: 29 },
      { name: "Professional", calls: 5000, cost: 99 },
      { name: "Business", calls: 20000, cost: 299 },
      { name: "Enterprise", calls: 100000, cost: 999 },
    ],
    perCallOverage: 0.01,
  },
  realie: {
    tiers: [
      { name: "Free", calls: 500, cost: 0 },
      { name: "Starter", calls: 5000, cost: 49 },
      { name: "Growth", calls: 25000, cost: 149 },
      { name: "Business", calls: 100000, cost: 399 },
      { name: "Enterprise", calls: 500000, cost: 999 },
    ],
    perCallOverage: 0.005,
  },
  trestle: {
    tiers: [
      { name: "Standard", calls: 50000, cost: 0 }, // Typically included with MLS membership
      { name: "Enhanced", calls: 200000, cost: 99 },
      { name: "Enterprise", calls: 1000000, cost: 299 },
    ],
  },
};

function getRecommendedTier(
  provider: string,
  monthlyCalls: number,
): { current: string; recommended: string; monthlyCost: number; headroom: number } | null {
  const pricing = PROVIDER_PRICING[provider];
  if (!pricing) return null;

  // Find current tier (smallest that fits)
  let currentTier = pricing.tiers[0];
  let recommendedTier = pricing.tiers[0];

  for (const tier of pricing.tiers) {
    if (monthlyCalls <= tier.calls) {
      recommendedTier = tier;
      break;
    }
    recommendedTier = tier; // if exceeds all, use highest
  }

  // Current = smallest tier that has been exceeded
  for (const tier of pricing.tiers) {
    currentTier = tier;
    if (monthlyCalls <= tier.calls) break;
  }

  const headroom =
    recommendedTier.calls > 0 ? Math.round(((recommendedTier.calls - monthlyCalls) / recommendedTier.calls) * 100) : 0;

  return {
    current: currentTier.name,
    recommended: recommendedTier.name,
    monthlyCost: recommendedTier.cost,
    headroom: Math.max(0, headroom),
  };
}

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
    byModel: Record<
      string,
      { calls: number; promptTokens: number; completionTokens: number; totalTokens: number; totalCost: number }
    >;
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
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading)
    return <div style={{ textAlign: "center", padding: 40, color: "hsl(var(--muted-foreground))" }}>Loading API usage data...</div>;
  if (!data)
    return <div style={{ textAlign: "center", padding: 40, color: "#dc2626" }}>Failed to load usage data.</div>;

  const providers = Object.keys(data.byProvider).sort((a, b) => data.byProvider[b] - data.byProvider[a]);
  const perUserPerDay =
    data.activeUsers > 0 && data.period.days > 0 ? data.totalCalls / data.activeUsers / data.period.days : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Period Selector */}
      <div style={{ display: "flex", gap: 4 }}>
        {[7, 14, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: "1px solid hsl(var(--border))",
              cursor: "pointer",
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
        <div style={{ padding: 16, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "hsl(var(--foreground))" }}>{fmtNum(data.totalCalls)}</div>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Total API Calls ({days}d)</div>
        </div>
        <div style={{ padding: 16, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#059669" }}>{data.cacheHitRate}%</div>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Cache Hit Rate</div>
        </div>
        <div style={{ padding: 16, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1e40af" }}>{data.activeUsers}</div>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Active Users</div>
        </div>
        <div style={{ padding: 16, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#7c3aed" }}>{perUserPerDay.toFixed(1)}</div>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Calls/User/Day</div>
        </div>
      </div>

      {/* Per-Provider Breakdown */}
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 12 }}>API Calls by Provider</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "8px 10px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>Provider</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                  Calls ({days}d)
                </th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                  Calls/Day
                </th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                  Avg Response
                </th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                  % of Total
                </th>
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
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      background: i % 2 === 0 ? "#fff" : "#f9fafb",
                      cursor: "pointer",
                    }}
                  >
                    <td style={{ padding: "8px 10px", fontWeight: 600, color }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: color,
                          marginRight: 8,
                        }}
                      />
                      {PROVIDER_LABELS[provider] || provider}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmtNum(count)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{callsPerDay}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{avgMs ? `${avgMs}ms` : "—"}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                        <div style={{ width: 60, height: 6, background: "hsl(var(--muted))", borderRadius: 3 }}>
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
          <div style={{ marginTop: 10, padding: 12, background: "hsl(var(--muted))", borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 6 }}>
              {PROVIDER_LABELS[expandedProvider] || expandedProvider} — Endpoints
            </div>
            {Object.entries(data.byEndpoint[expandedProvider])
              .sort(([, a], [, b]) => b - a)
              .map(([endpoint, count]) => (
                <div
                  key={endpoint}
                  style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}
                >
                  <code style={{ color: "hsl(var(--muted-foreground))" }}>{endpoint}</code>
                  <span style={{ fontWeight: 600 }}>{fmtNum(count)}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Projection Table */}
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}>
          API Call Projections by User Scale
        </h3>
        <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 12 }}>
          Based on {perUserPerDay.toFixed(1)} API calls/user/day average over {days} days with {data.activeUsers} active
          user{data.activeUsers !== 1 ? "s" : ""}
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "8px 10px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>Users</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                  Calls/Day
                </th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                  Calls/Week
                </th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                  Calls/Month
                </th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                  Calls/Year
                </th>
                {providers.map((p) => (
                  <th
                    key={p}
                    style={{
                      textAlign: "right",
                      padding: "8px 10px",
                      color: PROVIDER_COLORS[p] || "#6b7280",
                      fontWeight: 600,
                    }}
                  >
                    {(PROVIDER_LABELS[p] || p).split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Current actual usage row */}
              <tr style={{ borderBottom: "2px solid #1e40af", background: "#eff6ff" }}>
                <td style={{ padding: "8px 10px", fontWeight: 700, color: "#1e40af" }}>{data.activeUsers} (actual)</td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>
                  {fmtNum(Math.round(data.totalCalls / data.period.days))}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                  {fmtNum(Math.round((data.totalCalls / data.period.days) * 7))}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                  {fmtNum(Math.round((data.totalCalls / data.period.days) * 30))}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                  {fmtNum(Math.round((data.totalCalls / data.period.days) * 365))}
                </td>
                {providers.map((p) => {
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
                  <tr
                    key={users}
                    style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
                  >
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{users.toLocaleString()}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmtNum(dailyCalls)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmtNum(dailyCalls * 7)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmtNum(dailyCalls * 30)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>
                      {fmtNum(dailyCalls * 365)}
                    </td>
                    {providers.map((p) => {
                      const providerShare = data.totalCalls > 0 ? data.byProvider[p] / data.totalCalls : 0;
                      const projected = Math.round(dailyCalls * 30 * providerShare);
                      return (
                        <td key={p} style={{ padding: "8px 10px", textAlign: "right" }}>
                          {fmtNum(projected)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 8 }}>
          Projections assume linear scaling. Actual usage may vary with caching efficiency at scale. Cache hit rate (
          {data.cacheHitRate}%) reduces real API calls — projections show gross calls before caching.
        </div>
      </div>

      {/* Provider Cost Analysis & Tier Recommendations */}
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}>
          API Provider Costs & Tier Recommendations
        </h3>
        <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 12 }}>
          Based on {days}-day usage, projected monthly costs and recommended plan tiers
        </p>

        {/* Current usage vs tier cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {providers
            .filter((p) => PROVIDER_PRICING[p])
            .map((provider) => {
              const count = data.byProvider[provider] || 0;
              const monthlyCalls = Math.round((count / days) * 30);
              const tierInfo = getRecommendedTier(provider, monthlyCalls);
              if (!tierInfo) return null;
              const color = PROVIDER_COLORS[provider] || "#374151";
              const isNearLimit = tierInfo.headroom < 20;
              const isOverLimit = tierInfo.headroom <= 0;

              return (
                <div
                  key={provider}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    border: `2px solid ${isOverLimit ? "#dc2626" : isNearLimit ? "#f59e0b" : color}`,
                    background: isOverLimit ? "#fef2f2" : isNearLimit ? "#fffbeb" : "#fff",
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700, color }}>{PROVIDER_LABELS[provider] || provider}</div>
                    <div
                      style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        background: isOverLimit ? "#dc2626" : isNearLimit ? "#f59e0b" : "#059669",
                        color: "#fff",
                      }}
                    >
                      {isOverLimit
                        ? "UPGRADE NEEDED"
                        : isNearLimit
                          ? "NEARING LIMIT"
                          : `${tierInfo.headroom}% headroom`}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>
                    Current plan: <strong>{tierInfo.current}</strong> | Recommended:{" "}
                    <strong>{tierInfo.recommended}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                    Est. monthly calls: <strong>{fmtNum(monthlyCalls)}</strong> | Plan cost:{" "}
                    <strong>${tierInfo.monthlyCost}/mo</strong>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Cost projection table by provider */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 6 }}>
          Cost Projections by Provider & User Scale
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>Users</th>
                {providers
                  .filter((p) => PROVIDER_PRICING[p])
                  .map((p) => (
                    <th
                      key={`${p}-calls`}
                      style={{ textAlign: "right", padding: "6px 8px", color: PROVIDER_COLORS[p], fontWeight: 600 }}
                    >
                      {(PROVIDER_LABELS[p] || p).split(" ")[0]} Calls/Mo
                    </th>
                  ))}
                {providers
                  .filter((p) => PROVIDER_PRICING[p])
                  .map((p) => (
                    <th
                      key={`${p}-tier`}
                      style={{ textAlign: "right", padding: "6px 8px", color: PROVIDER_COLORS[p], fontWeight: 600 }}
                    >
                      {(PROVIDER_LABELS[p] || p).split(" ")[0]} Tier
                    </th>
                  ))}
                <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--foreground))", fontWeight: 700 }}>Total/Mo</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--foreground))", fontWeight: 700 }}>
                  Total/Year
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Actual row */}
              <tr style={{ borderBottom: "2px solid #1e40af", background: "#eff6ff" }}>
                <td style={{ padding: "6px 8px", fontWeight: 700, color: "#1e40af" }}>{data.activeUsers} (actual)</td>
                {providers
                  .filter((p) => PROVIDER_PRICING[p])
                  .map((p) => {
                    const monthly = Math.round(((data.byProvider[p] || 0) / days) * 30);
                    return (
                      <td key={`${p}-c`} style={{ padding: "6px 8px", textAlign: "right" }}>
                        {fmtNum(monthly)}
                      </td>
                    );
                  })}
                {providers
                  .filter((p) => PROVIDER_PRICING[p])
                  .map((p) => {
                    const monthly = Math.round(((data.byProvider[p] || 0) / days) * 30);
                    const tier = getRecommendedTier(p, monthly);
                    return (
                      <td key={`${p}-t`} style={{ padding: "6px 8px", textAlign: "right", fontWeight: 500 }}>
                        {tier?.recommended || "—"} (${tier?.monthlyCost || 0})
                      </td>
                    );
                  })}
                {(() => {
                  let totalMonthly = 0;
                  providers
                    .filter((p) => PROVIDER_PRICING[p])
                    .forEach((p) => {
                      const monthly = Math.round(((data.byProvider[p] || 0) / days) * 30);
                      const tier = getRecommendedTier(p, monthly);
                      totalMonthly += tier?.monthlyCost || 0;
                    });
                  return (
                    <>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>${totalMonthly}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>
                        ${(totalMonthly * 12).toLocaleString()}
                      </td>
                    </>
                  );
                })()}
              </tr>

              {/* Projection rows */}
              {USER_PROJECTIONS.map((users, i) => {
                const scale = data.activeUsers > 0 ? users / data.activeUsers : users;
                let rowTotalMonthly = 0;

                return (
                  <tr
                    key={users}
                    style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
                  >
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>{users.toLocaleString()}</td>
                    {providers
                      .filter((p) => PROVIDER_PRICING[p])
                      .map((p) => {
                        const monthly = Math.round(((data.byProvider[p] || 0) / days) * 30 * scale);
                        return (
                          <td key={`${p}-c`} style={{ padding: "6px 8px", textAlign: "right" }}>
                            {fmtNum(monthly)}
                          </td>
                        );
                      })}
                    {providers
                      .filter((p) => PROVIDER_PRICING[p])
                      .map((p) => {
                        const monthly = Math.round(((data.byProvider[p] || 0) / days) * 30 * scale);
                        const tier = getRecommendedTier(p, monthly);
                        rowTotalMonthly += tier?.monthlyCost || 0;
                        return (
                          <td key={`${p}-t`} style={{ padding: "6px 8px", textAlign: "right", fontWeight: 500 }}>
                            {tier?.recommended || "—"} (${tier?.monthlyCost || 0})
                          </td>
                        );
                      })}
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>${rowTotalMonthly}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>
                      ${(rowTotalMonthly * 12).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tier breakdown */}
        <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 6 }}>
          Available Plan Tiers
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
          {Object.entries(PROVIDER_PRICING).map(([provider, pricing]) => (
            <div
              key={provider}
              style={{ padding: 12, background: "hsl(var(--muted))", borderRadius: 8, border: "1px solid hsl(var(--border))" }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: PROVIDER_COLORS[provider] || "#374151",
                  marginBottom: 6,
                }}
              >
                {PROVIDER_LABELS[provider] || provider}
              </div>
              {pricing.tiers.map((tier) => (
                <div
                  key={tier.name}
                  style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 12 }}
                >
                  <span style={{ fontWeight: 500 }}>{tier.name}</span>
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>
                    {fmtNum(tier.calls)} calls/mo — ${tier.cost}/mo
                  </span>
                </div>
              ))}
              {pricing.perCallOverage && (
                <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>
                  Overage: ${pricing.perCallOverage}/call beyond plan limit
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Token Usage & Cost */}
      {data.ai && data.ai.totalCalls > 0 && (
        <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}>AI Token Usage & Cost</h3>
          <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 12 }}>Vercel AI Gateway — OpenAI & Anthropic</p>

          {/* AI Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>{fmtNum(data.ai.totalCalls)}</div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>AI Calls</div>
            </div>
            <div style={{ padding: 12, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1e40af" }}>{fmtNum(data.ai.totalTokens)}</div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Total Tokens</div>
            </div>
            <div style={{ padding: 12, background: "#faf5ff", borderRadius: 8, border: "1px solid #d8b4fe" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#7c3aed" }}>${data.ai.totalCost.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Est. Cost ({days}d)</div>
            </div>
            <div style={{ padding: 12, background: "#fff7ed", borderRadius: 8, border: "1px solid #fed7aa" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#ea580c" }}>${data.ai.costPerUser.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Cost/User ({days}d)</div>
            </div>
          </div>

          {/* By Model */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 6 }}>By Model</div>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>Model</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>Calls</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                    Prompt Tokens
                  </th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                    Completion
                  </th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                    Total Tokens
                  </th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                    Est. Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.ai.byModel)
                  .sort(([, a], [, b]) => b.totalCost - a.totalCost)
                  .map(([model, stats], i) => (
                    <tr
                      key={model}
                      style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
                    >
                      <td style={{ padding: "6px 8px", fontWeight: 500 }}>
                        <code>{model}</code>
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(stats.calls)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(stats.promptTokens)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(stats.completionTokens)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>
                        {fmtNum(stats.totalTokens)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "#7c3aed" }}>
                        ${stats.totalCost.toFixed(4)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* By Feature/Source */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 6 }}>By Feature</div>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>Feature</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>Calls</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                    Total Tokens
                  </th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                    Est. Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.ai.bySource)
                  .sort(([, a], [, b]) => b.totalCost - a.totalCost)
                  .map(([source, stats], i) => (
                    <tr
                      key={source}
                      style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
                    >
                      <td style={{ padding: "6px 8px", fontWeight: 500 }}>{source}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(stats.calls)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(stats.totalTokens)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "#7c3aed" }}>
                        ${stats.totalCost.toFixed(4)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* AI Cost Projection */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 6 }}>AI Cost Projections</div>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>Users</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                    Tokens/Month
                  </th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                    Cost/Month
                  </th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                    Cost/Year
                  </th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
                    Cost/User/Mo
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Actual row */}
                <tr style={{ borderBottom: "2px solid #7c3aed", background: "#faf5ff" }}>
                  <td style={{ padding: "6px 8px", fontWeight: 700, color: "#7c3aed" }}>{data.activeUsers} (actual)</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>
                    {fmtNum(Math.round((data.ai.totalTokens / days) * 30))}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>
                    ${((data.ai.totalCost / days) * 30).toFixed(2)}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>
                    ${((data.ai.totalCost / days) * 365).toFixed(2)}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>
                    ${data.ai.costPerUser > 0 ? ((data.ai.costPerUser / days) * 30).toFixed(2) : "—"}
                  </td>
                </tr>
                {USER_PROJECTIONS.map((users, i) => {
                  const scale = data.activeUsers > 0 ? users / data.activeUsers : users;
                  const monthlyTokens = Math.round((data.ai.totalTokens / days) * 30 * scale);
                  const monthlyCost = (data.ai.totalCost / days) * 30 * scale;
                  return (
                    <tr
                      key={users}
                      style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
                    >
                      <td style={{ padding: "6px 8px", fontWeight: 600 }}>{users.toLocaleString()}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(monthlyTokens)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "#7c3aed" }}>
                        ${monthlyCost.toFixed(2)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>${(monthlyCost * 12).toFixed(2)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>${(monthlyCost / users).toFixed(4)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 6 }}>
              Pricing: GPT-4o-mini ($0.15/$0.60 per 1M tokens), GPT-4-turbo ($10/$30), Claude Opus ($15/$75). Actual
              costs depend on model mix.
            </div>
          </div>
        </div>
      )}

      {/* Daily Trend (simple text-based) */}
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 12 }}>Daily API Call Trend</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "4px 8px", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>Date</th>
                {providers.map((p) => (
                  <th
                    key={p}
                    style={{
                      textAlign: "right",
                      padding: "4px 8px",
                      color: PROVIDER_COLORS[p] || "#6b7280",
                      fontWeight: 600,
                    }}
                  >
                    {(PROVIDER_LABELS[p] || p).split(" ")[0]}
                  </th>
                ))}
                <th style={{ textAlign: "right", padding: "4px 8px", color: "hsl(var(--foreground))", fontWeight: 700 }}>Total</th>
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
                    <tr
                      key={date}
                      style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
                    >
                      <td style={{ padding: "4px 8px", fontWeight: 500 }}>{date}</td>
                      {providers.map((p) => {
                        const count = data.dailyByProvider[p]?.[date] || 0;
                        dayTotal += count;
                        return (
                          <td key={p} style={{ padding: "4px 8px", textAlign: "right" }}>
                            {count || "—"}
                          </td>
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
