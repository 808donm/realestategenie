"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  PieChart, Pie,
} from "recharts";
import { OAHU_MONTHLY_DATA } from "@/lib/data/oahu-monthly-data";
import { MAUI_MONTHLY_DATA } from "@/lib/data/maui-monthly-data";
import { HAWAII_ISLAND_MONTHLY_DATA } from "@/lib/data/hawaii-island-monthly-data";
import { KAUAI_MONTHLY_DATA } from "@/lib/data/kauai-monthly-data";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const COLORS = {
  oahu: "#dc2626",
  maui: "#0284c7",
  hawaii: "#059669",
  kauai: "#8b5cf6",
};

export default function HawaiiMarketComparisonClient() {
  // Latest data from each island
  const oahu = OAHU_MONTHLY_DATA[OAHU_MONTHLY_DATA.length - 1];
  const maui = MAUI_MONTHLY_DATA[MAUI_MONTHLY_DATA.length - 1];
  const hi = HAWAII_ISLAND_MONTHLY_DATA[HAWAII_ISLAND_MONTHLY_DATA.length - 1];
  const kauai = KAUAI_MONTHLY_DATA[KAUAI_MONTHLY_DATA.length - 1];

  // SF Median Price Comparison
  const sfMedianPriceData = [
    { island: "O'ahu", value: oahu.singleFamily.medianPrice, color: COLORS.oahu },
    { island: "Maui", value: maui.singleFamily.medianPrice, color: COLORS.maui },
    { island: "Hawai'i", value: hi.singleFamily.medianPrice, color: COLORS.hawaii },
    { island: "Kaua'i", value: kauai.singleFamily.medianPrice, color: COLORS.kauai },
  ];

  // Condo Median Price Comparison
  const condoMedianPriceData = [
    { island: "O'ahu", value: oahu.condo.medianPrice, color: COLORS.oahu },
    { island: "Maui", value: maui.condo.medianPrice, color: COLORS.maui },
    { island: "Hawai'i", value: hi.condo.medianPrice, color: COLORS.hawaii },
    { island: "Kaua'i", value: kauai.condo.medianPrice, color: COLORS.kauai },
  ];

  // SF Sales Volume
  const sfSalesData = [
    { island: "O'ahu", value: oahu.singleFamily.sales, color: COLORS.oahu },
    { island: "Maui", value: maui.singleFamily.closedSales, color: COLORS.maui },
    { island: "Hawai'i", value: hi.singleFamily.soldListings, color: COLORS.hawaii },
    { island: "Kaua'i", value: kauai.singleFamily.soldListings, color: COLORS.kauai },
  ];

  // Condo Sales Volume
  const condoSalesData = [
    { island: "O'ahu", value: oahu.condo.sales, color: COLORS.oahu },
    { island: "Maui", value: maui.condo.closedSales, color: COLORS.maui },
    { island: "Hawai'i", value: hi.condo.soldListings, color: COLORS.hawaii },
    { island: "Kaua'i", value: kauai.condo.soldListings, color: COLORS.kauai },
  ];

  // SF Days on Market
  const sfDomData = [
    { island: "O'ahu", value: oahu.singleFamily.medianDOM, color: COLORS.oahu },
    { island: "Maui", value: maui.singleFamily.dom, color: COLORS.maui },
    { island: "Hawai'i", value: hi.singleFamily.dom, color: COLORS.hawaii },
    { island: "Kaua'i", value: kauai.singleFamily.dom, color: COLORS.kauai },
  ];

  // Condo Days on Market
  const condoDomData = [
    { island: "O'ahu", value: oahu.condo.medianDOM, color: COLORS.oahu },
    { island: "Maui", value: maui.condo.dom, color: COLORS.maui },
    { island: "Hawai'i", value: hi.condo.dom, color: COLORS.hawaii },
    { island: "Kaua'i", value: kauai.condo.dom, color: COLORS.kauai },
  ];

  // SF Active Inventory
  const sfInventoryData = [
    { island: "O'ahu", value: oahu.singleFamily.activeInventory, color: COLORS.oahu },
    { island: "Maui", value: maui.singleFamily.inventory, color: COLORS.maui },
    { island: "Hawai'i", value: hi.singleFamily.activeListings, color: COLORS.hawaii },
    { island: "Kaua'i", value: kauai.singleFamily.activeListings, color: COLORS.kauai },
  ];

  // Condo Active Inventory
  const condoInventoryData = [
    { island: "O'ahu", value: oahu.condo.activeInventory, color: COLORS.oahu },
    { island: "Maui", value: maui.condo.inventory, color: COLORS.maui },
    { island: "Hawai'i", value: hi.condo.activeListings, color: COLORS.hawaii },
    { island: "Kaua'i", value: kauai.condo.activeListings, color: COLORS.kauai },
  ];

  // Total SF sales pie chart
  const totalSfSales = sfSalesData.reduce((s, d) => s + d.value, 0);
  const totalCondoSales = condoSalesData.reduce((s, d) => s + d.value, 0);

  const cardStyle: React.CSSProperties = {
    padding: 20,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", borderRadius: 12, color: "#fff", marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>February 2026 — All Islands</div>
        <div style={{ fontSize: 14, opacity: 0.9 }}>
          Side-by-side comparison of O&apos;ahu, Maui County, Hawai&apos;i Island, and Kaua&apos;i
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { label: "O'ahu", color: COLORS.oahu, src: "Honolulu Board of REALTORS® / HiCentral MLS" },
            { label: "Maui", color: COLORS.maui, src: "REALTORS® Association of Maui / RAM MLS" },
            { label: "Hawai'i Island", color: COLORS.hawaii, src: "Hawaii Information Service" },
            { label: "Kaua'i", color: COLORS.kauai, src: "Hawaii Information Service" },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Island KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { name: "O'ahu", color: COLORS.oahu, sfPrice: oahu.singleFamily.medianPrice, condoPrice: oahu.condo.medianPrice, sfSales: oahu.singleFamily.sales, condoSales: oahu.condo.sales, sfDOM: oahu.singleFamily.medianDOM, condoDOM: oahu.condo.medianDOM, period: oahu.label },
          { name: "Maui", color: COLORS.maui, sfPrice: maui.singleFamily.medianPrice, condoPrice: maui.condo.medianPrice, sfSales: maui.singleFamily.closedSales, condoSales: maui.condo.closedSales, sfDOM: maui.singleFamily.dom, condoDOM: maui.condo.dom, period: maui.label },
          { name: "Hawai'i Island", color: COLORS.hawaii, sfPrice: hi.singleFamily.medianPrice, condoPrice: hi.condo.medianPrice, sfSales: hi.singleFamily.soldListings, condoSales: hi.condo.soldListings, sfDOM: hi.singleFamily.dom, condoDOM: hi.condo.dom, period: hi.label },
          { name: "Kaua'i", color: COLORS.kauai, sfPrice: kauai.singleFamily.medianPrice, condoPrice: kauai.condo.medianPrice, sfSales: kauai.singleFamily.soldListings, condoSales: kauai.condo.soldListings, sfDOM: kauai.singleFamily.dom, condoDOM: kauai.condo.dom, period: kauai.label },
        ].map((island) => (
          <div key={island.name} style={{ ...cardStyle, borderTop: `4px solid ${island.color}` }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: island.color }}>{island.name}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>SF Median</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(island.sfPrice)}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8, marginBottom: 2 }}>Condo Median</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(island.condoPrice)}</div>
            <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 12, color: "#6b7280" }}>
              <div>
                <div style={{ fontWeight: 700, color: "#374151" }}>{island.sfSales + island.condoSales}</div>
                <div>Sales</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#374151" }}>{island.sfDOM}d / {island.condoDOM}d</div>
                <div>SF / Condo DOM</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SF Median Price Comparison */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Single-Family Median Price by Island</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sfMedianPriceData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="island" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: any) => fmt(value)} />
            <Bar dataKey="value" name="Median Price" radius={[6, 6, 0, 0]}>
              {sfMedianPriceData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Condo Median Price Comparison */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Condo Median Price by Island</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={condoMedianPriceData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="island" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: any) => fmt(value)} />
            <Bar dataKey="value" name="Median Price" radius={[6, 6, 0, 0]}>
              {condoMedianPriceData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sales Volume: SF + Condo side by side */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>SF Sales by Island</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={sfSalesData}
                dataKey="value"
                nameKey="island"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={40}
                label={(props: any) => `${props.island}: ${props.value}`}
                labelLine
              >
                {sfSalesData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 13, color: "#6b7280" }}>Total: {totalSfSales} SF sales statewide</div>
        </div>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Condo Sales by Island</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={condoSalesData}
                dataKey="value"
                nameKey="island"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={40}
                label={(props: any) => `${props.island}: ${props.value}`}
                labelLine
              >
                {condoSalesData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 13, color: "#6b7280" }}>Total: {totalCondoSales} condo sales statewide</div>
        </div>
      </div>

      {/* Days on Market Comparison */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>SF Days on Market</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sfDomData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="island" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => `${value} days`} />
              <Bar dataKey="value" name="Days" radius={[6, 6, 0, 0]}>
                {sfDomData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Condo Days on Market</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={condoDomData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="island" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => `${value} days`} />
              <Bar dataKey="value" name="Days" radius={[6, 6, 0, 0]}>
                {condoDomData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inventory Comparison */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>SF Active Inventory</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sfInventoryData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="island" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Active Listings" radius={[6, 6, 0, 0]}>
                {sfInventoryData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...cardStyle, flex: "1 1 380px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Condo Active Inventory</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={condoInventoryData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="island" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Active Listings" radius={[6, 6, 0, 0]}>
                {condoInventoryData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comprehensive Data Table */}
      <div style={{ ...cardStyle, marginBottom: 24, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Full Comparison — February 2026</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Metric</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.oahu }}>O&apos;ahu</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.maui }}>Maui</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.hawaii }}>Hawai&apos;i Island</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.kauai }}>Kaua&apos;i</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "SF Median Price", oahu: fmt(oahu.singleFamily.medianPrice), maui: fmt(maui.singleFamily.medianPrice), hi: fmt(hi.singleFamily.medianPrice), kauai: fmt(kauai.singleFamily.medianPrice) },
              { label: "Condo Median Price", oahu: fmt(oahu.condo.medianPrice), maui: fmt(maui.condo.medianPrice), hi: fmt(hi.condo.medianPrice), kauai: fmt(kauai.condo.medianPrice) },
              { label: "SF Sales", oahu: oahu.singleFamily.sales.toString(), maui: maui.singleFamily.closedSales.toString(), hi: hi.singleFamily.soldListings.toString(), kauai: kauai.singleFamily.soldListings.toString() },
              { label: "Condo Sales", oahu: oahu.condo.sales.toString(), maui: maui.condo.closedSales.toString(), hi: hi.condo.soldListings.toString(), kauai: kauai.condo.soldListings.toString() },
              { label: "SF Days on Market", oahu: `${oahu.singleFamily.medianDOM}`, maui: `${maui.singleFamily.dom}`, hi: `${hi.singleFamily.dom}`, kauai: `${kauai.singleFamily.dom}` },
              { label: "Condo Days on Market", oahu: `${oahu.condo.medianDOM}`, maui: `${maui.condo.dom}`, hi: `${hi.condo.dom}`, kauai: `${kauai.condo.dom}` },
              { label: "SF Active Inventory", oahu: oahu.singleFamily.activeInventory.toString(), maui: maui.singleFamily.inventory.toString(), hi: hi.singleFamily.activeListings.toString(), kauai: kauai.singleFamily.activeListings.toString() },
              { label: "Condo Active Inventory", oahu: oahu.condo.activeInventory.toLocaleString(), maui: maui.condo.inventory.toString(), hi: hi.condo.activeListings.toString(), kauai: kauai.condo.activeListings.toString() },
              { label: "SF New Listings", oahu: oahu.singleFamily.newListings.toString(), maui: maui.singleFamily.newListings.toString(), hi: hi.singleFamily.newListings.toString(), kauai: kauai.singleFamily.newListings.toString() },
              { label: "Condo New Listings", oahu: oahu.condo.newListings.toString(), maui: maui.condo.newListings.toString(), hi: hi.condo.newListings.toString(), kauai: kauai.condo.newListings.toString() },
            ].map((row, i) => (
              <tr key={row.label} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.label}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.oahu}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.maui}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.hi}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.kauai}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key Takeaways */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Key Takeaways</h3>
        <ul style={{ margin: 0, padding: "0 0 0 20px", fontSize: 14, lineHeight: 2, color: "#374151" }}>
          <li><strong>Most affordable SF market:</strong> Hawai&apos;i Island at {fmt(hi.singleFamily.medianPrice)} — less than half of Kaua&apos;i&apos;s {fmt(kauai.singleFamily.medianPrice)}.</li>
          <li><strong>Fastest-selling SF homes:</strong> O&apos;ahu at {oahu.singleFamily.medianDOM} days, followed by Hawai&apos;i Island at {hi.singleFamily.dom} days.</li>
          <li><strong>Highest SF prices:</strong> Kaua&apos;i leads at {fmt(kauai.singleFamily.medianPrice)}, followed by Maui at {fmt(maui.singleFamily.medianPrice)}.</li>
          <li><strong>Most condo inventory:</strong> O&apos;ahu dominates with {oahu.condo.activeInventory.toLocaleString()} active listings vs Maui&apos;s {maui.condo.inventory}.</li>
          <li><strong>Slowest markets:</strong> Maui SF at {maui.singleFamily.dom} days and Kaua&apos;i land at {kauai.land.dom} days show extended selling timelines.</li>
          <li><strong>O&apos;ahu drives volume:</strong> {oahu.singleFamily.sales + oahu.condo.sales} total sales vs {maui.singleFamily.closedSales + maui.condo.closedSales} on Maui, {hi.singleFamily.soldListings + hi.condo.soldListings} on Hawai&apos;i Island, and {kauai.singleFamily.soldListings + kauai.condo.soldListings} on Kaua&apos;i.</li>
        </ul>
      </div>

      {/* Source Attribution */}
      <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "12px 0", lineHeight: 1.8 }}>
        Sources: Honolulu Board of REALTORS® / HiCentral MLS (O&apos;ahu) &middot; REALTORS® Association of Maui / RAM MLS (Maui) &middot; Hawaii Information Service (Hawai&apos;i Island &amp; Kaua&apos;i)
        <br />
        Data periods may vary slightly by source. Information is deemed reliable but not guaranteed.
      </div>
    </div>
  );
}
