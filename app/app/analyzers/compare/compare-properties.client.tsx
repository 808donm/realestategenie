"use client";

import { useState, useMemo } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  PropertyInput,
  analyzeProperty,
  compareProperties,
  PropertyComparison,
} from "@/lib/calculators/investment";

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

interface SavedComparison {
  id: string;
  name: string;
  description: string;
  comparison_type: string;
  property_ids: string[];
}

interface Props {
  savedProperties: SavedProperty[];
  savedComparisons: SavedComparison[];
}

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

function propertyToInput(property: SavedProperty): PropertyInput {
  return {
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
  };
}

export default function ComparePropertiesClient({ savedProperties, savedComparisons }: Props) {
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [comparisonName, setComparisonName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Calculate comparisons
  const comparisons = useMemo<PropertyComparison[]>(() => {
    if (selectedPropertyIds.length < 2) return [];

    const propertiesToCompare = savedProperties
      .filter((p) => selectedPropertyIds.includes(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        input: propertyToInput(p),
      }));

    return compareProperties(propertiesToCompare);
  }, [selectedPropertyIds, savedProperties]);

  const toggleProperty = (propertyId: string) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const loadComparison = (comparison: SavedComparison) => {
    setComparisonName(comparison.name);
    setSelectedPropertyIds(comparison.property_ids || []);
  };

  const saveComparison = async () => {
    if (!comparisonName.trim()) {
      setMessage("Please enter a comparison name");
      return;
    }
    if (selectedPropertyIds.length < 2) {
      setMessage("Select at least 2 properties to compare");
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

    const { error } = await supabase.from("property_comparisons").insert({
      agent_id: user.id,
      name: comparisonName,
      comparison_type: "investment",
      property_ids: selectedPropertyIds,
    });

    if (error) {
      setMessage("Error saving comparison: " + error.message);
    } else {
      setMessage("Comparison saved!");
      window.location.reload();
    }

    setSaving(false);
  };

  const getRankBadge = (rank: number, total: number) => {
    if (rank === 1) {
      return { bg: "#22c55e", text: "#fff", label: "Best" };
    } else if (rank === total) {
      return { bg: "#ef4444", text: "#fff", label: "Lowest" };
    }
    return { bg: "#f5f5f5", text: "#000", label: `#${rank}` };
  };

  if (savedProperties.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", border: "1px solid #e6e6e6", borderRadius: 12 }}>
        <h2 style={{ margin: "0 0 12px 0" }}>No Properties to Compare</h2>
        <p style={{ opacity: 0.7, marginBottom: 20 }}>
          Add some investment properties first using the Investment Analyzer.
        </p>
        <a
          href="/app/analyzers/investment"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "#000",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Go to Investment Analyzer
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Saved Comparisons */}
      {savedComparisons.length > 0 && (
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Saved Comparisons</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {savedComparisons.map((c) => (
              <button
                key={c.id}
                onClick={() => loadComparison(c)}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                {c.name} ({c.property_ids?.length || 0} properties)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Property Selection */}
      <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>
          Select Properties to Compare ({selectedPropertyIds.length} selected)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {savedProperties.map((property) => {
            const isSelected = selectedPropertyIds.includes(property.id);
            return (
              <button
                key={property.id}
                onClick={() => toggleProperty(property.id)}
                style={{
                  padding: 12,
                  border: isSelected ? "2px solid #000" : "1px solid #ddd",
                  borderRadius: 8,
                  background: isSelected ? "#f5f5f5" : "#fff",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{property.name}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {formatCurrency(Number(property.purchase_price))}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Rent: {formatCurrency(Number(property.monthly_rent))}/mo
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save Comparison */}
      <div style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
        <input
          type="text"
          value={comparisonName}
          onChange={(e) => setComparisonName(e.target.value)}
          placeholder="Comparison name"
          style={{ padding: 10, width: 250 }}
        />
        <button
          onClick={saveComparison}
          disabled={saving || selectedPropertyIds.length < 2}
          style={{ padding: "10px 20px", fontWeight: 700 }}
        >
          {saving ? "Saving..." : "Save Comparison"}
        </button>
        {message && (
          <span style={{ fontSize: 14, color: message.includes("Error") ? "red" : "green" }}>
            {message}
          </span>
        )}
      </div>

      {/* Comparison Results */}
      {comparisons.length >= 2 && (
        <>
          {/* Overall Rankings */}
          <div style={{ marginBottom: 20, padding: 20, border: "2px solid #000", borderRadius: 12, background: "#fafafa" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800 }}>Overall Rankings</h3>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${comparisons.length}, 1fr)`, gap: 16 }}>
              {comparisons.map((comp, index) => {
                const badge = getRankBadge(index + 1, comparisons.length);
                return (
                  <div
                    key={comp.propertyId}
                    style={{
                      padding: 16,
                      background: "#fff",
                      borderRadius: 8,
                      border: index === 0 ? "2px solid #22c55e" : "1px solid #e6e6e6",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          background: badge.bg,
                          color: badge.text,
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span style={{ fontSize: 12, opacity: 0.7 }}>Score: {comp.rankings.overall.toFixed(1)}</span>
                    </div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{comp.name}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e" }}>
                      {formatPercent(comp.analysis.irr)} IRR
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Comparison Table */}
          <div style={{ overflowX: "auto", marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd" }}>
                  <th style={{ textAlign: "left", padding: 12, background: "#f5f5f5" }}>Metric</th>
                  {comparisons.map((comp) => (
                    <th key={comp.propertyId} style={{ textAlign: "right", padding: 12, background: "#f5f5f5" }}>
                      {comp.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>Purchase Price</td>
                  {comparisons.map((comp) => (
                    <td key={comp.propertyId} style={{ textAlign: "right", padding: 12 }}>
                      {formatCurrency(
                        savedProperties.find((p) => p.id === comp.propertyId)?.purchase_price ?? 0
                      )}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>Total Investment</td>
                  {comparisons.map((comp) => (
                    <td key={comp.propertyId} style={{ textAlign: "right", padding: 12 }}>
                      {formatCurrency(comp.analysis.totalInvestment)}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>Monthly Rent</td>
                  {comparisons.map((comp) => (
                    <td key={comp.propertyId} style={{ textAlign: "right", padding: 12 }}>
                      {formatCurrency(comp.analysis.grossAnnualIncome / 12)}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>Monthly Cash Flow</td>
                  {comparisons.map((comp) => (
                    <td
                      key={comp.propertyId}
                      style={{
                        textAlign: "right",
                        padding: 12,
                        color: comp.analysis.annualCashFlow >= 0 ? "green" : "red",
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(comp.analysis.annualCashFlow / 12)}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: "1px solid #eee", background: "#fafafa" }}>
                  <td style={{ padding: 12, fontWeight: 700 }}>
                    Cap Rate
                    <RankIndicator comparisons={comparisons} metric="capRate" />
                  </td>
                  {comparisons.map((comp) => (
                    <td
                      key={comp.propertyId}
                      style={{
                        textAlign: "right",
                        padding: 12,
                        fontWeight: 700,
                        color: comp.rankings.capRate === 1 ? "#22c55e" : undefined,
                      }}
                    >
                      {formatPercent(comp.analysis.capRate)}
                      {comp.rankings.capRate === 1 && " "}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: "1px solid #eee", background: "#fafafa" }}>
                  <td style={{ padding: 12, fontWeight: 700 }}>
                    Cash-on-Cash
                    <RankIndicator comparisons={comparisons} metric="cashOnCash" />
                  </td>
                  {comparisons.map((comp) => (
                    <td
                      key={comp.propertyId}
                      style={{
                        textAlign: "right",
                        padding: 12,
                        fontWeight: 700,
                        color: comp.rankings.cashOnCash === 1 ? "#22c55e" : undefined,
                      }}
                    >
                      {formatPercent(comp.analysis.cashOnCash)}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: "1px solid #eee", background: "#fafafa" }}>
                  <td style={{ padding: 12, fontWeight: 700 }}>
                    IRR
                    <RankIndicator comparisons={comparisons} metric="irr" />
                  </td>
                  {comparisons.map((comp) => (
                    <td
                      key={comp.propertyId}
                      style={{
                        textAlign: "right",
                        padding: 12,
                        fontWeight: 700,
                        color: comp.rankings.irr === 1 ? "#22c55e" : undefined,
                      }}
                    >
                      {formatPercent(comp.analysis.irr)}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: "1px solid #eee", background: "#fafafa" }}>
                  <td style={{ padding: 12, fontWeight: 700 }}>
                    Total ROI
                    <RankIndicator comparisons={comparisons} metric="totalROI" />
                  </td>
                  {comparisons.map((comp) => (
                    <td
                      key={comp.propertyId}
                      style={{
                        textAlign: "right",
                        padding: 12,
                        fontWeight: 700,
                        color: comp.rankings.totalROI === 1 ? "#22c55e" : undefined,
                      }}
                    >
                      {formatPercent(comp.analysis.totalROI)}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>NOI (Year 1)</td>
                  {comparisons.map((comp) => (
                    <td key={comp.propertyId} style={{ textAlign: "right", padding: 12 }}>
                      {formatCurrency(comp.analysis.noi)}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>Projected Sale Price</td>
                  {comparisons.map((comp) => (
                    <td key={comp.propertyId} style={{ textAlign: "right", padding: 12 }}>
                      {formatCurrency(comp.analysis.projectedSalePrice)}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>Total Profit</td>
                  {comparisons.map((comp) => (
                    <td
                      key={comp.propertyId}
                      style={{
                        textAlign: "right",
                        padding: 12,
                        color: comp.analysis.totalProfit >= 0 ? "green" : "red",
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(comp.analysis.totalProfit)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Winner Summary */}
          {comparisons.length > 0 && (
            <div style={{ padding: 20, background: "#dcfce7", borderRadius: 12, border: "2px solid #22c55e" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 800, color: "#16a34a" }}>
                Recommendation
              </h3>
              <p style={{ margin: 0, fontSize: 14 }}>
                Based on the overall analysis, <strong>{comparisons[0].name}</strong> appears to be the
                best investment opportunity with an IRR of{" "}
                <strong>{formatPercent(comparisons[0].analysis.irr)}</strong>, Cash-on-Cash return of{" "}
                <strong>{formatPercent(comparisons[0].analysis.cashOnCash)}</strong>, and projected total
                profit of <strong>{formatCurrency(comparisons[0].analysis.totalProfit)}</strong> over the
                holding period.
              </p>
            </div>
          )}
        </>
      )}

      {selectedPropertyIds.length === 1 && (
        <div style={{ padding: 40, textAlign: "center", border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <p style={{ opacity: 0.7 }}>Select at least one more property to compare.</p>
        </div>
      )}

      {selectedPropertyIds.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <p style={{ opacity: 0.7 }}>Select properties above to start comparing.</p>
        </div>
      )}
    </div>
  );
}

function RankIndicator({
  comparisons,
  metric,
}: {
  comparisons: PropertyComparison[];
  metric: keyof PropertyComparison["rankings"];
}) {
  const best = comparisons.find((c) => c.rankings[metric] === 1);
  if (!best) return null;

  return (
    <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 8 }}>
      (Best: {best.name})
    </span>
  );
}
