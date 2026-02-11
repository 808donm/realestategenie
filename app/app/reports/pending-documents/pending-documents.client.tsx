"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

interface PendingDocument {
  id: string;
  propertyAddress: string;
  buyerSeller: string;
  agent: string;
  documentName: string;
  status: "Signed" | "Pending" | "Missing";
  dueDate: string;
}

const SAMPLE_DATA: PendingDocument[] = [
  { id: "D-001", propertyAddress: "1422 Maple Ridge Dr, Austin TX 78745", buyerSeller: "James & Linda Carter (Buyer)", agent: "Sarah Mitchell", documentName: "Purchase Agreement", status: "Signed", dueDate: "2025-01-10" },
  { id: "D-002", propertyAddress: "1422 Maple Ridge Dr, Austin TX 78745", buyerSeller: "James & Linda Carter (Buyer)", agent: "Sarah Mitchell", documentName: "Lead-Based Paint Disclosure", status: "Pending", dueDate: "2025-01-22" },
  { id: "D-003", propertyAddress: "1422 Maple Ridge Dr, Austin TX 78745", buyerSeller: "James & Linda Carter (Buyer)", agent: "Sarah Mitchell", documentName: "Home Inspection Report", status: "Missing", dueDate: "2025-01-15" },
  { id: "D-004", propertyAddress: "305 Oakwood Blvd, Round Rock TX 78664", buyerSeller: "Maria Gonzalez (Seller)", agent: "David Park", documentName: "Seller Disclosure Notice", status: "Signed", dueDate: "2025-01-08" },
  { id: "D-005", propertyAddress: "305 Oakwood Blvd, Round Rock TX 78664", buyerSeller: "Maria Gonzalez (Seller)", agent: "David Park", documentName: "Survey", status: "Pending", dueDate: "2025-01-25" },
  { id: "D-006", propertyAddress: "305 Oakwood Blvd, Round Rock TX 78664", buyerSeller: "Maria Gonzalez (Seller)", agent: "David Park", documentName: "Title Commitment", status: "Missing", dueDate: "2025-01-12" },
  { id: "D-007", propertyAddress: "789 Elm Crest Ln, Cedar Park TX 78613", buyerSeller: "Robert & Anne Nguyen (Buyer)", agent: "Sarah Mitchell", documentName: "Loan Pre-Approval Letter", status: "Signed", dueDate: "2025-01-05" },
  { id: "D-008", propertyAddress: "789 Elm Crest Ln, Cedar Park TX 78613", buyerSeller: "Robert & Anne Nguyen (Buyer)", agent: "Sarah Mitchell", documentName: "Appraisal Report", status: "Pending", dueDate: "2025-01-28" },
  { id: "D-009", propertyAddress: "789 Elm Crest Ln, Cedar Park TX 78613", buyerSeller: "Robert & Anne Nguyen (Buyer)", agent: "Sarah Mitchell", documentName: "HOA Addendum", status: "Missing", dueDate: "2025-01-14" },
  { id: "D-010", propertyAddress: "1050 Pecan Valley Ct, Pflugerville TX 78660", buyerSeller: "Thomas Reeves (Buyer)", agent: "Jessica Adams", documentName: "Earnest Money Receipt", status: "Signed", dueDate: "2025-01-03" },
  { id: "D-011", propertyAddress: "1050 Pecan Valley Ct, Pflugerville TX 78660", buyerSeller: "Thomas Reeves (Buyer)", agent: "Jessica Adams", documentName: "Option Period Extension", status: "Pending", dueDate: "2025-01-20" },
  { id: "D-012", propertyAddress: "1050 Pecan Valley Ct, Pflugerville TX 78660", buyerSeller: "Thomas Reeves (Buyer)", agent: "Jessica Adams", documentName: "Termite Inspection Report", status: "Signed", dueDate: "2025-01-09" },
  { id: "D-013", propertyAddress: "2200 Riverside Dr #4B, Austin TX 78741", buyerSeller: "Samantha Blake (Seller)", agent: "David Park", documentName: "Listing Agreement", status: "Signed", dueDate: "2025-01-02" },
  { id: "D-014", propertyAddress: "2200 Riverside Dr #4B, Austin TX 78741", buyerSeller: "Samantha Blake (Seller)", agent: "David Park", documentName: "MLS Data Sheet", status: "Signed", dueDate: "2025-01-04" },
  { id: "D-015", propertyAddress: "2200 Riverside Dr #4B, Austin TX 78741", buyerSeller: "Samantha Blake (Seller)", agent: "David Park", documentName: "Seller's Property Condition Disclosure", status: "Missing", dueDate: "2025-01-11" },
];

const STATUS_OPTIONS = ["All", "Signed", "Pending", "Missing"] as const;

const AGENTS = ["All", "Sarah Mitchell", "David Park", "Jessica Adams"] as const;

export default function PendingDocumentsClient() {
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [agentFilter, setAgentFilter] = useState<string>("All");
  const [useSampleData] = useState(true);

  const today = new Date("2025-01-18");

  const filtered = useMemo(() => {
    return SAMPLE_DATA.filter((d) => {
      if (statusFilter !== "All" && d.status !== statusFilter) return false;
      if (agentFilter !== "All" && d.agent !== agentFilter) return false;
      return true;
    });
  }, [statusFilter, agentFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, PendingDocument[]> = {};
    filtered.forEach((d) => {
      if (!groups[d.propertyAddress]) groups[d.propertyAddress] = [];
      groups[d.propertyAddress].push(d);
    });
    return groups;
  }, [filtered]);

  const totalDocs = SAMPLE_DATA.length;
  const signedCount = SAMPLE_DATA.filter((d) => d.status === "Signed").length;
  const pendingCount = SAMPLE_DATA.filter((d) => d.status === "Pending").length;
  const missingCount = SAMPLE_DATA.filter((d) => d.status === "Missing").length;

  const isOverdue = (doc: PendingDocument) => {
    if (doc.status === "Signed") return false;
    return new Date(doc.dueDate) < today;
  };

  const overdueCount = SAMPLE_DATA.filter((d) => isOverdue(d)).length;

  const statusBadge = (status: PendingDocument["status"]) => {
    const colors: Record<string, { bg: string; color: string }> = {
      Signed: { bg: "#dcfce7", color: "#16a34a" },
      Pending: { bg: "#fef9c3", color: "#ca8a04" },
      Missing: { bg: "#fee2e2", color: "#dc2626" },
    };
    const c = colors[status];
    return (
      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color }}>
        {status}
      </span>
    );
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Pending Document Checklist", pw / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString()}`, pw / 2, y, { align: "center" });
    y += 14;

    // Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Documents: ${totalDocs}`, 25, y); y += 6;
    doc.text(`Signed/Complete: ${signedCount}`, 25, y); y += 6;
    doc.text(`Pending: ${pendingCount}`, 25, y); y += 6;
    doc.text(`Missing/Overdue: ${missingCount} (${overdueCount} overdue)`, 25, y); y += 12;

    // Group by property
    Object.entries(grouped).forEach(([address, docs]) => {
      if (y > 250) { doc.addPage(); y = 20; }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(address, 20, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`${docs[0].buyerSeller} | Agent: ${docs[0].agent}`, 25, y);
      y += 8;

      // Table header
      doc.setFont("helvetica", "bold");
      doc.text("Document", 25, y);
      doc.text("Status", 120, y);
      doc.text("Due Date", 155, y);
      y += 2;
      doc.setLineWidth(0.3);
      doc.line(25, y, pw - 20, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      docs.forEach((d) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const overdue = isOverdue(d);
        doc.text(d.documentName, 25, y);
        doc.text(overdue ? `${d.status} (OVERDUE)` : d.status, 120, y);
        doc.text(d.dueDate, 155, y);
        y += 6;
      });
      y += 6;
    });

    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleDateString()} - RealEstateGenie`, pw / 2, footerY, { align: "center" });

    doc.save("Pending_Document_Checklist.pdf");
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
            <span style={{ fontSize: 13, opacity: 0.8, marginLeft: 8 }}>Connect GHL to pull real document tracking from your pipeline.</span>
          </div>
          <Link href="/app/integrations" style={{ padding: "6px 14px", background: "#f59e0b", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Connect Integration
          </Link>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, borderTop: "3px solid #3b82f6" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Total Documents</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totalDocs}</div>
        </div>
        <div style={{ ...cardStyle, borderTop: "3px solid #16a34a" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Signed / Complete</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#16a34a" }}>{signedCount}</div>
        </div>
        <div style={{ ...cardStyle, borderTop: "3px solid #ca8a04" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Pending</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#ca8a04" }}>{pendingCount}</div>
        </div>
        <div style={{ ...cardStyle, borderTop: "3px solid #dc2626" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Missing / Overdue</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#dc2626" }}>{missingCount}</div>
          <div style={{ fontSize: 11, color: "#dc2626" }}>{overdueCount} overdue</div>
        </div>
      </div>

      {/* Filters + Export */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>Status:</span>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                border: statusFilter === s ? "2px solid #3b82f6" : "1px solid #d1d5db",
                borderRadius: 8,
                background: statusFilter === s ? "#dbeafe" : "#fff",
                color: statusFilter === s ? "#1d4ed8" : "#374151",
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>Agent:</span>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              border: "1px solid #d1d5db",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {AGENTS.map((a) => (
              <option key={a} value={a}>{a}</option>
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

      {/* Grouped Table */}
      {Object.entries(grouped).map(([address, docs]) => (
        <div key={address} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20, overflow: "hidden" }}>
          {/* Group Header */}
          <div style={{ padding: "14px 20px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{address}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {docs[0].buyerSeller} &middot; Agent: {docs[0].agent}
            </div>
          </div>
          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Document Name</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Status</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const overdue = isOverdue(d);
                return (
                  <tr
                    key={d.id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      background: overdue ? "#fff5f5" : "transparent",
                    }}
                  >
                    <td style={{ padding: "10px 16px", fontWeight: 500 }}>
                      {d.documentName}
                      {overdue && (
                        <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fee2e2", padding: "2px 6px", borderRadius: 4 }}>
                          OVERDUE
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "center" }}>
                      {statusBadge(d.status)}
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: overdue ? "#dc2626" : "#374151", fontWeight: overdue ? 700 : 400 }}>
                      {d.dueDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          No documents match the current filters.
        </div>
      )}
    </div>
  );
}
