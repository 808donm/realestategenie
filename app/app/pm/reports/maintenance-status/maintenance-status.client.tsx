"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

type Priority = "Low" | "Medium" | "High" | "Emergency";
type WOStatus = "Open" | "In Progress" | "Overdue" | "Completed";

interface WorkOrder {
  id: string;
  property: string;
  unit: string;
  issue: string;
  priority: Priority;
  vendorAssigned: string;
  status: WOStatus;
  daysOpen: number;
}

const SAMPLE_DATA: WorkOrder[] = [
  { id: "WO-1041", property: "Sunset Ridge Apts", unit: "Unit 204", issue: "Leaking kitchen faucet", priority: "Medium", vendorAssigned: "Ace Plumbing Co.", status: "In Progress", daysOpen: 3 },
  { id: "WO-1042", property: "Sunset Ridge Apts", unit: "Unit 112", issue: "HVAC not cooling", priority: "High", vendorAssigned: "CoolAir HVAC", status: "Open", daysOpen: 1 },
  { id: "WO-1043", property: "Lakeview Townhomes", unit: "Unit B", issue: "Broken window latch", priority: "Low", vendorAssigned: "HandyPro Services", status: "Completed", daysOpen: 0 },
  { id: "WO-1044", property: "Lakeview Townhomes", unit: "Unit D", issue: "Garage door won't open", priority: "High", vendorAssigned: "Precision Door", status: "Overdue", daysOpen: 12 },
  { id: "WO-1045", property: "Pine Creek Duplexes", unit: "Unit A", issue: "Toilet running constantly", priority: "Medium", vendorAssigned: "Ace Plumbing Co.", status: "Open", daysOpen: 2 },
  { id: "WO-1046", property: "Pine Creek Duplexes", unit: "Unit B", issue: "No hot water", priority: "Emergency", vendorAssigned: "Ace Plumbing Co.", status: "In Progress", daysOpen: 0 },
  { id: "WO-1047", property: "Oakmont Plaza", unit: "Suite 301", issue: "Electrical outlet sparking", priority: "Emergency", vendorAssigned: "SafeWire Electric", status: "Open", daysOpen: 0 },
  { id: "WO-1048", property: "Oakmont Plaza", unit: "Suite 105", issue: "Carpet stain removal", priority: "Low", vendorAssigned: "CleanSweep LLC", status: "Completed", daysOpen: 0 },
  { id: "WO-1049", property: "Sunset Ridge Apts", unit: "Unit 318", issue: "Pest control - roaches reported", priority: "High", vendorAssigned: "BugOut Exterminators", status: "Overdue", daysOpen: 8 },
  { id: "WO-1050", property: "Lakeview Townhomes", unit: "Unit A", issue: "Water heater replacement", priority: "High", vendorAssigned: "Ace Plumbing Co.", status: "Overdue", daysOpen: 15 },
  { id: "WO-1051", property: "Oakmont Plaza", unit: "Suite 202", issue: "Light fixture flickering", priority: "Medium", vendorAssigned: "SafeWire Electric", status: "In Progress", daysOpen: 4 },
  { id: "WO-1052", property: "Pine Creek Duplexes", unit: "Unit A", issue: "Front door deadbolt jammed", priority: "High", vendorAssigned: "HandyPro Services", status: "Open", daysOpen: 1 },
  { id: "WO-1053", property: "Sunset Ridge Apts", unit: "Unit 101", issue: "Dishwasher not draining", priority: "Medium", vendorAssigned: "ApplianceFix Pro", status: "Completed", daysOpen: 0 },
  { id: "WO-1054", property: "Oakmont Plaza", unit: "Suite 110", issue: "Ceiling fan wobbling", priority: "Low", vendorAssigned: "HandyPro Services", status: "Open", daysOpen: 5 },
];

const PROPERTIES = ["All", "Sunset Ridge Apts", "Lakeview Townhomes", "Pine Creek Duplexes", "Oakmont Plaza"] as const;
const PRIORITIES: ("All" | Priority)[] = ["All", "Low", "Medium", "High", "Emergency"];
const STATUSES: ("All" | WOStatus)[] = ["All", "Open", "In Progress", "Overdue", "Completed"];

export default function MaintenanceStatusClient() {
  const [propertyFilter, setPropertyFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [useSampleData] = useState(true);

  const filtered = useMemo(() => {
    return SAMPLE_DATA.filter((wo) => {
      if (propertyFilter !== "All" && wo.property !== propertyFilter) return false;
      if (priorityFilter !== "All" && wo.priority !== priorityFilter) return false;
      if (statusFilter !== "All" && wo.status !== statusFilter) return false;
      return true;
    });
  }, [propertyFilter, priorityFilter, statusFilter]);

  const openCount = SAMPLE_DATA.filter((wo) => wo.status === "Open").length;
  const overdueCount = SAMPLE_DATA.filter((wo) => wo.status === "Overdue").length;
  const awaitingVendor = SAMPLE_DATA.filter((wo) => wo.status === "Open" || wo.status === "In Progress").length;
  const completedCount = SAMPLE_DATA.filter((wo) => wo.status === "Completed").length;

  const priorityBadge = (priority: Priority) => {
    const colors: Record<Priority, { bg: string; color: string }> = {
      Low: { bg: "#f0fdf4", color: "#16a34a" },
      Medium: { bg: "#fef9c3", color: "#ca8a04" },
      High: { bg: "#fee2e2", color: "#dc2626" },
      Emergency: { bg: "#dc2626", color: "#ffffff" },
    };
    const c = colors[priority];
    return (
      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color }}>
        {priority}
      </span>
    );
  };

  const statusBadge = (status: WOStatus) => {
    const colors: Record<WOStatus, { bg: string; color: string }> = {
      Open: { bg: "#dbeafe", color: "#1d4ed8" },
      "In Progress": { bg: "#fef9c3", color: "#ca8a04" },
      Overdue: { bg: "#fee2e2", color: "#dc2626" },
      Completed: { bg: "#dcfce7", color: "#16a34a" },
    };
    const c = colors[status];
    return (
      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color }}>
        {status}
      </span>
    );
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Maintenance Status Summary", pw / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString()}`, pw / 2, y, { align: "center" });
    y += 14;

    // Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Overview", 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Open Work Orders: ${openCount}  |  Overdue: ${overdueCount}  |  Awaiting Vendor: ${awaitingVendor}  |  Completed This Month: ${completedCount}`, 25, y);
    y += 12;

    // Table header
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const cols = [20, 45, 85, 105, 155, 185, 215, 245, 265];
    const headers = ["WO #", "Property", "Unit", "Issue", "Priority", "Vendor", "Status", "Days"];
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(20, y, pw - 20, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    filtered.forEach((wo) => {
      if (y > 190) { doc.addPage(); y = 20; }
      const row = [
        wo.id,
        wo.property.substring(0, 18),
        wo.unit,
        wo.issue.substring(0, 28),
        wo.priority,
        wo.vendorAssigned.substring(0, 16),
        wo.status,
        String(wo.daysOpen),
      ];
      row.forEach((val, i) => doc.text(val, cols[i], y));
      y += 6;
    });

    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleDateString()} - RealEstateGenie`, pw / 2, footerY, { align: "center" });

    doc.save("Maintenance_Status_Summary.pdf");
  };

  const cardStyle: React.CSSProperties = {
    padding: 20,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    textAlign: "center" as const,
  };

  return (
    <div>
      {/* Integration Notice */}
      {useSampleData && (
        <div style={{ padding: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ fontSize: 14 }}>Sample Data</strong>
            <span style={{ fontSize: 13, opacity: 0.8, marginLeft: 8 }}>Connect GHL to pull real maintenance work orders from your properties.</span>
          </div>
          <Link href="/app/integrations" style={{ padding: "6px 14px", background: "#f59e0b", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Connect Integration
          </Link>
        </div>
      )}

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, borderTop: "3px solid #3b82f6" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Open Work Orders</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{openCount}</div>
        </div>
        <div style={{ ...cardStyle, borderTop: "3px solid #dc2626" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Overdue</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#dc2626" }}>{overdueCount}</div>
        </div>
        <div style={{ ...cardStyle, borderTop: "3px solid #f59e0b" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Awaiting Vendor</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#ca8a04" }}>{awaitingVendor}</div>
        </div>
        <div style={{ ...cardStyle, borderTop: "3px solid #16a34a" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Completed This Month</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#16a34a" }}>{completedCount}</div>
        </div>
      </div>

      {/* Filters + Export */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>Property:</span>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            style={{ padding: "6px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", cursor: "pointer" }}
          >
            {PROPERTIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>Priority:</span>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                border: priorityFilter === p ? "2px solid #3b82f6" : "1px solid #d1d5db",
                borderRadius: 8,
                background: priorityFilter === p ? "#dbeafe" : "#fff",
                color: priorityFilter === p ? "#1d4ed8" : "#374151",
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "6px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", cursor: "pointer" }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={exportToPDF}
          style={{ padding: "8px 20px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13 }}
        >
          Export PDF
        </button>
      </div>

      {/* Work Orders Table */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                {["WO #", "Property", "Unit", "Issue", "Priority", "Vendor Assigned", "Status", "Days Open"].map((h) => (
                  <th key={h} style={{ padding: "12px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((wo) => (
                <tr
                  key={wo.id}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    background: wo.status === "Overdue" ? "#fff5f5" : "transparent",
                  }}
                >
                  <td style={{ padding: "10px 12px", fontWeight: 600, fontFamily: "monospace", fontSize: 12 }}>{wo.id}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{wo.property}</td>
                  <td style={{ padding: "10px 12px" }}>{wo.unit}</td>
                  <td style={{ padding: "10px 12px", maxWidth: 200 }}>{wo.issue}</td>
                  <td style={{ padding: "10px 12px" }}>{priorityBadge(wo.priority)}</td>
                  <td style={{ padding: "10px 12px" }}>{wo.vendorAssigned}</td>
                  <td style={{ padding: "10px 12px" }}>{statusBadge(wo.status)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: wo.daysOpen > 7 ? 700 : 400, color: wo.daysOpen > 7 ? "#dc2626" : "#374151" }}>
                    {wo.daysOpen}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          No work orders match the current filters.
        </div>
      )}
    </div>
  );
}
