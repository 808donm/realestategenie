"use client";

import { useState, useMemo } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import * as XLSX from "xlsx";
import {
  calculateTimeline,
  calculateTaxAnalysis,
  calculateReplacementRequirements,
  validateThreePropertyRule,
  TimelineStatus,
  TaxAnalysis,
  ReplacementRequirements,
  IdentifiedProperty,
} from "@/lib/calculators/exchange1031";

interface SavedExchange {
  id: string;
  name: string;
  status: string;
  relinquished_property_address: string;
  relinquished_sale_price: number;
  relinquished_original_basis: number;
  relinquished_accumulated_depreciation: number;
  relinquished_selling_costs: number;
  sale_close_date: string;
  federal_tax_rate: number;
  state_tax_rate: number;
  depreciation_recapture_rate: number;
  identified_properties: IdentifiedProperty[];
  replacement_property_id: string | null;
  replacement_purchase_price: number;
}

interface InvestmentProperty {
  id: string;
  name: string;
  address: string;
  purchase_price: number;
}

interface Props {
  savedExchanges: SavedExchange[];
  investmentProperties: InvestmentProperty[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Exchange1031Client({ savedExchanges, investmentProperties }: Props) {
  const [selectedExchangeId, setSelectedExchangeId] = useState<string | null>(null);
  const [exchangeName, setExchangeName] = useState("");

  // Relinquished property
  const [relinquishedAddress, setRelinquishedAddress] = useState("");
  const [salePrice, setSalePrice] = useState(500000);
  const [originalBasis, setOriginalBasis] = useState(400000);
  const [accumulatedDepreciation, setAccumulatedDepreciation] = useState(50000);
  const [sellingCosts, setSellingCosts] = useState(30000);
  const [existingMortgage, setExistingMortgage] = useState(200000);
  const [saleCloseDate, setSaleCloseDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Tax rates
  const [federalRate, setFederalRate] = useState(20);
  const [stateRate, setStateRate] = useState(5);
  const [recaptureRate, setRecaptureRate] = useState(25);
  const [niitRate, setNiitRate] = useState(3.8);

  // Identified properties
  const [identifiedProperties, setIdentifiedProperties] = useState<IdentifiedProperty[]>([]);
  const [newPropertyAddress, setNewPropertyAddress] = useState("");
  const [newPropertyValue, setNewPropertyValue] = useState(0);

  // Replacement
  const [replacementPurchasePrice, setReplacementPurchasePrice] = useState(0);
  const [replacementMortgage, setReplacementMortgage] = useState(0);
  const [replacementClosingCosts, setReplacementClosingCosts] = useState(0);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Calculate timeline
  const timeline = useMemo<TimelineStatus>(() => {
    return calculateTimeline(new Date(saleCloseDate));
  }, [saleCloseDate]);

  // Calculate tax analysis
  const taxAnalysis = useMemo<TaxAnalysis>(() => {
    return calculateTaxAnalysis({
      relinquished: {
        salePrice,
        originalBasis,
        accumulatedDepreciation,
        sellingCosts,
        existingMortgage,
      },
      replacement: replacementPurchasePrice > 0
        ? {
            purchasePrice: replacementPurchasePrice,
            newMortgage: replacementMortgage,
            closingCosts: replacementClosingCosts,
          }
        : undefined,
      taxRates: {
        federalCapitalGainsRate: federalRate,
        stateCapitalGainsRate: stateRate,
        depreciationRecaptureRate: recaptureRate,
        netInvestmentIncomeTax: niitRate,
      },
      saleCloseDate: new Date(saleCloseDate),
    });
  }, [
    salePrice,
    originalBasis,
    accumulatedDepreciation,
    sellingCosts,
    existingMortgage,
    replacementPurchasePrice,
    replacementMortgage,
    replacementClosingCosts,
    federalRate,
    stateRate,
    recaptureRate,
    niitRate,
    saleCloseDate,
  ]);

  // Calculate requirements
  const requirements = useMemo<ReplacementRequirements>(() => {
    return calculateReplacementRequirements({
      salePrice,
      originalBasis,
      accumulatedDepreciation,
      sellingCosts,
      existingMortgage,
    });
  }, [salePrice, originalBasis, accumulatedDepreciation, sellingCosts, existingMortgage]);

  // Validate identified properties
  const threePropertyValidation = useMemo(() => {
    return validateThreePropertyRule(identifiedProperties);
  }, [identifiedProperties]);

  const addIdentifiedProperty = () => {
    if (!newPropertyAddress.trim() || newPropertyValue <= 0) return;

    setIdentifiedProperties((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        address: newPropertyAddress,
        askingPrice: newPropertyValue,
        estimatedValue: newPropertyValue,
      },
    ]);
    setNewPropertyAddress("");
    setNewPropertyValue(0);
  };

  const removeIdentifiedProperty = (id: string) => {
    setIdentifiedProperties((prev) => prev.filter((p) => p.id !== id));
  };

  const loadExchange = (exchange: SavedExchange) => {
    setSelectedExchangeId(exchange.id);
    setExchangeName(exchange.name);
    setRelinquishedAddress(exchange.relinquished_property_address || "");
    setSalePrice(Number(exchange.relinquished_sale_price) || 0);
    setOriginalBasis(Number(exchange.relinquished_original_basis) || 0);
    setAccumulatedDepreciation(Number(exchange.relinquished_accumulated_depreciation) || 0);
    setSellingCosts(Number(exchange.relinquished_selling_costs) || 0);
    setSaleCloseDate(exchange.sale_close_date || new Date().toISOString().split("T")[0]);
    setFederalRate(Number(exchange.federal_tax_rate) || 20);
    setStateRate(Number(exchange.state_tax_rate) || 5);
    setRecaptureRate(Number(exchange.depreciation_recapture_rate) || 25);
    setIdentifiedProperties(exchange.identified_properties || []);
    setReplacementPurchasePrice(Number(exchange.replacement_purchase_price) || 0);
  };

  const saveExchange = async () => {
    if (!exchangeName.trim()) {
      setMessage("Please enter an exchange name");
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

    const exchangeData = {
      agent_id: user.id,
      name: exchangeName,
      status: timeline.status === "completed" ? "completed" : "active",
      relinquished_property_address: relinquishedAddress,
      relinquished_sale_price: salePrice,
      relinquished_original_basis: originalBasis,
      relinquished_accumulated_depreciation: accumulatedDepreciation,
      relinquished_selling_costs: sellingCosts,
      sale_close_date: saleCloseDate,
      identification_deadline: timeline.identificationDeadline.toISOString().split("T")[0],
      exchange_deadline: timeline.exchangeDeadline.toISOString().split("T")[0],
      federal_tax_rate: federalRate,
      state_tax_rate: stateRate,
      depreciation_recapture_rate: recaptureRate,
      identified_properties: identifiedProperties,
      replacement_purchase_price: replacementPurchasePrice,
      capital_gain: taxAnalysis.capitalGain,
      depreciation_recapture: taxAnalysis.depreciationRecapture,
      calculated_tax_without_exchange: taxAnalysis.totalTaxWithoutExchange,
      calculated_tax_with_exchange: taxAnalysis.taxWithExchange,
      calculated_tax_savings: taxAnalysis.taxSavings,
      cash_boot: taxAnalysis.cashBoot,
      mortgage_boot: taxAnalysis.mortgageBoot,
    };

    if (selectedExchangeId) {
      const { error } = await supabase
        .from("exchange_1031")
        .update(exchangeData)
        .eq("id", selectedExchangeId);

      if (error) {
        setMessage("Error updating exchange: " + error.message);
      } else {
        setMessage("Exchange updated!");
      }
    } else {
      const { error } = await supabase.from("exchange_1031").insert(exchangeData);

      if (error) {
        setMessage("Error saving exchange: " + error.message);
      } else {
        setMessage("Exchange saved!");
        window.location.reload();
      }
    }

    setSaving(false);
  };

  const newExchange = () => {
    setSelectedExchangeId(null);
    setExchangeName("");
    setRelinquishedAddress("");
    setSalePrice(500000);
    setOriginalBasis(400000);
    setAccumulatedDepreciation(50000);
    setSellingCosts(30000);
    setExistingMortgage(200000);
    setSaleCloseDate(new Date().toISOString().split("T")[0]);
    setIdentifiedProperties([]);
    setReplacementPurchasePrice(0);
    setReplacementMortgage(0);
    setReplacementClosingCosts(0);
    setMessage("");
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Exchange Summary
    const summaryData = [
      ["1031 Exchange Analysis Report"],
      ["Generated", new Date().toLocaleString()],
      [],
      ["EXCHANGE INFORMATION"],
      ["Exchange Name", exchangeName || "Untitled Exchange"],
      ["Status", timeline.status.replace(/_/g, " ").toUpperCase()],
      [],
      ["RELINQUISHED PROPERTY (Property Being Sold)"],
      ["Address", relinquishedAddress || "N/A"],
      ["Sale Price", salePrice],
      ["Selling Costs", sellingCosts],
      ["Original Basis", originalBasis],
      ["Accumulated Depreciation", accumulatedDepreciation],
      ["Existing Mortgage", existingMortgage],
      ["Sale Close Date", saleCloseDate],
      [],
      ["TIMELINE"],
      ["Sale Close Date", formatDate(timeline.saleCloseDate)],
      ["45-Day Identification Deadline", formatDate(timeline.identificationDeadline)],
      ["Days Until Identification", timeline.identificationExpired ? "EXPIRED" : timeline.daysUntilIdentification],
      ["180-Day Exchange Deadline", formatDate(timeline.exchangeDeadline)],
      ["Days Until Exchange", timeline.exchangeExpired ? "EXPIRED" : timeline.daysUntilExchange],
      [],
      ["TAX ANALYSIS"],
      ["Adjusted Basis", taxAnalysis.adjustedBasis],
      ["Realized Gain", taxAnalysis.realizedGain],
      ["Capital Gain", taxAnalysis.capitalGain],
      ["Depreciation Recapture", taxAnalysis.depreciationRecapture],
      [],
      ["TAX RATES"],
      ["Federal Capital Gains Rate", `${federalRate}%`],
      ["State Tax Rate", `${stateRate}%`],
      ["Depreciation Recapture Rate", `${recaptureRate}%`],
      ["Net Investment Income Tax", `${niitRate}%`],
      [],
      ["TAX WITHOUT 1031 EXCHANGE"],
      ["Federal Capital Gains Tax", taxAnalysis.federalCapitalGainsTax],
      ["State Capital Gains Tax", taxAnalysis.stateCapitalGainsTax],
      ["Depreciation Recapture Tax", taxAnalysis.depreciationRecaptureTax],
      ["Net Investment Income Tax", taxAnalysis.netInvestmentIncomeTax],
      ["Total Tax Without Exchange", taxAnalysis.totalTaxWithoutExchange],
      [],
      ["TAX WITH 1031 EXCHANGE"],
      ["Cash Boot", taxAnalysis.cashBoot],
      ["Mortgage Boot", taxAnalysis.mortgageBoot],
      ["Total Boot (Taxable)", taxAnalysis.totalBoot],
      ["Tax on Boot", taxAnalysis.taxWithExchange],
      [],
      ["TAX SAVINGS"],
      ["Tax Savings from 1031 Exchange", taxAnalysis.taxSavings],
      ["Deferred Gain", taxAnalysis.deferredGain],
      [],
      ["REPLACEMENT REQUIREMENTS (for Full Deferral)"],
      ["Minimum Purchase Price", requirements.minimumPurchasePrice],
      ["Minimum Equity to Reinvest", requirements.minimumEquity],
      ["Minimum Debt to Replace", requirements.minimumDebt],
      ["Net Equity from Sale", requirements.netEquityFromSale],
    ];

    if (replacementPurchasePrice > 0) {
      summaryData.push(
        [],
        ["SELECTED REPLACEMENT PROPERTY"],
        ["Purchase Price", replacementPurchasePrice],
        ["New Mortgage", replacementMortgage],
        ["Closing Costs", replacementClosingCosts],
        ["New Property Basis", taxAnalysis.newPropertyBasis]
      );
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 35 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // Sheet 2: Identified Properties
    if (identifiedProperties.length > 0) {
      const propertiesData = [
        ["Identified Replacement Properties"],
        ["(Must be identified within 45 days of sale)"],
        [],
        ["#", "Address", "Estimated Value", "Meets Min Price", "Notes"],
        ...identifiedProperties.map((prop, index) => [
          index + 1,
          prop.address,
          prop.estimatedValue,
          prop.estimatedValue >= requirements.minimumPurchasePrice ? "Yes" : "No",
          prop.notes || "",
        ]),
        [],
        ["Three Property Rule Status", threePropertyValidation.valid ? "VALID" : "INVALID"],
        ["Message", threePropertyValidation.message],
      ];

      const propertiesSheet = XLSX.utils.aoa_to_sheet(propertiesData);
      propertiesSheet["!cols"] = [{ wch: 5 }, { wch: 40 }, { wch: 18 }, { wch: 15 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, propertiesSheet, "Identified Properties");
    }

    // Sheet 3: Tax Comparison
    const comparisonData = [
      ["Tax Comparison: With vs Without 1031 Exchange"],
      [],
      ["Scenario", "Without Exchange", "With Exchange", "Difference"],
      ["Federal Capital Gains", taxAnalysis.federalCapitalGainsTax, taxAnalysis.totalBoot > 0 ? (taxAnalysis.taxWithExchange * 0.4) : 0, taxAnalysis.federalCapitalGainsTax - (taxAnalysis.totalBoot > 0 ? (taxAnalysis.taxWithExchange * 0.4) : 0)],
      ["State Taxes", taxAnalysis.stateCapitalGainsTax, taxAnalysis.totalBoot > 0 ? (taxAnalysis.taxWithExchange * 0.2) : 0, taxAnalysis.stateCapitalGainsTax - (taxAnalysis.totalBoot > 0 ? (taxAnalysis.taxWithExchange * 0.2) : 0)],
      ["Depreciation Recapture", taxAnalysis.depreciationRecaptureTax, taxAnalysis.totalBoot > 0 ? (taxAnalysis.taxWithExchange * 0.3) : 0, taxAnalysis.depreciationRecaptureTax - (taxAnalysis.totalBoot > 0 ? (taxAnalysis.taxWithExchange * 0.3) : 0)],
      ["NIIT", taxAnalysis.netInvestmentIncomeTax, taxAnalysis.totalBoot > 0 ? (taxAnalysis.taxWithExchange * 0.1) : 0, taxAnalysis.netInvestmentIncomeTax - (taxAnalysis.totalBoot > 0 ? (taxAnalysis.taxWithExchange * 0.1) : 0)],
      [],
      ["TOTAL TAX", taxAnalysis.totalTaxWithoutExchange, taxAnalysis.taxWithExchange, taxAnalysis.taxSavings],
      [],
      ["TAX SAVINGS", "", "", taxAnalysis.taxSavings],
      [],
      [],
      ["IMPORTANT NOTES:"],
      ["1. This analysis is for informational purposes only and should not be considered tax advice."],
      ["2. Consult with a qualified tax professional and 1031 exchange intermediary."],
      ["3. All deadlines are strict - missing them may disqualify the exchange."],
      ["4. Like-kind property rules must be followed for valid exchanges."],
    ];

    const comparisonSheet = XLSX.utils.aoa_to_sheet(comparisonData);
    comparisonSheet["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, comparisonSheet, "Tax Comparison");

    // Generate filename
    const fileName = `1031_Exchange_${exchangeName || "Analysis"}_${new Date().toISOString().split("T")[0]}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, fileName);
  };

  const getStatusColor = (status: TimelineStatus["status"]) => {
    switch (status) {
      case "on_track":
        return "#22c55e";
      case "identification_urgent":
      case "exchange_urgent":
        return "#f59e0b";
      case "identification_expired":
      case "exchange_expired":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {/* Left Column: Inputs */}
      <div>
        {/* Saved Exchanges */}
        {savedExchanges.length > 0 && (
          <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Saved Exchanges</h3>
              <button onClick={newExchange} style={{ padding: "6px 12px", fontSize: 12 }}>
                + New
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {savedExchanges.map((e) => (
                <button
                  key={e.id}
                  onClick={() => loadExchange(e)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    border: selectedExchangeId === e.id ? "2px solid #000" : "1px solid #ddd",
                    borderRadius: 6,
                    background: selectedExchangeId === e.id ? "#f5f5f5" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Exchange Name */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Exchange Info</h3>
          <div>
            <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Exchange Name</label>
            <input
              type="text"
              value={exchangeName}
              onChange={(e) => setExchangeName(e.target.value)}
              style={{ width: "100%", padding: 8 }}
              placeholder="e.g., 2024 Rental Property Exchange"
            />
          </div>
        </div>

        {/* Relinquished Property */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>
            Relinquished Property (Property Being Sold)
          </h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Property Address</label>
              <input
                type="text"
                value={relinquishedAddress}
                onChange={(e) => setRelinquishedAddress(e.target.value)}
                style={{ width: "100%", padding: 8 }}
                placeholder="123 Old Property St"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Sale Price</label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Selling Costs</label>
                <input
                  type="number"
                  value={sellingCosts}
                  onChange={(e) => setSellingCosts(Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Original Basis</label>
                <input
                  type="number"
                  value={originalBasis}
                  onChange={(e) => setOriginalBasis(Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Accumulated Depreciation</label>
                <input
                  type="number"
                  value={accumulatedDepreciation}
                  onChange={(e) => setAccumulatedDepreciation(Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Existing Mortgage</label>
                <input
                  type="number"
                  value={existingMortgage}
                  onChange={(e) => setExistingMortgage(Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Sale Close Date</label>
                <input
                  type="date"
                  value={saleCloseDate}
                  onChange={(e) => setSaleCloseDate(e.target.value)}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tax Rates */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Tax Rates</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Federal Cap Gains %</label>
              <input
                type="number"
                value={federalRate}
                onChange={(e) => setFederalRate(Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>State Tax %</label>
              <input
                type="number"
                value={stateRate}
                onChange={(e) => setStateRate(Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Depreciation Recapture %</label>
              <input
                type="number"
                value={recaptureRate}
                onChange={(e) => setRecaptureRate(Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>NIIT %</label>
              <input
                type="number"
                step="0.1"
                value={niitRate}
                onChange={(e) => setNiitRate(Number(e.target.value))}
                style={{ width: "100%", padding: 8 }}
              />
            </div>
          </div>
        </div>

        {/* Identified Properties */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>
            Identified Replacement Properties
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                fontWeight: 400,
                color: threePropertyValidation.valid ? "green" : "red",
              }}
            >
              ({identifiedProperties.length}/3)
            </span>
          </h3>
          <div style={{ display: "grid", gap: 12 }}>
            {identifiedProperties.map((prop) => (
              <div
                key={prop.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 8,
                  background: "#f5f5f5",
                  borderRadius: 6,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{prop.address}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{formatCurrency(prop.estimatedValue)}</div>
                </div>
                <button
                  onClick={() => removeIdentifiedProperty(prop.id)}
                  style={{ padding: "4px 8px", fontSize: 12, color: "red", border: "1px solid red", background: "white" }}
                >
                  Remove
                </button>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, alignItems: "end" }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Property Address</label>
                <input
                  type="text"
                  value={newPropertyAddress}
                  onChange={(e) => setNewPropertyAddress(e.target.value)}
                  style={{ width: "100%", padding: 8 }}
                  placeholder="456 New Property Ave"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Est. Value</label>
                <input
                  type="number"
                  value={newPropertyValue || ""}
                  onChange={(e) => setNewPropertyValue(Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <button
                onClick={addIdentifiedProperty}
                style={{ padding: "8px 12px" }}
                disabled={identifiedProperties.length >= 3}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Replacement Property Details */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Replacement Property (Selected)</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Purchase Price</label>
                <input
                  type="number"
                  value={replacementPurchasePrice || ""}
                  onChange={(e) => setReplacementPurchasePrice(Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>New Mortgage</label>
                <input
                  type="number"
                  value={replacementMortgage || ""}
                  onChange={(e) => setReplacementMortgage(Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Closing Costs</label>
                <input
                  type="number"
                  value={replacementClosingCosts || ""}
                  onChange={(e) => setReplacementClosingCosts(Number(e.target.value))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={saveExchange} disabled={saving} style={{ padding: "12px 24px", fontWeight: 700 }}>
            {saving ? "Saving..." : selectedExchangeId ? "Update Exchange" : "Save Exchange"}
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
          {message && (
            <span style={{ fontSize: 14, color: message.includes("Error") ? "red" : "green" }}>{message}</span>
          )}
        </div>
      </div>

      {/* Right Column: Results */}
      <div>
        {/* Timeline */}
        <div
          style={{
            marginBottom: 20,
            padding: 20,
            border: `2px solid ${getStatusColor(timeline.status)}`,
            borderRadius: 12,
            background: "#fafafa",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800 }}>1031 Exchange Timeline</h3>

          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                padding: 12,
                background: "#fff",
                borderRadius: 8,
                borderLeft: `4px solid ${timeline.identificationExpired ? "#ef4444" : timeline.daysUntilIdentification <= 7 ? "#f59e0b" : "#22c55e"}`,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>45-Day Identification Deadline</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{formatDate(timeline.identificationDeadline)}</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: timeline.identificationExpired ? "#ef4444" : timeline.daysUntilIdentification <= 7 ? "#f59e0b" : "#22c55e",
                }}
              >
                {timeline.identificationExpired
                  ? "EXPIRED"
                  : `${timeline.daysUntilIdentification} days remaining`}
              </div>
            </div>

            <div
              style={{
                padding: 12,
                background: "#fff",
                borderRadius: 8,
                borderLeft: `4px solid ${timeline.exchangeExpired ? "#ef4444" : timeline.daysUntilExchange <= 30 ? "#f59e0b" : "#22c55e"}`,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>180-Day Exchange Deadline</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{formatDate(timeline.exchangeDeadline)}</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: timeline.exchangeExpired ? "#ef4444" : timeline.daysUntilExchange <= 30 ? "#f59e0b" : "#22c55e",
                }}
              >
                {timeline.exchangeExpired ? "EXPIRED" : `${timeline.daysUntilExchange} days remaining`}
              </div>
            </div>
          </div>
        </div>

        {/* Tax Analysis */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Tax Analysis</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Adjusted Basis</span>
              <span>{formatCurrency(taxAnalysis.adjustedBasis)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Realized Gain</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(taxAnalysis.realizedGain)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 16, fontSize: 13 }}>
              <span>Capital Gain</span>
              <span>{formatCurrency(taxAnalysis.capitalGain)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 16, fontSize: 13 }}>
              <span>Depreciation Recapture</span>
              <span>{formatCurrency(taxAnalysis.depreciationRecapture)}</span>
            </div>
          </div>
        </div>

        {/* Tax Comparison */}
        <div style={{ marginBottom: 20, padding: 20, border: "2px solid #000", borderRadius: 12, background: "#fafafa" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800 }}>Tax Comparison</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: 12, background: "#fee2e2", borderRadius: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Without 1031 Exchange</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#dc2626" }}>
                {formatCurrency(taxAnalysis.totalTaxWithoutExchange)}
              </div>
              <div style={{ fontSize: 11, marginTop: 8, opacity: 0.7 }}>
                <div>Federal: {formatCurrency(taxAnalysis.federalCapitalGainsTax)}</div>
                <div>State: {formatCurrency(taxAnalysis.stateCapitalGainsTax)}</div>
                <div>Recapture: {formatCurrency(taxAnalysis.depreciationRecaptureTax)}</div>
                <div>NIIT: {formatCurrency(taxAnalysis.netInvestmentIncomeTax)}</div>
              </div>
            </div>
            <div style={{ padding: 12, background: "#dcfce7", borderRadius: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>With 1031 Exchange</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>
                {formatCurrency(taxAnalysis.taxWithExchange)}
              </div>
              {taxAnalysis.totalBoot > 0 && (
                <div style={{ fontSize: 11, marginTop: 8, opacity: 0.7 }}>
                  <div>Boot (taxable): {formatCurrency(taxAnalysis.totalBoot)}</div>
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: "#22c55e",
              borderRadius: 8,
              textAlign: "center",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.9 }}>Tax Savings</div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>{formatCurrency(taxAnalysis.taxSavings)}</div>
          </div>
        </div>

        {/* Replacement Requirements */}
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e6e6e6", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>
            Minimum Replacement Requirements (for Full Deferral)
          </h3>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Minimum Purchase Price</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(requirements.minimumPurchasePrice)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Minimum Equity to Reinvest</span>
              <span>{formatCurrency(requirements.minimumEquity)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Minimum Debt to Replace</span>
              <span>{formatCurrency(requirements.minimumDebt)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Net Equity from Sale</span>
              <span>{formatCurrency(requirements.netEquityFromSale)}</span>
            </div>
          </div>
        </div>

        {/* Boot Analysis */}
        {(taxAnalysis.cashBoot > 0 || taxAnalysis.mortgageBoot > 0) && (
          <div style={{ padding: 16, border: "1px solid #f59e0b", borderRadius: 12, background: "#fffbeb" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700, color: "#b45309" }}>
              Boot Warning (Taxable Portion)
            </h3>
            <div style={{ display: "grid", gap: 8 }}>
              {taxAnalysis.cashBoot > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Cash Boot</span>
                  <span>{formatCurrency(taxAnalysis.cashBoot)}</span>
                </div>
              )}
              {taxAnalysis.mortgageBoot > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Mortgage Boot</span>
                  <span>{formatCurrency(taxAnalysis.mortgageBoot)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span>Total Boot (Taxable)</span>
                <span>{formatCurrency(taxAnalysis.totalBoot)}</span>
              </div>
              <p style={{ margin: "8px 0 0 0", fontSize: 12, opacity: 0.8 }}>
                Boot is the portion of the exchange that is taxable. To avoid boot, ensure the replacement
                property price and debt are equal to or greater than the relinquished property.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
