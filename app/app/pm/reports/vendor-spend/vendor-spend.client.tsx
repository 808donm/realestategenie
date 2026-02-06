"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import Link from "next/link";

const SAMPLE_VENDORS = [
  { name: "Ace Plumbing Co.", category: "Plumbing", workOrders: 12, totalSpend: 8400, lastUsed: "Jan 28" },
  { name: "BrightClean Services", category: "Cleaning", workOrders: 24, totalSpend: 7200, lastUsed: "Feb 2" },
  { name: "CoolAir HVAC", category: "HVAC", workOrders: 6, totalSpend: 9600, lastUsed: "Jan 15" },
  { name: "Dave's Electric", category: "Electrical", workOrders: 8, totalSpend: 5600, lastUsed: "Feb 1" },
  { name: "Handy Fix General", category: "General", workOrders: 18, totalSpend: 5400, lastUsed: "Jan 30" },
  { name: "Premier Landscaping", category: "Landscaping", workOrders: 10, totalSpend: 4500, lastUsed: "Jan 20" },
  { name: "Quick Lock & Key", category: "General", workOrders: 15, totalSpend: 3000, lastUsed: "Feb 3" },
  { name: "SafeGuard Pest Control", category: "Pest Control", workOrders: 4, totalSpend: 1600, lastUsed: "Dec 18" },
];

export default function VendorSpendClient() {
  const [period, setPeriod] = useState("quarter");

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const totalSpend = SAMPLE_VENDORS.reduce((s, v) => s + v.totalSpend, 0);
  const totalWOs = SAMPLE_VENDORS.reduce((s, v) => s + v.workOrders, 0);
  const avgPerWO = totalWOs > 0 ? totalSpend / totalWOs : 0;
  const topVendor = [...SAMPLE_VENDORS].sort((a, b) => b.totalSpend - a.totalSpend)[0];
  const maxSpend = Math.max(...SAMPLE_VENDORS.map((v) => v.totalSpend));

  // Category aggregation
  const categories = SAMPLE_VENDORS.reduce<Record<string, number>>((acc, v) => {
    acc[v.category] = (acc[v.category] || 0) + v.totalSpend;
    return acc;
  }, {});
  const categoryList = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const maxCategorySpend = categoryList.length > 0 ? categoryList[0][1] : 1;

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("Vendor Spend Report", pw / 2, y, { align: "center" }); y += 14;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    [["Total Spend:", fmt(totalSpend)], ["Vendors:", `${SAMPLE_VENDORS.length}`], ["Avg per Work Order:", fmt(avgPerWO)]].forEach(([l, v]) => {
      doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 6;
    });
    y += 6;
    doc.setFont("helvetica", "bold"); doc.text("Vendor Breakdown", 20, y); y += 8;
    doc.setFont("helvetica", "normal");
    SAMPLE_VENDORS.sort((a, b) => b.totalSpend - a.totalSpend).forEach((v) => {
      doc.text(`${v.name} (${v.category})`, 25, y);
      doc.text(`${fmt(v.totalSpend)} / ${v.workOrders} WOs`, pw - 25, y, { align: "right" }); y += 6;
    });
    doc.save("Vendor_Spend_Report.pdf");
  };

  return (
    <div>
      <div style={{ padding: 12, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
        Showing sample data. <Link href="/app/integrations" style={{ color: "#3b82f6", fontWeight: 600 }}>Connect QuickBooks</Link> to see live vendor expenses.
      </div>

      {/* Period Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[{ v: "month", l: "This Month" }, { v: "quarter", l: "This Quarter" }, { v: "year", l: "This Year" }].map((p) => (
          <button key={p.v} onClick={() => setPeriod(p.v)} style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, border: period === p.v ? "2px solid #3b82f6" : "1px solid #d1d5db", borderRadius: 6, background: period === p.v ? "#dbeafe" : "#fff", cursor: "pointer" }}>
            {p.l}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Total Vendor Spend</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(totalSpend)}</div>
        </div>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Vendors</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{SAMPLE_VENDORS.length}</div>
        </div>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Avg per Work Order</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(avgPerWO)}</div>
        </div>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Most Used Vendor</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{topVendor.name}</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{fmt(topVendor.totalSpend)}</div>
        </div>
      </div>

      {/* Vendor Table */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, color: "#6b7280" }}>Vendor</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, color: "#6b7280" }}>Category</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: "#6b7280" }}>Work Orders</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: "#6b7280" }}>Total Spend</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: "#6b7280" }}>Avg/Job</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: "#6b7280" }}>Last Used</th>
            </tr>
          </thead>
          <tbody>
            {[...SAMPLE_VENDORS].sort((a, b) => b.totalSpend - a.totalSpend).map((v, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{v.name}</td>
                <td style={{ padding: "10px 16px", fontSize: 13 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, background: "#f3f4f6", fontSize: 11, fontWeight: 600 }}>{v.category}</span>
                </td>
                <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right" }}>{v.workOrders}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right", fontWeight: 600 }}>{fmt(v.totalSpend)}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right" }}>{fmt(v.totalSpend / v.workOrders)}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right", color: "#6b7280" }}>{v.lastUsed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Spend by Category */}
      <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Spend by Category</h3>
        {categoryList.map(([cat, spend]) => (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ width: 100, fontSize: 13, fontWeight: 600 }}>{cat}</div>
            <div style={{ flex: 1, height: 24, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(spend / maxCategorySpend) * 100}%`, background: "#8b5cf6", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>{fmt(spend)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={exportToPDF} style={{ padding: "12px 24px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
        Export PDF
      </button>
    </div>
  );
}
