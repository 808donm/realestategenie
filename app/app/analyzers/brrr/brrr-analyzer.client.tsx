"use client";

import { useState, useMemo } from "react";
import { analyzeBRRR, getBRRRVerdict, calculate70PercentRule, BRRRInput } from "@/lib/calculators/brrr";

interface SavedAnalysis {
  id: string;
  name: string;
  address?: string;
  purchase_price: number;
  after_repair_value: number;
  monthly_rent: number;
  calculated_deal_score?: number;
  calculated_is_infinite_return?: boolean;
  updated_at: string;
}

interface BRRRAnalyzerClientProps {
  savedAnalyses: SavedAnalysis[];
}

const formatCurrency = (value: number) => {
  if (!isFinite(value)) return "∞";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  if (!isFinite(value)) return "∞%";
  return `${value.toFixed(2)}%`;
};

export default function BRRRAnalyzerClient({ savedAnalyses }: BRRRAnalyzerClientProps) {
  const [activeTab, setActiveTab] = useState<"calculator" | "saved">("calculator");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    // Property Info
    name: "",
    address: "",
    numberOfUnits: 1,

    // Phase 1: Purchase
    purchasePrice: 150000,
    purchaseClosingCosts: 5000,
    initialLoanPercent: 80,
    initialInterestRate: 12,

    // Phase 2: Renovation
    renovationCosts: 30000,
    renovationTimeMonths: 3,
    holdingCostsDuringReno: 500,

    // After Repair Value
    afterRepairValue: 220000,

    // Phase 3: Refinance
    refinanceLTV: 75,
    refinanceInterestRate: 7,
    refinanceLoanTermYears: 30,
    refinanceClosingCosts: 3000,

    // Phase 4: Rent
    monthlyRent: 1800,
    otherMonthlyIncome: 0,
    vacancyRatePercent: 5,
    propertyTaxAnnual: 2400,
    insuranceAnnual: 1200,
    maintenancePercent: 5,
    propertyMgmtPercent: 0,
    otherMonthlyExpenses: 0,

    // Projections
    annualAppreciationPercent: 3,
    annualRentIncreasePercent: 2,
    holdingPeriodYears: 5,
  });

  const handleInputChange = (field: string, value: number | string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate analysis
  const analysis = useMemo(() => {
    const input: BRRRInput = {
      purchasePrice: formData.purchasePrice,
      purchaseClosingCosts: formData.purchaseClosingCosts,
      initialLoanPercent: formData.initialLoanPercent,
      initialInterestRate: formData.initialInterestRate,
      renovationCosts: formData.renovationCosts,
      renovationTimeMonths: formData.renovationTimeMonths,
      holdingCostsDuringReno: formData.holdingCostsDuringReno,
      afterRepairValue: formData.afterRepairValue,
      refinanceLTV: formData.refinanceLTV,
      refinanceInterestRate: formData.refinanceInterestRate,
      refinanceLoanTermYears: formData.refinanceLoanTermYears,
      refinanceClosingCosts: formData.refinanceClosingCosts,
      monthlyRent: formData.monthlyRent,
      otherMonthlyIncome: formData.otherMonthlyIncome,
      vacancyRatePercent: formData.vacancyRatePercent,
      propertyTaxAnnual: formData.propertyTaxAnnual,
      insuranceAnnual: formData.insuranceAnnual,
      maintenancePercent: formData.maintenancePercent,
      propertyMgmtPercent: formData.propertyMgmtPercent,
      otherMonthlyExpenses: formData.otherMonthlyExpenses,
      numberOfUnits: formData.numberOfUnits,
      annualAppreciationPercent: formData.annualAppreciationPercent,
      annualRentIncreasePercent: formData.annualRentIncreasePercent,
      holdingPeriodYears: formData.holdingPeriodYears,
    };
    return analyzeBRRR(input);
  }, [formData]);

  const verdict = useMemo(() => getBRRRVerdict(analysis), [analysis]);
  const maxPurchase70 = useMemo(
    () => calculate70PercentRule(formData.afterRepairValue, formData.renovationCosts),
    [formData.afterRepairValue, formData.renovationCosts]
  );

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setSaveMessage({ type: "error", text: "Please enter a name for this analysis" });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/analyzers/brrr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Include calculated results
          calculated_total_cash_invested: analysis.totalCashInvested,
          calculated_cash_out_at_refi: analysis.cashOutAtRefinance,
          calculated_cash_left_in_deal: analysis.cashLeftInDeal,
          calculated_equity_captured: analysis.equityCaptured,
          calculated_annual_cash_flow: analysis.annualCashFlow,
          calculated_cash_on_cash: isFinite(analysis.cashOnCashReturn) ? analysis.cashOnCashReturn : null,
          calculated_cap_rate: analysis.capRate,
          calculated_deal_score: analysis.dealScore,
          calculated_is_infinite_return: analysis.isInfiniteReturn,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      setSaveMessage({ type: "success", text: "Analysis saved successfully!" });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ type: "error", text: "Error saving analysis" });
    } finally {
      setSaving(false);
    }
  };

  const loadAnalysis = async (id: string) => {
    try {
      const response = await fetch(`/api/analyzers/brrr/${id}`);
      if (!response.ok) throw new Error("Failed to load");
      const data = await response.json();

      setFormData({
        name: data.name || "",
        address: data.address || "",
        numberOfUnits: data.number_of_units || 1,
        purchasePrice: data.purchase_price || 150000,
        purchaseClosingCosts: data.purchase_closing_costs || 5000,
        initialLoanPercent: data.initial_loan_percent || 80,
        initialInterestRate: data.initial_interest_rate || 12,
        renovationCosts: data.renovation_costs || 30000,
        renovationTimeMonths: data.renovation_time_months || 3,
        holdingCostsDuringReno: data.holding_costs_during_reno || 500,
        afterRepairValue: data.after_repair_value || 220000,
        refinanceLTV: data.refinance_ltv || 75,
        refinanceInterestRate: data.refinance_interest_rate || 7,
        refinanceLoanTermYears: data.refinance_loan_term_years || 30,
        refinanceClosingCosts: data.refinance_closing_costs || 3000,
        monthlyRent: data.monthly_rent || 1800,
        otherMonthlyIncome: data.other_monthly_income || 0,
        vacancyRatePercent: data.vacancy_rate_percent || 5,
        propertyTaxAnnual: data.property_tax_annual || 2400,
        insuranceAnnual: data.insurance_annual || 1200,
        maintenancePercent: data.maintenance_percent || 5,
        propertyMgmtPercent: data.property_mgmt_percent || 0,
        otherMonthlyExpenses: data.other_monthly_expenses || 0,
        annualAppreciationPercent: data.annual_appreciation_percent || 3,
        annualRentIncreasePercent: data.annual_rent_increase_percent || 2,
        holdingPeriodYears: data.holding_period_years || 5,
      });
      setActiveTab("calculator");
    } catch {
      setSaveMessage({ type: "error", text: "Error loading analysis" });
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 14,
  };

  const labelStyle = {
    display: "block",
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
  };

  const sectionStyle = {
    background: "#f9fafb",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  };

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab("calculator")}
          style={{
            padding: "10px 20px",
            borderRadius: 6,
            border: "none",
            background: activeTab === "calculator" ? "#2563eb" : "#e5e7eb",
            color: activeTab === "calculator" ? "#fff" : "#374151",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Calculator
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          style={{
            padding: "10px 20px",
            borderRadius: 6,
            border: "none",
            background: activeTab === "saved" ? "#2563eb" : "#e5e7eb",
            color: activeTab === "saved" ? "#fff" : "#374151",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Saved Analyses ({savedAnalyses.length})
        </button>
      </div>

      {activeTab === "saved" ? (
        <div>
          {savedAnalyses.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No saved analyses yet. Use the calculator to create one.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {savedAnalyses.map((item) => (
                <div
                  key={item.id}
                  onClick={() => loadAnalysis(item.id)}
                  style={{
                    padding: 16,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 600 }}>{item.name}</h3>
                      {item.address && (
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>{item.address}</p>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {item.calculated_is_infinite_return && (
                        <span
                          style={{
                            background: "#16a34a",
                            color: "#fff",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          INFINITE RETURN
                        </span>
                      )}
                      {item.calculated_deal_score && (
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                          Score: {item.calculated_deal_score.toFixed(1)}/5
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 12 }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Purchase</div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(item.purchase_price)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>ARV</div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(item.after_repair_value)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Monthly Rent</div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(item.monthly_rent)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 24 }}>
          {/* Input Form */}
          <div>
            {/* Property Info */}
            <div style={sectionStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Property Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Analysis Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g., 123 Main St BRRR"
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
                <div>
                  <label style={labelStyle}>Number of Units</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.numberOfUnits}
                    onChange={(e) => handleInputChange("numberOfUnits", parseInt(e.target.value) || 1)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Phase 1: Purchase */}
            <div style={sectionStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "#dc2626" }}>
                Phase 1: Buy
              </h3>
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
                  <label style={labelStyle}>Closing Costs</label>
                  <input
                    type="number"
                    value={formData.purchaseClosingCosts}
                    onChange={(e) => handleInputChange("purchaseClosingCosts", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Initial Loan LTV (%)</label>
                  <input
                    type="number"
                    value={formData.initialLoanPercent}
                    onChange={(e) => handleInputChange("initialLoanPercent", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Hard Money Rate (%)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={formData.initialInterestRate}
                    onChange={(e) => handleInputChange("initialInterestRate", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#6b7280" }}>
                70% Rule Max Purchase: {formatCurrency(maxPurchase70)}
                {formData.purchasePrice <= maxPurchase70 ? (
                  <span style={{ color: "#16a34a", marginLeft: 8 }}>✓ Meets rule</span>
                ) : (
                  <span style={{ color: "#dc2626", marginLeft: 8 }}>✗ Over max</span>
                )}
              </p>
            </div>

            {/* Phase 2: Renovation */}
            <div style={sectionStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "#ea580c" }}>
                Phase 2: Renovate
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Renovation Costs</label>
                  <input
                    type="number"
                    value={formData.renovationCosts}
                    onChange={(e) => handleInputChange("renovationCosts", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Reno Time (months)</label>
                  <input
                    type="number"
                    value={formData.renovationTimeMonths}
                    onChange={(e) => handleInputChange("renovationTimeMonths", parseInt(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Monthly Holding Costs</label>
                  <input
                    type="number"
                    value={formData.holdingCostsDuringReno}
                    onChange={(e) => handleInputChange("holdingCostsDuringReno", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>After Repair Value (ARV)</label>
                <input
                  type="number"
                  value={formData.afterRepairValue}
                  onChange={(e) => handleInputChange("afterRepairValue", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Phase 3: Refinance */}
            <div style={sectionStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "#2563eb" }}>
                Phase 3: Refinance
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Refinance LTV (%)</label>
                  <input
                    type="number"
                    value={formData.refinanceLTV}
                    onChange={(e) => handleInputChange("refinanceLTV", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Refinance Interest Rate (%)</label>
                  <input
                    type="number"
                    step={0.125}
                    value={formData.refinanceInterestRate}
                    onChange={(e) => handleInputChange("refinanceInterestRate", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Loan Term (years)</label>
                  <input
                    type="number"
                    value={formData.refinanceLoanTermYears}
                    onChange={(e) => handleInputChange("refinanceLoanTermYears", parseInt(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Refinance Closing Costs</label>
                  <input
                    type="number"
                    value={formData.refinanceClosingCosts}
                    onChange={(e) => handleInputChange("refinanceClosingCosts", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Phase 4: Rent */}
            <div style={sectionStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "#16a34a" }}>
                Phase 4: Rent
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Monthly Rent {formData.numberOfUnits > 1 && "(per unit)"}</label>
                  <input
                    type="number"
                    value={formData.monthlyRent}
                    onChange={(e) => handleInputChange("monthlyRent", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Other Monthly Income</label>
                  <input
                    type="number"
                    value={formData.otherMonthlyIncome}
                    onChange={(e) => handleInputChange("otherMonthlyIncome", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Vacancy Rate (%)</label>
                  <input
                    type="number"
                    value={formData.vacancyRatePercent}
                    onChange={(e) => handleInputChange("vacancyRatePercent", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Annual Property Tax</label>
                  <input
                    type="number"
                    value={formData.propertyTaxAnnual}
                    onChange={(e) => handleInputChange("propertyTaxAnnual", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Annual Insurance</label>
                  <input
                    type="number"
                    value={formData.insuranceAnnual}
                    onChange={(e) => handleInputChange("insuranceAnnual", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Maintenance (%)</label>
                  <input
                    type="number"
                    value={formData.maintenancePercent}
                    onChange={(e) => handleInputChange("maintenancePercent", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Property Management (%)</label>
                  <input
                    type="number"
                    value={formData.propertyMgmtPercent}
                    onChange={(e) => handleInputChange("propertyMgmtPercent", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Other Monthly Expenses</label>
                  <input
                    type="number"
                    value={formData.otherMonthlyExpenses}
                    onChange={(e) => handleInputChange("otherMonthlyExpenses", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Projections */}
            <div style={sectionStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Projections</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Annual Appreciation (%)</label>
                  <input
                    type="number"
                    step={0.5}
                    value={formData.annualAppreciationPercent}
                    onChange={(e) =>
                      handleInputChange("annualAppreciationPercent", parseFloat(e.target.value) || 0)
                    }
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Annual Rent Increase (%)</label>
                  <input
                    type="number"
                    step={0.5}
                    value={formData.annualRentIncreasePercent}
                    onChange={(e) =>
                      handleInputChange("annualRentIncreasePercent", parseFloat(e.target.value) || 0)
                    }
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Holding Period (years)</label>
                  <input
                    type="number"
                    value={formData.holdingPeriodYears}
                    onChange={(e) => handleInputChange("holdingPeriodYears", parseInt(e.target.value) || 1)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "12px 24px",
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Analysis"}
              </button>
              {saveMessage && (
                <span
                  style={{
                    color: saveMessage.type === "success" ? "#16a34a" : "#dc2626",
                    fontSize: 14,
                  }}
                >
                  {saveMessage.text}
                </span>
              )}
            </div>
          </div>

          {/* Results Panel */}
          <div>
            {/* Verdict Card */}
            <div
              style={{
                background: verdict.color,
                color: "#fff",
                borderRadius: 12,
                padding: 20,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Deal Verdict</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{verdict.verdict}</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{verdict.description}</div>
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 36, fontWeight: 900 }}>{analysis.dealScore.toFixed(1)}</span>
                <span style={{ fontSize: 18, opacity: 0.8 }}>/5</span>
              </div>
            </div>

            {/* Infinite Return Badge */}
            {analysis.isInfiniteReturn && (
              <div
                style={{
                  background: "linear-gradient(135deg, #16a34a, #22c55e)",
                  color: "#fff",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900 }}>♾️ INFINITE RETURN</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>All cash recovered at refinance!</div>
              </div>
            )}

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
              <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#6b7280" }}>
                KEY BRRR METRICS
              </h4>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Total Cash Invested</span>
                  <strong>{formatCurrency(analysis.totalCashInvested)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Cash Out at Refinance</span>
                  <strong style={{ color: "#16a34a" }}>{formatCurrency(analysis.cashOutAtRefinance)}</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: 8,
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <span>Cash Left in Deal</span>
                  <strong style={{ color: analysis.cashLeftInDeal <= 0 ? "#16a34a" : "#374151" }}>
                    {formatCurrency(analysis.cashLeftInDeal)}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Equity Captured</span>
                  <strong>{formatCurrency(analysis.equityCaptured)}</strong>
                </div>
              </div>
            </div>

            {/* Returns */}
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
                RENTAL RETURNS
              </h4>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Monthly Cash Flow</span>
                  <strong style={{ color: analysis.monthlyCashFlow >= 0 ? "#16a34a" : "#dc2626" }}>
                    {formatCurrency(analysis.monthlyCashFlow)}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Annual Cash Flow</span>
                  <strong>{formatCurrency(analysis.annualCashFlow)}</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: 8,
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <span>Cash-on-Cash Return</span>
                  <strong style={{ color: "#2563eb" }}>{formatPercent(analysis.cashOnCashReturn)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Cap Rate</span>
                  <strong>{formatPercent(analysis.capRate)}</strong>
                </div>
              </div>
            </div>

            {/* Long-term Projection */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#6b7280" }}>
                {formData.holdingPeriodYears}-YEAR PROJECTION
              </h4>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Projected Property Value</span>
                  <strong>{formatCurrency(analysis.projectedSalePrice)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Total Profit</span>
                  <strong style={{ color: "#16a34a" }}>{formatCurrency(analysis.totalProfit)}</strong>
                </div>
              </div>

              {/* Mini projection table */}
              {analysis.yearlyProjections.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ textAlign: "left", padding: "4px 0" }}>Year</th>
                        <th style={{ textAlign: "right", padding: "4px 0" }}>Cash Flow</th>
                        <th style={{ textAlign: "right", padding: "4px 0" }}>Equity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.yearlyProjections.map((year) => (
                        <tr key={year.year} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "4px 0" }}>Year {year.year}</td>
                          <td style={{ textAlign: "right", padding: "4px 0" }}>
                            {formatCurrency(year.cashFlow)}
                          </td>
                          <td style={{ textAlign: "right", padding: "4px 0" }}>
                            {formatCurrency(year.equity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Multi-family info */}
            {formData.numberOfUnits > 1 && (
              <div
                style={{
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  borderRadius: 8,
                  padding: 16,
                  marginTop: 16,
                }}
              >
                <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "#0369a1" }}>
                  Multi-Family Metrics
                </h4>
                <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Price Per Unit</span>
                    <strong>{formatCurrency(analysis.pricePerUnit)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Total Monthly Rent</span>
                    <strong>{formatCurrency(formData.monthlyRent * formData.numberOfUnits)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
