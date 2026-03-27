"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import AttachToContact from "@/components/attach-to-contact";
import CalculatorBrandedExport from "../../components/calculator-branded-export";
import MLSImport, { type MLSPropertyData } from "@/components/mls-import";
import { calculateSTR, type STRInput } from "@/lib/calculators/str";

const sectionStyle = { background: "#f9fafb", borderRadius: 8, padding: 16, marginBottom: 16 };
const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 4,
};

const formatCurrency = (value: number) => {
  if (!isFinite(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  if (!isFinite(value)) return "N/A";
  return `${value.toFixed(2)}%`;
};

export default function STRAnalyzerClient() {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    purchasePrice: 500000,
    downPaymentPercent: 25,
    interestRate: 7,
    loanTermYears: 30,
    closingCostPercent: 3,
    propertyTaxAnnual: 5000,
    insuranceAnnual: 2400,
    hoaMonthly: 0,
    averageNightlyRate: 250,
    occupancyRatePercent: 70,
    cleaningFeePerStay: 150,
    averageStayNights: 4,
    propertyMgmtPercent: 20,
    maintenancePercent: 5,
    utilitiesMonthly: 300,
    internetMonthly: 100,
    suppliesMonthly: 100,
    platformFeePercent: 3,
    furnishingBudget: 15000,
    getPercent: 4.712,
    tatPercent: 10.25,
    otherTaxPercent: 0,
    annualAppreciationPercent: 3,
    annualRevenueGrowthPercent: 2,
  });

  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");

  const handleInputChange = (field: string, value: number | string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMLSImport = (p: MLSPropertyData) => {
    setFormData((prev) => ({
      ...prev,
      name: `STR - ${p.address}`,
      address: p.address,
      purchasePrice: p.listPrice,
      propertyTaxAnnual: p.taxAnnual,
      insuranceAnnual: p.insuranceAnnual,
      hoaMonthly: p.associationFee || 0,
    }));
  };

  const analysis = useMemo(() => {
    const input: STRInput = { ...formData };
    return calculateSTR(input);
  }, [formData]);

  const multiplier = viewMode === "yearly" ? 12 : 1;

  const exportToExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const summaryData: (string | number)[][] = [
      ["Short-Term Rental Analysis"],
      ["Property", formData.address || formData.name],
      ["Purchase Price", formData.purchasePrice],
      ["Nightly Rate", formData.averageNightlyRate],
      ["Occupancy", `${formData.occupancyRatePercent}%`],
      [],
      ["Monthly Cash Flow", analysis.monthlyCashFlow],
      ["Annual Cash Flow", analysis.annualCashFlow],
      ["Cap Rate", `${analysis.capRate.toFixed(2)}%`],
      ["Cash-on-Cash", `${analysis.cashOnCash.toFixed(2)}%`],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

    const projData: (string | number)[][] = [
      ["Year", "Gross Revenue", "Expenses", "Cash Flow", "Property Value", "Equity"],
    ];
    analysis.yearlyProjections.forEach((y) =>
      projData.push([y.year, y.grossRevenue, y.totalExpenses, y.cashFlow, y.propertyValue, y.equity]),
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(projData), "Projections");

    XLSX.writeFile(wb, `STR_Analysis_${formData.address || "property"}.xlsx`);
  }, [formData, analysis]);

  const exportToPDF = useCallback(() => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Short-Term Rental Analysis", 20, 20);
    doc.setFontSize(12);
    doc.text(formData.address || formData.name || "Property", 20, 30);
    let y = 45;
    const addLine = (label: string, value: string) => {
      doc.text(label, 20, y);
      doc.text(value, 120, y);
      y += 8;
    };
    addLine("Purchase Price", formatCurrency(formData.purchasePrice));
    addLine("Nightly Rate", formatCurrency(formData.averageNightlyRate));
    addLine("Occupancy", `${formData.occupancyRatePercent}%`);
    addLine("Monthly Cash Flow", formatCurrency(analysis.monthlyCashFlow));
    addLine("Annual Cash Flow", formatCurrency(analysis.annualCashFlow));
    addLine("Cap Rate", formatPercent(analysis.capRate));
    addLine("Cash-on-Cash Return", formatPercent(analysis.cashOnCash));
    addLine("DSCR", analysis.dscr.toFixed(2));
    addLine("Break-Even Occupancy", formatPercent(analysis.breakEvenOccupancy));
    addLine("Total Cash Invested", formatCurrency(analysis.totalCashInvested));
    doc.save(`STR_Analysis_${formData.address || "property"}.pdf`);
  }, [formData, analysis]);

  const generateFile = useCallback(
    (format: "pdf" | "xlsx"): Blob => {
      if (format === "xlsx") {
        const wb = XLSX.utils.book_new();
        const data: (string | number)[][] = [
          ["SHORT-TERM RENTAL ANALYSIS"],
          [],
          ["Property", formData.address || formData.name || "N/A"],
          ["Purchase Price", formData.purchasePrice],
          ["Nightly Rate", formData.averageNightlyRate],
          ["Occupancy", `${formData.occupancyRatePercent}%`],
          [],
          ["Monthly Cash Flow", analysis.monthlyCashFlow],
          ["Annual Cash Flow", analysis.annualCashFlow],
          ["Cap Rate", `${analysis.capRate.toFixed(2)}%`],
          ["Cash-on-Cash", `${analysis.cashOnCash.toFixed(2)}%`],
          ["DSCR", analysis.dscr.toFixed(2)],
          ["Break-Even Occupancy", `${analysis.breakEvenOccupancy.toFixed(2)}%`],
          ["Total Cash Invested", analysis.totalCashInvested],
        ];
        const sheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, sheet, "STR Summary");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      }
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Short-Term Rental Analysis", 20, 20);
      doc.setFontSize(12);
      doc.text(formData.address || formData.name || "Property", 20, 30);
      let y = 45;
      const addLine = (label: string, value: string) => {
        doc.text(label, 20, y);
        doc.text(value, 120, y);
        y += 8;
      };
      addLine("Purchase Price", formatCurrency(formData.purchasePrice));
      addLine("Nightly Rate", formatCurrency(formData.averageNightlyRate));
      addLine("Occupancy", `${formData.occupancyRatePercent}%`);
      addLine("Monthly Cash Flow", formatCurrency(analysis.monthlyCashFlow));
      addLine("Annual Cash Flow", formatCurrency(analysis.annualCashFlow));
      addLine("Cap Rate", formatPercent(analysis.capRate));
      addLine("Cash-on-Cash Return", formatPercent(analysis.cashOnCash));
      addLine("DSCR", analysis.dscr.toFixed(2));
      addLine("Break-Even Occupancy", formatPercent(analysis.breakEvenOccupancy));
      addLine("Total Cash Invested", formatCurrency(analysis.totalCashInvested));
      return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
    },
    [formData, analysis],
  );

  return (
    <div>
      <MLSImport onImport={handleMLSImport} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 24, alignItems: "start" }}>
        {/* LEFT PANEL - Inputs */}
        <div>
          {/* Property Information */}
          <div style={sectionStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Property Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Analysis Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Waikiki STR"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="123 Main St, City, ST"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Purchase & Financing */}
          <div style={sectionStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Purchase & Financing</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Purchase Price</label>
                <input
                  type="number"
                  value={formData.purchasePrice}
                  onChange={(e) => handleInputChange("purchasePrice", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Down Payment (%)</label>
                <input
                  type="number"
                  step={1}
                  value={formData.downPaymentPercent}
                  onChange={(e) => handleInputChange("downPaymentPercent", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Interest Rate (%)</label>
                <input
                  type="number"
                  step={0.125}
                  value={formData.interestRate}
                  onChange={(e) => handleInputChange("interestRate", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Loan Term (years)</label>
                <input
                  type="number"
                  value={formData.loanTermYears}
                  onChange={(e) => handleInputChange("loanTermYears", parseInt(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Closing Costs (%)</label>
                <input
                  type="number"
                  step={0.5}
                  value={formData.closingCostPercent}
                  onChange={(e) => handleInputChange("closingCostPercent", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Furnishing Budget</label>
                <input
                  type="number"
                  value={formData.furnishingBudget}
                  onChange={(e) => handleInputChange("furnishingBudget", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Rental Income */}
          <div style={sectionStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Rental Income</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Average Nightly Rate</label>
                <input
                  type="number"
                  value={formData.averageNightlyRate}
                  onChange={(e) => handleInputChange("averageNightlyRate", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Occupancy Rate (%)</label>
                <input
                  type="number"
                  step={1}
                  value={formData.occupancyRatePercent}
                  onChange={(e) => handleInputChange("occupancyRatePercent", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Cleaning Fee / Stay</label>
                <input
                  type="number"
                  value={formData.cleaningFeePerStay}
                  onChange={(e) => handleInputChange("cleaningFeePerStay", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Average Stay (nights)</label>
                <input
                  type="number"
                  step={1}
                  value={formData.averageStayNights}
                  onChange={(e) => handleInputChange("averageStayNights", parseFloat(e.target.value) || 1)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Operating Expenses */}
          <div style={sectionStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Operating Expenses</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Property Management (%)</label>
                <input
                  type="number"
                  step={1}
                  value={formData.propertyMgmtPercent}
                  onChange={(e) => handleInputChange("propertyMgmtPercent", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Maintenance (%)</label>
                <input
                  type="number"
                  step={1}
                  value={formData.maintenancePercent}
                  onChange={(e) => handleInputChange("maintenancePercent", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Utilities (monthly)</label>
                <input
                  type="number"
                  value={formData.utilitiesMonthly}
                  onChange={(e) => handleInputChange("utilitiesMonthly", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Internet (monthly)</label>
                <input
                  type="number"
                  value={formData.internetMonthly}
                  onChange={(e) => handleInputChange("internetMonthly", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Supplies (monthly)</label>
                <input
                  type="number"
                  value={formData.suppliesMonthly}
                  onChange={(e) => handleInputChange("suppliesMonthly", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Platform Fee (%)</label>
                <input
                  type="number"
                  step={0.5}
                  value={formData.platformFeePercent}
                  onChange={(e) => handleInputChange("platformFeePercent", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Taxes & Assessments */}
          <div style={sectionStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Taxes & Assessments</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Property Tax (annual)</label>
                <input
                  type="number"
                  value={formData.propertyTaxAnnual}
                  onChange={(e) => handleInputChange("propertyTaxAnnual", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Insurance (annual)</label>
                <input
                  type="number"
                  value={formData.insuranceAnnual}
                  onChange={(e) => handleInputChange("insuranceAnnual", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>HOA (monthly)</label>
                <input
                  type="number"
                  value={formData.hoaMonthly}
                  onChange={(e) => handleInputChange("hoaMonthly", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>GET (%)</label>
                <input
                  type="number"
                  step={0.001}
                  value={formData.getPercent}
                  onChange={(e) => handleInputChange("getPercent", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>TAT (%)</label>
                <input
                  type="number"
                  step={0.01}
                  value={formData.tatPercent}
                  onChange={(e) => handleInputChange("tatPercent", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Other Tax (%)</label>
                <input
                  type="number"
                  step={0.01}
                  value={formData.otherTaxPercent}
                  onChange={(e) => handleInputChange("otherTaxPercent", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#6b7280" }}>
              Hawaii defaults (GET + TAT). Set to 0 for mainland.
            </p>
          </div>

          {/* Projections */}
          <div style={sectionStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Projections</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Annual Appreciation (%)</label>
                <input
                  type="number"
                  step={0.5}
                  value={formData.annualAppreciationPercent}
                  onChange={(e) => handleInputChange("annualAppreciationPercent", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Annual Revenue Growth (%)</label>
                <input
                  type="number"
                  step={0.5}
                  value={formData.annualRevenueGrowthPercent}
                  onChange={(e) => handleInputChange("annualRevenueGrowthPercent", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={exportToExcel}
              style={{
                padding: "12px 24px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Export Excel
            </button>
            <button
              onClick={exportToPDF}
              style={{
                padding: "12px 24px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Export PDF
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <AttachToContact generateFile={generateFile} reportTitle="STR Analysis" />
          </div>
          <div style={{ marginTop: 12 }}>
            <CalculatorBrandedExport
              calculatorName="Short-Term Rental Analysis"
              propertyAddress={formData.address}
              summaryData={{
                Property: formData.name || "Untitled",
                "Purchase Price": formatCurrency(formData.purchasePrice),
                "Nightly Rate": formatCurrency(formData.averageNightlyRate),
                Occupancy: `${formData.occupancyRatePercent}%`,
                "Monthly Cash Flow": formatCurrency(analysis.monthlyCashFlow),
                "Annual Cash Flow": formatCurrency(analysis.annualCashFlow),
                "Cap Rate": formatPercent(analysis.capRate),
                "Cash-on-Cash Return": formatPercent(analysis.cashOnCash),
                DSCR: analysis.dscr.toFixed(2),
                "Break-Even Occupancy": formatPercent(analysis.breakEvenOccupancy),
                "Total Cash Invested": formatCurrency(analysis.totalCashInvested),
              }}
            />
          </div>
        </div>

        {/* RIGHT PANEL - Results */}
        <div>
          {/* Hero Card */}
          <div
            style={{
              background:
                analysis.monthlyCashFlow >= 0
                  ? "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)"
                  : "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
              color: "#fff",
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Monthly Cash Flow</div>
            <div style={{ fontSize: 42, fontWeight: 700 }}>{formatCurrency(analysis.monthlyCashFlow)}</div>
            <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>
              {formatCurrency(analysis.annualCashFlow)}/yr - {formatPercent(analysis.cashOnCash)} CoC
            </div>
          </div>

          {/* Monthly/Yearly Toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setViewMode("monthly")}
              style={{
                flex: 1,
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: viewMode === "monthly" ? "#2563eb" : "#e5e7eb",
                color: viewMode === "monthly" ? "#fff" : "#374151",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode("yearly")}
              style={{
                flex: 1,
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: viewMode === "yearly" ? "#2563eb" : "#e5e7eb",
                color: viewMode === "yearly" ? "#fff" : "#374151",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Yearly
            </button>
          </div>

          {/* Cash Flow Breakdown */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#6b7280" }}>
              CASH FLOW (Year 1)
            </h4>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Gross Rental Income</span>
                <strong>{formatCurrency((analysis.grossRentalIncome / 12) * multiplier)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Cleaning Income</span>
                <strong>{formatCurrency((analysis.cleaningIncome / 12) * multiplier)}</strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <span style={{ fontWeight: 600 }}>Total Gross Income</span>
                <strong>{formatCurrency((analysis.totalGrossIncome / 12) * multiplier)}</strong>
              </div>
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Total Expenses</span>
                  <strong style={{ color: "#dc2626" }}>
                    -{formatCurrency((analysis.totalExpenses / 12) * multiplier)}
                  </strong>
                </div>
              </div>
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Net Operating Income</span>
                  <strong>{formatCurrency((analysis.noi / 12) * multiplier)}</strong>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Mortgage Payment</span>
                <strong style={{ color: "#dc2626" }}>
                  -{formatCurrency((analysis.mortgage / 12) * multiplier)}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTop: "2px solid #e5e7eb",
                }}
              >
                <span style={{ fontWeight: 700 }}>Cash Flow</span>
                <strong
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: analysis.annualCashFlow >= 0 ? "#16a34a" : "#dc2626",
                  }}
                >
                  {formatCurrency((analysis.annualCashFlow / 12) * multiplier)}
                </strong>
              </div>
            </div>
          </div>

          {/* Expense Breakdown Pie Chart */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#6b7280" }}>
              EXPENSE BREAKDOWN
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analysis.expenseBreakdown.filter((e) => e.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ percent }: { percent?: number }) => percent != null ? `${(percent * 100).toFixed(0)}%` : ""}
                >
                  {analysis.expenseBreakdown
                    .filter((e) => e.value > 0)
                    .map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {analysis.expenseBreakdown
                .filter((e) => e.value > 0)
                .map((entry, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: entry.color }} />
                    <span>{entry.name}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#6b7280" }}>KEY STR METRICS</h4>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Cap Rate</span>
                <strong>{formatPercent(analysis.capRate)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Cash-on-Cash Return</span>
                <strong style={{ color: "#2563eb" }}>{formatPercent(analysis.cashOnCash)}</strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <span>DSCR</span>
                <strong style={{ color: analysis.dscr >= 1.25 ? "#16a34a" : analysis.dscr >= 1 ? "#eab308" : "#dc2626" }}>
                  {analysis.dscr.toFixed(2)}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Break-Even Occupancy</span>
                <strong>{formatPercent(analysis.breakEvenOccupancy)}</strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <span>Total Cash Invested</span>
                <strong>{formatCurrency(analysis.totalCashInvested)}</strong>
              </div>
            </div>
          </div>

          {/* Equity Accumulation Table */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#6b7280" }}>
              EQUITY ACCUMULATION
            </h4>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "4px 0" }}>Year</th>
                  <th style={{ textAlign: "right", padding: "4px 0" }}>Property Value</th>
                  <th style={{ textAlign: "right", padding: "4px 0" }}>Loan Balance</th>
                  <th style={{ textAlign: "right", padding: "4px 0" }}>LTV</th>
                  <th style={{ textAlign: "right", padding: "4px 0" }}>Equity</th>
                </tr>
              </thead>
              <tbody>
                {analysis.yearlyProjections
                  .filter((y) => [1, 2, 3, 5, 10].includes(y.year))
                  .map((y) => (
                    <tr key={y.year} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "4px 0" }}>Year {y.year}</td>
                      <td style={{ textAlign: "right", padding: "4px 0" }}>{formatCurrency(y.propertyValue)}</td>
                      <td style={{ textAlign: "right", padding: "4px 0" }}>{formatCurrency(y.loanBalance)}</td>
                      <td style={{ textAlign: "right", padding: "4px 0" }}>{formatPercent(y.ltv)}</td>
                      <td style={{ textAlign: "right", padding: "4px 0", fontWeight: 600, color: "#16a34a" }}>
                        {formatCurrency(y.equity)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Sale Analysis Table */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#6b7280" }}>SALE ANALYSIS</h4>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "4px 0" }}>Year</th>
                  <th style={{ textAlign: "right", padding: "4px 0" }}>Sale Price</th>
                  <th style={{ textAlign: "right", padding: "4px 0" }}>Selling Costs</th>
                  <th style={{ textAlign: "right", padding: "4px 0" }}>Net Proceeds</th>
                  <th style={{ textAlign: "right", padding: "4px 0" }}>Cumul. CF</th>
                  <th style={{ textAlign: "right", padding: "4px 0" }}>Total Profit</th>
                </tr>
              </thead>
              <tbody>
                {analysis.saleAnalysis.map((s) => (
                  <tr key={s.year} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "4px 0" }}>Year {s.year}</td>
                    <td style={{ textAlign: "right", padding: "4px 0" }}>{formatCurrency(s.salePrice)}</td>
                    <td style={{ textAlign: "right", padding: "4px 0" }}>{formatCurrency(s.sellingCosts)}</td>
                    <td style={{ textAlign: "right", padding: "4px 0" }}>{formatCurrency(s.netProceeds)}</td>
                    <td style={{ textAlign: "right", padding: "4px 0" }}>{formatCurrency(s.cumulativeCashFlow)}</td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: "4px 0",
                        fontWeight: 700,
                        color: s.totalProfit >= 0 ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {formatCurrency(s.totalProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
