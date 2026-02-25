"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import AttachToContact from "@/components/attach-to-contact";
import { calculateCashToClose, type CashToCloseInput } from "@/lib/calculators/cashtoclose";
import MLSImport, { type MLSPropertyData } from "@/components/mls-import";

export default function CashToCloseCalculatorClient() {
  const [inputs, setInputs] = useState<CashToCloseInput>({
    purchasePrice: 400000,
    downPaymentPercent: 20,
    closingCostPercent: 3,
    earnestMoney: 5000,
    sellerCredits: 0,
    lenderCredits: 0,
    prepaidInsuranceMonths: 12,
    insuranceAnnual: 1800,
    prepaidTaxMonths: 3,
    propertyTaxAnnual: 4800,
    prepaidInterestDays: 15,
    loanAmount: 320000,
    interestRate: 6.5,
  });

  const handleMLSImport = (p: MLSPropertyData) => {
    handleChange("purchasePrice", p.listPrice);
    handleChange("propertyTaxAnnual", p.taxAnnual);
    handleChange("insuranceAnnual", p.insuranceAnnual);
  };

  // Keep loan amount in sync with purchase price and down payment
  const handleChange = (field: keyof CashToCloseInput, value: number) => {
    setInputs((prev) => {
      const newInputs = { ...prev, [field]: value };
      // Auto-sync loan amount
      if (field === "purchasePrice" || field === "downPaymentPercent") {
        const price = field === "purchasePrice" ? value : prev.purchasePrice;
        const dp = field === "downPaymentPercent" ? value : prev.downPaymentPercent;
        newInputs.loanAmount = price * (1 - dp / 100);
      }
      return newInputs;
    });
  };

  const analysis = useMemo(() => calculateCashToClose(inputs), [inputs]);

  // Format helpers
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const fmtDecimal = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const data: (string | number)[][] = [
      ["BUYER CASH-TO-CLOSE ESTIMATE"],
      [],
      ["PURCHASE DETAILS"],
      ["Purchase Price", inputs.purchasePrice],
      ["Down Payment %", `${inputs.downPaymentPercent}%`],
      ["Down Payment $", analysis.downPayment],
      ["Loan Amount", inputs.loanAmount],
      ["Interest Rate", `${inputs.interestRate}%`],
      [],
      ["COSTS"],
      ["Closing Costs", analysis.closingCosts],
      [],
      ["PREPAIDS & ESCROWS"],
      [`Prepaid Insurance (${inputs.prepaidInsuranceMonths} months)`, analysis.prepaidInsurance],
      [`Prepaid Taxes (${inputs.prepaidTaxMonths} months)`, analysis.prepaidTaxes],
      [`Prepaid Interest (${inputs.prepaidInterestDays} days)`, analysis.prepaidInterest],
      ["Total Prepaids", analysis.totalPrepaids],
      [],
      ["CREDITS"],
      ["Earnest Money Deposit", analysis.earnestMoney],
      ["Seller Credits", analysis.sellerCredits],
      ["Lender Credits", analysis.lenderCredits],
      ["Total Credits", analysis.totalCredits],
      [],
      ["SUMMARY"],
      ["Gross Cash Needed", analysis.grossCashNeeded],
      ["Less: Credits", analysis.totalCredits],
      [],
      ["ESTIMATED CASH TO CLOSE", analysis.estimatedCashToClose],
      [],
      ["RANGE ESTIMATE"],
      ["Low Estimate", analysis.lowEstimate],
      ["High Estimate", analysis.highEstimate],
    ];

    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, sheet, "Cash to Close");

    XLSX.writeFile(wb, `Buyer_Cash_To_Close_${inputs.purchasePrice}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Buyer Cash-to-Close Estimate", pageWidth / 2, y, { align: "center" });
    y += 12;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: "center" });
    y += 16;

    // Purchase Details
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Purchase Details", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const details = [
      ["Purchase Price:", fmt(inputs.purchasePrice)],
      ["Down Payment:", `${fmt(analysis.downPayment)} (${inputs.downPaymentPercent}%)`],
      ["Loan Amount:", fmt(inputs.loanAmount)],
    ];
    details.forEach(([label, value]) => {
      doc.text(label, 25, y);
      doc.text(value, pageWidth - 25, y, { align: "right" });
      y += 6;
    });
    y += 6;

    // Cash Needed
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Cash Needed", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const costs = [
      ["Down Payment", fmt(analysis.downPayment)],
      ["Closing Costs", fmt(analysis.closingCosts)],
      ["Prepaid Insurance", fmt(analysis.prepaidInsurance)],
      ["Prepaid Taxes", fmt(analysis.prepaidTaxes)],
      ["Prepaid Interest", fmtDecimal(analysis.prepaidInterest)],
    ];
    costs.forEach(([label, value]) => {
      doc.text(label, 25, y);
      doc.text(value, pageWidth - 25, y, { align: "right" });
      y += 6;
    });
    doc.setFont("helvetica", "bold");
    doc.text("Gross Cash Needed", 25, y);
    doc.text(fmt(analysis.grossCashNeeded), pageWidth - 25, y, { align: "right" });
    y += 10;

    // Credits
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Credits Applied", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const credits: [string, string][] = [];
    if (analysis.earnestMoney > 0) credits.push(["Earnest Money", fmt(analysis.earnestMoney)]);
    if (analysis.sellerCredits > 0) credits.push(["Seller Credits", fmt(analysis.sellerCredits)]);
    if (analysis.lenderCredits > 0) credits.push(["Lender Credits", fmt(analysis.lenderCredits)]);
    credits.forEach(([label, value]) => {
      doc.text(label, 25, y);
      doc.text(`-${value}`, pageWidth - 25, y, { align: "right" });
      y += 6;
    });
    y += 6;

    // Total
    doc.setLineWidth(1);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Estimated Cash to Close", 20, y);
    doc.text(fmt(analysis.estimatedCashToClose), pageWidth - 20, y, { align: "right" });
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Range: ${fmt(analysis.lowEstimate)} - ${fmt(analysis.highEstimate)}`, pageWidth - 20, y, { align: "right" });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} - RealEstateGenie`,
      pageWidth / 2,
      footerY,
      { align: "center" }
    );

    doc.save(`Buyer_Cash_To_Close_${inputs.purchasePrice}.pdf`);
  };

  // Generate file as Blob for attach-to-contact
  const generateFile = useCallback((format: "pdf" | "xlsx"): Blob => {
    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      const data: (string | number)[][] = [
        ["BUYER CASH-TO-CLOSE ESTIMATE"], [],
        ["Purchase Price", inputs.purchasePrice], ["Down Payment", analysis.downPayment],
        ["Closing Costs", analysis.closingCosts], ["Total Prepaids", analysis.totalPrepaids],
        ["Gross Cash Needed", analysis.grossCashNeeded],
        ["Less: Credits", analysis.totalCredits],
        ["ESTIMATED CASH TO CLOSE", analysis.estimatedCashToClose],
        ["Low Estimate", analysis.lowEstimate], ["High Estimate", analysis.highEstimate],
      ];
      const sheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, sheet, "Cash to Close");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("Buyer Cash-to-Close Estimate", pw / 2, y, { align: "center" }); y += 14;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    [["Purchase Price:", fmt(inputs.purchasePrice)], ["Down Payment:", fmt(analysis.downPayment)],
     ["Closing Costs:", fmt(analysis.closingCosts)], ["Prepaids:", fmt(analysis.totalPrepaids)],
     ["Gross Needed:", fmt(analysis.grossCashNeeded)], ["Credits:", `-${fmt(analysis.totalCredits)}`]
    ].forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 7; });
    y += 4; doc.setLineWidth(1); doc.line(20, y, pw - 20, y); y += 10;
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Cash to Close:", 20, y); doc.text(fmt(analysis.estimatedCashToClose), pw - 20, y, { align: "right" });
    return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
  }, [inputs, analysis, fmt]);

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

        {/* Purchase Details */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Purchase Details</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Purchase Price</label>
            <input
              type="number"
              value={inputs.purchasePrice}
              onChange={(e) => handleChange("purchasePrice", Number(e.target.value))}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Down Payment (%)</label>
              <input
                type="number"
                step="0.5"
                value={inputs.downPaymentPercent}
                onChange={(e) => handleChange("downPaymentPercent", Number(e.target.value))}
                style={inputStyle}
              />
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                = {fmt(analysis.downPayment)}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Interest Rate (%)</label>
              <input
                type="number"
                step="0.125"
                value={inputs.interestRate}
                onChange={(e) => handleChange("interestRate", Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Closing Costs (% of Purchase Price)</label>
            <input
              type="number"
              step="0.25"
              value={inputs.closingCostPercent}
              onChange={(e) => handleChange("closingCostPercent", Number(e.target.value))}
              style={inputStyle}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              = {fmt(analysis.closingCosts)} (typical range: 2-5%)
            </div>
          </div>

          <div>
            <label style={labelStyle}>Earnest Money Deposit</label>
            <input
              type="number"
              value={inputs.earnestMoney}
              onChange={(e) => handleChange("earnestMoney", Number(e.target.value))}
              style={inputStyle}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Credited toward down payment at closing
            </div>
          </div>
        </div>

        {/* Credits & Concessions */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Credits & Concessions</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Seller Credits / Concessions</label>
            <input
              type="number"
              value={inputs.sellerCredits}
              onChange={(e) => handleChange("sellerCredits", Number(e.target.value))}
              style={inputStyle}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Seller contribution toward closing costs
            </div>
          </div>

          <div>
            <label style={labelStyle}>Lender Credits</label>
            <input
              type="number"
              value={inputs.lenderCredits}
              onChange={(e) => handleChange("lenderCredits", Number(e.target.value))}
              style={inputStyle}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Credits from lender (often in exchange for higher rate)
            </div>
          </div>
        </div>

        {/* Prepaids & Escrows */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Prepaids & Escrows</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Homeowner's Insurance (Annual)</label>
              <input
                type="number"
                value={inputs.insuranceAnnual}
                onChange={(e) => handleChange("insuranceAnnual", Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Prepaid Months</label>
              <input
                type="number"
                value={inputs.prepaidInsuranceMonths}
                onChange={(e) => handleChange("prepaidInsuranceMonths", Number(e.target.value))}
                style={inputStyle}
              />
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                = {fmt(analysis.prepaidInsurance)}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Property Tax (Annual)</label>
              <input
                type="number"
                value={inputs.propertyTaxAnnual}
                onChange={(e) => handleChange("propertyTaxAnnual", Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Escrow Months</label>
              <input
                type="number"
                value={inputs.prepaidTaxMonths}
                onChange={(e) => handleChange("prepaidTaxMonths", Number(e.target.value))}
                style={inputStyle}
              />
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                = {fmt(analysis.prepaidTaxes)}
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Prepaid Interest (Days)</label>
            <input
              type="number"
              value={inputs.prepaidInterestDays}
              onChange={(e) => handleChange("prepaidInterestDays", Number(e.target.value))}
              style={inputStyle}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Per diem interest from closing to end of month = {fmtDecimal(analysis.prepaidInterest)}
            </div>
          </div>
        </div>
      </div>

      {/* Results Panel */}
      <div>
        {/* Cash to Close Hero */}
        <div
          style={{
            padding: 24,
            background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
            borderRadius: 12,
            color: "#fff",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Estimated Cash to Close</div>
          <div style={{ fontSize: 42, fontWeight: 700 }}>{fmt(analysis.estimatedCashToClose)}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 8 }}>
            Range: {fmt(analysis.lowEstimate)} &ndash; {fmt(analysis.highEstimate)}
          </div>
        </div>

        {/* Range Visualization */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Estimate Range</h3>
          <div style={{ position: "relative", height: 48, marginBottom: 8 }}>
            {/* Track */}
            <div style={{
              position: "absolute",
              top: 18,
              left: 0,
              right: 0,
              height: 12,
              background: "#f3f4f6",
              borderRadius: 6,
            }} />
            {/* Range bar */}
            {(() => {
              const min = analysis.lowEstimate;
              const max = analysis.highEstimate;
              const rangeMin = min * 0.9;
              const rangeMax = max * 1.1;
              const totalRange = rangeMax - rangeMin;
              const leftPct = ((min - rangeMin) / totalRange) * 100;
              const widthPct = ((max - min) / totalRange) * 100;
              const midPct = ((analysis.estimatedCashToClose - rangeMin) / totalRange) * 100;

              return (
                <>
                  <div
                    style={{
                      position: "absolute",
                      top: 18,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      height: 12,
                      background: "linear-gradient(90deg, #a78bfa, #7c3aed)",
                      borderRadius: 6,
                    }}
                  />
                  {/* Mid point marker */}
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: `${midPct}%`,
                      transform: "translateX(-50%)",
                      width: 24,
                      height: 24,
                      background: "#5b21b6",
                      borderRadius: "50%",
                      border: "3px solid #fff",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    }}
                  />
                </>
              );
            })()}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <div>
              <div style={{ color: "#6b7280" }}>Low</div>
              <div style={{ fontWeight: 600 }}>{fmt(analysis.lowEstimate)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#7c3aed", fontWeight: 600 }}>Estimate</div>
              <div style={{ fontWeight: 700 }}>{fmt(analysis.estimatedCashToClose)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#6b7280" }}>High</div>
              <div style={{ fontWeight: 600 }}>{fmt(analysis.highEstimate)}</div>
            </div>
          </div>
        </div>

        {/* Full Breakdown */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Full Breakdown</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {/* Cash needed */}
              <tr style={{ background: "#f9fafb" }}>
                <td colSpan={2} style={{ padding: "8px 0", fontWeight: 700, fontSize: 13, color: "#6b7280" }}>
                  CASH NEEDED
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>
                  Down Payment
                  <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>({inputs.downPaymentPercent}%)</span>
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>
                  {fmt(analysis.downPayment)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>
                  Closing Costs
                  <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>({inputs.closingCostPercent}%)</span>
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>
                  {fmt(analysis.closingCosts)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>
                  Prepaid Insurance
                  <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>({inputs.prepaidInsuranceMonths} mo)</span>
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>
                  {fmt(analysis.prepaidInsurance)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>
                  Prepaid Taxes
                  <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>({inputs.prepaidTaxMonths} mo)</span>
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>
                  {fmt(analysis.prepaidTaxes)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 0" }}>
                  Prepaid Interest
                  <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>({inputs.prepaidInterestDays} days)</span>
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>
                  {fmtDecimal(analysis.prepaidInterest)}
                </td>
              </tr>
              <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                <td style={{ padding: "10px 0", fontWeight: 700 }}>Gross Cash Needed</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 700 }}>
                  {fmt(analysis.grossCashNeeded)}
                </td>
              </tr>

              {/* Credits */}
              <tr style={{ background: "#f9fafb" }}>
                <td colSpan={2} style={{ padding: "12px 0 8px 0", fontWeight: 700, fontSize: 13, color: "#6b7280" }}>
                  CREDITS APPLIED
                </td>
              </tr>
              {analysis.earnestMoney > 0 && (
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 0" }}>Earnest Money Deposit</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#059669" }}>
                    -{fmt(analysis.earnestMoney)}
                  </td>
                </tr>
              )}
              {analysis.sellerCredits > 0 && (
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 0" }}>Seller Credits</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#059669" }}>
                    -{fmt(analysis.sellerCredits)}
                  </td>
                </tr>
              )}
              {analysis.lenderCredits > 0 && (
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 0" }}>Lender Credits</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#059669" }}>
                    -{fmt(analysis.lenderCredits)}
                  </td>
                </tr>
              )}
              {analysis.totalCredits > 0 && (
                <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  <td style={{ padding: "10px 0", fontWeight: 700 }}>Total Credits</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 700, color: "#059669" }}>
                    -{fmt(analysis.totalCredits)}
                  </td>
                </tr>
              )}

              {/* Net */}
              <tr style={{ background: "#ede9fe" }}>
                <td style={{ padding: "14px 0", fontWeight: 700, fontSize: 16 }}>Cash to Close</td>
                <td style={{ padding: "14px 0", textAlign: "right", fontWeight: 700, fontSize: 20, color: "#5b21b6" }}>
                  {fmt(analysis.estimatedCashToClose)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Total Prepaids & Escrows</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{fmt(analysis.totalPrepaids)}</div>
          </div>
          <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Loan-to-Value</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {inputs.purchasePrice > 0
                ? `${((inputs.loanAmount / inputs.purchasePrice) * 100).toFixed(1)}%`
                : "0%"}
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
          <AttachToContact generateFile={generateFile} reportTitle="Buyer Cash-to-Close Estimate" />
        </div>
      </div>
    </div>
  );
}
