"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";

interface SpeedToLeadData {
  avgResponseMin: number;
  medianResponseMin: number;
  under5min: number;
  under15min: number;
  under1hr: number;
  over1hr: number;
  totalLeads: number;
  noResponse24hr: number;
  hourlyBreakdown: { hour: string; avg: number; count: number }[];
}

const FALLBACK_DATA: SpeedToLeadData = {
  avgResponseMin: 47,
  medianResponseMin: 22,
  under5min: 18,
  under15min: 32,
  under1hr: 25,
  over1hr: 15,
  totalLeads: 90,
  noResponse24hr: 6,
  hourlyBreakdown: [
    { hour: "6-8 AM", avg: 8, count: 5 },
    { hour: "8-10 AM", avg: 12, count: 14 },
    { hour: "10-12 PM", avg: 18, count: 18 },
    { hour: "12-2 PM", avg: 35, count: 12 },
    { hour: "2-4 PM", avg: 42, count: 15 },
    { hour: "4-6 PM", avg: 55, count: 11 },
    { hour: "6-8 PM", avg: 72, count: 9 },
    { hour: "8-10 PM", avg: 90, count: 6 },
  ],
};

export default function SpeedToLeadClient() {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<SpeedToLeadData>(FALLBACK_DATA);
  const [isLive, setIsLive] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/speed-to-lead");
      if (!res.ok) throw new Error("API request failed");
      const json: SpeedToLeadData = await res.json();
      if (json && json.totalLeads !== undefined && json.totalLeads > 0) {
        setData(json);
        setIsLive(true);
      }
    } catch {
      // Keep fallback data
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const grade = useMemo(() => {
    if (data.avgResponseMin <= 5) return { letter: "A", color: "#059669", label: "Excellent" };
    if (data.avgResponseMin <= 15) return { letter: "B", color: "#22c55e", label: "Good" };
    if (data.avgResponseMin <= 30) return { letter: "C", color: "#eab308", label: "Average" };
    if (data.avgResponseMin <= 60) return { letter: "D", color: "#f97316", label: "Below Average" };
    return { letter: "F", color: "#dc2626", label: "Poor" };
  }, [data.avgResponseMin]);

  const under5pct = data.totalLeads > 0 ? ((data.under5min / data.totalLeads) * 100).toFixed(0) : "0";
  const maxHourlyAvg = Math.max(...data.hourlyBreakdown.map((h) => h.avg));

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("Speed-to-Lead Audit", pw / 2, y, { align: "center" }); y += 12;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Period: Last ${period === "7d" ? "7" : period === "30d" ? "30" : "90"} Days`, pw / 2, y, { align: "center" }); y += 14;
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("Summary", 20, y); y += 8;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    [
      ["Grade:", `${grade.letter} - ${grade.label}`],
      ["Average Response:", `${data.avgResponseMin} min`],
      ["Median Response:", `${data.medianResponseMin} min`],
      ["Under 5 min:", `${data.under5min} leads (${under5pct}%)`],
      ["No Response (24hr):", `${data.noResponse24hr} leads`],
    ].forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 6; });
    doc.save(`Speed_To_Lead_Audit.pdf`);
  };

  const exportToExcel = () => {
    const summaryRows = [
      { Metric: "Grade", Value: `${grade.letter} - ${grade.label}` },
      { Metric: "Average Response (min)", Value: data.avgResponseMin },
      { Metric: "Median Response (min)", Value: data.medianResponseMin },
      { Metric: "Total Leads", Value: data.totalLeads },
      { Metric: "Under 5 min", Value: data.under5min },
      { Metric: "5-15 min", Value: data.under15min },
      { Metric: "15-60 min", Value: data.under1hr },
      { Metric: "Over 60 min", Value: data.over1hr },
      { Metric: "No Response (24hr)", Value: data.noResponse24hr },
    ];
    const hourlyRows = data.hourlyBreakdown.map(h => ({
      "Time Window": h.hour,
      "Avg Response (min)": h.avg,
      "Lead Count": h.count,
    }));
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");
    const ws2 = XLSX.utils.json_to_sheet(hourlyRows);
    XLSX.utils.book_append_sheet(wb, ws2, "Hourly Breakdown");
    XLSX.writeFile(wb, "Speed_To_Lead_Audit.xlsx");
  };

  return (
    <div>
      {/* Integration Notice */}
      {isLive ? (
        <div style={{ padding: 12, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
          Showing live data from your integrations. <Link href="/app/integrations" style={{ color: "#059669", fontWeight: 600 }}>Manage Integrations</Link>
        </div>
      ) : (
        <div style={{ padding: 12, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
          Showing sample data. <Link href="/app/integrations" style={{ color: "#3b82f6", fontWeight: 600 }}>Connect GHL</Link> to see live response metrics.
        </div>
      )}

      {/* Period Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[{ v: "7d", l: "Last 7 Days" }, { v: "30d", l: "Last 30 Days" }, { v: "90d", l: "Last 90 Days" }].map((p) => (
          <button key={p.v} onClick={() => setPeriod(p.v)} style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, border: period === p.v ? "2px solid #3b82f6" : "1px solid #d1d5db", borderRadius: 6, background: period === p.v ? "#dbeafe" : "#fff", cursor: "pointer", color: period === p.v ? "#1d4ed8" : "#374151" }}>
            {p.l}
          </button>
        ))}
      </div>

      {/* Grade + Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 24, background: grade.color, borderRadius: 12, color: "#fff", textAlign: "center", minWidth: 100 }}>
          <div style={{ fontSize: 48, fontWeight: 900 }}>{grade.letter}</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>{grade.label}</div>
        </div>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Avg Response</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{data.avgResponseMin} min</div>
        </div>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Median</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{data.medianResponseMin} min</div>
        </div>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Under 5 min</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{under5pct}%</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{data.under5min} leads</div>
        </div>
        <div style={{ padding: 16, background: data.noResponse24hr > 0 ? "#fef2f2" : "#fff", border: `1px solid ${data.noResponse24hr > 0 ? "#fecaca" : "#e5e7eb"}`, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Missed (24hr)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: data.noResponse24hr > 0 ? "#dc2626" : "#059669" }}>{data.noResponse24hr}</div>
        </div>
      </div>

      {/* Response Distribution Pie Chart */}
      <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Response Time Distribution</h3>
        {(() => {
          const distData = [
            { name: "< 5 min", value: data.under5min, color: "#059669" },
            { name: "5-15 min", value: data.under15min, color: "#22c55e" },
            { name: "15-60 min", value: data.under1hr, color: "#eab308" },
            { name: "> 60 min", value: data.over1hr, color: "#dc2626" },
          ];
          return (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={distData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={45}
                  label={(props: any) => `${props.name}: ${props.value}`}
                  labelLine
                >
                  {distData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          );
        })()}
      </div>

      {/* Hourly Breakdown Bar Chart */}
      <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Average Response by Time of Day</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.hourlyBreakdown} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: "Minutes", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
            <Tooltip formatter={(value: any) => `${value} min`} />
            <Bar dataKey="avg" name="Avg Response (min)" radius={[4, 4, 0, 0]}>
              {data.hourlyBreakdown.map((h, i) => (
                <Cell key={i} fill={h.avg <= 15 ? "#059669" : h.avg <= 30 ? "#eab308" : "#dc2626"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recommendation */}
      <div style={{ padding: 20, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: 15, fontWeight: 700 }}>Recommendation</h3>
        <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
          {data.avgResponseMin > 15
            ? "Your average response time exceeds 15 minutes. Studies show that responding within 5 minutes increases conversion by 400%. Consider setting up automated initial responses in GHL for leads that come in during your busiest hours."
            : "Great job keeping response times low! Continue monitoring to ensure consistency, especially during peak hours."}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={exportToPDF} style={{ padding: "12px 24px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
          Export PDF
        </button>
        <button onClick={exportToExcel} style={{ padding: "8px 20px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
          Export Excel
        </button>
      </div>
    </div>
  );
}
