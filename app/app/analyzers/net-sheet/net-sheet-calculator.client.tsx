"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import AttachToContact from "@/components/attach-to-contact";
import MLSImport, { type MLSPropertyData } from "@/components/mls-import";
import {
  calculateNetSheet,
  DEFAULT_CLOSING_COST_ITEMS,
  type NetSheetInput,
  type ClosingCostLineItem,
} from "@/lib/calculators/netsheet";

export default function NetSheetCalculatorClient() {
  const [inputs, setInputs] = useState<NetSheetInput>({
    salePrice: 500000,
    mortgagePayoff: 280000,
    commissionMode: "total",
    totalCommissionPercent: 5,
    listingAgentPercent: 2.5,
    buyerAgentPercent: 2.5,
    closingCostMode: "percent",
    closingCostPercent: 2,
    closingCostItems: DEFAULT_CLOSING_COST_ITEMS.map((item) => ({ ...item })),
    repairsCredits: 0,
    sellerConcessions: 0,
    additionalPayoffs: 0,
  });

  const analysis = useMemo(() => calculateNetSheet(inputs), [inputs]);

  const handleChange = (field: keyof NetSheetInput, value: number | string | boolean) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleMLSImport = (p: MLSPropertyData) => {
    setInputs((prev) => ({ ...prev, salePrice: p.listPrice }));
  };

  const handleClosingCostItemChange = (index: number, field: "label" | "amount", value: string | number) => {
    setInputs((prev) => {
      const items = [...prev.closingCostItems];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, closingCostItems: items };
    });
  };

  const addClosingCostItem = () => {
    setInputs((prev) => ({
      ...prev,
      closingCostItems: [...prev.closingCostItems, { label: "", amount: 0 }],
    }));
  };

  const removeClosingCostItem = (index: number) => {
    setInputs((prev) => ({
      ...prev,
      closingCostItems: prev.closingCostItems.filter((_, i) => i !== index),
    }));
  };

  // Format currency
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const fmtDecimal = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const summaryData: (string | number)[][] = [
      ["SELLER NET SHEET SUMMARY"],
      [],
      ["SALE DETAILS"],
      ["Sale Price", analysis.salePrice],
      [],
      ["DEDUCTIONS"],
      ["Listing Agent Commission", analysis.listingAgentCommission],
      ["Buyer Agent Commission", analysis.buyerAgentCommission],
      ["Total Commission", analysis.totalCommission],
      [],
      ["CLOSING COSTS"],
    ];

    analysis.closingCostBreakdown.forEach((item) => {
      summaryData.push([item.label, item.amount]);
    });
    summaryData.push(["Total Closing Costs", analysis.totalClosingCosts]);

    summaryData.push([]);
    summaryData.push(["OTHER DEDUCTIONS"]);
    summaryData.push(["Mortgage Payoff", analysis.mortgagePayoff]);
    summaryData.push(["Repairs / Credits", analysis.repairsCredits]);
    summaryData.push(["Seller Concessions", analysis.sellerConcessions]);
    summaryData.push(["Additional Payoffs (HELOCs, liens)", analysis.additionalPayoffs]);
    summaryData.push([]);
    summaryData.push(["TOTAL DEDUCTIONS", analysis.totalDeductions]);
    summaryData.push([]);
    summaryData.push(["ESTIMATED SELLER PROCEEDS", analysis.estimatedProceeds]);
    summaryData.push(["Proceeds as % of Sale Price", `${analysis.proceedsPercent.toFixed(1)}%`]);

    const sheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, sheet, "Net Sheet");

    XLSX.writeFile(wb, `Seller_Net_Sheet_${inputs.salePrice}.xlsx`);
  };

  // Build Excel workbook as Blob (for attach-to-contact)
  const buildExcelBlob = useCallback((): Blob => {
    const wb = XLSX.utils.book_new();
    const summaryData: (string | number)[][] = [
      ["SELLER NET SHEET SUMMARY"], [],
      ["SALE DETAILS"], ["Sale Price", analysis.salePrice], [],
      ["DEDUCTIONS"],
      ["Listing Agent Commission", analysis.listingAgentCommission],
      ["Buyer Agent Commission", analysis.buyerAgentCommission],
      ["Total Commission", analysis.totalCommission], [],
      ["CLOSING COSTS"],
    ];
    analysis.closingCostBreakdown.forEach((item) => summaryData.push([item.label, item.amount]));
    summaryData.push(["Total Closing Costs", analysis.totalClosingCosts], [],
      ["OTHER DEDUCTIONS"], ["Mortgage Payoff", analysis.mortgagePayoff],
      ["Repairs / Credits", analysis.repairsCredits], ["Seller Concessions", analysis.sellerConcessions],
      ["Additional Payoffs", analysis.additionalPayoffs], [],
      ["TOTAL DEDUCTIONS", analysis.totalDeductions], [],
      ["ESTIMATED SELLER PROCEEDS", analysis.estimatedProceeds],
      ["Proceeds as % of Sale Price", `${analysis.proceedsPercent.toFixed(1)}%`]);
    const sheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, sheet, "Net Sheet");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }, [analysis]);

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Seller Net Sheet", pageWidth / 2, y, { align: "center" });
    y += 12;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: "center" });
    y += 16;

    // Sale Price
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Sale Price", 20, y);
    doc.text(fmt(analysis.salePrice), pageWidth - 20, y, { align: "right" });
    y += 10;

    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    // Commissions
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Commissions", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const commItems = [
      ["Listing Agent Commission", fmt(analysis.listingAgentCommission)],
      ["Buyer Agent Commission", fmt(analysis.buyerAgentCommission)],
    ];
    commItems.forEach(([label, value]) => {
      doc.text(label, 25, y);
      doc.text(value, pageWidth - 25, y, { align: "right" });
      y += 6;
    });
    doc.setFont("helvetica", "bold");
    doc.text("Total Commission", 25, y);
    doc.text(fmt(analysis.totalCommission), pageWidth - 25, y, { align: "right" });
    y += 10;

    // Closing Costs
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Closing Costs", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    analysis.closingCostBreakdown.forEach((item) => {
      doc.text(item.label, 25, y);
      doc.text(fmt(item.amount), pageWidth - 25, y, { align: "right" });
      y += 6;
    });
    doc.setFont("helvetica", "bold");
    doc.text("Total Closing Costs", 25, y);
    doc.text(fmt(analysis.totalClosingCosts), pageWidth - 25, y, { align: "right" });
    y += 10;

    // Other Deductions
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Other Deductions", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const otherItems: [string, string][] = [
      ["Mortgage Payoff", fmt(analysis.mortgagePayoff)],
    ];
    if (analysis.repairsCredits > 0) {
      otherItems.push(["Repairs / Credits", fmt(analysis.repairsCredits)]);
    }
    if (analysis.sellerConcessions > 0) {
      otherItems.push(["Seller Concessions", fmt(analysis.sellerConcessions)]);
    }
    if (analysis.additionalPayoffs > 0) {
      otherItems.push(["Additional Payoffs", fmt(analysis.additionalPayoffs)]);
    }
    otherItems.forEach(([label, value]) => {
      doc.text(label, 25, y);
      doc.text(value, pageWidth - 25, y, { align: "right" });
      y += 6;
    });
    y += 6;

    // Total line
    doc.setLineWidth(1);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Estimated Seller Proceeds", 20, y);
    doc.text(fmt(analysis.estimatedProceeds), pageWidth - 20, y, { align: "right" });
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`(${analysis.proceedsPercent.toFixed(1)}% of sale price)`, pageWidth - 20, y, { align: "right" });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} - RealEstateGenie`,
      pageWidth / 2,
      footerY,
      { align: "center" }
    );

    doc.save(`Seller_Net_Sheet_${inputs.salePrice}.pdf`);
  };

  // Generate file as Blob for attach-to-contact
  const generateFile = useCallback((format: "pdf" | "xlsx"): Blob => {
    if (format === "xlsx") return buildExcelBlob();
    // PDF blob
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;
    doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text("Seller Net Sheet", pageWidth / 2, y, { align: "center" }); y += 12;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: "center" }); y += 16;
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Sale Price", 20, y); doc.text(fmt(analysis.salePrice), pageWidth - 20, y, { align: "right" }); y += 10;
    doc.setLineWidth(0.5); doc.line(20, y, pageWidth - 20, y); y += 10;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    const items: [string, string][] = [
      ["Mortgage Payoff", fmt(analysis.mortgagePayoff)],
      ["Total Commission", fmt(analysis.totalCommission)],
      ["Closing Costs", fmt(analysis.totalClosingCosts)],
    ];
    if (analysis.repairsCredits > 0) items.push(["Repairs / Credits", fmt(analysis.repairsCredits)]);
    if (analysis.sellerConcessions > 0) items.push(["Seller Concessions", fmt(analysis.sellerConcessions)]);
    if (analysis.additionalPayoffs > 0) items.push(["Additional Payoffs", fmt(analysis.additionalPayoffs)]);
    items.forEach(([l, v]) => { doc.text(l, 25, y); doc.text(`-${v}`, pageWidth - 25, y, { align: "right" }); y += 6; });
    y += 6; doc.setLineWidth(1); doc.line(20, y, pageWidth - 20, y); y += 10;
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Estimated Seller Proceeds", 20, y); doc.text(fmt(analysis.estimatedProceeds), pageWidth - 20, y, { align: "right" });
    return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
  }, [analysis, buildExcelBlob, fmt]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 16,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      {/* Input Form */}
      <div>
        <MLSImport onImport={handleMLSImport} />

        {/* Sale Price */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Sale Details</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Sale Price</label>
            <input
              type="number"
              value={inputs.salePrice}
              onChange={(e) => handleChange("salePrice", Number(e.target.value))}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 0 }}>
            <label style={labelStyle}>Mortgage Payoff Balance</label>
            <input
              type="number"
              value={inputs.mortgagePayoff}
              onChange={(e) => handleChange("mortgagePayoff", Number(e.target.value))}
              style={inputStyle}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Remaining balance on existing mortgage(s)
            </div>
          </div>
        </div>

        {/* Commissions */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Commissions</h2>
            <div style={{ display: "flex", gap: 0, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
              <button
                onClick={() => handleChange("commissionMode", "total")}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  background: inputs.commissionMode === "total" ? "#3b82f6" : "transparent",
                  color: inputs.commissionMode === "total" ? "#fff" : "#6b7280",
                  cursor: "pointer",
                }}
              >
                Total %
              </button>
              <button
                onClick={() => handleChange("commissionMode", "split")}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  background: inputs.commissionMode === "split" ? "#3b82f6" : "transparent",
                  color: inputs.commissionMode === "split" ? "#fff" : "#6b7280",
                  cursor: "pointer",
                }}
              >
                Split
              </button>
            </div>
          </div>

          {inputs.commissionMode === "total" ? (
            <div>
              <label style={labelStyle}>Total Commission (%)</label>
              <input
                type="number"
                step="0.25"
                value={inputs.totalCommissionPercent}
                onChange={(e) => handleChange("totalCommissionPercent", Number(e.target.value))}
                style={inputStyle}
              />
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                = {fmt(analysis.totalCommission)} ({fmt(analysis.listingAgentCommission)} each side)
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Listing Agent (%)</label>
                <input
                  type="number"
                  step="0.25"
                  value={inputs.listingAgentPercent}
                  onChange={(e) => handleChange("listingAgentPercent", Number(e.target.value))}
                  style={inputStyle}
                />
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  = {fmt(analysis.listingAgentCommission)}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Buyer Agent (%)</label>
                <input
                  type="number"
                  step="0.25"
                  value={inputs.buyerAgentPercent}
                  onChange={(e) => handleChange("buyerAgentPercent", Number(e.target.value))}
                  style={inputStyle}
                />
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  = {fmt(analysis.buyerAgentCommission)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Closing Costs */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Closing Costs</h2>
            <div style={{ display: "flex", gap: 0, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
              <button
                onClick={() => handleChange("closingCostMode", "percent")}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  background: inputs.closingCostMode === "percent" ? "#3b82f6" : "transparent",
                  color: inputs.closingCostMode === "percent" ? "#fff" : "#6b7280",
                  cursor: "pointer",
                }}
              >
                Percentage
              </button>
              <button
                onClick={() => handleChange("closingCostMode", "itemized")}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  background: inputs.closingCostMode === "itemized" ? "#3b82f6" : "transparent",
                  color: inputs.closingCostMode === "itemized" ? "#fff" : "#6b7280",
                  cursor: "pointer",
                }}
              >
                Itemized
              </button>
            </div>
          </div>

          {inputs.closingCostMode === "percent" ? (
            <div>
              <label style={labelStyle}>Closing Costs (% of Sale Price)</label>
              <input
                type="number"
                step="0.25"
                value={inputs.closingCostPercent}
                onChange={(e) => handleChange("closingCostPercent", Number(e.target.value))}
                style={inputStyle}
              />
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                = {fmt(analysis.totalClosingCosts)}
              </div>
            </div>
          ) : (
            <div>
              {inputs.closingCostItems.map((item, index) => (
                <div
                  key={index}
                  style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}
                >
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => handleClosingCostItemChange(index, "label", e.target.value)}
                    placeholder="Description"
                    style={{ ...inputStyle, flex: 2, fontSize: 14 }}
                  />
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => handleClosingCostItemChange(index, "amount", Number(e.target.value))}
                    placeholder="Amount"
                    style={{ ...inputStyle, flex: 1, fontSize: 14 }}
                  />
                  <button
                    onClick={() => removeClosingCostItem(index)}
                    style={{
                      padding: "8px 12px",
                      background: "#fee2e2",
                      color: "#dc2626",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    X
                  </button>
                </div>
              ))}
              <button
                onClick={addClosingCostItem}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#f3f4f6",
                  border: "1px dashed #d1d5db",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#6b7280",
                  marginTop: 4,
                }}
              >
                + Add Line Item
              </button>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8, textAlign: "right" }}>
                Total: {fmt(analysis.totalClosingCosts)}
              </div>
            </div>
          )}
        </div>

        {/* Repairs / Credits / Concessions */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>
            Repairs, Credits & Other
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Repairs / Credits</label>
            <input
              type="number"
              value={inputs.repairsCredits}
              onChange={(e) => handleChange("repairsCredits", Number(e.target.value))}
              style={inputStyle}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Agreed-upon repairs or buyer credits
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Seller Concessions</label>
            <input
              type="number"
              value={inputs.sellerConcessions}
              onChange={(e) => handleChange("sellerConcessions", Number(e.target.value))}
              style={inputStyle}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Closing cost assistance, home warranty, etc.
            </div>
          </div>

          <div>
            <label style={labelStyle}>Additional Payoffs</label>
            <input
              type="number"
              value={inputs.additionalPayoffs}
              onChange={(e) => handleChange("additionalPayoffs", Number(e.target.value))}
              style={inputStyle}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              HELOCs, liens, judgments, or other payoffs
            </div>
          </div>
        </div>
      </div>

      {/* Results Panel */}
      <div>
        {/* Estimated Proceeds Hero */}
        <div
          style={{
            padding: 24,
            background:
              analysis.estimatedProceeds >= 0
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            borderRadius: 12,
            color: "#fff",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Estimated Cash to Seller</div>
          <div style={{ fontSize: 42, fontWeight: 700 }}>{fmt(analysis.estimatedProceeds)}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>
            {analysis.proceedsPercent.toFixed(1)}% of sale price
          </div>
        </div>

        {/* Deductions Breakdown */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Deductions Breakdown</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>Sale Price</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#059669" }}>
                  {fmt(analysis.salePrice)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>Mortgage Payoff</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                  -{fmt(analysis.mortgagePayoff)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>
                  Total Commission
                  <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>
                    ({inputs.commissionMode === "total"
                      ? `${inputs.totalCommissionPercent}%`
                      : `${inputs.listingAgentPercent}% + ${inputs.buyerAgentPercent}%`})
                  </span>
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                  -{fmt(analysis.totalCommission)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>
                  Closing Costs
                  {inputs.closingCostMode === "percent" && (
                    <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>
                      ({inputs.closingCostPercent}%)
                    </span>
                  )}
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                  -{fmt(analysis.totalClosingCosts)}
                </td>
              </tr>
              {analysis.repairsCredits > 0 && (
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 0" }}>Repairs / Credits</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                    -{fmt(analysis.repairsCredits)}
                  </td>
                </tr>
              )}
              {analysis.sellerConcessions > 0 && (
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 0" }}>Seller Concessions</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                    -{fmt(analysis.sellerConcessions)}
                  </td>
                </tr>
              )}
              {analysis.additionalPayoffs > 0 && (
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 0" }}>Additional Payoffs</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                    -{fmt(analysis.additionalPayoffs)}
                  </td>
                </tr>
              )}
              <tr style={{ background: "#f9fafb" }}>
                <td style={{ padding: "12px 0", fontWeight: 700 }}>Total Deductions</td>
                <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 700, fontSize: 18, color: "#dc2626" }}>
                  -{fmt(analysis.totalDeductions)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Visual Breakdown */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Where the Money Goes</h3>
          <ProceedsBar analysis={analysis} fmt={fmt} />
        </div>

        {/* Itemized Closing Costs (when in itemized mode) */}
        {inputs.closingCostMode === "itemized" && analysis.closingCostBreakdown.length > 0 && (
          <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Closing Cost Details</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {analysis.closingCostBreakdown.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "8px 0", fontSize: 14 }}>{item.label}</td>
                    <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, fontSize: 14 }}>
                      {fmt(item.amount)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#f9fafb" }}>
                  <td style={{ padding: "10px 0", fontWeight: 700 }}>Total</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 700 }}>
                    {fmt(analysis.totalClosingCosts)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Equity in Home</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {fmt(inputs.salePrice - inputs.mortgagePayoff)}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {inputs.salePrice > 0
                ? `${(((inputs.salePrice - inputs.mortgagePayoff) / inputs.salePrice) * 100).toFixed(1)}%`
                : "0%"}{" "}
              equity
            </div>
          </div>
          <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Cost to Sell</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#dc2626" }}>
              {fmt(analysis.totalDeductions - analysis.mortgagePayoff)}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {inputs.salePrice > 0
                ? `${(((analysis.totalDeductions - analysis.mortgagePayoff) / inputs.salePrice) * 100).toFixed(1)}%`
                : "0%"}{" "}
              of sale price
            </div>
          </div>
        </div>

        {/* Export Actions */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={exportToExcel}
            style={{
              flex: "1 1 45%",
              padding: "12px 20px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Export Excel
          </button>
          <button
            onClick={exportToPDF}
            style={{
              flex: "1 1 45%",
              padding: "12px 20px",
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Export PDF
          </button>
        </div>

        {/* Attach to GHL Contact */}
        <div style={{ marginTop: 12 }}>
          <AttachToContact generateFile={generateFile} reportTitle="Seller Net Sheet" />
        </div>
      </div>
    </div>
  );
}

// Visual bar showing how sale proceeds are distributed
function ProceedsBar({
  analysis,
  fmt,
}: {
  analysis: ReturnType<typeof calculateNetSheet>;
  fmt: (n: number) => string;
}) {
  if (analysis.salePrice <= 0) return null;

  const segments: { label: string; value: number; color: string }[] = [];

  if (analysis.mortgagePayoff > 0) {
    segments.push({ label: "Mortgage", value: analysis.mortgagePayoff, color: "#6366f1" });
  }
  if (analysis.totalCommission > 0) {
    segments.push({ label: "Commission", value: analysis.totalCommission, color: "#f59e0b" });
  }
  if (analysis.totalClosingCosts > 0) {
    segments.push({ label: "Closing", value: analysis.totalClosingCosts, color: "#8b5cf6" });
  }
  const otherCosts = analysis.repairsCredits + analysis.sellerConcessions + analysis.additionalPayoffs;
  if (otherCosts > 0) {
    segments.push({ label: "Other", value: otherCosts, color: "#ec4899" });
  }
  if (analysis.estimatedProceeds > 0) {
    segments.push({ label: "Proceeds", value: analysis.estimatedProceeds, color: "#10b981" });
  }

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div>
      {/* Stacked bar */}
      <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 32, marginBottom: 12 }}>
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          if (pct < 1) return null;
          return (
            <div
              key={i}
              style={{
                width: `${pct}%`,
                background: seg.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
              title={`${seg.label}: ${fmt(seg.value)}`}
            >
              {pct > 10 ? `${pct.toFixed(0)}%` : ""}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: seg.color }} />
            <span style={{ color: "#6b7280" }}>{seg.label}:</span>
            <span style={{ fontWeight: 600 }}>{fmt(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
