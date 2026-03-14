"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  LineChart, Line,
  PieChart, Pie,
} from "recharts";
import { HAWAII_ISLAND_MONTHLY_DATA } from "@/lib/data/hawaii-island-monthly-data";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const COLORS = {
  sf: "#059669",
  sfLight: "#6ee7b7",
  condo: "#0284c7",
  condoLight: "#7dd3fc",
  land: "#92400e",
  landLight: "#fbbf24",
  amber: "#f59e0b",
  purple: "#8b5cf6",
};

export default function HawaiiIslandStatisticsClient() {
  const [selectedMonth, setSelectedMonth] = useState(
    HAWAII_ISLAND_MONTHLY_DATA[HAWAII_ISLAND_MONTHLY_DATA.length - 1].month
  );

  const data = useMemo(() => {
    return HAWAII_ISLAND_MONTHLY_DATA.find((m) => m.month === selectedMonth) ?? HAWAII_ISLAND_MONTHLY_DATA[HAWAII_ISLAND_MONTHLY_DATA.length - 1];
  }, [selectedMonth]);

  const hasMultipleMonths = HAWAII_ISLAND_MONTHLY_DATA.length > 1;

  const trendData = useMemo(() => {
    return HAWAII_ISLAND_MONTHLY_DATA.map((m) => ({
      month: m.label.replace(/\s\d{4}$/, "").slice(0, 3),
      sfMedianPrice: m.singleFamily.medianPrice,
      condoMedianPrice: m.condo.medianPrice,
      landMedianPrice: m.land.medianPrice,
      sfDOM: m.singleFamily.dom,
      condoDOM: m.condo.dom,
      landDOM: m.land.dom,
      sfSold: m.singleFamily.soldListings,
      condoSold: m.condo.soldListings,
      landSold: m.land.soldListings,
    }));
  }, []);

  const sf = data.singleFamily;
  const cd = data.condo;
  const ld = data.land;

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return 0;
    return ((curr - prev) / prev) * 100;
  };

  const yoyColor = (val: number) => (val >= 0 ? "#059669" : "#dc2626");
  const yoyText = (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;

  const sfNewListingsYoY = pctChange(sf.newListings, sf.prevYearNewListings);
  const sfSoldYoY = pctChange(sf.soldListings, sf.prevYearSoldListings);
  const cdNewListingsYoY = pctChange(cd.newListings, cd.prevYearNewListings);
  const cdSoldYoY = pctChange(cd.soldListings, cd.prevYearSoldListings);
  const ldNewListingsYoY = pctChange(ld.newListings, ld.prevYearNewListings);
  const ldSoldYoY = pctChange(ld.soldListings, ld.prevYearSoldListings);

  // Median Price comparison
  const medianPriceData = [
    { type: "Single-Family", value: sf.medianPrice, color: COLORS.sf },
    { type: "Condo", value: cd.medianPrice, color: COLORS.condo },
    { type: "Land", value: ld.medianPrice, color: COLORS.land },
  ];

  // Sales comparison
  const salesComparison = [
    {
      metric: "New Listings",
      "Single-Family": sf.newListings,
      Condo: cd.newListings,
      Land: ld.newListings,
    },
    {
      metric: "Sold Listings",
      "Single-Family": sf.soldListings,
      Condo: cd.soldListings,
      Land: ld.soldListings,
    },
  ];

  // YoY changes
  const yoyChanges = [
    { metric: "New Listings", sf: sfNewListingsYoY, condo: cdNewListingsYoY, land: ldNewListingsYoY },
    { metric: "Sold Listings", sf: sfSoldYoY, condo: cdSoldYoY, land: ldSoldYoY },
  ];

  // Days on market
  const domData = [
    { type: "Single-Family", value: sf.dom, color: COLORS.sf },
    { type: "Condo", value: cd.dom, color: COLORS.condo },
    { type: "Land", value: ld.dom, color: COLORS.land },
  ];

  // Active inventory pie
  const inventoryPie = [
    { name: "Single-Family", value: sf.activeListings, color: COLORS.sf },
    { name: "Condo", value: cd.activeListings, color: COLORS.condo },
    { name: "Land", value: ld.activeListings, color: COLORS.land },
  ];

  // New vs Sold comparison (current vs previous year)
  const newVsSoldData = [
    { type: "SF New '26", value: sf.newListings, color: COLORS.sf },
    { type: "SF New '25", value: sf.prevYearNewListings, color: COLORS.sfLight },
    { type: "SF Sold '26", value: sf.soldListings, color: COLORS.sf },
    { type: "SF Sold '25", value: sf.prevYearSoldListings, color: COLORS.sfLight },
  ];

  const cardStyle: React.CSSProperties = {
    padding: 20,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, #064e3b 0%, #059669 100%)", borderRadius: 12, color: "#fff", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{data.label}</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>
            Hawai&apos;i Island Market: {data.headline}
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
            Source: Hawaii Information Service
          </div>
        </div>
        {hasMultipleMonths && (
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.2)", color: "#fff" }}
          >
            {HAWAII_ISLAND_MONTHLY_DATA.map((m) => (
              <option key={m.month} value={m.month} style={{ color: "#064e3b" }}>{m.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* KPI Cards — Row 1: Median Prices */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.sf}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>SF Median Price</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(sf.medianPrice)}</div>
          <div style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
            {sf.dom} days on market ({sf.domDirection === "up" ? "rising" : "falling"})
          </div>
        </div>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.condo}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Condo Median Price</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(cd.medianPrice)}</div>
          <div style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
            {cd.dom} days on market ({cd.domDirection === "up" ? "rising" : "falling"})
          </div>
        </div>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.land}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Land Median Price</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(ld.medianPrice)}</div>
          <div style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
            {ld.dom} days on market ({ld.domDirection === "up" ? "rising" : "falling"})
          </div>
        </div>
      </div>

      {/* KPI Cards — Row 2: Sales & Inventory */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.amber}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Total Sold Listings</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{sf.soldListings + cd.soldListings + ld.soldListings}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>SF: {sf.soldListings} | Condo: {cd.soldListings} | Land: {ld.soldListings}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.purple}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Total New Listings</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{sf.newListings + cd.newListings + ld.newListings}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>SF: {sf.newListings} | Condo: {cd.newListings} | Land: {ld.newListings}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #6366f1" }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Total Active Listings</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{(sf.activeListings + cd.activeListings + ld.activeListings).toLocaleString()}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>SF: {sf.activeListings} | Condo: {cd.activeListings} | Land: {ld.activeListings.toLocaleString()}</div>
        </div>
      </div>

      {/* Trend Line Charts */}
      {hasMultipleMonths && (
        <>
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Median Price Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => fmt(value)} />
                <Legend />
                <Line type="monotone" dataKey="sfMedianPrice" name="Single-Family" stroke={COLORS.sf} strokeWidth={3} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="condoMedianPrice" name="Condo" stroke={COLORS.condo} strokeWidth={3} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="landMedianPrice" name="Land" stroke={COLORS.land} strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ ...cardStyle, flex: "1 1 380px" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Sales Trend</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sfSold" name="SF Sold" stroke={COLORS.sf} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="condoSold" name="Condo Sold" stroke={COLORS.condo} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="landSold" name="Land Sold" stroke={COLORS.land} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ ...cardStyle, flex: "1 1 380px" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Days on Market Trend</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: any) => `${value} days`} />
                  <Legend />
                  <Line type="monotone" dataKey="sfDOM" name="SF DOM" stroke={COLORS.sf} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="condoDOM" name="Condo DOM" stroke={COLORS.condo} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="landDOM" name="Land DOM" stroke={COLORS.land} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Median Price Bar Chart */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Median Sales Price by Property Type</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={medianPriceData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="type" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: any) => fmt(value)} />
            <Bar dataKey="value" name="Median Price" radius={[6, 6, 0, 0]}>
              {medianPriceData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sales Activity Bar Chart */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>New Listings & Sales — {data.label}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesComparison} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Single-Family" fill={COLORS.sf} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Condo" fill={COLORS.condo} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Land" fill={COLORS.land} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* YoY Changes */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Year-over-Year Changes (%)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={yoyChanges} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
            <Legend />
            <Bar dataKey="sf" name="Single-Family" fill={COLORS.sf} radius={[4, 4, 0, 0]} />
            <Bar dataKey="condo" name="Condo" fill={COLORS.condo} radius={[4, 4, 0, 0]} />
            <Bar dataKey="land" name="Land" fill={COLORS.land} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* DOM + Inventory */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Days on Market</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={domData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="type" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => `${value} days`} />
              <Bar dataKey="value" name="Days" radius={[6, 6, 0, 0]}>
                {domData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Active Inventory Split</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={inventoryPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={40}
                label={(props: any) => `${props.name}: ${props.value.toLocaleString()}`}
                labelLine
              >
                {inventoryPie.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 13, color: "#6b7280" }}>
            Total: {(sf.activeListings + cd.activeListings + ld.activeListings).toLocaleString()} active listings
          </div>
        </div>
      </div>

      {/* Detailed Statistics Table */}
      <div style={{ ...cardStyle, marginBottom: 24, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Detailed Statistics — {data.label}</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Metric</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.sf }}>Single-Family</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.condo }}>Condo</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.land }}>Land</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "Median Sales Price", sfVal: fmt(sf.medianPrice), cdVal: fmt(cd.medianPrice), ldVal: fmt(ld.medianPrice) },
              { label: "Days on Market", sfVal: `${sf.dom} days`, cdVal: `${cd.dom} days`, ldVal: `${ld.dom} days` },
              { label: "Active Listings", sfVal: sf.activeListings.toString(), cdVal: cd.activeListings.toString(), ldVal: ld.activeListings.toLocaleString() },
              { label: `New Listings (${data.label})`, sfVal: sf.newListings.toString(), cdVal: cd.newListings.toString(), ldVal: ld.newListings.toString() },
              { label: `New Listings (prev year)`, sfVal: sf.prevYearNewListings.toString(), cdVal: cd.prevYearNewListings.toString(), ldVal: ld.prevYearNewListings.toString() },
              { label: "New Listings YoY", sfVal: yoyText(sfNewListingsYoY), cdVal: yoyText(cdNewListingsYoY), ldVal: yoyText(ldNewListingsYoY), sfColor: yoyColor(sfNewListingsYoY), cdColor: yoyColor(cdNewListingsYoY), ldColor: yoyColor(ldNewListingsYoY) },
              { label: `Sold Listings (${data.label})`, sfVal: sf.soldListings.toString(), cdVal: cd.soldListings.toString(), ldVal: ld.soldListings.toString() },
              { label: `Sold Listings (prev year)`, sfVal: sf.prevYearSoldListings.toString(), cdVal: cd.prevYearSoldListings.toString(), ldVal: ld.prevYearSoldListings.toString() },
              { label: "Sold Listings YoY", sfVal: yoyText(sfSoldYoY), cdVal: yoyText(cdSoldYoY), ldVal: yoyText(ldSoldYoY), sfColor: yoyColor(sfSoldYoY), cdColor: yoyColor(cdSoldYoY), ldColor: yoyColor(ldSoldYoY) },
            ].map((row: any, i) => (
              <tr key={row.label} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.label}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: row.sfColor || "inherit" }}>{row.sfVal}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: row.cdColor || "inherit" }}>{row.cdVal}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: row.ldColor || "inherit" }}>{row.ldVal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Market Highlights */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Market Highlights</h3>
        <ul style={{ margin: 0, padding: "0 0 0 20px", fontSize: 14, lineHeight: 2, color: "#374151" }}>
          {data.highlights.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      </div>

      {/* Source */}
      <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "12px 0" }}>
        Source: Hawaii Information Service &middot; Information is deemed reliable but not guaranteed
      </div>
    </div>
  );
}
