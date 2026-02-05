"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";

interface MortgageInputs {
  purchasePrice: number;
  downPaymentPercent: number;
  downPaymentAmount: number;
  interestRate: number;
  loanTermYears: number;
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  pmiRate: number;
  includePmi: boolean;
}

interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  totalInterest: number;
  totalPrincipal: number;
}

export default function MortgageCalculatorClient() {
  const [inputs, setInputs] = useState<MortgageInputs>({
    purchasePrice: 400000,
    downPaymentPercent: 20,
    downPaymentAmount: 80000,
    interestRate: 6.5,
    loanTermYears: 30,
    propertyTaxAnnual: 4800,
    insuranceAnnual: 1800,
    hoaMonthly: 0,
    pmiRate: 0.5,
    includePmi: false,
  });

  const [showAmortization, setShowAmortization] = useState(false);
  const [usePercentDownPayment, setUsePercentDownPayment] = useState(true);

  // Update down payment when purchase price or percentage changes
  const handleInputChange = (field: keyof MortgageInputs, value: number | boolean) => {
    setInputs((prev) => {
      const newInputs = { ...prev, [field]: value };

      // Sync down payment amount/percent
      if (field === "purchasePrice") {
        if (usePercentDownPayment) {
          newInputs.downPaymentAmount = (value as number) * (prev.downPaymentPercent / 100);
        } else {
          newInputs.downPaymentPercent = ((prev.downPaymentAmount / (value as number)) * 100);
        }
      } else if (field === "downPaymentPercent") {
        newInputs.downPaymentAmount = prev.purchasePrice * ((value as number) / 100);
      } else if (field === "downPaymentAmount") {
        newInputs.downPaymentPercent = ((value as number) / prev.purchasePrice) * 100;
      }

      // Auto-enable PMI if down payment < 20%
      if (field === "downPaymentPercent" || field === "downPaymentAmount" || field === "purchasePrice") {
        const dpPercent = field === "downPaymentPercent"
          ? (value as number)
          : (newInputs.downPaymentAmount / newInputs.purchasePrice) * 100;
        newInputs.includePmi = dpPercent < 20;
      }

      return newInputs;
    });
  };

  // Calculate mortgage details
  const calculation = useMemo(() => {
    const loanAmount = inputs.purchasePrice - inputs.downPaymentAmount;
    const monthlyRate = inputs.interestRate / 100 / 12;
    const numPayments = inputs.loanTermYears * 12;

    // Monthly P&I using standard amortization formula
    let monthlyPI = 0;
    if (monthlyRate > 0) {
      monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
    } else {
      monthlyPI = loanAmount / numPayments;
    }

    // Monthly costs
    const monthlyTax = inputs.propertyTaxAnnual / 12;
    const monthlyInsurance = inputs.insuranceAnnual / 12;
    const monthlyPMI = inputs.includePmi ? (loanAmount * (inputs.pmiRate / 100)) / 12 : 0;
    const monthlyHOA = inputs.hoaMonthly;

    const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyPMI + monthlyHOA;
    const totalInterestPaid = (monthlyPI * numPayments) - loanAmount;

    // Generate amortization schedule
    const amortization: AmortizationRow[] = [];
    let balance = loanAmount;
    let totalInterest = 0;
    let totalPrincipal = 0;

    for (let month = 1; month <= numPayments; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPI - interestPayment;
      balance -= principalPayment;
      totalInterest += interestPayment;
      totalPrincipal += principalPayment;

      amortization.push({
        month,
        payment: monthlyPI,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance),
        totalInterest,
        totalPrincipal,
      });
    }

    return {
      loanAmount,
      monthlyPI,
      monthlyTax,
      monthlyInsurance,
      monthlyPMI,
      monthlyHOA,
      totalMonthly,
      totalInterestPaid,
      amortization,
      downPaymentPercent: (inputs.downPaymentAmount / inputs.purchasePrice) * 100,
    };
  }, [inputs]);

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData: (string | number)[][] = [
      ["MORTGAGE CALCULATOR SUMMARY"],
      [],
      ["LOAN DETAILS"],
      ["Purchase Price", inputs.purchasePrice],
      ["Down Payment", inputs.downPaymentAmount],
      ["Down Payment %", `${calculation.downPaymentPercent.toFixed(1)}%`],
      ["Loan Amount", calculation.loanAmount],
      ["Interest Rate", `${inputs.interestRate}%`],
      ["Loan Term", `${inputs.loanTermYears} years`],
      [],
      ["MONTHLY PAYMENT BREAKDOWN"],
      ["Principal & Interest", calculation.monthlyPI],
      ["Property Tax", calculation.monthlyTax],
      ["Homeowner's Insurance", calculation.monthlyInsurance],
      ["PMI", calculation.monthlyPMI],
      ["HOA Fees", calculation.monthlyHOA],
      [],
      ["TOTAL MONTHLY PAYMENT", calculation.totalMonthly],
      [],
      ["LOAN TOTALS"],
      ["Total Interest Paid", calculation.totalInterestPaid],
      ["Total Cost of Loan", calculation.loanAmount + calculation.totalInterestPaid],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // Amortization schedule sheet
    const amortData: (string | number)[][] = [
      ["Month", "Payment", "Principal", "Interest", "Balance", "Total Interest", "Total Principal"],
    ];
    calculation.amortization.forEach((row) => {
      amortData.push([
        row.month,
        row.payment,
        row.principal,
        row.interest,
        row.balance,
        row.totalInterest,
        row.totalPrincipal,
      ]);
    });

    const amortSheet = XLSX.utils.aoa_to_sheet(amortData);
    XLSX.utils.book_append_sheet(wb, amortSheet, "Amortization");

    XLSX.writeFile(wb, `Mortgage_Calculator_${inputs.purchasePrice}.xlsx`);
  };

  // Format currency
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const fmtDecimal = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Input Form */}
        <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Loan Details</h2>

          {/* Purchase Price */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Purchase Price
            </label>
            <input
              type="number"
              value={inputs.purchasePrice}
              onChange={(e) => handleInputChange("purchasePrice", Number(e.target.value))}
              style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
            />
          </div>

          {/* Down Payment */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Down Payment
              <button
                onClick={() => setUsePercentDownPayment(!usePercentDownPayment)}
                style={{
                  marginLeft: 8,
                  padding: "2px 8px",
                  fontSize: 11,
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {usePercentDownPayment ? "Switch to $" : "Switch to %"}
              </button>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {usePercentDownPayment ? (
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type="number"
                    value={inputs.downPaymentPercent}
                    onChange={(e) => handleInputChange("downPaymentPercent", Number(e.target.value))}
                    style={{ width: "100%", padding: 10, paddingRight: 30, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
                  />
                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }}>%</span>
                </div>
              ) : (
                <input
                  type="number"
                  value={inputs.downPaymentAmount}
                  onChange={(e) => handleInputChange("downPaymentAmount", Number(e.target.value))}
                  style={{ flex: 1, padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
                />
              )}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              {usePercentDownPayment
                ? `= ${fmt(inputs.downPaymentAmount)}`
                : `= ${calculation.downPaymentPercent.toFixed(1)}%`}
            </div>
          </div>

          {/* Interest Rate & Term */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Interest Rate (%)
              </label>
              <input
                type="number"
                step="0.125"
                value={inputs.interestRate}
                onChange={(e) => handleInputChange("interestRate", Number(e.target.value))}
                style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Loan Term
              </label>
              <select
                value={inputs.loanTermYears}
                onChange={(e) => handleInputChange("loanTermYears", Number(e.target.value))}
                style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
              >
                <option value={30}>30 years</option>
                <option value={20}>20 years</option>
                <option value={15}>15 years</option>
                <option value={10}>10 years</option>
              </select>
            </div>
          </div>

          <h3 style={{ margin: "24px 0 16px 0", fontSize: 16, fontWeight: 700, borderTop: "1px solid #e5e7eb", paddingTop: 20 }}>
            Monthly Costs
          </h3>

          {/* Property Tax */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Property Tax (Annual)
            </label>
            <input
              type="number"
              value={inputs.propertyTaxAnnual}
              onChange={(e) => handleInputChange("propertyTaxAnnual", Number(e.target.value))}
              style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              = {fmt(inputs.propertyTaxAnnual / 12)}/month
            </div>
          </div>

          {/* Insurance */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Homeowner's Insurance (Annual)
            </label>
            <input
              type="number"
              value={inputs.insuranceAnnual}
              onChange={(e) => handleInputChange("insuranceAnnual", Number(e.target.value))}
              style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              = {fmt(inputs.insuranceAnnual / 12)}/month
            </div>
          </div>

          {/* HOA */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              HOA Fees (Monthly)
            </label>
            <input
              type="number"
              value={inputs.hoaMonthly}
              onChange={(e) => handleInputChange("hoaMonthly", Number(e.target.value))}
              style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
            />
          </div>

          {/* PMI */}
          {calculation.downPaymentPercent < 20 && (
            <div style={{ marginBottom: 16, padding: 12, background: "#fef3c7", borderRadius: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={inputs.includePmi}
                  onChange={(e) => handleInputChange("includePmi", e.target.checked)}
                />
                Include PMI (Private Mortgage Insurance)
              </label>
              {inputs.includePmi && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                    PMI Rate (% of loan annually)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.pmiRate}
                    onChange={(e) => handleInputChange("pmiRate", Number(e.target.value))}
                    style={{ width: 100, padding: 6, border: "1px solid #d1d5db", borderRadius: 4 }}
                  />
                  <span style={{ marginLeft: 8, fontSize: 12, color: "#92400e" }}>
                    = {fmt(calculation.monthlyPMI)}/month
                  </span>
                </div>
              )}
              <p style={{ fontSize: 11, color: "#92400e", margin: "8px 0 0 0" }}>
                PMI is typically required when down payment is less than 20%
              </p>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div>
          {/* Total Monthly Payment */}
          <div
            style={{
              padding: 24,
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              borderRadius: 12,
              color: "#fff",
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Total Monthly Payment</div>
            <div style={{ fontSize: 42, fontWeight: 700 }}>{fmtDecimal(calculation.totalMonthly)}</div>
          </div>

          {/* Payment Breakdown */}
          <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Monthly Breakdown</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 0" }}>Principal & Interest</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmtDecimal(calculation.monthlyPI)}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 0" }}>Property Tax</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmtDecimal(calculation.monthlyTax)}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 0" }}>Insurance</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmtDecimal(calculation.monthlyInsurance)}</td>
                </tr>
                {inputs.includePmi && calculation.monthlyPMI > 0 && (
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "10px 0" }}>PMI</td>
                    <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmtDecimal(calculation.monthlyPMI)}</td>
                  </tr>
                )}
                {inputs.hoaMonthly > 0 && (
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "10px 0" }}>HOA</td>
                    <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmtDecimal(calculation.monthlyHOA)}</td>
                  </tr>
                )}
                <tr style={{ background: "#f9fafb" }}>
                  <td style={{ padding: "12px 0", fontWeight: 700 }}>Total</td>
                  <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 700, fontSize: 18 }}>{fmtDecimal(calculation.totalMonthly)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Loan Summary */}
          <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Loan Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Loan Amount</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt(calculation.loanAmount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Down Payment</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt(inputs.downPaymentAmount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Total Interest Paid</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#dc2626" }}>{fmt(calculation.totalInterestPaid)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Total Cost of Loan</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt(calculation.loanAmount + calculation.totalInterestPaid)}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setShowAmortization(!showAmortization)}
              style={{
                flex: 1,
                padding: "12px 20px",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {showAmortization ? "Hide" : "Show"} Amortization Schedule
            </button>
            <button
              onClick={exportToExcel}
              style={{
                flex: 1,
                padding: "12px 20px",
                background: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Export to Excel
            </button>
          </div>
        </div>
      </div>

      {/* Amortization Schedule */}
      {showAmortization && (
        <div style={{ marginTop: 32, padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: 20, fontWeight: 700 }}>
            Amortization Schedule
          </h2>
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb", position: "sticky", top: 0 }}>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>Month</th>
                  <th style={{ padding: 10, textAlign: "right", borderBottom: "2px solid #e5e7eb" }}>Payment</th>
                  <th style={{ padding: 10, textAlign: "right", borderBottom: "2px solid #e5e7eb" }}>Principal</th>
                  <th style={{ padding: 10, textAlign: "right", borderBottom: "2px solid #e5e7eb" }}>Interest</th>
                  <th style={{ padding: 10, textAlign: "right", borderBottom: "2px solid #e5e7eb" }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {calculation.amortization.map((row) => (
                  <tr key={row.month} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 8 }}>{row.month}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{fmtDecimal(row.payment)}</td>
                    <td style={{ padding: 8, textAlign: "right", color: "#059669" }}>{fmtDecimal(row.principal)}</td>
                    <td style={{ padding: 8, textAlign: "right", color: "#dc2626" }}>{fmtDecimal(row.interest)}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{fmtDecimal(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Comparison */}
      <div style={{ marginTop: 32, padding: 24, background: "#f9fafb", borderRadius: 12 }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700 }}>
          Loan Term Comparison
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[15, 20, 30].map((term) => {
            const monthlyRate = inputs.interestRate / 100 / 12;
            const numPayments = term * 12;
            const loanAmount = calculation.loanAmount;
            let monthlyPI = 0;
            if (monthlyRate > 0) {
              monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                (Math.pow(1 + monthlyRate, numPayments) - 1);
            }
            const totalInterest = (monthlyPI * numPayments) - loanAmount;
            const isCurrent = term === inputs.loanTermYears;

            return (
              <div
                key={term}
                style={{
                  padding: 16,
                  background: isCurrent ? "#dbeafe" : "#fff",
                  border: isCurrent ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                  {term}-Year Loan {isCurrent && "(Current)"}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Monthly P&I</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{fmtDecimal(monthlyPI)}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>Total Interest</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#dc2626" }}>{fmt(totalInterest)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
