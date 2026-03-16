"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  type PieLabelRenderProps,
} from "recharts";

interface SourceData {
  name: string;
  count: number;
}

interface LeadsBySourceChartProps {
  bySource: SourceData[];
  byEvent: SourceData[];
}

const SOURCE_COLORS: Record<string, string> = {
  "Open House": "#6366f1",
  Zillow: "#006aff",
  Google: "#34a853",
  Facebook: "#1877f2",
  Instagram: "#e4405f",
  LinkedIn: "#0a66c2",
  Other: "#9ca3af",
};

const PIE_COLORS = ["#6366f1", "#34a853", "#1877f2", "#e4405f", "#0a66c2", "#f59e0b", "#9ca3af"];

export default function LeadsBySourceChart({ bySource, byEvent }: LeadsBySourceChartProps) {
  const totalLeads = bySource.reduce((sum, s) => sum + s.count, 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {/* Leads by Source - Donut Chart */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          border: "1px solid #e5e7eb",
        }}
      >
        <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>
          Leads by Source
        </h3>
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#6b7280" }}>
          {totalLeads} total leads
        </p>
        {bySource.length === 0 ? (
          <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>No lead data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={bySource}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="count"
                nameKey="name"
                paddingAngle={2}
                label={(props: PieLabelRenderProps) =>
                  `${props.name ?? ""} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={{ strokeWidth: 1 }}
              >
                {bySource.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={SOURCE_COLORS[entry.name] || PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [value, "Leads"]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Leads by Open House - Bar Chart */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          border: "1px solid #e5e7eb",
        }}
      >
        <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>
          Leads by Open House
        </h3>
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#6b7280" }}>
          Top events by lead volume
        </p>
        {byEvent.length === 0 ? (
          <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>No event data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={byEvent.slice(0, 10)}
              layout="vertical"
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={160}
                tickFormatter={(v: string) => v.length > 25 ? v.slice(0, 25) + "..." : v}
              />
              <Tooltip formatter={(value: any) => [value, "Leads"]} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
