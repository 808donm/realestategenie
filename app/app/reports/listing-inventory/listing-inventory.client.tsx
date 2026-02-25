"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type Period = "active" | "last_30" | "this_quarter" | "ytd";

interface Listing {
  address: string;
  listPrice: number;
  dom: number;
  status: "Active" | "Pending" | "Coming Soon" | "Active - Price Reduced";
  listingAgent: string;
}

const FALLBACK_DATA: Listing[] = [
  { address: "1234 Oak Ridge Dr", listPrice: 449900, dom: 8, status: "Active", listingAgent: "Sarah Mitchell" },
  { address: "567 Maple Ave #202", listPrice: 319000, dom: 14, status: "Active", listingAgent: "James Carter" },
  { address: "890 Pine Valley Ct", listPrice: 599000, dom: 28, status: "Active - Price Reduced", listingAgent: "Ashley Brown" },
  { address: "2100 Sunset Blvd", listPrice: 385000, dom: 3, status: "Coming Soon", listingAgent: "Maria Lopez" },
  { address: "45 Lakeview Terrace", listPrice: 725000, dom: 42, status: "Active", listingAgent: "Ashley Brown" },
  { address: "333 Elm Street", listPrice: 275000, dom: 21, status: "Active - Price Reduced", listingAgent: "Tyler Nguyen" },
  { address: "1678 Birch Lane", listPrice: 465000, dom: 5, status: "Active", listingAgent: "Sarah Mitchell" },
  { address: "912 Willow Creek Rd", listPrice: 549000, dom: 35, status: "Pending", listingAgent: "David Kim" },
  { address: "4401 Cedar Park Way", listPrice: 410000, dom: 17, status: "Active", listingAgent: "Maria Lopez" },
  { address: "88 Riverside Dr #5", listPrice: 289000, dom: 52, status: "Active", listingAgent: "James Carter" },
];

const PERIOD_LABELS: Record<Period, string> = {
  active: "Active Only",
  last_30: "Last 30 Days",
  this_quarter: "This Quarter",
  ytd: "Year to Date",
};

export default function ListingInventoryClient() {
  const [period, setPeriod] = useState<Period>("active");
  const [data, setData] = useState<Listing[]>(FALLBACK_DATA);
  const [isLive, setIsLive] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/listing-inventory");
      if (!res.ok) throw new Error("API request failed");
      const json: Listing[] = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        setData(json);
        setIsLive(true);
      }
    } catch {
      // Fall back to sample data (already set as initial state)
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeListings = data.filter((l) => l.status !== "Pending");
  const totalActive = activeListings.length;
  const avgDom = useMemo(() => {
    if (activeListings.length === 0) return 0;
    return activeListings.reduce((s, l) => s + l.dom, 0) / activeListings.length;
  }, [data]);
  const listings21Plus = activeListings.filter((l) => l.dom >= 21).length;
  const avgListPrice = useMemo(() => {
    if (activeListings.length === 0) return 0;
    return activeListings.reduce((s, l) => s + l.listPrice, 0) / activeListings.length;
  }, [data]);

  // DOM distribution buckets
  const domBuckets = useMemo(() => {
    const buckets = [
      { label: "0-7", min: 0, max: 7, count: 0, color: "#10b981" },
      { label: "8-14", min: 8, max: 14, count: 0, color: "#3b82f6" },
      { label: "15-21", min: 15, max: 21, count: 0, color: "#f59e0b" },
      { label: "22-30", min: 22, max: 30, count: 0, color: "#f97316" },
      { label: "31+", min: 31, max: Infinity, count: 0, color: "#ef4444" },
    ];
    data.forEach((l) => {
      const bucket = buckets.find((b) => l.dom >= b.min && l.dom <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [data]);
  const maxBucketCount = Math.max(...domBuckets.map((b) => b.count), 1);

  const rowBg = (listing: Listing, index: number): string => {
    if (listing.dom >= 21) return "#fffbeb";
    return index % 2 === 0 ? "#fff" : "#fafafa";
  };

  const rowBorder = (listing: Listing): string => {
    if (listing.dom >= 30) return "2px solid #f97316";
    if (listing.dom >= 21) return "2px solid #fbbf24";
    return "none";
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Listing Inventory Health Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${PERIOD_LABELS[period]} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    doc.setFontSize(11);
    doc.text(`Total Active Listings: ${totalActive}`, 14, 42);
    doc.text(`Average DOM: ${avgDom.toFixed(1)} days`, 14, 50);
    doc.text(`Listings 21+ DOM: ${listings21Plus}`, 14, 58);
    doc.text(`Average List Price: ${fmt.format(avgListPrice)}`, 14, 66);

    const headers = ["Address", "List Price", "DOM", "Status", "Agent"];
    const colX = [14, 72, 102, 118, 162];
    let y = 80;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    doc.setFont("helvetica", "normal");

    data.forEach((listing) => {
      y += 8;
      if (y > 280) { doc.addPage(); y = 20; }
      const addr = listing.address.length > 26 ? listing.address.substring(0, 26) + "..." : listing.address;
      doc.text(addr, colX[0], y);
      doc.text(fmt.format(listing.listPrice), colX[1], y);
      doc.text(`${listing.dom}`, colX[2], y);
      doc.text(listing.status, colX[3], y);
      doc.text(listing.listingAgent.split(" ")[0], colX[4], y);
    });

    doc.save("listing-inventory-health.pdf");
  };

  const domColor = (dom: number): string => {
    if (dom >= 30) return "#dc2626";
    if (dom >= 21) return "#d97706";
    if (dom >= 14) return "#f59e0b";
    return "#10b981";
  };

  return (
    <div>
      {/* Integration Notice */}
      <div style={{
        background: isLive ? "#f0fdf4" : "#eff6ff",
        border: isLive ? "1px solid #bbf7d0" : "1px solid #bfdbfe",
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 13,
      }}>
        <span>
          {isLive ? (
            <><strong>Live Data</strong> -- Showing live data from your MLS/Trestle integration.</>
          ) : (
            <><strong>Sample Data</strong> -- Connect your MLS/Trestle integration to see live data.</>
          )}
        </span>
        {!isLive && (
          <Link href="/app/integrations" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
            Connect MLS &rarr;
          </Link>
        )}
      </div>

      {/* Period Selector + Export */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: period === p ? "2px solid #8b5cf6" : "1px solid #d1d5db",
                background: period === p ? "#f5f3ff" : "#fff",
                color: period === p ? "#7c3aed" : "#374151",
                fontWeight: period === p ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          onClick={exportPDF}
          style={{
            padding: "8px 18px",
            borderRadius: 6,
            border: "none",
            background: "#7c3aed",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Export PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, borderTop: "3px solid #8b5cf6" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Total Active</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{totalActive}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, borderTop: "3px solid #3b82f6" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Avg DOM</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{avgDom.toFixed(1)}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, borderTop: "3px solid #f59e0b" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Listings 21+ DOM</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: listings21Plus > 0 ? "#d97706" : "inherit" }}>{listings21Plus}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, borderTop: "3px solid #10b981" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Avg List Price</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt.format(avgListPrice)}</div>
        </div>
      </div>

      {/* DOM Distribution Mini Chart */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700 }}>Days on Market Distribution</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
          {domBuckets.map((bucket) => (
            <div key={bucket.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{bucket.count}</div>
              <div
                style={{
                  width: "100%",
                  maxWidth: 60,
                  height: `${Math.max((bucket.count / maxBucketCount) * 80, 4)}px`,
                  background: bucket.color,
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.3s ease",
                }}
              />
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{bucket.label}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 8 }}>Days on Market</div>
      </div>

      {/* Price Adjustment Alert */}
      {listings21Plus > 0 && (
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 10,
          padding: "14px 20px",
          marginBottom: 20,
          fontSize: 13,
        }}>
          <strong style={{ color: "#92400e" }}>Price Adjustment Alert:</strong>{" "}
          <span style={{ color: "#78350f" }}>
            {listings21Plus} listing{listings21Plus !== 1 ? "s" : ""} ha{listings21Plus !== 1 ? "ve" : "s"} been
            on market 21+ days. Consider a price reduction or marketing refresh. Rows highlighted below.
          </span>
        </div>
      )}

      {/* Listings Table */}
      <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Address</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>List Price</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>DOM</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Status</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, borderBottom: "2px solid #e5e7eb" }}>Listing Agent</th>
            </tr>
          </thead>
          <tbody>
            {data.map((listing, i) => (
              <tr
                key={listing.address}
                style={{
                  background: rowBg(listing, i),
                  borderLeft: rowBorder(listing),
                }}
              >
                <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                  <strong>{listing.address}</strong>
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>
                  {fmt.format(listing.listPrice)}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{
                    fontWeight: 700,
                    color: domColor(listing.dom),
                    background: listing.dom >= 21 ? "#fef3c7" : "transparent",
                    padding: listing.dom >= 21 ? "2px 8px" : 0,
                    borderRadius: 4,
                  }}>
                    {listing.dom}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background:
                      listing.status === "Active" ? "#dcfce7" :
                      listing.status === "Pending" ? "#dbeafe" :
                      listing.status === "Coming Soon" ? "#f3e8ff" :
                      "#fef3c7",
                    color:
                      listing.status === "Active" ? "#166534" :
                      listing.status === "Pending" ? "#1e40af" :
                      listing.status === "Coming Soon" ? "#6b21a8" :
                      "#92400e",
                  }}>
                    {listing.status}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                  {listing.listingAgent}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
