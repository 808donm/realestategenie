"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import AttachToContact from "@/components/attach-to-contact";
import { calculateRental, type RentalInput } from "@/lib/calculators/rental";
import MLSImport, { type MLSPropertyData } from "@/components/mls-import";

export default function RentalCalculatorClient() {
  const [inputs, setInputs] = useState<RentalInput>({
    purchasePrice: 300000,
    downPaymentPercent: 25,
    monthlyRent: 2200,
    vacancyPercent: 5,
    propertyTaxAnnual: 3600,
    insuranceAnnual: 1500,
    hoaMonthly: 0,
    maintenancePercent: 10,
    managementPercent: 0,
    otherExpensesMonthly: 0,
    interestRate: 7,
    loanTermYears: 30,
  });

  const analysis = useMemo(() => calculateRental(inputs), [inputs]);

  const handleChange = (field: keyof RentalInput, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleMLSImport = (p: MLSPropertyData) => {
    setInputs((prev) => ({
      ...prev,
      purchasePrice: p.listPrice,
      propertyTaxAnnual: p.taxAnnual,
      insuranceAnnual: p.insuranceAnnual,
      hoaMonthly: p.associationFee || 0,
    }));
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const fmtDecimal = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const dscrColor = analysis.dscr >= 1.25 ? "#059669" : analysis.dscr >= 1.0 ? "#eab308" : "#dc2626";

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const data: (string | number)[][] = [
      ["RENTAL PROPERTY ANALYSIS"],
      [],
      ["PROPERTY DETAILS"],
      ["Purchase Price", inputs.purchasePrice],
      ["Down Payment", `${inputs.downPaymentPercent}% (${analysis.downPayment})`],
      ["Loan Amount", analysis.loanAmount],
      ["Interest Rate", `${inputs.interestRate}%`],
      ["Loan Term", `${inputs.loanTermYears} years`],
      [],
      ["INCOME"],
      ["Monthly Rent", inputs.monthlyRent],
      ["Vacancy", `${inputs.vacancyPercent}% (-${analysis.vacancyLoss})`],
      ["Effective Gross Income (monthly)", analysis.effectiveGrossIncome],
      ["Effective Gross Income (annual)", analysis.effectiveGrossIncomeAnnual],
      [],
      ["OPERATING EXPENSES (MONTHLY)"],
      ["Property Tax", analysis.propertyTaxMonthly],
      ["Insurance", analysis.insuranceMonthly],
      ["HOA", analysis.hoaMonthly],
      ["Maintenance Reserve", analysis.maintenanceMonthly],
      ["Property Management", analysis.managementMonthly],
      ["Other Expenses", analysis.otherExpensesMonthly],
      ["Total Operating Expenses", analysis.totalOperatingExpensesMonthly],
      [],
      ["KEY METRICS"],
      ["NOI (Annual)", analysis.noi],
      ["Cap Rate", `${analysis.capRate.toFixed(2)}%`],
      ["Monthly Mortgage (P&I)", analysis.monthlyMortgage],
      ["Monthly Cash Flow", analysis.monthlyCashFlow],
      ["Annual Cash Flow", analysis.annualCashFlow],
      ["Cash-on-Cash Return", `${analysis.cashOnCash.toFixed(2)}%`],
      ["DSCR", analysis.dscr.toFixed(2)],
      ["GRM", analysis.grm.toFixed(1)],
      ["Expense Ratio", `${analysis.operatingExpenseRatio.toFixed(1)}%`],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, sheet, "Rental Analysis");
    XLSX.writeFile(wb, `Rental_Analysis_${inputs.purchasePrice}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Rental Property Analysis", pw / 2, y, { align: "center" });
    y += 12;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString()}`, pw / 2, y, { align: "center" });
    y += 16;

    // Property details
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Property Details", 20, y); y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    [
      ["Purchase Price:", fmt(inputs.purchasePrice)],
      ["Down Payment:", `${fmt(analysis.downPayment)} (${inputs.downPaymentPercent}%)`],
      ["Monthly Rent:", fmt(inputs.monthlyRent)],
    ].forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 6; });
    y += 8;

    // Key Metrics
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Key Metrics", 20, y); y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    [
      ["NOI (Annual):", fmt(analysis.noi)],
      ["Cap Rate:", `${analysis.capRate.toFixed(2)}%`],
      ["Monthly Cash Flow:", fmtDecimal(analysis.monthlyCashFlow)],
      ["Cash-on-Cash Return:", `${analysis.cashOnCash.toFixed(2)}%`],
      ["DSCR:", `${analysis.dscr.toFixed(2)} - ${analysis.dscrVerdict}`],
      ["GRM:", analysis.grm.toFixed(1)],
    ].forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 6; });

    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleDateString()} - RealEstateGenie`, pw / 2, footerY, { align: "center" });
    doc.save(`Rental_Analysis_${inputs.purchasePrice}.pdf`);
  };

  const generateFile = useCallback((format: "pdf" | "xlsx"): Blob => {
    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      const data: (string | number)[][] = [
        ["RENTAL ANALYSIS"], [],
        ["Purchase Price", inputs.purchasePrice], ["Monthly Rent", inputs.monthlyRent],
        ["NOI (Annual)", analysis.noi], ["Cap Rate", `${analysis.capRate.toFixed(2)}%`],
        ["Monthly Cash Flow", analysis.monthlyCashFlow],
        ["Cash-on-Cash", `${analysis.cashOnCash.toFixed(2)}%`],
        ["DSCR", analysis.dscr.toFixed(2)],
      ];
      const sheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, sheet, "Rental Analysis");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("Rental Property Analysis", pw / 2, y, { align: "center" }); y += 14;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    [["Purchase Price:", fmt(inputs.purchasePrice)], ["Monthly Rent:", fmt(inputs.monthlyRent)],
     ["NOI:", fmt(analysis.noi)], ["Cap Rate:", `${analysis.capRate.toFixed(2)}%`],
     ["Cash Flow:", fmtDecimal(analysis.monthlyCashFlow)], ["Cash-on-Cash:", `${analysis.cashOnCash.toFixed(2)}%`],
     ["DSCR:", `${analysis.dscr.toFixed(2)} - ${analysis.dscrVerdict}`]
    ].forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 7; });
    return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
  }, [inputs, analysis, fmt, fmtDecimal]);

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      {/* Inputs */}
      <div>
        <MLSImport onImport={handleMLSImport} />

        {/* Property & Financing */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Property & Financing</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Purchase Price</label>
            <input type="number" value={inputs.purchasePrice} onChange={(e) => handleChange("purchasePrice", Number(e.target.value))} style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Down Payment (%)</label>
              <input type="number" step="5" value={inputs.downPaymentPercent} onChange={(e) => handleChange("downPaymentPercent", Number(e.target.value))} style={inputStyle} />
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>= {fmt(analysis.downPayment)}</div>
            </div>
            <div>
              <label style={labelStyle}>Interest Rate (%)</label>
              <input type="number" step="0.125" value={inputs.interestRate} onChange={(e) => handleChange("interestRate", Number(e.target.value))} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Loan Term</label>
            <select value={inputs.loanTermYears} onChange={(e) => handleChange("loanTermYears", Number(e.target.value))} style={inputStyle}>
              <option value={30}>30 years</option>
              <option value={20}>20 years</option>
              <option value={15}>15 years</option>
            </select>
          </div>
        </div>

        {/* Income */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Income</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Monthly Rent</label>
            <input type="number" value={inputs.monthlyRent} onChange={(e) => handleChange("monthlyRent", Number(e.target.value))} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Vacancy Rate (%)</label>
            <input type="number" step="1" value={inputs.vacancyPercent} onChange={(e) => handleChange("vacancyPercent", Number(e.target.value))} style={inputStyle} />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              = -{fmtDecimal(analysis.vacancyLoss)}/mo
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Expenses</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Property Tax (Annual)</label>
              <input type="number" value={inputs.propertyTaxAnnual} onChange={(e) => handleChange("propertyTaxAnnual", Number(e.target.value))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Insurance (Annual)</label>
              <input type="number" value={inputs.insuranceAnnual} onChange={(e) => handleChange("insuranceAnnual", Number(e.target.value))} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>HOA (Monthly)</label>
            <input type="number" value={inputs.hoaMonthly} onChange={(e) => handleChange("hoaMonthly", Number(e.target.value))} style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Maintenance (% of rent)</label>
              <input type="number" step="1" value={inputs.maintenancePercent} onChange={(e) => handleChange("maintenancePercent", Number(e.target.value))} style={inputStyle} />
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>= {fmtDecimal(analysis.maintenanceMonthly)}/mo</div>
            </div>
            <div>
              <label style={labelStyle}>Management (% of rent)</label>
              <input type="number" step="1" value={inputs.managementPercent} onChange={(e) => handleChange("managementPercent", Number(e.target.value))} style={inputStyle} />
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>= {fmtDecimal(analysis.managementMonthly)}/mo</div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Other Monthly Expenses</label>
            <input type="number" value={inputs.otherExpensesMonthly} onChange={(e) => handleChange("otherExpensesMonthly", Number(e.target.value))} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        {/* Cash Flow Hero */}
        <div style={{
          padding: 24,
          background: analysis.monthlyCashFlow >= 0
            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
            : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          borderRadius: 12,
          color: "#fff",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Monthly Cash Flow</div>
          <div style={{ fontSize: 42, fontWeight: 700 }}>{fmtDecimal(analysis.monthlyCashFlow)}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>
            {fmtDecimal(analysis.annualCashFlow)}/year
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>NOI (Annual)</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(analysis.noi)}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{fmtDecimal(analysis.noiMonthly)}/mo</div>
          </div>
          <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Cap Rate</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: analysis.capRate >= 5 ? "#059669" : analysis.capRate >= 3 ? "#eab308" : "#dc2626" }}>
              {analysis.capRate.toFixed(2)}%
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>NOI / Purchase Price</div>
          </div>
          <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Cash-on-Cash Return</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: analysis.cashOnCash >= 8 ? "#059669" : analysis.cashOnCash >= 4 ? "#eab308" : "#dc2626" }}>
              {analysis.cashOnCash.toFixed(2)}%
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Annual CF / Cash Invested</div>
          </div>
          <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>DSCR</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: dscrColor }}>
              {analysis.dscr >= 999 ? "N/A" : analysis.dscr.toFixed(2)}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>NOI / Debt Service</div>
          </div>
        </div>

        {/* DSCR Status */}
        <div style={{
          padding: 16,
          background: analysis.dscr >= 1.25 ? "#ecfdf5" : analysis.dscr >= 1.0 ? "#fefce8" : "#fef2f2",
          border: `1px solid ${analysis.dscr >= 1.25 ? "#a7f3d0" : analysis.dscr >= 1.0 ? "#fef08a" : "#fecaca"}`,
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            DSCR: {analysis.dscr >= 999 ? "No debt" : analysis.dscr.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            {analysis.dscrVerdict}
          </div>
        </div>

        {/* Income / Expense Breakdown */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Monthly Breakdown</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {/* Income */}
              <tr style={{ background: "#f9fafb" }}>
                <td colSpan={2} style={{ padding: "8px 0", fontWeight: 700, fontSize: 13, color: "#6b7280" }}>INCOME</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 0" }}>Gross Rent</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, color: "#059669" }}>{fmtDecimal(analysis.grossMonthlyIncome)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 0" }}>Vacancy ({inputs.vacancyPercent}%)</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>-{fmtDecimal(analysis.vacancyLoss)}</td>
              </tr>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <td style={{ padding: "8px 0", fontWeight: 600 }}>Effective Income</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>{fmtDecimal(analysis.effectiveGrossIncome)}</td>
              </tr>

              {/* Expenses */}
              <tr style={{ background: "#f9fafb" }}>
                <td colSpan={2} style={{ padding: "8px 0", fontWeight: 700, fontSize: 13, color: "#6b7280" }}>OPERATING EXPENSES</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 0" }}>Property Tax</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>-{fmtDecimal(analysis.propertyTaxMonthly)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 0" }}>Insurance</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>-{fmtDecimal(analysis.insuranceMonthly)}</td>
              </tr>
              {analysis.hoaMonthly > 0 && (
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 0" }}>HOA</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>-{fmtDecimal(analysis.hoaMonthly)}</td>
                </tr>
              )}
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 0" }}>Maintenance ({inputs.maintenancePercent}%)</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>-{fmtDecimal(analysis.maintenanceMonthly)}</td>
              </tr>
              {analysis.managementMonthly > 0 && (
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 0" }}>Management ({inputs.managementPercent}%)</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>-{fmtDecimal(analysis.managementMonthly)}</td>
                </tr>
              )}
              {analysis.otherExpensesMonthly > 0 && (
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 0" }}>Other Expenses</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>-{fmtDecimal(analysis.otherExpensesMonthly)}</td>
                </tr>
              )}
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <td style={{ padding: "8px 0", fontWeight: 600 }}>NOI (monthly)</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>{fmtDecimal(analysis.noiMonthly)}</td>
              </tr>

              {/* Debt Service */}
              <tr style={{ background: "#f9fafb" }}>
                <td colSpan={2} style={{ padding: "8px 0", fontWeight: 700, fontSize: 13, color: "#6b7280" }}>DEBT SERVICE</td>
              </tr>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <td style={{ padding: "8px 0" }}>Mortgage (P&I)</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>-{fmtDecimal(analysis.monthlyMortgage)}</td>
              </tr>

              {/* Cash Flow */}
              <tr style={{ background: analysis.monthlyCashFlow >= 0 ? "#ecfdf5" : "#fef2f2" }}>
                <td style={{ padding: "12px 0", fontWeight: 700, fontSize: 15 }}>Cash Flow</td>
                <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 700, fontSize: 18, color: analysis.monthlyCashFlow >= 0 ? "#059669" : "#dc2626" }}>
                  {fmtDecimal(analysis.monthlyCashFlow)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Additional Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>GRM</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{analysis.grm.toFixed(1)}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Price / Annual Rent</div>
          </div>
          <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Expense Ratio</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{analysis.operatingExpenseRatio.toFixed(1)}%</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>OpEx / Effective Income</div>
          </div>
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
          <AttachToContact generateFile={generateFile} reportTitle="Rental Property Analysis" />
        </div>
      </div>
    </div>
  );
}
