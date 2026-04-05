"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const COUNTIES = [
  { value: "Honolulu", label: "Honolulu, HI" },
  { value: "Maui", label: "Maui, HI" },
  { value: "Hawaii", label: "Hawaii, HI" },
  { value: "Kauai", label: "Kauai, HI" },
];

interface QuickStat {
  value: number;
  trend: number;
  label: string;
}

interface MarketData {
  county: string;
  state: string;
  marketTemperature: number;
  quickStats: {
    closedSales: QuickStat;
    pendingSales: QuickStat;
    activeListings: QuickStat;
    monthsOfInventory: QuickStat;
    daysOnMarket: QuickStat;
    saleToListRatio: QuickStat;
  };
  monthlyTrends: { month: string; count: number; avgPrice: number }[];
}

export default function MarketQuickLookClient() {
  const [county, setCounty] = useState("Honolulu");
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (c: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/mls/market-quick-look?county=${encodeURIComponent(c)}&state=HI`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load market data");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(county);
  }, [county, fetchData]);

  const formatCurrency = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
    return `$${v.toLocaleString()}`;
  };

  const TrendArrow = ({ value }: { value: number }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          fontSize: 12,
          fontWeight: 600,
          color: isPositive ? "#059669" : "#dc2626",
          backgroundColor: isPositive ? "#ecfdf5" : "#fef2f2",
          padding: "2px 8px",
          borderRadius: 12,
        }}
      >
        {isPositive ? "↗" : "↘"} {Math.abs(value)}%
      </span>
    );
  };

  const StatCard = ({ stat }: { stat: QuickStat }) => {
    const displayValue = (() => {
      if (stat.label.includes("Ratio")) return `${stat.value}% Ratio`;
      if (stat.label.includes("Days")) return `${stat.value} Avg`;
      if (stat.label.includes("Months")) return String(stat.value);
      return stat.value.toLocaleString();
    })();

    return (
      <div
        style={{
          padding: "20px 24px",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          backgroundColor: "#fff",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", marginBottom: 12 }}>{stat.label}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#111827" }}>{displayValue}</div>
          <TrendArrow value={stat.trend} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      {/* Header with County Selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Market Snapshot</h2>
        <select
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            backgroundColor: "#fff",
          }}
        >
          {COUNTIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>
          Loading market statistics for {county}...
        </div>
      )}

      {error && (
        <div style={{ textAlign: "center", padding: 40, color: "#dc2626", backgroundColor: "#fef2f2", borderRadius: 12 }}>
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Market Temperature Gauge */}
          <div
            style={{
              padding: "24px 32px",
              backgroundColor: "#f9fafb",
              borderRadius: 16,
              marginBottom: 24,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                Market Temperature
              </div>
            </div>
            <div style={{ position: "relative", height: 24, marginBottom: 8 }}>
              {/* Gradient bar */}
              <div
                style={{
                  height: 10,
                  borderRadius: 5,
                  background: "linear-gradient(to right, #3b82f6, #22c55e, #eab308, #ef4444)",
                  position: "absolute",
                  top: 7,
                  left: 0,
                  right: 0,
                }}
              />
              {/* Indicator dot */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${data.marketTemperature}%`,
                  transform: "translateX(-50%)",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundColor: "#1e40af",
                  border: "3px solid #fff",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
              <span>Buyer&apos;s Market</span>
              <span>Seller&apos;s Market</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div
            style={{
              padding: "24px 32px",
              backgroundColor: "#f9fafb",
              borderRadius: 16,
              marginBottom: 24,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Quick Stats</span>
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>
              90 Day Trend: Figures below represent the monthly average over the past 90 days
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <StatCard stat={data.quickStats.closedSales} />
              <StatCard stat={data.quickStats.pendingSales} />
              <StatCard stat={data.quickStats.activeListings} />
              <StatCard stat={data.quickStats.monthsOfInventory} />
              <StatCard stat={data.quickStats.daysOnMarket} />
              <StatCard stat={data.quickStats.saleToListRatio} />
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 12 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: "#60a5fa", marginRight: 4, verticalAlign: "middle" }} />
              {data.county}, {data.state}
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            {/* Average Sales Price */}
            <div
              style={{
                padding: "24px",
                backgroundColor: "#f9fafb",
                borderRadius: 16,
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
                MLS Average Sales Price
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={11} tick={{ fill: "#9ca3af" }} />
                  <YAxis
                    fontSize={11}
                    tick={{ fill: "#9ca3af" }}
                    tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1_000)}K`}
                  />
                  <Tooltip
                    formatter={(v) => [`$${Number(v).toLocaleString()}`, "Avg Price"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="avgPrice" fill="#7dd3fc" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: "#7dd3fc", marginRight: 4, verticalAlign: "middle" }} />
                {data.county}, {data.state}
              </div>
            </div>

            {/* Sales Activity */}
            <div
              style={{
                padding: "24px",
                backgroundColor: "#f9fafb",
                borderRadius: 16,
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
                Change in MLS Sales Activity
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={11} tick={{ fill: "#9ca3af" }} />
                  <YAxis fontSize={11} tick={{ fill: "#9ca3af" }} />
                  <Tooltip
                    formatter={(v) => [Number(v), "Closed Sales"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="count" fill="#7dd3fc" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: "#7dd3fc", marginRight: 4, verticalAlign: "middle" }} />
                {data.county}, {data.state}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
