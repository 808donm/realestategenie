"use client";

import { useState, useMemo, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import AttachToContact from "@/components/attach-to-contact";
import {
  PropertyInput,
  PropertyAnalysis,
  analyzeProperty,
} from "@/lib/calculators/investment";
import MLSImport, { type MLSPropertyData } from "@/components/mls-import";

interface SavedProperty {
  id: string;
  name: string;
  address: string;
  purchase_price: number;
  closing_costs: number;
  renovation_costs: number;
  down_payment_percent: number;
  loan_interest_rate: number;
  loan_term_years: number;
  monthly_rent: number;
  other_monthly_income: number;
  vacancy_rate_percent: number;
  property_tax_annual: number;
  insurance_annual: number;
  hoa_monthly: number;
  maintenance_percent: number;
  property_mgmt_percent: number;
  other_monthly_expenses: number;
  annual_appreciation_percent: number;
  annual_rent_increase_percent: number;
  holding_period_years: number;
}

interface Props {
  savedProperties: SavedProperty[];
}

const defaultInput: PropertyInput = {
  purchasePrice: 500000,
  closingCosts: 10000,
  renovationCosts: 0,
  downPaymentPercent: 20,
  loanInterestRate: 7.0,
  loanTermYears: 30,
  monthlyRent: 3000,
  otherMonthlyIncome: 0,
  vacancyRatePercent: 5,
  propertyTaxAnnual: 6000,
  insuranceAnnual: 1800,
  hoaMonthly: 0,
  maintenancePercent: 5,
  propertyMgmtPercent: 0,
  otherMonthlyExpenses: 0,
  annualAppreciationPercent: 3,
  annualRentIncreasePercent: 2,
  holdingPeriodYears: 5,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function getVerdict(analysis: PropertyAnalysis): string {
  const score =
    (analysis.capRate >= 5 ? 1 : 0) +
    (analysis.cashOnCash >= 8 ? 1 : 0) +
    (analysis.irr >= 12 ? 1 : 0) +
    (analysis.annualCashFlow > 0 ? 1 : 0);

  if (score >= 4) return "Strong Buy";
  if (score >= 3) return "Good Investment";
  if (score >= 2) return "Moderate";
  if (score >= 1) return "Weak";
  return "Pass";
}

function getVerdictColor(analysis: PropertyAnalysis): { bg: string; border: string; text: string } {
  const score =
    (analysis.capRate >= 5 ? 1 : 0) +
    (analysis.cashOnCash >= 8 ? 1 : 0) +
    (analysis.irr >= 12 ? 1 : 0) +
    (analysis.annualCashFlow > 0 ? 1 : 0);

  if (score >= 4) return { bg: "#dcfce7", border: "#16a34a", text: "#15803d" };
  if (score >= 3) return { bg: "#d1fae5", border: "#10b981", text: "#047857" };
  if (score >= 2) return { bg: "#fef9c3", border: "#ca8a04", text: "#a16207" };
  if (score >= 1) return { bg: "#fee2e2", border: "#f87171", text: "#b91c1c" };
  return { bg: "#fecaca", border: "#dc2626", text: "#991b1b" };
}

export default function InvestmentAnalyzerClient({ savedProperties }: Props) {
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [input, setInput] = useState<PropertyInput>(defaultInput);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const analysis = useMemo(() => analyzeProperty(input), [input]);

  const updateField = <K extends keyof PropertyInput>(
    field: K,
    value: PropertyInput[K]
  ) => {
    setInput((prev) => ({ ...prev, [field]: value }));
  };

  const handleMLSImport = (p: MLSPropertyData) => {
    setPropertyName(p.address);
    setPropertyAddress(p.address);
    setInput((prev) => ({
      ...prev,
      purchasePrice: p.listPrice,
      propertyTaxAnnual: p.taxAnnual,
      insuranceAnnual: p.insuranceAnnual,
      hoaMonthly: p.associationFee || 0,
    }));
  };

  const loadProperty = (property: SavedProperty) => {
    setSelectedPropertyId(property.id);
    setPropertyName(property.name);
    setPropertyAddress(property.address || "");
    setInput({
      purchasePrice: Number(property.purchase_price) || 0,
      closingCosts: Number(property.closing_costs) || 0,
      renovationCosts: Number(property.renovation_costs) || 0,
      downPaymentPercent: Number(property.down_payment_percent) || 20,
      loanInterestRate: Number(property.loan_interest_rate) || 7,
      loanTermYears: Number(property.loan_term_years) || 30,
      monthlyRent: Number(property.monthly_rent) || 0,
      otherMonthlyIncome: Number(property.other_monthly_income) || 0,
      vacancyRatePercent: Number(property.vacancy_rate_percent) || 5,
      propertyTaxAnnual: Number(property.property_tax_annual) || 0,
      insuranceAnnual: Number(property.insurance_annual) || 0,
      hoaMonthly: Number(property.hoa_monthly) || 0,
      maintenancePercent: Number(property.maintenance_percent) || 5,
      propertyMgmtPercent: Number(property.property_mgmt_percent) || 0,
      otherMonthlyExpenses: Number(property.other_monthly_expenses) || 0,
      annualAppreciationPercent: Number(property.annual_appreciation_percent) || 3,
      annualRentIncreasePercent: Number(property.annual_rent_increase_percent) || 2,
      holdingPeriodYears: Number(property.holding_period_years) || 5,
    });
  };

  const saveProperty = async () => {
    if (!propertyName.trim()) {
      setMessage("Please enter a property name");
      return;
    }

    setSaving(true);
    setMessage("");

    const supabase = supabaseBrowser();

    // Get current user ID for RLS
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Error: Not authenticated");
      setSaving(false);
      return;
    }

    const propertyData = {
      agent_id: user.id,
      name: propertyName,
      address: propertyAddress,
      purchase_price: input.purchasePrice,
      closing_costs: input.closingCosts,
      renovation_costs: input.renovationCosts,
      down_payment_percent: input.downPaymentPercent,
      loan_interest_rate: input.loanInterestRate,
      loan_term_years: input.loanTermYears,
      monthly_rent: input.monthlyRent,
      other_monthly_income: input.otherMonthlyIncome,
      vacancy_rate_percent: input.vacancyRatePercent,
      property_tax_annual: input.propertyTaxAnnual,
      insurance_annual: input.insuranceAnnual,
      hoa_monthly: input.hoaMonthly,
      maintenance_percent: input.maintenancePercent,
      property_mgmt_percent: input.propertyMgmtPercent,
      other_monthly_expenses: input.otherMonthlyExpenses,
      annual_appreciation_percent: input.annualAppreciationPercent,
      annual_rent_increase_percent: input.annualRentIncreasePercent,
      holding_period_years: input.holdingPeriodYears,
      calculated_noi: analysis.noi,
      calculated_cap_rate: analysis.capRate,
      calculated_cash_on_cash: analysis.cashOnCash,
      calculated_total_roi: analysis.totalROI,
      calculated_irr: analysis.irr,
    };

    if (selectedPropertyId) {
      const { error } = await supabase
        .from("investment_properties")
        .update(propertyData)
        .eq("id", selectedPropertyId);

      if (error) {
        setMessage("Error updating property: " + error.message);
      } else {
        setMessage("Property updated!");
      }
    } else {
      const { error } = await supabase
        .from("investment_properties")
        .insert(propertyData);

      if (error) {
        setMessage("Error saving property: " + error.message);
      } else {
        setMessage("Property saved!");
        // Reload page to get updated list
        window.location.reload();
      }
    }

    setSaving(false);
  };

  const newProperty = () => {
    setSelectedPropertyId(null);
    setPropertyName("");
    setPropertyAddress("");
    setInput(defaultInput);
    setMessage("");
  };

  const generateFile = useCallback((format: "pdf" | "xlsx"): Blob => {
    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      const data: (string | number)[][] = [
        ["INVESTMENT PROPERTY ANALYSIS"], [],
        ["Property", propertyName || "Untitled"],
        ["Address", propertyAddress || "N/A"],
        [],
        ["Purchase Price", input.purchasePrice],
        ["Down Payment", analysis.downPayment],
        ["Loan Amount", analysis.loanAmount],
        [],
        ["NOI", analysis.noi],
        ["Cap Rate", `${analysis.capRate.toFixed(2)}%`],
        ["Cash-on-Cash Return", `${analysis.cashOnCash.toFixed(2)}%`],
        ["IRR", `${analysis.irr.toFixed(2)}%`],
        ["Total ROI", `${analysis.totalROI.toFixed(2)}%`],
        [],
        ["Monthly Cash Flow", analysis.annualCashFlow / 12],
        ["Annual Cash Flow", analysis.annualCashFlow],
        ["Total Profit", analysis.totalProfit],
      ];
      const sheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, sheet, "Investment Summary");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("Investment Property Analysis", pw / 2, y, { align: "center" }); y += 14;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    [
      ["Property:", propertyName || "Untitled"],
      ["Purchase Price:", formatCurrency(input.purchasePrice)],
      ["Down Payment:", formatCurrency(analysis.downPayment)],
      ["Loan Amount:", formatCurrency(analysis.loanAmount)],
      ["", ""],
      ["NOI:", formatCurrency(analysis.noi)],
      ["Cap Rate:", formatPercent(analysis.capRate)],
      ["Cash-on-Cash:", formatPercent(analysis.cashOnCash)],
      ["IRR:", formatPercent(analysis.irr)],
      ["Total ROI:", formatPercent(analysis.totalROI)],
      ["", ""],
      ["Monthly Cash Flow:", formatCurrency(analysis.annualCashFlow / 12)],
      ["Annual Cash Flow:", formatCurrency(analysis.annualCashFlow)],
      ["Total Profit:", formatCurrency(analysis.totalProfit)],
    ].forEach(([l, v]) => { doc.text(l, 25, y); doc.text(v, pw - 25, y, { align: "right" }); y += 7; });
    return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
  }, [propertyName, propertyAddress, input, analysis]);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Property Summary
    const summaryData = [
      ["Investment Property Analysis Report"],
      ["Generated", new Date().toLocaleString()],
      [],
      ["PROPERTY INFORMATION"],
      ["Property Name", propertyName || "Untitled Property"],
      ["Address", propertyAddress || "N/A"],
      [],
      ["PURCHASE DETAILS"],
      ["Purchase Price", input.purchasePrice],
      ["Closing Costs", input.closingCosts],
      ["Renovation Costs", input.renovationCosts],
      ["Down Payment %", `${input.downPaymentPercent}%`],
      ["Down Payment Amount", analysis.downPayment],
      ["Loan Amount", analysis.loanAmount],
      ["Loan Interest Rate", `${input.loanInterestRate}%`],
      ["Loan Term (Years)", input.loanTermYears],
      ["Total Cash Invested", analysis.totalInvestment],
      [],
      ["INCOME"],
      ["Monthly Rent", input.monthlyRent],
      ["Other Monthly Income", input.otherMonthlyIncome],
      ["Vacancy Rate", `${input.vacancyRatePercent}%`],
      ["Gross Annual Income", analysis.grossAnnualIncome],
      ["Effective Gross Income", analysis.effectiveGrossIncome],
      [],
      ["OPERATING EXPENSES"],
      ["Property Tax (Annual)", input.propertyTaxAnnual],
      ["Insurance (Annual)", input.insuranceAnnual],
      ["HOA (Monthly)", input.hoaMonthly],
      ["Maintenance (% of Rent)", `${input.maintenancePercent}%`],
      ["Property Management (% of Rent)", `${input.propertyMgmtPercent}%`],
      ["Other Monthly Expenses", input.otherMonthlyExpenses],
      ["Total Operating Expenses", analysis.annualOperatingExpenses],
      [],
      ["KEY METRICS"],
      ["Net Operating Income (NOI)", analysis.noi],
      ["Monthly Mortgage (P&I)", analysis.monthlyMortgage],
      ["Annual Debt Service", analysis.annualDebtService],
      ["Annual Cash Flow", analysis.annualCashFlow],
      ["Monthly Cash Flow", analysis.annualCashFlow / 12],
      [],
      ["Cap Rate", `${analysis.capRate.toFixed(2)}%`],
      ["Cash-on-Cash Return", `${analysis.cashOnCash.toFixed(2)}%`],
      ["IRR", `${analysis.irr.toFixed(2)}%`],
      ["Total ROI", `${analysis.totalROI.toFixed(2)}%`],
      [],
      ["EXIT ANALYSIS"],
      ["Holding Period (Years)", input.holdingPeriodYears],
      ["Annual Appreciation", `${input.annualAppreciationPercent}%`],
      ["Annual Rent Increase", `${input.annualRentIncreasePercent}%`],
      ["Projected Sale Price", analysis.projectedSalePrice],
      ["Total Cash Flow Received", analysis.totalCashFlow],
      ["Net Sale Proceeds", analysis.projectedEquity],
      ["Total Profit", analysis.totalProfit],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    // Set column widths
    summarySheet["!cols"] = [{ wch: 30 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // Sheet 2: Year-by-Year Projections
    const projectionsData = [
      ["Year-by-Year Projections"],
      [],
      [
        "Year",
        "Gross Income",
        "Operating Expenses",
        "NOI",
        "Debt Service",
        "Cash Flow",
        "Property Value",
        "Loan Balance",
        "Equity",
        "Cumulative Cash Flow",
      ],
      ...analysis.yearlyProjections.map((year) => [
        year.year,
        year.grossIncome,
        year.operatingExpenses,
        year.noi,
        year.debtService,
        year.cashFlow,
        year.propertyValue,
        year.loanBalance,
        year.equity,
        year.cumulativeCashFlow,
      ]),
    ];

    const projectionsSheet = XLSX.utils.aoa_to_sheet(projectionsData);
    projectionsSheet["!cols"] = [
      { wch: 8 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, projectionsSheet, "Projections");

    // Sheet 3: Cash Flow Analysis
    const cashFlowData = [
      ["Annual Cash Flow Analysis (Year 1)"],
      [],
      ["INCOME"],
      ["Gross Annual Income", analysis.grossAnnualIncome],
      ["Less: Vacancy", -(analysis.grossAnnualIncome - analysis.effectiveGrossIncome)],
      ["Effective Gross Income", analysis.effectiveGrossIncome],
      [],
      ["OPERATING EXPENSES"],
      ["Property Taxes", input.propertyTaxAnnual],
      ["Insurance", input.insuranceAnnual],
      ["HOA Fees", input.hoaMonthly * 12],
      ["Maintenance", input.monthlyRent * 12 * (input.maintenancePercent / 100)],
      ["Property Management", input.monthlyRent * 12 * (input.propertyMgmtPercent / 100)],
      ["Other Expenses", input.otherMonthlyExpenses * 12],
      ["Total Operating Expenses", analysis.annualOperatingExpenses],
      [],
      ["NET OPERATING INCOME (NOI)", analysis.noi],
      [],
      ["DEBT SERVICE"],
      ["Annual Mortgage Payments", analysis.annualDebtService],
      [],
      ["CASH FLOW"],
      ["Annual Cash Flow", analysis.annualCashFlow],
      ["Monthly Cash Flow", analysis.annualCashFlow / 12],
    ];

    const cashFlowSheet = XLSX.utils.aoa_to_sheet(cashFlowData);
    cashFlowSheet["!cols"] = [{ wch: 30 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, cashFlowSheet, "Cash Flow");

    // Generate filename
    const fileName = `${propertyName || "Investment_Analysis"}_${new Date().toISOString().split("T")[0]}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {/* Left Column: Inputs */}
      <div>
        <MLSImport onImport={handleMLSImport} />

        {/* Saved Properties */}
        {savedProperties.length > 0 && (
          <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Saved Properties</h3>
              <button onClick={newProperty} style={{ padding: "6px 12px", fontSize: 12 }}>
                + New
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {savedProperties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadProperty(p)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    border: selectedPropertyId === p.id ? "2px solid #000" : "1px solid #ddd",
                    borderRadius: 6,
                    background: selectedPropertyId === p.id ? "#f5f5f5" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Property Name */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Property Info</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Property Name</label>
              <input
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                style={{ width: "100%", padding: 8 }}
                placeholder="e.g., 123 Main St Investment"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Address</label>
              <input
                type="text"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                style={{ width: "100%", padding: 8 }}
                placeholder="123 Main St, City, State"
              />
            </div>
          </div>
        </div>

        {/* Purchase Details */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Purchase Details</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Purchase Price</label>
                <input
                  type="number"
                  value={input.purchasePrice}
                  onChange={(e) => updateField("purchasePrice", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Closing Costs</label>
                <input
                  type="number"
                  value={input.closingCosts}
                  onChange={(e) => updateField("closingCosts", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Renovation Costs</label>
                <input
                  type="number"
                  value={input.renovationCosts}
                  onChange={(e) => updateField("renovationCosts", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Down Payment %</label>
                <input
                  type="number"
                  value={input.downPaymentPercent}
                  onChange={(e) => updateField("downPaymentPercent", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Loan Interest Rate %</label>
                <input
                  type="number"
                  step="0.125"
                  value={input.loanInterestRate}
                  onChange={(e) => updateField("loanInterestRate", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Loan Term (Years)</label>
                <input
                  type="number"
                  value={input.loanTermYears}
                  onChange={(e) => updateField("loanTermYears", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Income */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Income</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Monthly Rent</label>
                <input
                  type="number"
                  value={input.monthlyRent}
                  onChange={(e) => updateField("monthlyRent", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Other Monthly Income</label>
                <input
                  type="number"
                  value={input.otherMonthlyIncome}
                  onChange={(e) => updateField("otherMonthlyIncome", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Vacancy Rate %</label>
              <input
                type="number"
                value={input.vacancyRatePercent}
                onChange={(e) => updateField("vacancyRatePercent", Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Operating Expenses</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Property Tax (Annual)</label>
                <input
                  type="number"
                  value={input.propertyTaxAnnual}
                  onChange={(e) => updateField("propertyTaxAnnual", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Insurance (Annual)</label>
                <input
                  type="number"
                  value={input.insuranceAnnual}
                  onChange={(e) => updateField("insuranceAnnual", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>HOA (Monthly)</label>
                <input
                  type="number"
                  value={input.hoaMonthly}
                  onChange={(e) => updateField("hoaMonthly", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Other Monthly Expenses</label>
                <input
                  type="number"
                  value={input.otherMonthlyExpenses}
                  onChange={(e) => updateField("otherMonthlyExpenses", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Maintenance (% of Rent)</label>
                <input
                  type="number"
                  value={input.maintenancePercent}
                  onChange={(e) => updateField("maintenancePercent", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Property Mgmt (% of Rent)</label>
                <input
                  type="number"
                  value={input.propertyMgmtPercent}
                  onChange={(e) => updateField("propertyMgmtPercent", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Growth & Holding Period */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Growth & Analysis Period</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Appreciation %/yr</label>
                <input
                  type="number"
                  step="0.5"
                  value={input.annualAppreciationPercent}
                  onChange={(e) => updateField("annualAppreciationPercent", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Rent Increase %/yr</label>
                <input
                  type="number"
                  step="0.5"
                  value={input.annualRentIncreasePercent}
                  onChange={(e) => updateField("annualRentIncreasePercent", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Holding (Years)</label>
                <input
                  type="number"
                  value={input.holdingPeriodYears}
                  onChange={(e) => updateField("holdingPeriodYears", Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={saveProperty}
            disabled={saving}
            style={{ padding: "12px 24px", fontWeight: 700 }}
          >
            {saving ? "Saving..." : selectedPropertyId ? "Update Property" : "Save Property"}
          </button>
          <button
            onClick={exportToExcel}
            style={{
              padding: "12px 24px",
              fontWeight: 700,
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Export to Excel
          </button>
          {message && <span style={{ fontSize: 14, color: message.includes("Error") ? "red" : "green" }}>{message}</span>}
        </div>
        <div style={{ marginTop: 12 }}>
          <AttachToContact generateFile={generateFile} reportTitle="Investment Property Analysis" />
        </div>
      </div>

      {/* Right Column: Results */}
      <div>
        {/* Investment Verdict */}
        <div
          style={{
            marginBottom: 20,
            padding: 20,
            borderRadius: 12,
            background: getVerdictColor(analysis).bg,
            border: `2px solid ${getVerdictColor(analysis).border}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Investment Verdict</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: getVerdictColor(analysis).text }}>
                {getVerdict(analysis)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Monthly Cash Flow</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: analysis.annualCashFlow >= 0 ? "#16a34a" : "#dc2626",
                }}
              >
                {formatCurrency(analysis.annualCashFlow / 12)}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div style={{ marginBottom: 20, padding: 20, border: "2px solid #000", borderRadius: 12, background: "#fafafa" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800 }}>Key Investment Metrics</h3>

          {/* Primary Metrics - Large Display */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 16, background: "#fff", borderRadius: 8, border: "1px solid #e6e6e6", textAlign: "center" }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, textTransform: "uppercase" }}>NOI</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: analysis.noi >= 0 ? "#16a34a" : "#dc2626" }}>
                {formatCurrency(analysis.noi)}
              </div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>Net Operating Income</div>
            </div>
            <div style={{ padding: 16, background: "#fff", borderRadius: 8, border: "1px solid #e6e6e6", textAlign: "center" }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, textTransform: "uppercase" }}>Cap Rate</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: analysis.capRate >= 5 ? "#16a34a" : analysis.capRate >= 3 ? "#ca8a04" : "#dc2626" }}>
                {formatPercent(analysis.capRate)}
              </div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>NOI / Price</div>
            </div>
            <div style={{ padding: 16, background: "#fff", borderRadius: 8, border: "1px solid #e6e6e6", textAlign: "center" }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, textTransform: "uppercase" }}>Cash-on-Cash</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: analysis.cashOnCash >= 8 ? "#16a34a" : analysis.cashOnCash >= 4 ? "#ca8a04" : "#dc2626" }}>
                {formatPercent(analysis.cashOnCash)}
              </div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>Cash Flow / Invested</div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <MetricCard
              label="IRR"
              value={formatPercent(analysis.irr)}
              description="Internal Rate of Return"
              good={analysis.irr >= 12}
            />
            <MetricCard
              label="Total ROI"
              value={formatPercent(analysis.totalROI)}
              description={`Over ${input.holdingPeriodYears} years`}
              good={analysis.totalROI >= 50}
            />
          </div>

          {/* Quick Stats Bar */}
          <div style={{ marginTop: 16, padding: 12, background: "#fff", borderRadius: 8, border: "1px solid #e6e6e6" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, textAlign: "center", fontSize: 12 }}>
              <div>
                <div style={{ opacity: 0.6 }}>Annual Cash Flow</div>
                <div style={{ fontWeight: 700, color: analysis.annualCashFlow >= 0 ? "#16a34a" : "#dc2626" }}>
                  {formatCurrency(analysis.annualCashFlow)}
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.6 }}>Total Investment</div>
                <div style={{ fontWeight: 700 }}>{formatCurrency(analysis.totalInvestment)}</div>
              </div>
              <div>
                <div style={{ opacity: 0.6 }}>Monthly Mortgage</div>
                <div style={{ fontWeight: 700 }}>{formatCurrency(analysis.monthlyMortgage)}</div>
              </div>
              <div>
                <div style={{ opacity: 0.6 }}>Total Profit</div>
                <div style={{ fontWeight: 700, color: analysis.totalProfit >= 0 ? "#16a34a" : "#dc2626" }}>
                  {formatCurrency(analysis.totalProfit)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Summary */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Investment Summary</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <SummaryRow label="Down Payment" value={formatCurrency(analysis.downPayment)} />
            <SummaryRow label="Closing + Renovation" value={formatCurrency(input.closingCosts + input.renovationCosts)} />
            <SummaryRow label="Total Cash Invested" value={formatCurrency(analysis.totalInvestment)} bold />
            <SummaryRow label="Loan Amount" value={formatCurrency(analysis.loanAmount)} />
            <SummaryRow label="Monthly Mortgage (P&I)" value={formatCurrency(analysis.monthlyMortgage)} />
          </div>
        </div>

        {/* Annual Cash Flow */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Annual Cash Flow (Year 1)</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <SummaryRow label="Gross Annual Income" value={formatCurrency(analysis.grossAnnualIncome)} />
            <SummaryRow label="Less Vacancy" value={formatCurrency(analysis.grossAnnualIncome - analysis.effectiveGrossIncome)} negative />
            <SummaryRow label="Effective Gross Income" value={formatCurrency(analysis.effectiveGrossIncome)} />
            <SummaryRow label="Operating Expenses" value={formatCurrency(analysis.annualOperatingExpenses)} negative />
            <SummaryRow label="Net Operating Income (NOI)" value={formatCurrency(analysis.noi)} bold />
            <SummaryRow label="Debt Service" value={formatCurrency(analysis.annualDebtService)} negative />
            <SummaryRow
              label="Annual Cash Flow"
              value={formatCurrency(analysis.annualCashFlow)}
              bold
              good={analysis.annualCashFlow > 0}
            />
            <SummaryRow
              label="Monthly Cash Flow"
              value={formatCurrency(analysis.annualCashFlow / 12)}
              good={analysis.annualCashFlow > 0}
            />
          </div>
        </div>

        {/* Projection Table */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>
            {input.holdingPeriodYears}-Year Projection
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd" }}>
                  <th style={{ textAlign: "left", padding: "8px 4px" }}>Year</th>
                  <th style={{ textAlign: "right", padding: "8px 4px" }}>Cash Flow</th>
                  <th style={{ textAlign: "right", padding: "8px 4px" }}>Property Value</th>
                  <th style={{ textAlign: "right", padding: "8px 4px" }}>Equity</th>
                </tr>
              </thead>
              <tbody>
                {analysis.yearlyProjections.map((year) => (
                  <tr key={year.year} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px 4px" }}>Year {year.year}</td>
                    <td style={{ textAlign: "right", padding: "8px 4px", color: year.cashFlow >= 0 ? "green" : "red" }}>
                      {formatCurrency(year.cashFlow)}
                    </td>
                    <td style={{ textAlign: "right", padding: "8px 4px" }}>{formatCurrency(year.propertyValue)}</td>
                    <td style={{ textAlign: "right", padding: "8px 4px" }}>{formatCurrency(year.equity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exit Analysis */}
        <div style={{ padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Exit Analysis (After {input.holdingPeriodYears} Years)</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <SummaryRow label="Projected Sale Price" value={formatCurrency(analysis.projectedSalePrice)} />
            <SummaryRow label="Total Cash Flow Received" value={formatCurrency(analysis.totalCashFlow)} />
            <SummaryRow label="Net Sale Proceeds" value={formatCurrency(analysis.projectedEquity)} />
            <SummaryRow label="Total Profit" value={formatCurrency(analysis.totalProfit)} bold good={analysis.totalProfit > 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  good,
}: {
  label: string;
  value: string;
  description: string;
  good?: boolean;
}) {
  return (
    <div style={{ padding: 12, background: "#fff", borderRadius: 8, border: "1px solid #e6e6e6" }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: good ? "green" : undefined }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.5 }}>{description}</div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  negative,
  good,
}: {
  label: string;
  value: string;
  bold?: boolean;
  negative?: boolean;
  good?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 700 : 400 }}>
      <span>{label}</span>
      <span style={{ color: good ? "green" : negative ? "#999" : undefined }}>
        {negative ? `(${value})` : value}
      </span>
    </div>
  );
}
