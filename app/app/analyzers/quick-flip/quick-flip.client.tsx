"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import AttachToContact from "@/components/attach-to-contact";
import { calculateQuickFlip, type QuickFlipInput } from "@/lib/calculators/quickflip";

export default function QuickFlipClient() {
  const [inputs, setInputs] = useState<QuickFlipInput>({
    arv: 350000,
    purchasePrice: 200000,
    rehabCost: 50000,
    holdingCosts: 8000,
    sellingCosts: 21000,
    financingCosts: 6000,
  });

  const analysis = useMemo(() => calculateQuickFlip(inputs), [inputs]);

  const handleChange = (field: keyof QuickFlipInput, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const scoreColors = ["#dc2626", "#f97316", "#eab308", "#22c55e", "#059669"];
  const scoreLabels = ["Poor", "Marginal", "Decent", "Good", "Excellent"];

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const data: (string | number)[][] = [
      ["QUICK FLIP DEAL ANALYSIS"],
      [],
      ["INPUTS"],
      ["After Repair Value (ARV)", inputs.arv],
      ["Purchase Price", inputs.purchasePrice],
      ["Rehab Cost", inputs.rehabCost],
      ["Holding Costs", inputs.holdingCosts],
      ["Selling Costs", inputs.sellingCosts],
      ["Financing Costs", inputs.financingCosts],
      [],
      ["RESULTS"],
      ["Total Investment", analysis.totalInvestment],
      ["Gross Profit", analysis.grossProfit],
      ["Net Profit", analysis.netProfit],
      ["ROI", `${analysis.roi.toFixed(1)}%`],
      ["Profit Margin", `${analysis.profitMargin.toFixed(1)}%`],
      [],
      ["70% RULE"],
      ["MAO (70% Rule)", analysis.mao70],
      ["Meets 70% Rule?", analysis.meetsRule70 ? "YES" : "NO"],
      ["Spread", analysis.rule70Spread],
      [],
      ["VERDICT"],
      ["Deal Score", `${analysis.dealScore}/5`],
      ["Assessment", analysis.verdict],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, sheet, "Quick Flip");
    XLSX.writeFile(wb, `Quick_Flip_Analysis_${inputs.arv}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Quick Flip Deal Analysis", pw / 2, y, { align: "center" });
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
      ["Purchase Price:", fmt(inputs.purchasePrice)],
      ["Rehab:", fmt(inputs.rehabCost)],
      ["Holding Costs:", fmt(inputs.holdingCosts)],
      ["Selling Costs:", fmt(inputs.sellingCosts)],
      ["Financing Costs:", fmt(inputs.financingCosts)],
    ].forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 6; });
    y += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Results", 20, y); y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    [
      ["Net Profit:", fmt(analysis.netProfit)],
      ["ROI:", `${analysis.roi.toFixed(1)}%`],
      ["MAO (70% Rule):", fmt(analysis.mao70)],
      ["Verdict:", `${analysis.dealScore}/5 - ${analysis.verdict}`],
    ].forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 6; });

    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleDateString()} - RealEstateGenie`, pw / 2, footerY, { align: "center" });
    doc.save(`Quick_Flip_Analysis_${inputs.arv}.pdf`);
  };

  const generateFile = useCallback((format: "pdf" | "xlsx"): Blob => {
    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      const data: (string | number)[][] = [
        ["QUICK FLIP ANALYSIS"], [],
        ["ARV", inputs.arv], ["Purchase Price", inputs.purchasePrice], ["Rehab", inputs.rehabCost],
        ["Total Investment", analysis.totalInvestment], ["Net Profit", analysis.netProfit],
        ["ROI", `${analysis.roi.toFixed(1)}%`], ["MAO (70%)", analysis.mao70],
        ["Deal Score", `${analysis.dealScore}/5 - ${analysis.verdict}`],
      ];
      const sheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, sheet, "Quick Flip");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("Quick Flip Deal Analysis", pw / 2, y, { align: "center" }); y += 14;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    [["ARV:", fmt(inputs.arv)], ["Purchase:", fmt(inputs.purchasePrice)], ["Net Profit:", fmt(analysis.netProfit)],
     ["ROI:", `${analysis.roi.toFixed(1)}%`], ["MAO (70%):", fmt(analysis.mao70)],
     ["Verdict:", `${analysis.dealScore}/5 - ${analysis.verdict}`]
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
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Deal Numbers</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>After Repair Value (ARV)</label>
            <input type="number" value={inputs.arv} onChange={(e) => handleChange("arv", Number(e.target.value))} style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Purchase Price</label>
            <input type="number" value={inputs.purchasePrice} onChange={(e) => handleChange("purchasePrice", Number(e.target.value))} style={inputStyle} />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              {inputs.arv > 0 ? `${((inputs.purchasePrice / inputs.arv) * 100).toFixed(1)}% of ARV` : ""}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Rehab / Renovation Cost</label>
            <input type="number" value={inputs.rehabCost} onChange={(e) => handleChange("rehabCost", Number(e.target.value))} style={inputStyle} />
          </div>
        </div>

        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Costs</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Holding Costs</label>
            <input type="number" value={inputs.holdingCosts} onChange={(e) => handleChange("holdingCosts", Number(e.target.value))} style={inputStyle} />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Taxes, insurance, utilities, etc. during hold</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Selling Costs</label>
            <input type="number" value={inputs.sellingCosts} onChange={(e) => handleChange("sellingCosts", Number(e.target.value))} style={inputStyle} />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Agent commissions, closing costs, transfer tax</div>
          </div>

          <div>
            <label style={labelStyle}>Financing Costs</label>
            <input type="number" value={inputs.financingCosts} onChange={(e) => handleChange("financingCosts", Number(e.target.value))} style={inputStyle} />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Points, interest, loan origination fees</div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        {/* Net Profit Hero */}
        <div style={{
          padding: 24,
          background: analysis.netProfit >= 0
            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
            : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          borderRadius: 12,
          color: "#fff",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Net Profit</div>
          <div style={{ fontSize: 42, fontWeight: 700 }}>{fmt(analysis.netProfit)}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>
            {analysis.roi.toFixed(1)}% ROI &bull; {analysis.profitMargin.toFixed(1)}% margin
          </div>
        </div>

        {/* Deal Score */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>Deal Score</h3>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  background: s <= analysis.dealScore ? scoreColors[analysis.dealScore - 1] : "#e5e7eb",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: scoreColors[analysis.dealScore - 1] }}>
              {analysis.dealScore}/5 - {scoreLabels[analysis.dealScore - 1]}
            </span>
          </div>
          <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#6b7280" }}>
            {analysis.verdict}
          </p>
        </div>

        {/* 70% Rule */}
        <div style={{
          padding: 20,
          background: analysis.meetsRule70 ? "#ecfdf5" : "#fef2f2",
          border: `1px solid ${analysis.meetsRule70 ? "#a7f3d0" : "#fecaca"}`,
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 700 }}>
            70% Rule: {analysis.meetsRule70 ? "PASS" : "FAIL"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
            <div>
              <div style={{ color: "#6b7280" }}>MAO (70% Rule)</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt(analysis.mao70)}</div>
            </div>
            <div>
              <div style={{ color: "#6b7280" }}>Spread</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: analysis.rule70Spread >= 0 ? "#059669" : "#dc2626" }}>
                {analysis.rule70Spread >= 0 ? "+" : ""}{fmt(analysis.rule70Spread)}
              </div>
            </div>
          </div>
          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#6b7280" }}>
            Max Allowable Offer = ARV x 70% - Rehab = {fmt(inputs.arv)} x 0.70 - {fmt(inputs.rehabCost)}
          </p>
        </div>

        {/* Breakdown */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Cost Breakdown</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>Purchase Price</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmt(inputs.purchasePrice)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>Rehab</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmt(inputs.rehabCost)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>Holding Costs</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmt(inputs.holdingCosts)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>Selling Costs</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmt(inputs.sellingCosts)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>Financing Costs</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmt(inputs.financingCosts)}</td>
              </tr>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0", fontWeight: 700 }}>Total Investment</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 700 }}>{fmt(analysis.totalInvestment)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>ARV (Sale Price)</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#059669" }}>{fmt(inputs.arv)}</td>
              </tr>
              <tr style={{ background: analysis.netProfit >= 0 ? "#ecfdf5" : "#fef2f2" }}>
                <td style={{ padding: "12px 0", fontWeight: 700 }}>Net Profit</td>
                <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 700, fontSize: 18, color: analysis.netProfit >= 0 ? "#059669" : "#dc2626" }}>
                  {fmt(analysis.netProfit)}
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
          <AttachToContact generateFile={generateFile} reportTitle="Quick Flip Analysis" />
        </div>
      </div>
    </div>
  );
}
