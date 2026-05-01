"use client";

import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OAHU_RESALES_DATA, COMPARATIVE_STATS, computeYoYChanges } from "@/lib/data/oahu-resales-data";

type TimeRange = "all" | "10yr" | "20yr" | "5yr";

const COLORS = {
  sfPrimary: "#2563eb", // blue-600
  sfLight: "#93c5fd", // blue-300
  condoPrimary: "#059669", // emerald-600
  condoLight: "#6ee7b7", // emerald-300
  total: "#7c3aed", // violet-600
  positive: "#16a34a", // green-600
  negative: "#dc2626", // red-600
  grid: "#e5e7eb", // gray-200
};

function formatPrice(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatSales(value: number) {
  return value.toLocaleString();
}

function formatPercent(value: number | null) {
  if (value === null) return "N/A";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function MarketStatisticsClient() {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const allData = useMemo(() => computeYoYChanges(OAHU_RESALES_DATA), []);

  const filteredData = useMemo(() => {
    const now = 2025;
    switch (timeRange) {
      case "5yr":
        return allData.filter((d) => d.year >= now - 5);
      case "10yr":
        return allData.filter((d) => d.year >= now - 10);
      case "20yr":
        return allData.filter((d) => d.year >= now - 20);
      default:
        return allData;
    }
  }, [allData, timeRange]);

  // Chart data transformations
  const salesData = filteredData.map((d) => ({
    year: d.year,
    "Single Family": d.singleFamily.sales,
    Condo: d.condo.sales,
    Total: d.totalSales,
  }));

  const medianPriceData = filteredData.map((d) => ({
    year: d.year,
    "Single Family": d.singleFamily.medianPrice,
    Condo: d.condo.medianPrice,
  }));

  const avgPriceData = filteredData.map((d) => ({
    year: d.year,
    "Single Family": d.singleFamily.avgPrice,
    Condo: d.condo.avgPrice,
  }));

  const yoyData = filteredData.map((d) => ({
    year: d.year,
    "SF Sales %": d.sfSalesChange,
    "Condo Sales %": d.condoSalesChange,
    "SF Median %": d.sfMedianChange,
    "Condo Median %": d.condoMedianChange,
  }));

  // Latest year stats for KPI cards
  const latest = OAHU_RESALES_DATA[OAHU_RESALES_DATA.length - 1];
  const prevYear = OAHU_RESALES_DATA[OAHU_RESALES_DATA.length - 2];
  const sfMedianChange =
    ((latest.singleFamily.medianPrice - prevYear.singleFamily.medianPrice) / prevYear.singleFamily.medianPrice) * 100;
  const condoMedianChange =
    ((latest.condo.medianPrice - prevYear.condo.medianPrice) / prevYear.condo.medianPrice) * 100;
  const totalSalesChange = ((latest.totalSales - prevYear.totalSales) / prevYear.totalSales) * 100;

  const exportReport = (format: "pdf" | "xlsx") => {
    const exportData = filteredData.map((d) => ({
      Year: d.year,
      "SF Median Price": d.singleFamily.medianPrice,
      "SF Avg Price": d.singleFamily.avgPrice,
      "SF Sales": d.singleFamily.sales,
      "Condo Median Price": d.condo.medianPrice,
      "Condo Avg Price": d.condo.avgPrice,
      "Condo Sales": d.condo.sales,
      "Total Sales": d.totalSales,
    }));

    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Oahu Market Statistics");
      XLSX.writeFile(wb, "Oahu_Market_Statistics.xlsx");
    } else {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      let y = 20;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Oahu Market Statistics", pw / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated ${new Date().toLocaleDateString()}`, pw / 2, y, { align: "center" });
      y += 14;

      doc.setFontSize(8);
      const headers = ["Year", "SF Median", "SF Avg", "SF Sales", "Condo Median", "Condo Avg", "Condo Sales", "Total"];
      const colW = (pw - 20) / headers.length;
      doc.setFont("helvetica", "bold");
      headers.forEach((h, i) => doc.text(h, 10 + i * colW, y));
      y += 6;
      doc.setFont("helvetica", "normal");

      exportData.forEach((row) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        const vals = [
          String(row.Year),
          `$${(row["SF Median Price"] / 1000).toFixed(0)}K`,
          `$${(row["SF Avg Price"] / 1000).toFixed(0)}K`,
          String(row["SF Sales"]),
          `$${(row["Condo Median Price"] / 1000).toFixed(0)}K`,
          `$${(row["Condo Avg Price"] / 1000).toFixed(0)}K`,
          String(row["Condo Sales"]),
          String(row["Total Sales"]),
        ];
        vals.forEach((v, i) => doc.text(v, 10 + i * colW, y));
        y += 5;
      });

      doc.save("Oahu_Market_Statistics.pdf");
    }
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(
          [
            ["all", "All Years (1985-2025)"],
            ["20yr", "Last 20 Years"],
            ["10yr", "Last 10 Years"],
            ["5yr", "Last 5 Years"],
          ] as [TimeRange, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTimeRange(value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              timeRange === value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="noprint" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          onClick={() => exportReport("xlsx")}
          style={{
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            background: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
            cursor: "pointer",
          }}
        >
          Export Excel
        </button>
        <button
          onClick={() => exportReport("pdf")}
          style={{
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
            border: "none",
            borderRadius: 6,
            background: "#dc2626",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Export PDF
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="SF Median Price"
          value={formatPrice(latest.singleFamily.medianPrice)}
          change={sfMedianChange}
          year={latest.year}
        />
        <KPICard
          label="Condo Median Price"
          value={formatPrice(latest.condo.medianPrice)}
          change={condoMedianChange}
          year={latest.year}
        />
        <KPICard
          label="Total Sales"
          value={formatSales(latest.totalSales)}
          change={totalSalesChange}
          year={latest.year}
        />
        <KPICard
          label="40-Year Appreciation"
          value={`${COMPARATIVE_STATS.singleFamily.medianPriceAnnual}% / yr`}
          subtitle="SF Median (annual)"
        />
      </div>

      {/* Chart 1: Median Sales Prices — Line Chart */}
      <ChartCard title="Median Sales Prices Over Time" subtitle="Single Family vs Condo">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={medianPriceData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatPrice} tick={{ fontSize: 12 }} width={70} />
            <Tooltip formatter={(value: any) => formatPrice(value)} labelFormatter={(label) => `Year: ${label}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="Single Family"
              stroke={COLORS.sfPrimary}
              strokeWidth={2.5}
              dot={{ r: timeRange === "5yr" ? 4 : 0 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Condo"
              stroke={COLORS.condoPrimary}
              strokeWidth={2.5}
              dot={{ r: timeRange === "5yr" ? 4 : 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 2: Average Sales Prices — Area Chart */}
      <ChartCard title="Average Sales Prices Over Time" subtitle="Filled area showing price growth">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={avgPriceData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatPrice} tick={{ fontSize: 12 }} width={70} />
            <Tooltip formatter={(value: any) => formatPrice(value)} labelFormatter={(label) => `Year: ${label}`} />
            <Legend />
            <Area
              type="monotone"
              dataKey="Single Family"
              stroke={COLORS.sfPrimary}
              fill={COLORS.sfLight}
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Condo"
              stroke={COLORS.condoPrimary}
              fill={COLORS.condoLight}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 3: Number of Sales — Bar Chart */}
      <ChartCard title="Number of Sales by Year" subtitle="Single Family, Condo, and Total">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatSales} tick={{ fontSize: 12 }} width={55} />
            <Tooltip formatter={(value: any) => formatSales(value)} labelFormatter={(label) => `Year: ${label}`} />
            <Legend />
            <Bar dataKey="Single Family" fill={COLORS.sfPrimary} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Condo" fill={COLORS.condoPrimary} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 4: Year-over-Year Price Changes — Bar Chart with positive/negative */}
      <ChartCard title="Year-over-Year Median Price Changes" subtitle="Percent change from previous year">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={yoyData.filter((d) => d["SF Median %"] !== null)}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} width={50} />
            <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} labelFormatter={(label) => `Year: ${label}`} />
            <Legend />
            <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
            <Bar dataKey="SF Median %" fill={COLORS.sfPrimary} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Condo Median %" fill={COLORS.condoPrimary} radius={[2, 2, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 5: Sales Volume Changes — Shows market activity swings */}
      <ChartCard title="Year-over-Year Sales Volume Changes" subtitle="Market activity expansion and contraction">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={yoyData.filter((d) => d["SF Sales %"] !== null)}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} width={50} />
            <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} labelFormatter={(label) => `Year: ${label}`} />
            <Legend />
            <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
            <Bar
              dataKey="SF Sales %"
              fill={COLORS.sfLight}
              stroke={COLORS.sfPrimary}
              strokeWidth={1}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="Condo Sales %"
              fill={COLORS.condoLight}
              stroke={COLORS.condoPrimary}
              strokeWidth={1}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 6: SF vs Condo Median Price Spread */}
      <ChartCard title="Single Family vs Condo Price Gap" subtitle="Growing spread between property types">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={filteredData.map((d) => ({
              year: d.year,
              "SF Median": d.singleFamily.medianPrice,
              "Condo Median": d.condo.medianPrice,
              Spread: d.singleFamily.medianPrice - d.condo.medianPrice,
            }))}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatPrice} tick={{ fontSize: 12 }} width={70} />
            <Tooltip formatter={(value: any) => formatPrice(value)} labelFormatter={(label) => `Year: ${label}`} />
            <Legend />
            <Area
              type="monotone"
              dataKey="SF Median"
              stroke={COLORS.sfPrimary}
              fill={COLORS.sfLight}
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Condo Median"
              stroke={COLORS.condoPrimary}
              fill={COLORS.condoLight}
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="Spread"
              stroke={COLORS.total}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Comparative Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparative Statistics (1985-2025)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold">Metric</th>
                  <th className="text-right py-2 px-3 font-semibold">Single Family</th>
                  <th className="text-right py-2 px-3 font-semibold">Condo</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-3">Median Price Total Change</td>
                  <td className="text-right py-2 px-3 font-medium text-blue-600">
                    +{COMPARATIVE_STATS.singleFamily.medianPriceChange}%
                  </td>
                  <td className="text-right py-2 px-3 font-medium text-emerald-600">
                    +{COMPARATIVE_STATS.condo.medianPriceChange}%
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3">Median Price Annual Appreciation</td>
                  <td className="text-right py-2 px-3 font-medium text-blue-600">
                    {COMPARATIVE_STATS.singleFamily.medianPriceAnnual}%
                  </td>
                  <td className="text-right py-2 px-3 font-medium text-emerald-600">
                    {COMPARATIVE_STATS.condo.medianPriceAnnual}%
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3">Average Price Total Change</td>
                  <td className="text-right py-2 px-3 font-medium text-blue-600">
                    +{COMPARATIVE_STATS.singleFamily.avgPriceChange}%
                  </td>
                  <td className="text-right py-2 px-3 font-medium text-emerald-600">
                    +{COMPARATIVE_STATS.condo.avgPriceChange}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Average Price Annual Appreciation</td>
                  <td className="text-right py-2 px-3 font-medium text-blue-600">
                    {COMPARATIVE_STATS.singleFamily.avgPriceAnnual}%
                  </td>
                  <td className="text-right py-2 px-3 font-medium text-emerald-600">
                    {COMPARATIVE_STATS.condo.avgPriceAnnual}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Full Data Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-900">
                  <th className="text-left py-2 px-2 font-semibold">Year</th>
                  <th className="text-right py-2 px-2 font-semibold">SF Sales</th>
                  <th className="text-right py-2 px-2 font-semibold">SF Median</th>
                  <th className="text-right py-2 px-2 font-semibold">SF Avg</th>
                  <th className="text-right py-2 px-2 font-semibold">Condo Sales</th>
                  <th className="text-right py-2 px-2 font-semibold">Condo Median</th>
                  <th className="text-right py-2 px-2 font-semibold">Condo Avg</th>
                  <th className="text-right py-2 px-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, i) => (
                  <tr key={row.year} className={`border-b ${i % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-gray-900/50"}`}>
                    <td className="py-1.5 px-2 font-medium">{row.year}</td>
                    <td className="text-right py-1.5 px-2">{row.singleFamily.sales.toLocaleString()}</td>
                    <td className="text-right py-1.5 px-2">{formatPrice(row.singleFamily.medianPrice)}</td>
                    <td className="text-right py-1.5 px-2">{formatPrice(row.singleFamily.avgPrice)}</td>
                    <td className="text-right py-1.5 px-2">{row.condo.sales.toLocaleString()}</td>
                    <td className="text-right py-1.5 px-2">{formatPrice(row.condo.medianPrice)}</td>
                    <td className="text-right py-1.5 px-2">{formatPrice(row.condo.avgPrice)}</td>
                    <td className="text-right py-1.5 px-2 font-medium">{row.totalSales.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Sub-components ---

function KPICard({
  label,
  value,
  change,
  year,
  subtitle,
}: {
  label: string;
  value: string;
  change?: number;
  year?: number;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`text-xs font-medium mt-1 ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
            {change >= 0 ? "+" : ""}
            {change.toFixed(1)}% vs {(year || 2025) - 1}
          </div>
        )}
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}
