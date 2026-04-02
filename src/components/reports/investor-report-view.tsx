"use client";

import React from "react";
import type { PropertyReportData } from "@/lib/documents/property-intelligence-report";
import {
  ReportHeader,
  ReportSection,
  ReportRow,
  ReportFooter,
  ValueCard,
  TwoColumnGrid,
  AvmRangeBar,
  EquityBar,
  MarketTypeIndicator,
  ComparisonTable,
  PhotoGallery,
  HorizontalBarChart,
  fmt$,
  fmtPct,
  REPORT_COLORS,
} from "./report-components";

interface AgentBranding {
  displayName: string;
  email: string;
  phone?: string | null;
  licenseNumber?: string | null;
  brokerageName?: string;
}

interface FinancingScenario {
  label: string;
  downPaymentPct: number;
  interestRate: number;
  termYears: number;
}

interface InvestorReportProps {
  property: PropertyReportData;
  branding: AgentBranding;
  date?: string;
  photos?: string[];
  // Rental data
  rentalEstimate?: number;
  rentalLow?: number;
  rentalHigh?: number;
  rentalPerSqft?: number;
  areaMedianRent?: number;
  // HUD Fair Market Rents by bedroom
  fairMarketRents?: Record<string, number>; // e.g., {"0br": 1200, "1br": 1400, ...}
  // Area stats
  vacancyRate?: number; // area vacancy percentage
  areaAppreciationRate?: number; // annual appreciation %
  // Custom financing scenarios (optional, defaults provided)
  financingScenarios?: FinancingScenario[];
  // Demographics
  areaMedianIncome?: number;
  areaPopulation?: number;
  areaUnemploymentRate?: number;
  ownerOccupiedPct?: number;
  renterOccupiedPct?: number;
}

// ── Calculation Helpers ──

function calcMonthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (annualRate === 0) return principal / (termYears * 12);
  const monthlyRate = annualRate / 100 / 12;
  const n = termYears * 12;
  return (principal * (monthlyRate * Math.pow(1 + monthlyRate, n))) / (Math.pow(1 + monthlyRate, n) - 1);
}

function calcScenario(
  price: number,
  scenario: FinancingScenario,
  monthlyRent: number,
  monthlyTax: number,
  monthlyInsurance: number,
  monthlyHOA: number,
  maintenancePct: number,
  managementPct: number,
  vacancyPct: number,
) {
  const downPayment = price * (scenario.downPaymentPct / 100);
  const loanAmount = price - downPayment;
  const monthlyPI = calcMonthlyPayment(loanAmount, scenario.interestRate, scenario.termYears);
  const cashInvested = downPayment; // simplified -- add closing costs if available

  const grossMonthlyIncome = monthlyRent;
  const vacancyAllowance = grossMonthlyIncome * (vacancyPct / 100);
  const effectiveIncome = grossMonthlyIncome - vacancyAllowance;

  const monthlyMaintenance = (price * (maintenancePct / 100)) / 12;
  const monthlyMgmt = effectiveIncome * (managementPct / 100);

  const totalExpenses = monthlyPI + monthlyTax + monthlyInsurance + monthlyHOA + monthlyMaintenance + monthlyMgmt;
  const monthlyCashFlow = effectiveIncome - totalExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  // NOI (excludes debt service)
  const annualNOI = (effectiveIncome - monthlyTax - monthlyInsurance - monthlyHOA - monthlyMaintenance - monthlyMgmt) * 12;

  const capRate = price > 0 ? (annualNOI / price) * 100 : 0;
  const cashOnCash = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : annualCashFlow > 0 ? Infinity : 0;
  const grossYield = price > 0 ? ((grossMonthlyIncome * 12) / price) * 100 : 0;
  const dscr = monthlyPI > 0 ? annualNOI / (monthlyPI * 12) : Infinity;

  return {
    downPayment,
    loanAmount,
    monthlyPI,
    cashInvested,
    effectiveIncome,
    totalExpenses,
    monthlyCashFlow,
    annualCashFlow,
    annualNOI,
    capRate,
    cashOnCash,
    grossYield,
    dscr,
  };
}

function getInvestmentVerdict(capRate: number, cashOnCash: number, monthlyCashFlow: number): { verdict: string; color: string } {
  if (capRate >= 8 && cashOnCash >= 10 && monthlyCashFlow > 0) return { verdict: "Strong Buy", color: "#15803d" };
  if (capRate >= 6 && cashOnCash >= 7 && monthlyCashFlow > 0) return { verdict: "Good Investment", color: "#22c55e" };
  if (capRate >= 4 && cashOnCash >= 4) return { verdict: "Moderate", color: "#eab308" };
  if (capRate >= 2 || monthlyCashFlow > 0) return { verdict: "Weak", color: "#f97316" };
  return { verdict: "Pass", color: "#dc2626" };
}

// ── Default Financing Scenarios ──

const DEFAULT_SCENARIOS: FinancingScenario[] = [
  { label: "Conventional (20%)", downPaymentPct: 20, interestRate: 6.75, termYears: 30 },
  { label: "Investor Loan (25%)", downPaymentPct: 25, interestRate: 7.25, termYears: 30 },
  { label: "All Cash", downPaymentPct: 100, interestRate: 0, termYears: 1 },
];

// ── Component ──

export default function InvestorReportView({
  property: d,
  branding: b,
  date,
  photos,
  rentalEstimate,
  rentalLow,
  rentalHigh,
  rentalPerSqft,
  areaMedianRent,
  fairMarketRents,
  vacancyRate = 5,
  areaAppreciationRate = 3,
  financingScenarios,
  areaMedianIncome,
  areaPopulation,
  areaUnemploymentRate,
  ownerOccupiedPct,
  renterOccupiedPct,
}: InvestorReportProps) {
  const cityLine = [d.city, d.state, d.zip].filter(Boolean).join(", ");
  const dateStr = date || d.generatedAt;
  const price = d.listPrice || d.avmValue || 0;
  const rent = rentalEstimate || d.rentalEstimate || 0;
  const scenarios = financingScenarios || DEFAULT_SCENARIOS;

  // Default expense assumptions
  const monthlyTax = (d.taxAmount || d.taxAnnualAmount || price * 0.012) / 12;
  const monthlyInsurance = (price * 0.005) / 12; // 0.5% of value annually
  const monthlyHOA = (d.associationFee || 0);
  const maintenancePct = 1; // 1% of value annually
  const managementPct = 8; // 8% of effective income

  // Calculate primary scenario (conventional)
  const primary = calcScenario(price, scenarios[0], rent, monthlyTax, monthlyInsurance, monthlyHOA, maintenancePct, managementPct, vacancyRate);
  const verdict = getInvestmentVerdict(primary.capRate, primary.cashOnCash, primary.monthlyCashFlow);

  // All scenario results
  const scenarioResults = scenarios.map((s) => calcScenario(price, s, rent, monthlyTax, monthlyInsurance, monthlyHOA, maintenancePct, managementPct, vacancyRate));

  // Rules of thumb
  const onePercentRule = rent >= price * 0.01;
  const grm = rent > 0 ? Math.round(price / (rent * 12) * 10) / 10 : 0;

  // Depreciation (27.5 years for residential)
  const buildingValue = d.assessedImpr || price * 0.8; // assume 80% building if no data
  const annualDepreciation = Math.round(buildingValue / 27.5);
  const taxSavings24 = Math.round(annualDepreciation * 0.24); // at 24% bracket
  const taxSavings32 = Math.round(annualDepreciation * 0.32); // at 32% bracket

  // Exit projections
  const exitYears = [5, 10, 15];
  const exitProjections = exitYears.map((yr) => {
    const projectedValue = Math.round(price * Math.pow(1 + areaAppreciationRate / 100, yr));
    const totalRentalIncome = Math.round(primary.annualCashFlow * yr); // simplified -- doesn't account for rent growth
    const principalPaydown = Math.round(price * 0.03 * yr); // rough estimate
    const totalReturn = projectedValue - price + totalRentalIncome + principalPaydown;
    const annualizedROI = primary.cashInvested > 0 ? Math.round(((Math.pow((price + totalReturn) / price, 1 / yr) - 1) * 100) * 10) / 10 : 0;
    return { years: yr, projectedValue, totalRentalIncome, totalReturn, annualizedROI };
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <ReportHeader
        reportType="Investor Report"
        title={d.address}
        subtitle={cityLine}
        agentName={b.displayName}
        licenseNumber={b.licenseNumber || undefined}
        date={dateStr}
      />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>

        {/* ═══ Executive Summary ═══ */}
        <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
          {/* Investment Verdict */}
          <div style={{ flex: "1 1 200px", padding: "20px 24px", background: "#fff", border: `2px solid ${verdict.color}`, borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: REPORT_COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Investment Verdict</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: verdict.color, marginTop: 4 }}>{verdict.verdict}</div>
            <div style={{ fontSize: 11, color: REPORT_COLORS.textMuted, marginTop: 4 }}>
              {primary.capRate.toFixed(1)}% cap | {primary.cashOnCash.toFixed(1)}% CoC | {fmt$(Math.round(primary.monthlyCashFlow))}/mo
            </div>
          </div>

          {/* Key Metrics */}
          <ValueCard label="Purchase Price" value={fmt$(price)!} />
          <ValueCard label="Monthly Rent" value={`${fmt$(rent)}/mo`} sub={rentalLow && rentalHigh ? `Range: ${fmt$(rentalLow)} - ${fmt$(rentalHigh)}` : undefined} color="#f5f3ff" />
          <ValueCard label="Monthly Cash Flow" value={`${primary.monthlyCashFlow >= 0 ? "+" : ""}${fmt$(Math.round(primary.monthlyCashFlow))}`} color={primary.monthlyCashFlow >= 0 ? "#ecfdf5" : "#fef2f2"} />
        </div>

        {/* AVM Range */}
        {d.avmLow != null && d.avmHigh != null && d.avmValue != null && (
          <AvmRangeBar low={d.avmLow} estimate={d.avmValue} high={d.avmHigh} />
        )}

        {/* ═══ Rental Income Analysis ═══ */}
        <ReportSection title="Rental Income Analysis">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <ValueCard label="Rental AVM" value={`${fmt$(rent)}/mo`} color="#f5f3ff" />
            <ValueCard label="Annual Rent" value={fmt$(rent * 12)!} color="#f0fdf4" />
            <ValueCard label="Gross Yield" value={`${primary.grossYield.toFixed(1)}%`} />
            <ValueCard label="GRM" value={String(grm)} sub="Gross Rent Multiplier" />
          </div>
          <TwoColumnGrid>
            {rentalLow != null && rentalHigh != null && <ReportRow label="Rental Range" value={`${fmt$(rentalLow)} - ${fmt$(rentalHigh)}/mo`} />}
            {rentalPerSqft != null && <ReportRow label="Rent per Sqft" value={`$${rentalPerSqft.toFixed(2)}/sqft`} />}
            {areaMedianRent != null && <ReportRow label="Area Median Rent" value={`${fmt$(areaMedianRent)}/mo`} />}
            <ReportRow label="1% Rule" value={onePercentRule ? "PASSES" : "FAILS"} />
            <ReportRow label="Vacancy Allowance" value={`${vacancyRate}%`} />
            <ReportRow label="Effective Monthly Income" value={fmt$(Math.round(primary.effectiveIncome))} />
          </TwoColumnGrid>

          {/* HUD Fair Market Rents */}
          {fairMarketRents && Object.keys(fairMarketRents).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: REPORT_COLORS.textDark, marginBottom: 8 }}>HUD Fair Market Rents ({d.zip})</h4>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(fairMarketRents).map(([key, val]) => (
                  <div key={key} style={{ padding: "6px 12px", background: "#f0f9ff", borderRadius: 6, fontSize: 12 }}>
                    <span style={{ color: REPORT_COLORS.textMuted }}>{key.toUpperCase()}: </span>
                    <strong style={{ color: REPORT_COLORS.textDark }}>{fmt$(val)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ReportSection>

        {/* ═══ Return Metrics ═══ */}
        <ReportSection title="Return Metrics">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <ValueCard label="Cap Rate" value={`${primary.capRate.toFixed(1)}%`} color={primary.capRate >= 6 ? "#ecfdf5" : primary.capRate >= 4 ? "#fffbeb" : "#fef2f2"} />
            <ValueCard label="Cash-on-Cash" value={`${primary.cashOnCash.toFixed(1)}%`} color={primary.cashOnCash >= 8 ? "#ecfdf5" : primary.cashOnCash >= 4 ? "#fffbeb" : "#fef2f2"} />
            <ValueCard label="Net Yield" value={`${(primary.annualNOI / price * 100).toFixed(1)}%`} />
            <ValueCard label="DSCR" value={primary.dscr === Infinity ? "N/A (cash)" : primary.dscr.toFixed(2)} sub={primary.dscr >= 1.25 ? "Healthy" : primary.dscr >= 1.0 ? "Marginal" : "Negative"} color={primary.dscr >= 1.25 ? "#ecfdf5" : primary.dscr >= 1.0 ? "#fffbeb" : "#fef2f2"} />
          </div>

          {/* Visual benchmarks */}
          <div style={{ marginTop: 8 }}>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: REPORT_COLORS.textMuted, marginBottom: 8 }}>Benchmarks</h4>
            <HorizontalBarChart
              data={[
                { label: "Cap Rate", value: primary.capRate, displayValue: `${primary.capRate.toFixed(1)}%` },
                { label: "Cash-on-Cash", value: primary.cashOnCash, displayValue: `${primary.cashOnCash.toFixed(1)}%` },
                { label: "Gross Yield", value: primary.grossYield, displayValue: `${primary.grossYield.toFixed(1)}%` },
              ]}
              maxValue={15}
              labelWidth={100}
              barColor={REPORT_COLORS.brandBlue}
            />
          </div>
        </ReportSection>

        {/* ═══ Cash Flow Breakdown ═══ */}
        <ReportSection title="Monthly Cash Flow Breakdown">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Income */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: REPORT_COLORS.greenAccent, marginBottom: 8 }}>Income</h4>
              <ReportRow label="Gross Rent" value={fmt$(rent)} />
              <ReportRow label="Vacancy (-{vacancyRate}%)" value={`-${fmt$(Math.round(rent * vacancyRate / 100))}`} />
              <div style={{ borderTop: `2px solid ${REPORT_COLORS.greenAccent}`, marginTop: 4, paddingTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span style={{ fontSize: 13, color: REPORT_COLORS.greenAccent }}>Effective Income</span>
                <span style={{ fontSize: 13, color: REPORT_COLORS.greenAccent }}>{fmt$(Math.round(primary.effectiveIncome))}</span>
              </div>
            </div>

            {/* Expenses */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: REPORT_COLORS.redAccent, marginBottom: 8 }}>Expenses</h4>
              <ReportRow label="Mortgage (P&I)" value={fmt$(Math.round(scenarioResults[0].monthlyPI))} />
              <ReportRow label="Property Tax" value={fmt$(Math.round(monthlyTax))} />
              <ReportRow label="Insurance" value={fmt$(Math.round(monthlyInsurance))} />
              {monthlyHOA > 0 && <ReportRow label="HOA" value={fmt$(monthlyHOA)} />}
              <ReportRow label="Maintenance (1%)" value={fmt$(Math.round((price * maintenancePct / 100) / 12))} />
              <ReportRow label="Management (8%)" value={fmt$(Math.round(primary.effectiveIncome * managementPct / 100))} />
              <div style={{ borderTop: `2px solid ${REPORT_COLORS.redAccent}`, marginTop: 4, paddingTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span style={{ fontSize: 13, color: REPORT_COLORS.redAccent }}>Total Expenses</span>
                <span style={{ fontSize: 13, color: REPORT_COLORS.redAccent }}>{fmt$(Math.round(primary.totalExpenses))}</span>
              </div>
            </div>
          </div>

          {/* Net Cash Flow */}
          <div style={{ marginTop: 16, padding: "16px 20px", background: primary.monthlyCashFlow >= 0 ? "#f0fdf4" : "#fef2f2", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: REPORT_COLORS.textDark }}>Net Monthly Cash Flow</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: primary.monthlyCashFlow >= 0 ? REPORT_COLORS.greenAccent : REPORT_COLORS.redAccent }}>
              {primary.monthlyCashFlow >= 0 ? "+" : ""}{fmt$(Math.round(primary.monthlyCashFlow))}
            </span>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: REPORT_COLORS.textMuted, marginTop: 4 }}>
            Annual: {primary.annualCashFlow >= 0 ? "+" : ""}{fmt$(Math.round(primary.annualCashFlow))} | NOI: {fmt$(Math.round(primary.annualNOI))}
          </div>
        </ReportSection>

        {/* ═══ Financing Scenarios ═══ */}
        <ReportSection title="Financing Scenarios">
          <ComparisonTable
            headers={["Metric", ...scenarios.map((s) => s.label)]}
            rows={[
              { label: "Down Payment", values: scenarioResults.map((r) => fmt$(Math.round(r.downPayment)) || "-") },
              { label: "Loan Amount", values: scenarioResults.map((r) => fmt$(Math.round(r.loanAmount)) || "-") },
              { label: "Monthly P&I", values: scenarioResults.map((r) => r.monthlyPI > 0 ? fmt$(Math.round(r.monthlyPI)) || "-" : "$0") },
              { label: "Monthly Cash Flow", values: scenarioResults.map((r) => `${r.monthlyCashFlow >= 0 ? "+" : ""}${fmt$(Math.round(r.monthlyCashFlow))}`), changeValues: scenarioResults.map((r) => r.monthlyCashFlow) },
              { label: "Annual Cash Flow", values: scenarioResults.map((r) => `${r.annualCashFlow >= 0 ? "+" : ""}${fmt$(Math.round(r.annualCashFlow))}`), changeValues: scenarioResults.map((r) => r.annualCashFlow) },
              { label: "Cap Rate", values: scenarioResults.map((r) => `${r.capRate.toFixed(1)}%`) },
              { label: "Cash-on-Cash", values: scenarioResults.map((r) => r.cashOnCash === Infinity ? "N/A" : `${r.cashOnCash.toFixed(1)}%`), changeValues: scenarioResults.map((r) => r.cashOnCash === Infinity ? 1 : r.cashOnCash) },
              { label: "DSCR", values: scenarioResults.map((r) => r.dscr === Infinity ? "N/A" : r.dscr.toFixed(2)) },
            ]}
          />
        </ReportSection>

        {/* ═══ Tax Benefits ═══ */}
        <ReportSection title="Tax Benefits (Depreciation)">
          <div style={{ padding: "12px 16px", background: "#f0f9ff", borderRadius: 8, marginBottom: 12, fontSize: 12, color: REPORT_COLORS.textMuted, lineHeight: 1.6 }}>
            Residential rental property is depreciated over 27.5 years (straight-line). The depreciation deduction reduces taxable income, effectively creating a tax shelter for rental income.
          </div>
          <TwoColumnGrid>
            <ReportRow label="Building Value (depreciable)" value={fmt$(buildingValue)} />
            <ReportRow label="Annual Depreciation" value={fmt$(annualDepreciation)} />
            <ReportRow label="Tax Savings (24% bracket)" value={`+${fmt$(taxSavings24)}/yr`} />
            <ReportRow label="Tax Savings (32% bracket)" value={`+${fmt$(taxSavings32)}/yr`} />
            <ReportRow label="Depreciation Period" value="27.5 years" />
            <ReportRow label="Total Depreciation" value={fmt$(buildingValue)} />
          </TwoColumnGrid>
        </ReportSection>

        {/* ═══ Exit Strategy ═══ */}
        <ReportSection title="Exit Strategy Projections">
          <div style={{ padding: "12px 16px", background: "#f9fafb", borderRadius: 8, marginBottom: 12, fontSize: 12, color: REPORT_COLORS.textMuted }}>
            Based on {areaAppreciationRate}% annual appreciation and current cash flow assumptions.
          </div>
          <ComparisonTable
            headers={["", ...exitYears.map((yr) => `${yr}-Year Hold`)]}
            rows={[
              { label: "Projected Value", values: exitProjections.map((p) => fmt$(p.projectedValue) || "-") },
              { label: "Appreciation", values: exitProjections.map((p) => `+${fmt$(p.projectedValue - price)}`), changeValues: exitProjections.map(() => 1) },
              { label: "Total Cash Flow", values: exitProjections.map((p) => `${p.totalRentalIncome >= 0 ? "+" : ""}${fmt$(p.totalRentalIncome)}`), changeValues: exitProjections.map((p) => p.totalRentalIncome) },
              { label: "Total Return", values: exitProjections.map((p) => `+${fmt$(p.totalReturn)}`), changeValues: exitProjections.map(() => 1) },
              { label: "Annualized ROI", values: exitProjections.map((p) => `${p.annualizedROI}%`) },
            ]}
          />
        </ReportSection>

        {/* ═══ Equity & Appreciation ═══ */}
        {d.avmValue && d.loanBalance && (
          <ReportSection title="Current Equity Position">
            <EquityBar propertyValue={d.avmValue} loanBalance={d.loanBalance} />
            <TwoColumnGrid>
              <ReportRow label="AVM Value" value={fmt$(d.avmValue)} />
              <ReportRow label="Last Sale Price" value={fmt$(d.lastSalePrice)} />
              {d.lastSalePrice && d.avmValue && (
                <ReportRow label="Appreciation Since Purchase" value={`+${fmt$(d.avmValue - d.lastSalePrice)} (${((d.avmValue - d.lastSalePrice) / d.lastSalePrice * 100).toFixed(1)}%)`} />
              )}
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ Market Overview ═══ */}
        {(d.marketStats || d.marketType) && (
          <ReportSection title="Market Overview">
            {d.marketType && <MarketTypeIndicator marketType={d.marketType} />}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              {d.monthsOfInventory != null && <ValueCard label="Months Inventory" value={d.monthsOfInventory.toFixed(1)} />}
              {d.marketStats?.avgDOM != null && <ValueCard label="Avg DOM" value={String(d.marketStats.avgDOM)} />}
              {d.marketStats?.medianPrice != null && <ValueCard label="Median Price" value={fmt$(d.marketStats.medianPrice)!} />}
              {d.marketStats?.pricePerSqft != null && <ValueCard label="$/Sqft" value={`$${d.marketStats.pricePerSqft}`} />}
            </div>
            <TwoColumnGrid>
              {areaMedianIncome != null && <ReportRow label="Median Household Income" value={fmt$(areaMedianIncome)} />}
              {areaPopulation != null && <ReportRow label="Population" value={areaPopulation.toLocaleString()} />}
              {areaUnemploymentRate != null && <ReportRow label="Unemployment Rate" value={fmtPct(areaUnemploymentRate)} />}
              {ownerOccupiedPct != null && <ReportRow label="Owner Occupied" value={fmtPct(ownerOccupiedPct)} />}
              {renterOccupiedPct != null && <ReportRow label="Renter Occupied" value={fmtPct(renterOccupiedPct)} />}
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ Risk Assessment ═══ */}
        <ReportSection title="Risk Assessment">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Cash Flow Risk */}
            <RiskItem
              label="Cash Flow"
              level={primary.monthlyCashFlow > 200 ? "low" : primary.monthlyCashFlow > 0 ? "moderate" : "high"}
              detail={primary.monthlyCashFlow > 200 ? "Positive cash flow with cushion" : primary.monthlyCashFlow > 0 ? "Marginally positive -- thin margins" : "Negative cash flow -- requires out-of-pocket funding"}
            />
            {/* DSCR Risk */}
            <RiskItem
              label="Debt Service"
              level={primary.dscr >= 1.25 ? "low" : primary.dscr >= 1.0 ? "moderate" : "high"}
              detail={`DSCR ${primary.dscr === Infinity ? "N/A (cash)" : primary.dscr.toFixed(2)} -- ${primary.dscr >= 1.25 ? "income covers debt comfortably" : primary.dscr >= 1.0 ? "tight coverage" : "income does not cover debt"}`}
            />
            {/* Vacancy Risk */}
            <RiskItem
              label="Vacancy"
              level={vacancyRate <= 5 ? "low" : vacancyRate <= 10 ? "moderate" : "high"}
              detail={`Area vacancy rate: ${vacancyRate}%. Break-even occupancy: ${rent > 0 ? Math.round((primary.totalExpenses / rent) * 100) : "N/A"}%`}
            />
            {/* Hazard Risk */}
            {d.hazards && d.hazards.length > 0 && (
              <RiskItem
                label="Environmental"
                level={d.hazards.length > 2 ? "high" : d.hazards.length > 0 ? "moderate" : "low"}
                detail={`${d.hazards.length} hazard zone(s): ${d.hazards.map((h) => h.label).join(", ")}. May impact insurance costs.`}
              />
            )}
            {/* Market Risk */}
            {d.marketType && (
              <RiskItem
                label="Market"
                level={d.marketType === "buyers" ? "moderate" : "low"}
                detail={d.marketType === "sellers" ? "Seller's market -- strong demand, potential appreciation" : d.marketType === "balanced" ? "Balanced market -- stable conditions" : "Buyer's market -- potential for price softening"}
              />
            )}
          </div>
        </ReportSection>

        {/* ═══ Property Details ═══ */}
        <ReportSection title="Property Details">
          <TwoColumnGrid>
            <ReportRow label="Property Type" value={d.propertyType} />
            <ReportRow label="Year Built" value={d.yearBuilt} />
            <ReportRow label="Bedrooms" value={d.beds} />
            <ReportRow label="Bathrooms" value={d.baths} />
            <ReportRow label="Living Area" value={d.sqft ? `${d.sqft.toLocaleString()} sqft` : null} />
            <ReportRow label="Lot Size" value={d.lotSizeSqft ? `${d.lotSizeSqft.toLocaleString()} sqft` : null} />
            <ReportRow label="APN / TMK" value={d.apn} />
            <ReportRow label="Land Tenure" value={d.ownershipType} />
          </TwoColumnGrid>
        </ReportSection>

        {/* ═══ Comps ═══ */}
        {d.comps && d.comps.length > 0 && (
          <ReportSection title="Comparable Sales">
            <ComparisonTable
              headers={["Address", "Price", "Bd/Ba", "Sqft", "Closed", "Match"]}
              rows={d.comps.slice(0, 8).map((c) => ({
                label: (c.address || "-").substring(0, 28),
                values: [
                  c.price != null ? fmt$(c.price) || "-" : "-",
                  `${c.beds || "?"}/${c.baths || "?"}`,
                  c.sqft != null ? c.sqft.toLocaleString() : "-",
                  c.closeDate || "-",
                  c.correlation != null ? `${Math.round(c.correlation <= 1 ? c.correlation * 100 : c.correlation)}%` : "-",
                ],
              }))}
            />
          </ReportSection>
        )}

        {/* ═══ Photos ═══ */}
        {photos && photos.length > 0 && (
          <ReportSection title="Photos">
            <PhotoGallery photos={photos.slice(0, 9)} columns={3} />
          </ReportSection>
        )}

        <ReportFooter agentName={b.displayName} email={b.email} phone={b.phone || undefined} />
      </div>
    </div>
  );
}

// ── Risk Assessment Item ──

function RiskItem({ label, level, detail }: { label: string; level: "low" | "moderate" | "high"; detail: string }) {
  const colors = { low: { bg: "#f0fdf4", border: "#15803d", text: "#15803d" }, moderate: { bg: "#fffbeb", border: "#eab308", text: "#92400e" }, high: { bg: "#fef2f2", border: "#dc2626", text: "#dc2626" } };
  const c = colors[level];
  const labels = { low: "Low Risk", moderate: "Moderate Risk", high: "High Risk" };
  return (
    <div style={{ padding: "10px 14px", background: c.bg, borderLeft: `4px solid ${c.border}`, borderRadius: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: REPORT_COLORS.textDark }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: c.text, textTransform: "uppercase" }}>{labels[level]}</span>
      </div>
      <div style={{ fontSize: 12, color: REPORT_COLORS.textMuted, marginTop: 2 }}>{detail}</div>
    </div>
  );
}
