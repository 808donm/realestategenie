"use client";

import { useState, useEffect } from "react";

interface AvmStats {
  predictions: {
    total: number;
    withListPrice: number;
    closedAccuracy: {
      count: number;
      meanError: number;
      medianError: number;
      within10: number;
      within20: number;
    } | null;
    listAccuracy: {
      count: number;
      meanError: number;
      medianError: number;
      within10: number;
      within15: number;
      within20: number;
    } | null;
  };
  byZip: Array<{
    zip: string;
    count: number;
    medianError: number;
    meanError: number;
    within10: number;
    within20: number;
    within20Pct: number;
  }>;
  byType: Array<{
    type: string;
    count: number;
    medianError: number;
    meanError: number;
    within10: number;
    within20: number;
  }>;
  byConfidence: Array<{
    confidence: string;
    count: number;
    medianError: number;
    within10: number;
    within20: number;
  }>;
  recentPredictions: Array<{
    address: string;
    zipCode: string;
    propertyType: string;
    listPrice: number;
    genieAvm: number;
    errorPct: number;
    confidence: string;
    date: string;
  }>;
  compCache: {
    totalComps: number;
    byZip: Array<{ zip: string; count: number }>;
    bySource: Record<string, number>;
  };
  listToSaleRatios: Array<{
    zip_code: string;
    subdivision: string | null;
    avg_ratio: number;
    median_ratio: number;
    sample_count: number;
  }>;
}

const fmt = (n: number) => "$" + n.toLocaleString();

const card = {
  background: "hsl(var(--card))",
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  padding: 20,
  marginBottom: 16,
};

const statBox = (color: string) => ({
  textAlign: "center" as const,
  padding: 16,
  borderRadius: 10,
  background: `${color}10`,
  border: `1px solid ${color}30`,
});

export function AvmStatisticsDashboard() {
  const [stats, setStats] = useState<AvmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/avm-statistics")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 60, color: "hsl(var(--muted-foreground))" }}>Loading AVM statistics...</div>
    );
  if (error) return <div style={{ color: "#dc2626", padding: 20 }}>Error: {error}</div>;
  if (!stats) return null;

  const la = stats.predictions.listAccuracy;
  const ca = stats.predictions.closedAccuracy;

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* ── Top-Level Metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <div style={statBox("#3b82f6")}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#3b82f6" }}>{stats.predictions.total}</div>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>Total Predictions</div>
        </div>
        <div style={statBox("#10b981")}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#10b981" }}>
            {la ? `${la.medianError}%` : "N/A"}
          </div>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>Median Error (vs List)</div>
        </div>
        <div style={statBox("#8b5cf6")}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#8b5cf6" }}>
            {la ? `${Math.round((la.within20 / la.count) * 100)}%` : "N/A"}
          </div>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>Within 20% of List</div>
        </div>
        <div style={statBox("#f59e0b")}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>
            {stats.compCache.totalComps.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>Cached Comps</div>
        </div>
      </div>

      {/* ── Accuracy vs List Price ── */}
      {la && (
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Accuracy vs List Price ({la.count} properties)
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            <div style={statBox("#10b981")}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981" }}>{la.medianError}%</div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Median Error</div>
            </div>
            <div style={statBox("#3b82f6")}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#3b82f6" }}>{la.meanError}%</div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Mean Error</div>
            </div>
            <div style={statBox("#8b5cf6")}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#8b5cf6" }}>
                {Math.round((la.within10 / la.count) * 100)}%
              </div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Within 10%</div>
            </div>
            <div style={statBox("#f59e0b")}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#f59e0b" }}>
                {Math.round((la.within15 / la.count) * 100)}%
              </div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Within 15%</div>
            </div>
            <div style={statBox("#059669")}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#059669" }}>
                {Math.round((la.within20 / la.count) * 100)}%
              </div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Within 20%</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Closed Sale Accuracy (Ground Truth) ── */}
      {ca && (
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Accuracy vs Actual Sale Price ({ca.count} closed sales)
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div style={statBox("#dc2626")}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#dc2626" }}>{ca.medianError}%</div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Median Error</div>
            </div>
            <div style={statBox("#dc2626")}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#dc2626" }}>{ca.meanError}%</div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Mean Error</div>
            </div>
            <div style={statBox("#dc2626")}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#dc2626" }}>
                {Math.round((ca.within10 / ca.count) * 100)}%
              </div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Within 10%</div>
            </div>
            <div style={statBox("#dc2626")}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#dc2626" }}>
                {Math.round((ca.within20 / ca.count) * 100)}%
              </div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Within 20%</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Two-Column: By ZIP and By Type ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* By ZIP Code */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Accuracy by ZIP Code</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "8px 4px" }}>ZIP</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>Count</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>Median</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>Mean</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>Within 20%</th>
              </tr>
            </thead>
            <tbody>
              {stats.byZip.map((z) => (
                <tr key={z.zip} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "6px 4px", fontWeight: 600 }}>{z.zip}</td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>{z.count}</td>
                  <td
                    style={{
                      padding: "6px 4px",
                      textAlign: "right",
                      color: z.medianError <= 10 ? "#059669" : z.medianError <= 15 ? "#f59e0b" : "#dc2626",
                      fontWeight: 600,
                    }}
                  >
                    {z.medianError}%
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>{z.meanError}%</td>
                  <td
                    style={{
                      padding: "6px 4px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: z.within20Pct >= 90 ? "#059669" : z.within20Pct >= 80 ? "#f59e0b" : "#dc2626",
                    }}
                  >
                    {z.within20Pct}%
                  </td>
                </tr>
              ))}
              {stats.byZip.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* By Property Type */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Accuracy by Property Type</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "8px 4px" }}>Type</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>Count</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>Median</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>Mean</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>Within 20%</th>
              </tr>
            </thead>
            <tbody>
              {stats.byType.map((t) => (
                <tr key={t.type} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "6px 4px", fontWeight: 600 }}>{t.type}</td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>{t.count}</td>
                  <td
                    style={{
                      padding: "6px 4px",
                      textAlign: "right",
                      color: t.medianError <= 10 ? "#059669" : t.medianError <= 15 ? "#f59e0b" : "#dc2626",
                      fontWeight: 600,
                    }}
                  >
                    {t.medianError}%
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>{t.meanError}%</td>
                  <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: 600 }}>
                    {t.count > 0 ? Math.round((t.within20 / t.count) * 100) : 0}%
                  </td>
                </tr>
              ))}
              {stats.byType.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Two-Column: By Confidence and Comp Cache ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* By Confidence Level */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Accuracy by Confidence Level</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "8px 4px" }}>Confidence</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>Count</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>Median</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>Within 10%</th>
                <th style={{ padding: "8px 4px", textAlign: "right" }}>Within 20%</th>
              </tr>
            </thead>
            <tbody>
              {stats.byConfidence.map((c) => (
                <tr key={c.confidence} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "6px 4px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        background:
                          c.confidence === "High"
                            ? "#d1fae5"
                            : c.confidence === "Medium"
                              ? "#fef3c7"
                              : "#fee2e2",
                        color:
                          c.confidence === "High"
                            ? "#065f46"
                            : c.confidence === "Medium"
                              ? "#92400e"
                              : "#991b1b",
                      }}
                    >
                      {c.confidence}
                    </span>
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>{c.count}</td>
                  <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: 600 }}>
                    {c.medianError}%
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>
                    {c.count > 0 ? Math.round((c.within10 / c.count) * 100) : 0}%
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>
                    {c.count > 0 ? Math.round((c.within20 / c.count) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Comp Cache Health */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Comp Cache Health</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={statBox("#3b82f6")}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>
                {stats.compCache.totalComps.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Total Cached</div>
            </div>
            <div style={statBox("#10b981")}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>
                {stats.compCache.byZip.length}
              </div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>ZIP Codes</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 8 }}>
            By source:{" "}
            {Object.entries(stats.compCache.bySource)
              .map(([src, count]) => `${src}: ${count.toLocaleString()}`)
              .join(" | ")}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Top ZIPs by cached comps:</div>
          {stats.compCache.byZip.slice(0, 8).map((z) => (
            <div
              key={z.zip}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 0",
                fontSize: 13,
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <span>{z.zip}</span>
              <span style={{ fontWeight: 600 }}>{z.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Predictions ── */}
      <div style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Recent Predictions</h2>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "8px 4px" }}>Address</th>
              <th style={{ padding: "8px 4px" }}>ZIP</th>
              <th style={{ padding: "8px 4px" }}>Type</th>
              <th style={{ padding: "8px 4px", textAlign: "right" }}>List Price</th>
              <th style={{ padding: "8px 4px", textAlign: "right" }}>Genie AVM</th>
              <th style={{ padding: "8px 4px", textAlign: "right" }}>Error</th>
              <th style={{ padding: "8px 4px" }}>Conf.</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentPredictions.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "6px 4px", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.address}
                </td>
                <td style={{ padding: "6px 4px" }}>{p.zipCode}</td>
                <td style={{ padding: "6px 4px" }}>{p.propertyType || "-"}</td>
                <td style={{ padding: "6px 4px", textAlign: "right" }}>{fmt(p.listPrice)}</td>
                <td style={{ padding: "6px 4px", textAlign: "right" }}>{fmt(p.genieAvm)}</td>
                <td
                  style={{
                    padding: "6px 4px",
                    textAlign: "right",
                    fontWeight: 600,
                    color: p.errorPct <= 10 ? "#059669" : p.errorPct <= 20 ? "#f59e0b" : "#dc2626",
                  }}
                >
                  {p.errorPct}%
                </td>
                <td style={{ padding: "6px 4px" }}>
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      background:
                        p.confidence === "High" ? "#d1fae5" : p.confidence === "Medium" ? "#fef3c7" : "#fee2e2",
                      color:
                        p.confidence === "High" ? "#065f46" : p.confidence === "Medium" ? "#92400e" : "#991b1b",
                    }}
                  >
                    {p.confidence}
                  </span>
                </td>
              </tr>
            ))}
            {stats.recentPredictions.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
                  No predictions tracked yet. View properties to start collecting data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
