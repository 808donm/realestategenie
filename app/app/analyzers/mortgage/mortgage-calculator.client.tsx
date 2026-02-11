"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

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

interface AffordabilityInputs {
  monthlyBudget: number;
  interestRate: number;
  loanTermYears: number;
  downPaymentPercent: number;
  propertyTaxRate: number; // Annual % of home value
  insuranceRate: number; // Annual % of home value
  hoaMonthly: number;
  includePmi: boolean;
  pmiRate: number;
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
  const [activeTab, setActiveTab] = useState<"calculator" | "affordability">("calculator");

  // Affordability calculator state
  const [affordInputs, setAffordInputs] = useState<AffordabilityInputs>({
    monthlyBudget: 3000,
    interestRate: 6.5,
    loanTermYears: 30,
    downPaymentPercent: 20,
    propertyTaxRate: 1.2, // 1.2% of home value annually
    insuranceRate: 0.5, // 0.5% of home value annually
    hoaMonthly: 0,
    includePmi: false,
    pmiRate: 0.5,
  });

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

  // Calculate affordability (reverse mortgage calculation)
  const affordabilityCalc = useMemo(() => {
    const { monthlyBudget, interestRate, loanTermYears, downPaymentPercent, propertyTaxRate, insuranceRate, hoaMonthly, includePmi, pmiRate } = affordInputs;

    // We need to solve for purchase price given the monthly budget
    // Monthly budget = P&I + Tax + Insurance + PMI + HOA
    // P&I = L * (r * (1+r)^n) / ((1+r)^n - 1) where L = PurchasePrice * (1 - DP%)
    // Tax = PurchasePrice * TaxRate / 12
    // Insurance = PurchasePrice * InsuranceRate / 12
    // PMI = L * PMIRate / 12 (if applicable)

    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTermYears * 12;
    const dpPercent = downPaymentPercent / 100;
    const loanPercent = 1 - dpPercent;

    // Calculate the monthly P&I factor (per dollar of loan)
    let piFactorPerLoanDollar = 0;
    if (monthlyRate > 0) {
      piFactorPerLoanDollar = (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
    } else {
      piFactorPerLoanDollar = 1 / numPayments;
    }

    // P&I per dollar of purchase price = piFactorPerLoanDollar * loanPercent
    const piPerPurchaseDollar = piFactorPerLoanDollar * loanPercent;

    // Tax per dollar of purchase price
    const taxPerPurchaseDollar = (propertyTaxRate / 100) / 12;

    // Insurance per dollar of purchase price
    const insurancePerPurchaseDollar = (insuranceRate / 100) / 12;

    // PMI per dollar of purchase price (on loan amount)
    const pmiPerPurchaseDollar = includePmi ? (loanPercent * (pmiRate / 100)) / 12 : 0;

    // Total monthly cost per dollar of purchase price (excluding HOA which is fixed)
    const costPerPurchaseDollar = piPerPurchaseDollar + taxPerPurchaseDollar + insurancePerPurchaseDollar + pmiPerPurchaseDollar;

    // Solve for purchase price: Budget - HOA = PurchasePrice * costPerPurchaseDollar
    const availableForMortgage = monthlyBudget - hoaMonthly;
    const maxPurchasePrice = availableForMortgage / costPerPurchaseDollar;

    const maxLoanAmount = maxPurchasePrice * loanPercent;
    const requiredDownPayment = maxPurchasePrice * dpPercent;

    // Calculate actual breakdown at this price
    const actualPI = maxLoanAmount * piFactorPerLoanDollar;
    const actualTax = maxPurchasePrice * (propertyTaxRate / 100) / 12;
    const actualInsurance = maxPurchasePrice * (insuranceRate / 100) / 12;
    const actualPMI = includePmi ? (maxLoanAmount * (pmiRate / 100)) / 12 : 0;

    return {
      maxPurchasePrice: Math.max(0, maxPurchasePrice),
      maxLoanAmount: Math.max(0, maxLoanAmount),
      requiredDownPayment: Math.max(0, requiredDownPayment),
      monthlyPI: actualPI,
      monthlyTax: actualTax,
      monthlyInsurance: actualInsurance,
      monthlyPMI: actualPMI,
      monthlyHOA: hoaMonthly,
      totalMonthly: actualPI + actualTax + actualInsurance + actualPMI + hoaMonthly,
    };
  }, [affordInputs]);

  // Loan comparison data for export
  const loanComparison = useMemo(() => {
    return [15, 20, 30].map((term) => {
      const monthlyRate = inputs.interestRate / 100 / 12;
      const numPayments = term * 12;
      const loanAmount = calculation.loanAmount;
      let monthlyPI = 0;
      if (monthlyRate > 0) {
        monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
          (Math.pow(1 + monthlyRate, numPayments) - 1);
      }
      const totalInterest = (monthlyPI * numPayments) - loanAmount;
      const totalPayments = monthlyPI * numPayments;

      return {
        term,
        monthlyPI,
        totalInterest,
        totalPayments,
        totalCost: loanAmount + totalInterest,
      };
    });
  }, [inputs.interestRate, calculation.loanAmount]);

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

    // Loan Comparison sheet
    const comparisonData: (string | number)[][] = [
      ["LOAN TERM COMPARISON"],
      [],
      ["Loan Amount", calculation.loanAmount],
      ["Interest Rate", `${inputs.interestRate}%`],
      [],
      ["Term (Years)", "Monthly P&I", "Total Interest", "Total Payments", "Total Cost"],
    ];
    loanComparison.forEach((row) => {
      comparisonData.push([
        row.term,
        row.monthlyPI,
        row.totalInterest,
        row.totalPayments,
        row.totalCost,
      ]);
    });
    comparisonData.push([]);
    comparisonData.push(["INTEREST SAVINGS vs 30-Year"]);
    const thirtyYearInterest = loanComparison.find(l => l.term === 30)?.totalInterest || 0;
    loanComparison.forEach((row) => {
      if (row.term !== 30) {
        comparisonData.push([
          `${row.term}-Year vs 30-Year`,
          "",
          thirtyYearInterest - row.totalInterest,
          "",
          `Save ${fmt(thirtyYearInterest - row.totalInterest)} in interest`,
        ]);
      }
    });

    const comparisonSheet = XLSX.utils.aoa_to_sheet(comparisonData);
    XLSX.utils.book_append_sheet(wb, comparisonSheet, "Loan Comparison");

    XLSX.writeFile(wb, `Mortgage_Calculator_${inputs.purchasePrice}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Mortgage Calculator Summary", pageWidth / 2, y, { align: "center" });
    y += 15;

    // Loan Details Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Loan Details", 20, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const loanDetails = [
      ["Purchase Price:", fmt(inputs.purchasePrice)],
      ["Down Payment:", `${fmt(inputs.downPaymentAmount)} (${calculation.downPaymentPercent.toFixed(1)}%)`],
      ["Loan Amount:", fmt(calculation.loanAmount)],
      ["Interest Rate:", `${inputs.interestRate}%`],
      ["Loan Term:", `${inputs.loanTermYears} years`],
    ];

    loanDetails.forEach(([label, value]) => {
      doc.text(label, 25, y);
      doc.text(value, 90, y);
      y += 6;
    });

    y += 8;

    // Monthly Payment Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Monthly Payment Breakdown", 20, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const paymentDetails = [
      ["Principal & Interest:", fmtDecimal(calculation.monthlyPI)],
      ["Property Tax:", fmtDecimal(calculation.monthlyTax)],
      ["Insurance:", fmtDecimal(calculation.monthlyInsurance)],
    ];
    if (calculation.monthlyPMI > 0) {
      paymentDetails.push(["PMI:", fmtDecimal(calculation.monthlyPMI)]);
    }
    if (calculation.monthlyHOA > 0) {
      paymentDetails.push(["HOA:", fmtDecimal(calculation.monthlyHOA)]);
    }

    paymentDetails.forEach(([label, value]) => {
      doc.text(label, 25, y);
      doc.text(value, 90, y);
      y += 6;
    });

    // Total line
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(25, y, 130, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Total Monthly Payment:", 25, y);
    doc.setFontSize(12);
    doc.text(fmtDecimal(calculation.totalMonthly), 90, y);
    y += 12;

    // Loan Totals
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Total Interest Paid:", 25, y);
    doc.text(fmt(calculation.totalInterestPaid), 90, y);
    y += 6;
    doc.text("Total Cost of Loan:", 25, y);
    doc.text(fmt(calculation.loanAmount + calculation.totalInterestPaid), 90, y);

    y += 20;

    // Loan Comparison Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Loan Term Comparison", 20, y);
    y += 10;

    // Table headers
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const colWidths = [25, 40, 45, 45];
    const headers = ["Term", "Monthly P&I", "Total Interest", "Total Cost"];
    let x = 25;
    headers.forEach((header, i) => {
      doc.text(header, x, y);
      x += colWidths[i];
    });
    y += 2;
    doc.line(25, y, 175, y);
    y += 6;

    // Table rows
    doc.setFont("helvetica", "normal");
    loanComparison.forEach((row) => {
      x = 25;
      const isCurrent = row.term === inputs.loanTermYears;
      if (isCurrent) {
        doc.setFont("helvetica", "bold");
      }
      doc.text(`${row.term} years${isCurrent ? " *" : ""}`, x, y);
      x += colWidths[0];
      doc.text(fmtDecimal(row.monthlyPI), x, y);
      x += colWidths[1];
      doc.text(fmt(row.totalInterest), x, y);
      x += colWidths[2];
      doc.text(fmt(row.totalCost), x, y);
      doc.setFont("helvetica", "normal");
      y += 6;
    });

    y += 4;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("* Currently selected loan term", 25, y);

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${new Date().toLocaleDateString()} - RealEstateGenie`, pageWidth / 2, footerY, { align: "center" });

    doc.save(`Mortgage_Summary_${inputs.purchasePrice}.pdf`);
  };

  // Format currency
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const fmtDecimal = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e5e7eb" }}>
        <button
          onClick={() => setActiveTab("calculator")}
          style={{
            padding: "12px 24px",
            fontWeight: 600,
            fontSize: 14,
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "calculator" ? "2px solid #3b82f6" : "2px solid transparent",
            marginBottom: -2,
            color: activeTab === "calculator" ? "#3b82f6" : "#6b7280",
            cursor: "pointer",
          }}
        >
          Mortgage Calculator
        </button>
        <button
          onClick={() => setActiveTab("affordability")}
          style={{
            padding: "12px 24px",
            fontWeight: 600,
            fontSize: 14,
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "affordability" ? "2px solid #3b82f6" : "2px solid transparent",
            marginBottom: -2,
            color: activeTab === "affordability" ? "#3b82f6" : "#6b7280",
            cursor: "pointer",
          }}
        >
          Affordability Calculator
        </button>
      </div>

      {activeTab === "calculator" && (
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
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => setShowAmortization(!showAmortization)}
              style={{
                flex: "1 1 45%",
                padding: "12px 20px",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {showAmortization ? "Hide" : "Show"} Amortization
            </button>
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
                flex: "1 1 100%",
                padding: "12px 20px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Export PDF Summary
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Amortization Schedule */}
      {showAmortization && activeTab === "calculator" && (
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
      {activeTab === "calculator" && (
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
      )}

      {/* Affordability Calculator Tab */}
      {activeTab === "affordability" && (
        <div>
          <div style={{ padding: 20, background: "#ecfdf5", borderRadius: 12, marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 700, color: "#065f46" }}>
              How much home can I afford?
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: "#047857" }}>
              Enter your monthly budget and we'll calculate the maximum home price you can afford.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {/* Affordability Inputs */}
            <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
              <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700 }}>Your Budget</h2>

              {/* Monthly Budget */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Monthly Housing Budget
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }}>$</span>
                  <input
                    type="number"
                    value={affordInputs.monthlyBudget}
                    onChange={(e) => setAffordInputs(prev => ({ ...prev, monthlyBudget: Number(e.target.value) }))}
                    style={{ width: "100%", padding: "12px 12px 12px 24px", border: "2px solid #10b981", borderRadius: 8, fontSize: 20, fontWeight: 600 }}
                  />
                </div>
                <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#6b7280" }}>
                  Total amount you can spend on housing each month (PITI + HOA)
                </p>
              </div>

              <h3 style={{ margin: "24px 0 16px 0", fontSize: 16, fontWeight: 700, borderTop: "1px solid #e5e7eb", paddingTop: 20 }}>
                Loan Terms
              </h3>

              {/* Interest Rate & Term */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.125"
                    value={affordInputs.interestRate}
                    onChange={(e) => setAffordInputs(prev => ({ ...prev, interestRate: Number(e.target.value) }))}
                    style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Loan Term
                  </label>
                  <select
                    value={affordInputs.loanTermYears}
                    onChange={(e) => setAffordInputs(prev => ({ ...prev, loanTermYears: Number(e.target.value) }))}
                    style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
                  >
                    <option value={30}>30 years</option>
                    <option value={20}>20 years</option>
                    <option value={15}>15 years</option>
                    <option value={10}>10 years</option>
                  </select>
                </div>
              </div>

              {/* Down Payment */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Down Payment (%)
                </label>
                <input
                  type="number"
                  value={affordInputs.downPaymentPercent}
                  onChange={(e) => {
                    const dp = Number(e.target.value);
                    setAffordInputs(prev => ({
                      ...prev,
                      downPaymentPercent: dp,
                      includePmi: dp < 20,
                    }));
                  }}
                  style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
                />
              </div>

              <h3 style={{ margin: "24px 0 16px 0", fontSize: 16, fontWeight: 700, borderTop: "1px solid #e5e7eb", paddingTop: 20 }}>
                Estimated Costs
              </h3>

              {/* Property Tax Rate */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Property Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={affordInputs.propertyTaxRate}
                    onChange={(e) => setAffordInputs(prev => ({ ...prev, propertyTaxRate: Number(e.target.value) }))}
                    style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
                  />
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                    Annual % of home value
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Insurance Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={affordInputs.insuranceRate}
                    onChange={(e) => setAffordInputs(prev => ({ ...prev, insuranceRate: Number(e.target.value) }))}
                    style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
                  />
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                    Annual % of home value
                  </div>
                </div>
              </div>

              {/* HOA */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  HOA Fees (Monthly)
                </label>
                <input
                  type="number"
                  value={affordInputs.hoaMonthly}
                  onChange={(e) => setAffordInputs(prev => ({ ...prev, hoaMonthly: Number(e.target.value) }))}
                  style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16 }}
                />
              </div>

              {/* PMI */}
              {affordInputs.downPaymentPercent < 20 && (
                <div style={{ marginBottom: 16, padding: 12, background: "#fef3c7", borderRadius: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={affordInputs.includePmi}
                      onChange={(e) => setAffordInputs(prev => ({ ...prev, includePmi: e.target.checked }))}
                    />
                    Include PMI (Required for &lt;20% down)
                  </label>
                  {affordInputs.includePmi && (
                    <div style={{ marginTop: 8 }}>
                      <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                        PMI Rate (% of loan annually)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={affordInputs.pmiRate}
                        onChange={(e) => setAffordInputs(prev => ({ ...prev, pmiRate: Number(e.target.value) }))}
                        style={{ width: 100, padding: 6, border: "1px solid #d1d5db", borderRadius: 4 }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Affordability Results */}
            <div>
              {/* Max Home Price */}
              <div
                style={{
                  padding: 24,
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  borderRadius: 12,
                  color: "#fff",
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>You Can Afford Up To</div>
                <div style={{ fontSize: 42, fontWeight: 700 }}>{fmt(affordabilityCalc.maxPurchasePrice)}</div>
                <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>
                  with {fmtDecimal(affordInputs.monthlyBudget)} monthly budget
                </div>
              </div>

              {/* Key Numbers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Down Payment Needed</div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{fmt(affordabilityCalc.requiredDownPayment)}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>({affordInputs.downPaymentPercent}%)</div>
                </div>
                <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Loan Amount</div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{fmt(affordabilityCalc.maxLoanAmount)}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>({100 - affordInputs.downPaymentPercent}% financed)</div>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div style={{ padding: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Estimated Monthly Payment</h3>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "10px 0" }}>Principal & Interest</td>
                      <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmtDecimal(affordabilityCalc.monthlyPI)}</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "10px 0" }}>Property Tax</td>
                      <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmtDecimal(affordabilityCalc.monthlyTax)}</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "10px 0" }}>Insurance</td>
                      <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmtDecimal(affordabilityCalc.monthlyInsurance)}</td>
                    </tr>
                    {affordInputs.includePmi && affordabilityCalc.monthlyPMI > 0 && (
                      <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "10px 0" }}>PMI</td>
                        <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmtDecimal(affordabilityCalc.monthlyPMI)}</td>
                      </tr>
                    )}
                    {affordInputs.hoaMonthly > 0 && (
                      <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "10px 0" }}>HOA</td>
                        <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmtDecimal(affordabilityCalc.monthlyHOA)}</td>
                      </tr>
                    )}
                    <tr style={{ background: "#f9fafb" }}>
                      <td style={{ padding: "12px 0", fontWeight: 700 }}>Total</td>
                      <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 700, fontSize: 18 }}>{fmtDecimal(affordabilityCalc.totalMonthly)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Transfer to Calculator Button */}
              <button
                onClick={() => {
                  handleInputChange("purchasePrice", Math.round(affordabilityCalc.maxPurchasePrice));
                  handleInputChange("interestRate", affordInputs.interestRate);
                  handleInputChange("loanTermYears", affordInputs.loanTermYears);
                  handleInputChange("downPaymentPercent", affordInputs.downPaymentPercent);
                  handleInputChange("hoaMonthly", affordInputs.hoaMonthly);
                  handleInputChange("pmiRate", affordInputs.pmiRate);
                  handleInputChange("includePmi", affordInputs.includePmi);
                  handleInputChange("propertyTaxAnnual", Math.round(affordabilityCalc.maxPurchasePrice * (affordInputs.propertyTaxRate / 100)));
                  handleInputChange("insuranceAnnual", Math.round(affordabilityCalc.maxPurchasePrice * (affordInputs.insuranceRate / 100)));
                  setActiveTab("calculator");
                }}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 15,
                }}
              >
                Use This Price in Calculator
              </button>
            </div>
          </div>

          {/* Affordability Tips */}
          <div style={{ marginTop: 32, padding: 24, background: "#f9fafb", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Tips for Affordability</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div style={{ padding: 16, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>28%</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Front-End Ratio</div>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                  Housing costs should be less than 28% of gross monthly income
                </p>
              </div>
              <div style={{ padding: 16, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>36%</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Back-End Ratio</div>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                  Total debt payments should be less than 36% of gross monthly income
                </p>
              </div>
              <div style={{ padding: 16, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>3-6 mo</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Emergency Fund</div>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                  Keep 3-6 months of expenses saved after down payment
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
