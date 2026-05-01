"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  type PieLabelRenderProps,
} from "recharts";

interface ChartData {
  name: string;
  count: number;
  color: string;
}

interface TimeData {
  week: string;
  count: number;
}

interface LeadsInsightsChartsProps {
  heatDistribution: ChartData[];
  byPipelineStage: ChartData[];
  leadsOverTime: TimeData[];
  buyerReadiness: ChartData[];
}

export default function LeadsInsightsCharts({
  heatDistribution,
  byPipelineStage,
  leadsOverTime,
  buyerReadiness,
}: LeadsInsightsChartsProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {/* Heat Score Distribution */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          border: "1px solid #e5e7eb",
        }}
      >
        <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>Heat Score Distribution</h3>
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Lead temperature breakdown</p>
        {heatDistribution.every((d) => d.count === 0) ? (
          <p style={{ color: "hsl(var(--muted-foreground))", textAlign: "center", padding: 40 }}>No lead data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={heatDistribution} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(value: any) => [value, "Leads"]} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {heatDistribution.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pipeline Stage Breakdown */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          border: "1px solid #e5e7eb",
        }}
      >
        <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>Pipeline Stages</h3>
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Leads by current stage</p>
        {byPipelineStage.length === 0 ? (
          <p style={{ color: "hsl(var(--muted-foreground))", textAlign: "center", padding: 40 }}>No lead data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byPipelineStage} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={160}
                tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 22) + "..." : v)}
              />
              <Tooltip formatter={(value: any) => [value, "Leads"]} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {byPipelineStage.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Leads Over Time */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          border: "1px solid #e5e7eb",
        }}
      >
        <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>Leads Over Time</h3>
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Weekly lead acquisition trend</p>
        {leadsOverTime.length === 0 ? (
          <p style={{ color: "hsl(var(--muted-foreground))", textAlign: "center", padding: 40 }}>No lead data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={leadsOverTime} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <defs>
                <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(value: any) => [value, "Leads"]} />
              <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#leadGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Buyer Readiness */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          border: "1px solid #e5e7eb",
        }}
      >
        <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>Buyer Readiness</h3>
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Pre-approval status of leads</p>
        {buyerReadiness.length === 0 ? (
          <p style={{ color: "hsl(var(--muted-foreground))", textAlign: "center", padding: 40 }}>No lead data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={buyerReadiness}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="count"
                nameKey="name"
                paddingAngle={3}
                label={(props: PieLabelRenderProps) =>
                  `${props.name ?? ""} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={{ strokeWidth: 1 }}
              >
                {buyerReadiness.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [value, "Leads"]} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
