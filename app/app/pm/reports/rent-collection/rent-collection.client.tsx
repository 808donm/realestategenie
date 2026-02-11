"use client";

import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import Link from "next/link";

const SAMPLE_TENANTS = [
  { name: "Sarah Johnson", unit: "Unit 101 - 123 Oak St", rent: 1800, status: "paid" as const, datePaid: "Feb 1", lateFee: 0 },
  { name: "Mike Chen", unit: "Unit 202 - 123 Oak St", rent: 2100, status: "paid" as const, datePaid: "Feb 2", lateFee: 0 },
  { name: "Lisa Martinez", unit: "Unit 303 - 456 Elm Ave", rent: 1650, status: "late" as const, datePaid: "Feb 7", lateFee: 75 },
  { name: "James Wilson", unit: "Unit 1 - 789 Pine Rd", rent: 2400, status: "unpaid" as const, datePaid: "-", lateFee: 150 },
  { name: "Emily Davis", unit: "Unit 2 - 789 Pine Rd", rent: 1950, status: "partial" as const, datePaid: "Feb 3", lateFee: 0 },
  { name: "Robert Taylor", unit: "Unit 404 - 456 Elm Ave", rent: 1750, status: "paid" as const, datePaid: "Feb 1", lateFee: 0 },
  { name: "Anna Brown", unit: "Unit 505 - 123 Oak St", rent: 1900, status: "paid" as const, datePaid: "Feb 3", lateFee: 0 },
  { name: "David Kim", unit: "Unit 3 - 789 Pine Rd", rent: 2200, status: "unpaid" as const, datePaid: "-", lateFee: 150 },
];

const MONTHLY_RATES = [
  { month: "Sep", rate: 97 }, { month: "Oct", rate: 95 }, { month: "Nov", rate: 98 },
  { month: "Dec", rate: 94 }, { month: "Jan", rate: 96 }, { month: "Feb", rate: 82 },
];

type Status = "paid" | "late" | "unpaid" | "partial";

const STATUS_STYLES: Record<Status, { bg: string; color: string; label: string }> = {
  paid: { bg: "#ecfdf5", color: "#059669", label: "Paid" },
  late: { bg: "#fefce8", color: "#ca8a04", label: "Late" },
  unpaid: { bg: "#fef2f2", color: "#dc2626", label: "Unpaid" },
  partial: { bg: "#eff6ff", color: "#2563eb", label: "Partial" },
};

export default function RentCollectionClient() {
  const [month, setMonth] = useState("February 2026");
  const [filter, setFilter] = useState<"all" | Status>("all");

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const filtered = filter === "all" ? SAMPLE_TENANTS : SAMPLE_TENANTS.filter((t) => t.status === filter);
  const totalExpected = SAMPLE_TENANTS.reduce((s, t) => s + t.rent, 0);
  const totalCollected = SAMPLE_TENANTS.filter((t) => t.status === "paid" || t.status === "late").reduce((s, t) => s + t.rent, 0);
  const totalOutstanding = totalExpected - totalCollected;
  const collectionRate = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : "0";
  const totalLateFees = SAMPLE_TENANTS.reduce((s, t) => s + t.lateFee, 0);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("Rent Collection Ledger", pw / 2, y, { align: "center" }); y += 10;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(month, pw / 2, y, { align: "center" }); y += 14;
    [["Expected:", fmt(totalExpected)], ["Collected:", fmt(totalCollected)], ["Outstanding:", fmt(totalOutstanding)], ["Collection Rate:", `${collectionRate}%`], ["Late Fees:", fmt(totalLateFees)]].forEach(([l, v]) => {
      doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 6;
    });
    y += 6;
    SAMPLE_TENANTS.forEach((t) => {
      doc.text(`${t.name} - ${t.unit}`, 25, y);
      doc.text(`${fmt(t.rent)} (${STATUS_STYLES[t.status].label})`, pw - 25, y, { align: "right" }); y += 6;
    });
    doc.save("Rent_Collection_Ledger.pdf");
  };

  return (
    <div>
      <div style={{ padding: 12, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
        Showing sample data. <Link href="/app/integrations" style={{ color: "#3b82f6", fontWeight: 600 }}>Connect Stripe/PayPal</Link> to see live payment data.
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Expected</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(totalExpected)}</div>
        </div>
        <div style={{ padding: 16, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#059669" }}>Collected</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#059669" }}>{fmt(totalCollected)}</div>
        </div>
        <div style={{ padding: 16, background: totalOutstanding > 0 ? "#fef2f2" : "#fff", border: `1px solid ${totalOutstanding > 0 ? "#fecaca" : "#e5e7eb"}`, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Outstanding</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#dc2626" }}>{fmt(totalOutstanding)}</div>
        </div>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Collection Rate</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{collectionRate}%</div>
        </div>
        <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Late Fees</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f59e0b" }}>{fmt(totalLateFees)}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["all", "paid", "late", "unpaid", "partial"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, border: filter === s ? "2px solid #3b82f6" : "1px solid #d1d5db", borderRadius: 6, background: filter === s ? "#dbeafe" : "#fff", cursor: "pointer" }}>
            {s === "all" ? "All" : STATUS_STYLES[s].label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, color: "#6b7280" }}>Tenant</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, color: "#6b7280" }}>Property / Unit</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: "#6b7280" }}>Rent</th>
              <th style={{ padding: "10px 16px", textAlign: "center", fontSize: 12, color: "#6b7280" }}>Status</th>
              <th style={{ padding: "10px 16px", textAlign: "center", fontSize: 12, color: "#6b7280" }}>Paid</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: "#6b7280" }}>Late Fee</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => {
              const st = STATUS_STYLES[t.status];
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{t.name}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13 }}>{t.unit}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right", fontWeight: 600 }}>{fmt(t.rent)}</td>
                  <td style={{ padding: "10px 16px", textAlign: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 12, background: st.bg, color: st.color }}>{st.label}</span>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "center" }}>{t.datePaid}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right", fontWeight: 600, color: t.lateFee > 0 ? "#dc2626" : "#6b7280" }}>{t.lateFee > 0 ? fmt(t.lateFee) : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Collection Rate Trend */}
      <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Collection Rate Trend</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 100 }}>
          {MONTHLY_RATES.map((m) => (
            <div key={m.month} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: `${m.rate}%`, background: m.rate >= 95 ? "#10b981" : m.rate >= 90 ? "#eab308" : "#ef4444", borderRadius: "4px 4px 0 0", marginBottom: 4, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{m.rate}%</span>
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{m.month}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={exportToPDF} style={{ padding: "12px 24px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
        Export PDF
      </button>
    </div>
  );
}
