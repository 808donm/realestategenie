"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { analyzeFlip, getFlipVerdict, calculateFlipMAO, estimateRehabCosts, FlipInput } from "@/lib/calculators/flip";
import MLSImport, { type MLSPropertyData } from "@/components/mls-import";

interface SavedAnalysis {
  id: string;
  name: string;
  address?: string;
  purchase_price: number;
  after_repair_value: number;
  renovation_costs: number;
  calculated_net_profit?: number;
  calculated_roi_on_cash?: number;
  calculated_deal_score?: number;
  calculated_meets_70_rule?: boolean;
  updated_at: string;
}

interface FlipAnalyzerClientProps {
  savedAnalyses: SavedAnalysis[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(2)}%`;
};

export default function FlipAnalyzerClient({ savedAnalyses }: FlipAnalyzerClientProps) {
  const [activeTab, setActiveTab] = useState<"calculator" | "saved">("calculator");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    // Property Info
    name: "",
    address: "",
    squareFeet: 1500,

    // Purchase
    purchasePrice: 150000,
    purchaseClosingCosts: 4500,

    // Financing
    useFinancing: false,
    loanToValuePercent: 70,
    loanInterestRate: 12,
    loanPoints: 2,

    // Renovation
    renovationCosts: 35000,
    contingencyPercent: 15,
    permitsCosts: 2000,
    stagingCosts: 3000,

    // Holding Period
    holdingPeriodMonths: 4,

    // Monthly Holding Costs
    propertyTaxMonthly: 300,
    insuranceMonthly: 150,
    utilitiesMonthly: 200,
    otherHoldingCostsMonthly: 100,

    // Sale
    afterRepairValue: 250000,
    sellingCostsPercent: 8,
  });

  const handleInputChange = (field: string, value: number | string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMLSImport = (p: MLSPropertyData) => {
    setFormData((prev) => ({
      ...prev,
      name: `Flip - ${p.address}`,
      address: p.address,
      squareFeet: p.livingArea || prev.squareFeet,
      purchasePrice: p.listPrice,
      afterRepairValue: Math.round(p.listPrice * 1.3),
      propertyTaxMonthly: Math.round(p.taxAnnual / 12),
      insuranceMonthly: Math.round(p.insuranceAnnual / 12),
    }));
  };

  // Calculate analysis
  const analysis = useMemo(() => {
    const input: FlipInput = {
      purchasePrice: formData.purchasePrice,
      purchaseClosingCosts: formData.purchaseClosingCosts,
      useFinancing: formData.useFinancing,
      loanToValuePercent: formData.loanToValuePercent,
      loanInterestRate: formData.loanInterestRate,
      loanPoints: formData.loanPoints,
      renovationCosts: formData.renovationCosts,
      contingencyPercent: formData.contingencyPercent,
      holdingPeriodMonths: formData.holdingPeriodMonths,
      propertyTaxMonthly: formData.propertyTaxMonthly,
      insuranceMonthly: formData.insuranceMonthly,
      utilitiesMonthly: formData.utilitiesMonthly,
      otherHoldingCostsMonthly: formData.otherHoldingCostsMonthly,
      afterRepairValue: formData.afterRepairValue,
      sellingCostsPercent: formData.sellingCostsPercent,
      stagingCosts: formData.stagingCosts,
      permitsCosts: formData.permitsCosts,
    };
    return analyzeFlip(input);
  }, [formData]);

  const verdict = useMemo(() => getFlipVerdict(analysis), [analysis]);
  const maoCalc = useMemo(
    () => calculateFlipMAO(formData.afterRepairValue, formData.renovationCosts),
    [formData.afterRepairValue, formData.renovationCosts]
  );

  // Rehab cost estimate
  const [rehabLevel, setRehabLevel] = useState<"cosmetic" | "moderate" | "major" | "gut">("moderate");
  const rehabEstimate = useMemo(
    () => estimateRehabCosts(formData.squareFeet, rehabLevel),
    [formData.squareFeet, rehabLevel]
  );

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setSaveMessage({ type: "error", text: "Please enter a name for this analysis" });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/analyzers/flip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Include calculated results
          calculated_all_in_cost: analysis.allInCost,
          calculated_total_cash_required: analysis.totalCashRequired,
          calculated_gross_profit: analysis.grossProfit,
          calculated_net_profit: analysis.netProfit,
          calculated_roi_on_cash: analysis.roiOnCash,
          calculated_annualized_roi: analysis.annualizedROI,
          calculated_profit_margin: analysis.profitMargin,
          calculated_deal_score: analysis.dealScore,
          calculated_meets_70_rule: analysis.meetsRule70,
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
      const response = await fetch(`/api/analyzers/flip/${id}`);
      if (!response.ok) throw new Error("Failed to load");
      const data = await response.json();

      setFormData({
        name: data.name || "",
        address: data.address || "",
        squareFeet: data.square_feet || 1500,
        purchasePrice: data.purchase_price || 150000,
        purchaseClosingCosts: data.purchase_closing_costs || 4500,
        useFinancing: data.use_financing || false,
        loanToValuePercent: data.loan_to_value_percent || 70,
        loanInterestRate: data.loan_interest_rate || 12,
        loanPoints: data.loan_points || 2,
        renovationCosts: data.renovation_costs || 35000,
        contingencyPercent: data.contingency_percent || 15,
        permitsCosts: data.permits_costs || 2000,
        stagingCosts: data.staging_costs || 3000,
        holdingPeriodMonths: data.holding_period_months || 4,
        propertyTaxMonthly: data.property_tax_monthly || 300,
        insuranceMonthly: data.insurance_monthly || 150,
        utilitiesMonthly: data.utilities_monthly || 200,
        otherHoldingCostsMonthly: data.other_holding_costs_monthly || 100,
        afterRepairValue: data.after_repair_value || 250000,
        sellingCostsPercent: data.selling_costs_percent || 8,
      });
      setActiveTab("calculator");
    } catch {
      setSaveMessage({ type: "error", text: "Error loading analysis" });
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Flip Summary
    const summaryData = [
      ["House Flip Analysis Report"],
      ["Generated", new Date().toLocaleString()],
      [],
      ["PROPERTY INFORMATION"],
      ["Property Name", formData.name || "Untitled Property"],
      ["Address", formData.address || "N/A"],
      ["Square Feet", formData.squareFeet],
      [],
      ["PURCHASE"],
      ["Purchase Price", formData.purchasePrice],
      ["Closing Costs", formData.purchaseClosingCosts],
      ["Total Purchase Cost", analysis.totalPurchaseCost],
      [],
      ["70% RULE ANALYSIS"],
      ["After Repair Value (ARV)", formData.afterRepairValue],
      ["70% of ARV", formData.afterRepairValue * 0.7],
      ["Less: Renovation Costs", formData.renovationCosts],
      ["Max Purchase (70% Rule)", analysis.maxPurchaseAt70],
      ["Meets 70% Rule", analysis.meetsRule70 ? "YES" : "No"],
      [],
      ["MAX ALLOWABLE OFFER (MAO)"],
      ["Target Profit (15%)", maoCalc.breakdown.desiredProfit],
      ["MAO", maoCalc.mao],
      [],
      ["FINANCING"],
      ["Using Financing", formData.useFinancing ? "Yes" : "No (Cash)"],
    ];

    if (formData.useFinancing) {
      summaryData.push(
        ["Loan-to-Value", `${formData.loanToValuePercent}%`],
        ["Loan Amount", formData.purchasePrice * (formData.loanToValuePercent / 100)],
        ["Interest Rate", `${formData.loanInterestRate}%`],
        ["Points", `${formData.loanPoints}%`],
        ["Points Cost", analysis.loanPointsCost],
        ["Interest During Hold", analysis.interestCostsDuringHold],
        ["Down Payment Required", analysis.totalCashRequired]
      );
    }

    summaryData.push(
      [],
      ["RENOVATION"],
      ["Base Renovation Costs", formData.renovationCosts],
      ["Contingency", `${formData.contingencyPercent}%`],
      ["Contingency Amount", formData.renovationCosts * (formData.contingencyPercent / 100)],
      ["Permits", formData.permitsCosts],
      ["Staging", formData.stagingCosts],
      ["Total Renovation Cost", analysis.totalRenovationCost],
      [],
      ["HOLDING PERIOD"],
      ["Duration (Months)", formData.holdingPeriodMonths],
      ["Property Tax / Month", formData.propertyTaxMonthly],
      ["Insurance / Month", formData.insuranceMonthly],
      ["Utilities / Month", formData.utilitiesMonthly],
      ["Other Costs / Month", formData.otherHoldingCostsMonthly],
      ["Total Holding Costs", analysis.totalHoldingCosts],
      [],
      ["SALE"],
      ["After Repair Value (ARV)", formData.afterRepairValue],
      ["Selling Costs", `${formData.sellingCostsPercent}%`],
      ["Selling Costs Amount", analysis.sellingCosts],
      ["Net Sale Proceeds", formData.afterRepairValue - analysis.sellingCosts],
      [],
      ["COST SUMMARY"],
      ["Total Purchase Cost", analysis.totalPurchaseCost],
      ["Total Renovation Cost", analysis.totalRenovationCost],
      ["Total Holding Costs", analysis.totalHoldingCosts],
      ["Total Selling Costs", analysis.sellingCosts],
      ["All-In Cost", analysis.allInCost],
      [],
      ["PROFIT ANALYSIS"],
      ["Gross Profit", analysis.grossProfit],
      ["Net Profit", analysis.netProfit],
      ["Profit Margin", `${analysis.profitMargin.toFixed(2)}%`],
      ["Profit Per Month", analysis.profitPerMonth],
      [],
      ["RETURN ON INVESTMENT"],
      ["ROI on Cash Invested", `${analysis.roiOnCash.toFixed(2)}%`],
      ["ROI on Total Cost", `${analysis.roiOnTotalCost.toFixed(2)}%`],
      ["Annualized ROI", `${analysis.annualizedROI.toFixed(2)}%`],
      [],
      ["BREAK-EVEN ANALYSIS"],
      ["Break-Even Sale Price", analysis.breakEvenSalePrice],
      ["Safety Margin", `${analysis.safetyMargin.toFixed(2)}%`],
      [],
      ["DEAL SCORE"],
      ["Score", `${analysis.dealScore.toFixed(1)} / 5`],
      ["Verdict", verdict.verdict]
    );

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, "Flip Summary");

    // Sheet 2: Monthly Breakdown
    const monthlyData: (string | number)[][] = [
      ["Monthly Cash Flow Breakdown"],
      [],
      ["Month", "Holding Costs", formData.useFinancing ? "Interest" : "", "Cumulative Costs"],
    ];

    const monthlyHoldingCost = formData.propertyTaxMonthly + formData.insuranceMonthly +
      formData.utilitiesMonthly + formData.otherHoldingCostsMonthly;
    const monthlyInterest = formData.useFinancing ?
      (formData.purchasePrice * (formData.loanToValuePercent / 100) * (formData.loanInterestRate / 100) / 12) : 0;

    let cumulative = 0;
    for (let i = 1; i <= formData.holdingPeriodMonths; i++) {
      cumulative += monthlyHoldingCost + monthlyInterest;
      monthlyData.push([
        i,
        monthlyHoldingCost,
        formData.useFinancing ? monthlyInterest : "",
        cumulative,
      ]);
    }

    const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData);
    monthlySheet["!cols"] = [{ wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, monthlySheet, "Monthly Breakdown");

    // Sheet 3: Rehab Estimate Reference
    const rehabData = [
      ["Rehab Cost Estimator Reference"],
      [],
      ["Based on", `${formData.squareFeet} sqft`],
      [],
      ["Rehab Level", "Low ($/sqft)", "High ($/sqft)", "Low Total", "High Total", "Mid Total"],
      ["Cosmetic", "$15", "$35", formData.squareFeet * 15, formData.squareFeet * 35, formData.squareFeet * 25],
      ["Moderate", "$30", "$60", formData.squareFeet * 30, formData.squareFeet * 60, formData.squareFeet * 45],
      ["Major", "$50", "$100", formData.squareFeet * 50, formData.squareFeet * 100, formData.squareFeet * 75],
      ["Gut Rehab", "$80", "$175", formData.squareFeet * 80, formData.squareFeet * 175, formData.squareFeet * 127.5],
      [],
      ["Current Rehab Budget", formData.renovationCosts],
      ["Cost Per Sqft", (formData.renovationCosts / formData.squareFeet).toFixed(2)],
    ];

    const rehabSheet = XLSX.utils.aoa_to_sheet(rehabData);
    rehabSheet["!cols"] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, rehabSheet, "Rehab Reference");

    // Generate filename
    const fileName = `Flip_${formData.name || "Analysis"}_${new Date().toISOString().split("T")[0]}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, fileName);
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
      <MLSImport onImport={handleMLSImport} />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab("calculator")}
          style={{
            padding: "10px 20px",
            borderRadius: 6,
            border: "none",
            background: activeTab === "calculator" ? "#ea580c" : "#e5e7eb",
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
            background: activeTab === "saved" ? "#ea580c" : "#e5e7eb",
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
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#ea580c")}
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
                      {item.calculated_meets_70_rule && (
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
                          70% RULE
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
                    style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 12 }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Purchase</div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(item.purchase_price)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Rehab</div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(item.renovation_costs)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>ARV</div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(item.after_repair_value)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Net Profit</div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: (item.calculated_net_profit || 0) >= 0 ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {formatCurrency(item.calculated_net_profit || 0)}
                      </div>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Analysis Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g., 456 Oak Ave Flip"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="456 Oak Ave, City, ST"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Square Feet</label>
                  <input
                    type="number"
                    value={formData.squareFeet}
                    onChange={(e) => handleInputChange("squareFeet", parseInt(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Purchase */}
            <div style={sectionStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "#dc2626" }}>
                Purchase
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
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 12, color: "#6b7280" }}>
                Max Purchase (70% Rule): {formatCurrency(analysis.maxPurchaseAt70)}
                {analysis.meetsRule70 ? (
                  <span style={{ color: "#16a34a", marginLeft: 8 }}>✓ Meets rule</span>
                ) : (
                  <span style={{ color: "#dc2626", marginLeft: 8 }}>✗ Over max</span>
                )}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>
                Max Allowable Offer (15% profit): {formatCurrency(maoCalc.mao)}
              </p>
            </div>

            {/* Financing */}
            <div style={sectionStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#7c3aed" }}>
                  Financing (Optional)
                </h3>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.useFinancing}
                    onChange={(e) => handleInputChange("useFinancing", e.target.checked)}
                  />
                  <span style={{ fontSize: 13 }}>Use Hard Money Loan</span>
                </label>
              </div>
              {formData.useFinancing && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>LTV (%)</label>
                    <input
                      type="number"
                      value={formData.loanToValuePercent}
                      onChange={(e) => handleInputChange("loanToValuePercent", parseFloat(e.target.value) || 0)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Interest Rate (%)</label>
                    <input
                      type="number"
                      step={0.5}
                      value={formData.loanInterestRate}
                      onChange={(e) => handleInputChange("loanInterestRate", parseFloat(e.target.value) || 0)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Points (%)</label>
                    <input
                      type="number"
                      step={0.5}
                      value={formData.loanPoints}
                      onChange={(e) => handleInputChange("loanPoints", parseFloat(e.target.value) || 0)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Renovation */}
            <div style={sectionStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "#ea580c" }}>
                Renovation
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
                  <label style={labelStyle}>Contingency (%)</label>
                  <input
                    type="number"
                    value={formData.contingencyPercent}
                    onChange={(e) => handleInputChange("contingencyPercent", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Permits</label>
                  <input
                    type="number"
                    value={formData.permitsCosts}
                    onChange={(e) => handleInputChange("permitsCosts", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Staging</label>
                  <input
                    type="number"
                    value={formData.stagingCosts}
                    onChange={(e) => handleInputChange("stagingCosts", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Rehab Estimator */}
              <div style={{ marginTop: 16, padding: 12, background: "#fff", borderRadius: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 500 }}>Rehab Estimator:</label>
                  <select
                    value={rehabLevel}
                    onChange={(e) => setRehabLevel(e.target.value as typeof rehabLevel)}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ddd" }}
                  >
                    <option value="cosmetic">Cosmetic ($15-35/sqft)</option>
                    <option value="moderate">Moderate ($30-60/sqft)</option>
                    <option value="major">Major ($50-100/sqft)</option>
                    <option value="gut">Gut Rehab ($80-175/sqft)</option>
                  </select>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Estimate for {formData.squareFeet} sqft:{" "}
                  <strong>{formatCurrency(rehabEstimate.low)}</strong> -{" "}
                  <strong>{formatCurrency(rehabEstimate.high)}</strong>
                  <button
                    onClick={() => handleInputChange("renovationCosts", rehabEstimate.mid)}
                    style={{
                      marginLeft: 12,
                      padding: "2px 8px",
                      fontSize: 11,
                      background: "#ea580c",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    Use Mid ({formatCurrency(rehabEstimate.mid)})
                  </button>
                </div>
              </div>
            </div>

            {/* Holding Period */}
            <div style={sectionStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Holding Period</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Months</label>
                  <input
                    type="number"
                    value={formData.holdingPeriodMonths}
                    onChange={(e) => handleInputChange("holdingPeriodMonths", parseInt(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Prop Tax/mo</label>
                  <input
                    type="number"
                    value={formData.propertyTaxMonthly}
                    onChange={(e) => handleInputChange("propertyTaxMonthly", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Insurance/mo</label>
                  <input
                    type="number"
                    value={formData.insuranceMonthly}
                    onChange={(e) => handleInputChange("insuranceMonthly", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Utilities/mo</label>
                  <input
                    type="number"
                    value={formData.utilitiesMonthly}
                    onChange={(e) => handleInputChange("utilitiesMonthly", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Other/mo</label>
                  <input
                    type="number"
                    value={formData.otherHoldingCostsMonthly}
                    onChange={(e) =>
                      handleInputChange("otherHoldingCostsMonthly", parseFloat(e.target.value) || 0)
                    }
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Sale */}
            <div style={sectionStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "#16a34a" }}>Sale</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>After Repair Value (ARV)</label>
                  <input
                    type="number"
                    value={formData.afterRepairValue}
                    onChange={(e) => handleInputChange("afterRepairValue", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Selling Costs (%)</label>
                  <input
                    type="number"
                    step={0.5}
                    value={formData.sellingCostsPercent}
                    onChange={(e) => handleInputChange("sellingCostsPercent", parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Save and Export Buttons */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "12px 24px",
                  background: "#ea580c",
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
                Export to Excel
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

            {/* 70% Rule Badge */}
            {analysis.meetsRule70 && (
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
                <div style={{ fontSize: 20, fontWeight: 900 }}>✓ 70% RULE</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Purchase price meets the 70% rule!</div>
              </div>
            )}

            {/* Profit Summary */}
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
                PROFIT SUMMARY
              </h4>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Gross Profit</span>
                  <strong>{formatCurrency(analysis.grossProfit)}</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: 8,
                    borderTop: "1px solid #e5e7eb",
                    fontSize: 18,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Net Profit</span>
                  <strong style={{ color: analysis.netProfit >= 0 ? "#16a34a" : "#dc2626" }}>
                    {formatCurrency(analysis.netProfit)}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Profit Margin</span>
                  <strong>{formatPercent(analysis.profitMargin)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Profit Per Month</span>
                  <strong>{formatCurrency(analysis.profitPerMonth)}</strong>
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
                RETURN ON INVESTMENT
              </h4>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>ROI on Cash</span>
                  <strong style={{ color: "#ea580c" }}>{formatPercent(analysis.roiOnCash)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>ROI on Total Cost</span>
                  <strong>{formatPercent(analysis.roiOnTotalCost)}</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: 8,
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <span>Annualized ROI</span>
                  <strong style={{ color: "#2563eb" }}>{formatPercent(analysis.annualizedROI)}</strong>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
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
                COST BREAKDOWN
              </h4>
              <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Purchase + Closing</span>
                  <span>{formatCurrency(analysis.totalPurchaseCost)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Renovation (w/ contingency)</span>
                  <span>{formatCurrency(analysis.totalRenovationCost)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Holding Costs</span>
                  <span>{formatCurrency(analysis.totalHoldingCosts)}</span>
                </div>
                {formData.useFinancing && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Interest + Points</span>
                    <span>{formatCurrency(analysis.interestCostsDuringHold + analysis.loanPointsCost)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Selling Costs</span>
                  <span>{formatCurrency(analysis.sellingCosts)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: 8,
                    borderTop: "1px solid #e5e7eb",
                    fontWeight: 600,
                  }}
                >
                  <span>All-In Cost</span>
                  <span>{formatCurrency(analysis.allInCost)}</span>
                </div>
              </div>
            </div>

            {/* Break-even */}
            <div
              style={{
                background: "#fef3c7",
                border: "1px solid #fcd34d",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "#92400e" }}>
                BREAK-EVEN ANALYSIS
              </h4>
              <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Break-Even Sale Price</span>
                  <strong>{formatCurrency(analysis.breakEvenSalePrice)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Safety Margin</span>
                  <strong style={{ color: analysis.safetyMargin >= 10 ? "#16a34a" : "#dc2626" }}>
                    {formatPercent(analysis.safetyMargin)}
                  </strong>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#92400e" }}>
                  ARV can drop {formatPercent(analysis.safetyMargin)} before losing money
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
