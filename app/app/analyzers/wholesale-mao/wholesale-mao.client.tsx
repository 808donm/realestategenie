"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import AttachToContact from "@/components/attach-to-contact";
import { calculateWholesaleMao, type WholesaleMaoInput } from "@/lib/calculators/wholesalemao";

export default function WholesaleMaoClient() {
  const [inputs, setInputs] = useState<WholesaleMaoInput>({
    arv: 300000,
    repairEstimate: 40000,
    investorMarginPercent: 25,
    assignmentFee: 10000,
  });

  const analysis = useMemo(() => calculateWholesaleMao(inputs), [inputs]);

  const handleChange = (field: keyof WholesaleMaoInput, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const data: (string | number)[][] = [
      ["WHOLESALE MAO CALCULATOR"],
      [],
      ["INPUTS"],
      ["After Repair Value (ARV)", inputs.arv],
      ["Repair Estimate", inputs.repairEstimate],
      ["Investor Margin %", `${inputs.investorMarginPercent}%`],
      ["Assignment Fee", inputs.assignmentFee],
      [],
      ["RESULTS"],
      ["MAO (Max Allowable Offer)", analysis.mao],
      [],
      ["OFFER RANGE"],
      ["Aggressive (Low)", analysis.lowOffer],
      ["Target (Mid)", analysis.midOffer],
      ["Stretch (High)", analysis.highOffer],
      [],
      ["70% RULE CHECK"],
      ["MAO (70% Rule)", analysis.mao70Rule],
      ["Meets 70% Rule?", analysis.meets70Rule ? "YES" : "NO"],
      [],
      ["INVESTOR NUMBERS AT MAO"],
      ["Investor All-In Cost", analysis.investorAllIn],
      ["Investor Profit", analysis.investorProfit],
      ["Investor ROI", `${analysis.investorROI.toFixed(1)}%`],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, sheet, "Wholesale MAO");
    XLSX.writeFile(wb, `Wholesale_MAO_${inputs.arv}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Wholesale MAO Analysis", pw / 2, y, { align: "center" });
    y += 12;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString()}`, pw / 2, y, { align: "center" });
    y += 16;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Deal Inputs", 20, y); y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    [
      ["ARV:", fmt(inputs.arv)],
      ["Repair Estimate:", fmt(inputs.repairEstimate)],
      ["Investor Margin:", `${inputs.investorMarginPercent}% (${fmt(analysis.investorMargin)})`],
      ["Assignment Fee:", fmt(inputs.assignmentFee)],
    ].forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 6; });
    y += 8;

    doc.setLineWidth(1);
    doc.line(20, y, pw - 20, y);
    y += 10;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Maximum Allowable Offer", 20, y);
    doc.text(fmt(analysis.mao), pw - 20, y, { align: "right" });
    y += 12;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Offer Range", 20, y); y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    [
      ["Aggressive:", fmt(analysis.lowOffer)],
      ["Target:", fmt(analysis.midOffer)],
      ["Stretch:", fmt(analysis.highOffer)],
    ].forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 6; });

    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleDateString()} - RealEstateGenie`, pw / 2, footerY, { align: "center" });
    doc.save(`Wholesale_MAO_${inputs.arv}.pdf`);
  };

  const generateFile = useCallback((format: "pdf" | "xlsx"): Blob => {
    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      const data: (string | number)[][] = [
        ["WHOLESALE MAO"], [],
        ["ARV", inputs.arv], ["Repairs", inputs.repairEstimate],
        ["Investor Margin", `${inputs.investorMarginPercent}%`],
        ["Assignment Fee", inputs.assignmentFee], ["MAO", analysis.mao],
        ["Low Offer", analysis.lowOffer], ["Target", analysis.midOffer], ["High Offer", analysis.highOffer],
      ];
      const sheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, sheet, "Wholesale MAO");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("Wholesale MAO Analysis", pw / 2, y, { align: "center" }); y += 14;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    [["ARV:", fmt(inputs.arv)], ["Repairs:", fmt(inputs.repairEstimate)],
     ["MAO:", fmt(analysis.mao)], ["Offer Range:", `${fmt(analysis.lowOffer)} - ${fmt(analysis.highOffer)}`]
    ].forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 7; });
    return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
  }, [inputs, analysis, fmt]);

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      {/* Inputs */}
      <div>
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Deal Inputs</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>After Repair Value (ARV)</label>
            <input type="number" value={inputs.arv} onChange={(e) => handleChange("arv", Number(e.target.value))} style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Repair Estimate</label>
            <input type="number" value={inputs.repairEstimate} onChange={(e) => handleChange("repairEstimate", Number(e.target.value))} style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Desired Investor Margin (%)</label>
            <input type="number" step="1" value={inputs.investorMarginPercent} onChange={(e) => handleChange("investorMarginPercent", Number(e.target.value))} style={inputStyle} />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              = {fmt(analysis.investorMargin)} profit for the investor
            </div>
          </div>

          <div>
            <label style={labelStyle}>Assignment Fee</label>
            <input type="number" value={inputs.assignmentFee} onChange={(e) => handleChange("assignmentFee", Number(e.target.value))} style={inputStyle} />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Your wholesale fee</div>
          </div>
        </div>

        {/* Formula Explanation */}
        <div style={{ padding: 20, background: "#f9fafb", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>How MAO is Calculated</h3>
          <div style={{ fontSize: 13, fontFamily: "monospace", lineHeight: 1.8, color: "#374151" }}>
            <div>MAO = ARV - Repairs - Investor Margin - Assignment Fee</div>
            <div style={{ color: "#6b7280", marginTop: 8 }}>
              MAO = {fmt(inputs.arv)} - {fmt(inputs.repairEstimate)} - {fmt(analysis.investorMargin)} - {fmt(inputs.assignmentFee)}
            </div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>MAO = {fmt(analysis.mao)}</div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        {/* MAO Hero */}
        <div style={{
          padding: 24,
          background: analysis.mao >= 0
            ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          borderRadius: 12,
          color: "#fff",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Maximum Allowable Offer</div>
          <div style={{ fontSize: 42, fontWeight: 700 }}>{fmt(analysis.mao)}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>
            {inputs.arv > 0 ? `${((analysis.mao / inputs.arv) * 100).toFixed(1)}% of ARV` : ""}
          </div>
        </div>

        {/* Offer Range */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Suggested Offer Range</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ padding: 16, background: "#ecfdf5", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#065f46", fontWeight: 600, marginBottom: 4 }}>AGGRESSIVE</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#059669" }}>{fmt(analysis.lowOffer)}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>MAO - 10%</div>
            </div>
            <div style={{ padding: 16, background: "#fef3c7", borderRadius: 8, textAlign: "center", border: "2px solid #f59e0b" }}>
              <div style={{ fontSize: 11, color: "#92400e", fontWeight: 600, marginBottom: 4 }}>TARGET</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#d97706" }}>{fmt(analysis.midOffer)}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>MAO</div>
            </div>
            <div style={{ padding: 16, background: "#fef2f2", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#991b1b", fontWeight: 600, marginBottom: 4 }}>STRETCH</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#dc2626" }}>{fmt(analysis.highOffer)}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>MAO + 5%</div>
            </div>
          </div>
        </div>

        {/* 70% Rule Check */}
        <div style={{
          padding: 20,
          background: analysis.meets70Rule ? "#ecfdf5" : "#fef2f2",
          border: `1px solid ${analysis.meets70Rule ? "#a7f3d0" : "#fecaca"}`,
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 700 }}>
            70% Rule: {analysis.meets70Rule ? "PASS" : "FAIL"}
          </h3>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: "#6b7280" }}>70% Rule MAO:</span>{" "}
            <span style={{ fontWeight: 600 }}>{fmt(analysis.mao70Rule)}</span>
          </div>
          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#6b7280" }}>
            {inputs.arv > 0 ? `${fmt(inputs.arv)} x 70% - ${fmt(inputs.repairEstimate)} = ${fmt(analysis.mao70Rule)}` : ""}
          </p>
        </div>

        {/* Investor Numbers */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Investor Numbers at MAO</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>Purchase (MAO)</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmt(analysis.mao)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>+ Repairs</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmt(inputs.repairEstimate)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>+ Assignment Fee</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmt(inputs.assignmentFee)}</td>
              </tr>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0", fontWeight: 700 }}>Investor All-In</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 700 }}>{fmt(analysis.investorAllIn)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>ARV (Exit Price)</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#059669" }}>{fmt(inputs.arv)}</td>
              </tr>
              <tr style={{ background: "#ecfdf5" }}>
                <td style={{ padding: "10px 0", fontWeight: 700 }}>Investor Profit</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 700, color: "#059669" }}>
                  {fmt(analysis.investorProfit)} ({analysis.investorROI.toFixed(1)}% ROI)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Export */}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={exportToExcel} style={{ flex: 1, padding: "12px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
            Export Excel
          </button>
          <button onClick={exportToPDF} style={{ flex: 1, padding: "12px 20px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
            Export PDF
          </button>
        </div>
        {/* Attach to GHL Contact */}
        <div style={{ marginTop: 12 }}>
          <AttachToContact generateFile={generateFile} reportTitle="Wholesale MAO Analysis" />
        </div>
      </div>
    </div>
  );
}
