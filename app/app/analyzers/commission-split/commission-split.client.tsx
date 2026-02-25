"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import AttachToContact from "@/components/attach-to-contact";
import { calculateCommissionSplit, type CommissionSplitInput } from "@/lib/calculators/commissionsplit";
import MLSImport, { type MLSPropertyData } from "@/components/mls-import";

export default function CommissionSplitClient() {
  const [inputs, setInputs] = useState<CommissionSplitInput>({
    salePrice: 500000,
    commissionPercent: 3,
    agentSplitPercent: 70,
    brokerageCap: 25000,
    capAlreadyPaid: 0,
    transactionFee: 495,
    otherFees: 75,
    teamOverridePercent: 0,
  });

  const analysis = useMemo(() => calculateCommissionSplit(inputs), [inputs]);

  const handleChange = (field: keyof CommissionSplitInput, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleMLSImport = (p: MLSPropertyData) => {
    setInputs((prev) => ({ ...prev, salePrice: p.listPrice }));
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const fmtDecimal = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Common split presets
  const splitPresets = [
    { label: "50/50", value: 50 },
    { label: "60/40", value: 60 },
    { label: "70/30", value: 70 },
    { label: "80/20", value: 80 },
    { label: "90/10", value: 90 },
    { label: "100/0", value: 100 },
  ];

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const data: (string | number)[][] = [
      ["COMMISSION SPLIT CALCULATOR"],
      [],
      ["DEAL DETAILS"],
      ["Sale Price", inputs.salePrice],
      ["Commission %", `${inputs.commissionPercent}%`],
      ["Gross Commission", analysis.grossCommission],
      [],
      ["SPLIT DETAILS"],
      ["Agent Split", `${inputs.agentSplitPercent}/${100 - inputs.agentSplitPercent}`],
      ["Brokerage Share (pre-cap)", analysis.brokerageSharePreCap],
      ["Brokerage Share (after cap)", analysis.brokerageShare],
      ["Cap Applied?", analysis.capApplied ? "Yes" : "No"],
      ["Cap Remaining", analysis.capRemaining],
      [],
      ["AGENT BREAKDOWN"],
      ["Agent Share (pre-override)", analysis.agentSharePreOverride],
      ["Team Override", analysis.teamOverrideAmount],
      ["Agent Gross (after split)", analysis.agentGrossAfterSplit],
      ["Transaction Fee", analysis.transactionFee],
      ["Other Fees", analysis.otherFees],
      [],
      ["RESULTS"],
      ["Agent Net", analysis.agentNet],
      ["Brokerage Gross", analysis.brokerageGross],
      ["Agent Net % of Commission", `${analysis.agentNetPercent.toFixed(1)}%`],
      ["Effective % of Sale Price", `${analysis.effectiveSplitPercent.toFixed(3)}%`],
    ];

    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, sheet, "Commission Split");
    XLSX.writeFile(wb, `Commission_Split_${inputs.salePrice}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Commission Split Summary", pw / 2, y, { align: "center" });
    y += 12;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString()}`, pw / 2, y, { align: "center" });
    y += 16;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Deal Details", 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    [
      ["Sale Price:", fmt(inputs.salePrice)],
      ["Commission:", `${inputs.commissionPercent}% = ${fmt(analysis.grossCommission)}`],
      ["Split:", `${inputs.agentSplitPercent}/${100 - inputs.agentSplitPercent} (Agent/Brokerage)`],
    ].forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 6; });
    y += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Breakdown", 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const rows: [string, string][] = [
      ["Brokerage Share:", fmt(analysis.brokerageShare)],
      ["Agent Share:", fmt(analysis.agentSharePreOverride)],
    ];
    if (analysis.teamOverrideAmount > 0) rows.push(["Team Override:", `-${fmt(analysis.teamOverrideAmount)}`]);
    if (analysis.totalFees > 0) rows.push(["Fees:", `-${fmt(analysis.totalFees)}`]);
    rows.forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 6; });
    y += 4;

    doc.setLineWidth(1);
    doc.line(20, y, pw - 20, y);
    y += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Agent Net:", 20, y);
    doc.text(fmt(analysis.agentNet), pw - 20, y, { align: "right" });
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Brokerage Gross: ${fmt(analysis.brokerageGross)}`, pw - 20, y, { align: "right" });

    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleDateString()} - RealEstateGenie`, pw / 2, footerY, { align: "center" });
    doc.save(`Commission_Split_${inputs.salePrice}.pdf`);
  };

  const generateFile = useCallback((format: "pdf" | "xlsx"): Blob => {
    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      const data: (string | number)[][] = [
        ["COMMISSION SPLIT"], [],
        ["Sale Price", inputs.salePrice], ["Commission %", `${inputs.commissionPercent}%`],
        ["Gross Commission", analysis.grossCommission],
        ["Split", `${inputs.agentSplitPercent}/${100 - inputs.agentSplitPercent}`],
        ["Brokerage Share", analysis.brokerageShare],
        ["Team Override", analysis.teamOverrideAmount],
        ["Fees", analysis.totalFees],
        ["Agent Net", analysis.agentNet], ["Brokerage Gross", analysis.brokerageGross],
      ];
      const sheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, sheet, "Commission Split");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("Commission Split Summary", pw / 2, y, { align: "center" }); y += 14;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    [["Sale Price:", fmt(inputs.salePrice)], ["Gross Commission:", fmt(analysis.grossCommission)],
     ["Agent Net:", fmt(analysis.agentNet)], ["Brokerage Gross:", fmt(analysis.brokerageGross)]
    ].forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 7; });
    return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
  }, [inputs, analysis, fmt]);

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      {/* Inputs */}
      <div>
        <MLSImport onImport={handleMLSImport} />

        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Deal Details</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Sale Price</label>
            <input type="number" value={inputs.salePrice} onChange={(e) => handleChange("salePrice", Number(e.target.value))} style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Commission Rate (%)</label>
            <input type="number" step="0.25" value={inputs.commissionPercent} onChange={(e) => handleChange("commissionPercent", Number(e.target.value))} style={inputStyle} />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Your side only = {fmt(analysis.grossCommission)}
            </div>
          </div>
        </div>

        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Split & Cap</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Agent / Brokerage Split</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {splitPresets.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleChange("agentSplitPercent", p.value)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    border: inputs.agentSplitPercent === p.value ? "2px solid #3b82f6" : "1px solid #d1d5db",
                    borderRadius: 6,
                    background: inputs.agentSplitPercent === p.value ? "#dbeafe" : "#fff",
                    cursor: "pointer",
                    color: inputs.agentSplitPercent === p.value ? "#1d4ed8" : "#374151",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input type="number" value={inputs.agentSplitPercent} onChange={(e) => handleChange("agentSplitPercent", Number(e.target.value))} style={inputStyle} />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Agent gets {inputs.agentSplitPercent}%, brokerage gets {100 - inputs.agentSplitPercent}%
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Brokerage Cap ($)</label>
              <input type="number" value={inputs.brokerageCap} onChange={(e) => handleChange("brokerageCap", Number(e.target.value))} style={inputStyle} />
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>0 = no cap</div>
            </div>
            <div>
              <label style={labelStyle}>Already Paid to Cap ($)</label>
              <input type="number" value={inputs.capAlreadyPaid} onChange={(e) => handleChange("capAlreadyPaid", Number(e.target.value))} style={inputStyle} />
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>YTD toward cap</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Fees & Overrides</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Transaction Fee ($)</label>
              <input type="number" value={inputs.transactionFee} onChange={(e) => handleChange("transactionFee", Number(e.target.value))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Other Fees (E&O, etc.)</label>
              <input type="number" value={inputs.otherFees} onChange={(e) => handleChange("otherFees", Number(e.target.value))} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Team Override (%)</label>
            <input type="number" step="1" value={inputs.teamOverridePercent} onChange={(e) => handleChange("teamOverridePercent", Number(e.target.value))} style={inputStyle} />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              % of agent share that goes to team lead{inputs.teamOverridePercent > 0 ? ` = ${fmt(analysis.teamOverrideAmount)}` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        {/* Agent Net Hero */}
        <div style={{ padding: 24, background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", borderRadius: 12, color: "#fff", marginBottom: 20 }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Agent Net</div>
          <div style={{ fontSize: 42, fontWeight: 700 }}>{fmt(analysis.agentNet)}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>
            {analysis.agentNetPercent.toFixed(1)}% of gross commission &bull; {analysis.effectiveSplitPercent.toFixed(3)}% of sale price
          </div>
        </div>

        {/* Brokerage Gross */}
        <div style={{ padding: 20, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Brokerage Gross</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(analysis.brokerageGross)}</div>
        </div>

        {/* Waterfall Breakdown */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Commission Waterfall</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>Gross Commission</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmtDecimal(analysis.grossCommission)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>
                  Brokerage Share ({100 - inputs.agentSplitPercent}%)
                  {analysis.capApplied && (
                    <span style={{ fontSize: 11, color: "#059669", marginLeft: 6, fontWeight: 600 }}>CAP HIT</span>
                  )}
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                  -{fmtDecimal(analysis.brokerageShare)}
                </td>
              </tr>
              {analysis.teamOverrideAmount > 0 && (
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 0" }}>Team Override ({inputs.teamOverridePercent}%)</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                    -{fmtDecimal(analysis.teamOverrideAmount)}
                  </td>
                </tr>
              )}
              {analysis.totalFees > 0 && (
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 0" }}>
                    Fees
                    <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>
                      ({fmt(inputs.transactionFee)} txn + {fmt(inputs.otherFees)} other)
                    </span>
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                    -{fmtDecimal(analysis.totalFees)}
                  </td>
                </tr>
              )}
              <tr style={{ background: "#dbeafe" }}>
                <td style={{ padding: "12px 0", fontWeight: 700 }}>Agent Net</td>
                <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 700, fontSize: 18, color: "#1d4ed8" }}>
                  {fmtDecimal(analysis.agentNet)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Visual Split Bar */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Split Visualization</h3>
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 32, marginBottom: 12 }}>
            {analysis.grossCommission > 0 && (
              <>
                <div style={{ width: `${(analysis.agentNet / analysis.grossCommission) * 100}%`, background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff" }}>
                  {((analysis.agentNet / analysis.grossCommission) * 100).toFixed(0)}%
                </div>
                <div style={{ width: `${(analysis.brokerageShare / analysis.grossCommission) * 100}%`, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff" }}>
                  {((analysis.brokerageShare / analysis.grossCommission) * 100).toFixed(0)}%
                </div>
                {analysis.totalFees > 0 && (
                  <div style={{ width: `${(analysis.totalFees / analysis.grossCommission) * 100}%`, background: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff" }} />
                )}
                {analysis.teamOverrideAmount > 0 && (
                  <div style={{ width: `${(analysis.teamOverrideAmount / analysis.grossCommission) * 100}%`, background: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff" }} />
                )}
              </>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "#3b82f6" }} />
              Agent: {fmt(analysis.agentNet)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b" }} />
              Brokerage: {fmt(analysis.brokerageShare)}
            </div>
            {analysis.totalFees > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "#6b7280" }} />
                Fees: {fmt(analysis.totalFees)}
              </div>
            )}
            {analysis.teamOverrideAmount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "#8b5cf6" }} />
                Team: {fmt(analysis.teamOverrideAmount)}
              </div>
            )}
          </div>
        </div>

        {/* Cap Status */}
        {inputs.brokerageCap > 0 && (
          <div style={{ padding: 20, background: analysis.capApplied ? "#ecfdf5" : "#fff", border: `1px solid ${analysis.capApplied ? "#a7f3d0" : "#e5e7eb"}`, borderRadius: 12, marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 700 }}>
              Cap Status {analysis.capApplied && <span style={{ color: "#059669" }}> - Cap Hit!</span>}
            </h3>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>Paid toward cap:</span>
              <span style={{ fontWeight: 600 }}>{fmt(inputs.capAlreadyPaid + analysis.brokerageShare)} / {fmt(inputs.brokerageCap)}</span>
            </div>
            <div style={{ marginTop: 8, height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, ((inputs.capAlreadyPaid + analysis.brokerageShare) / inputs.brokerageCap) * 100)}%`,
                background: analysis.capApplied ? "#10b981" : "#3b82f6",
                borderRadius: 4,
              }} />
            </div>
            {analysis.capRemaining > 0 && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                {fmt(analysis.capRemaining)} remaining until cap
              </div>
            )}
          </div>
        )}

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
          <AttachToContact generateFile={generateFile} reportTitle="Commission Split" />
        </div>
      </div>
    </div>
  );
}
