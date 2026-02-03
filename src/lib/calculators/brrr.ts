/**
 * BRRR Strategy Calculator (Buy, Renovate, Refinance, Rent)
 *
 * The BRRR strategy involves:
 * 1. Buy - Purchase property below market value
 * 2. Renovate - Add value through improvements
 * 3. Refinance - Cash-out refinance based on After Repair Value (ARV)
 * 4. Rent - Hold as rental property
 *
 * Key metrics:
 * - After Repair Value (ARV)
 * - Equity captured at refinance
 * - Cash left in deal
 * - Cash-on-Cash return on remaining capital
 * - Infinite returns (when all cash is pulled out)
 */

import { calculateMonthlyMortgage, calculateLoanBalance } from "./investment";

export interface BRRRInput {
  // Purchase Phase
  purchasePrice: number;
  purchaseClosingCosts: number;
  initialLoanPercent: number; // Short-term/hard money loan LTV
  initialInterestRate: number; // Hard money rates are higher

  // Renovation Phase
  renovationCosts: number;
  renovationTimeMonths: number;
  holdingCostsDuringReno: number; // Monthly (utilities, insurance, taxes, loan interest)

  // After Repair Value
  afterRepairValue: number;

  // Refinance Phase
  refinanceLTV: number; // Usually 70-80% of ARV
  refinanceInterestRate: number;
  refinanceLoanTermYears: number;
  refinanceClosingCosts: number;

  // Rent Phase (Annual)
  monthlyRent: number;
  otherMonthlyIncome: number;
  vacancyRatePercent: number;
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  maintenancePercent: number;
  propertyMgmtPercent: number;
  otherMonthlyExpenses: number;

  // Multi-family support
  numberOfUnits: number;

  // Long-term projections
  annualAppreciationPercent: number;
  annualRentIncreasePercent: number;
  holdingPeriodYears: number;
}

export interface BRRRAnalysis {
  // Phase 1: Purchase
  totalPurchaseCost: number;
  initialLoanAmount: number;
  cashAtPurchase: number;

  // Phase 2: Renovation
  allInCost: number; // Purchase + Reno + Holding
  totalHoldingCosts: number;
  totalCashInvested: number;

  // Phase 3: Refinance
  refinanceLoanAmount: number;
  cashOutAtRefinance: number;
  cashLeftInDeal: number;
  equityCaptured: number;
  equityCapturedPercent: number;

  // Phase 4: Rent
  monthlyMortgageAfterRefi: number;
  grossAnnualIncome: number;
  effectiveGrossIncome: number;
  annualOperatingExpenses: number;
  noi: number;
  annualDebtService: number;
  annualCashFlow: number;
  monthlyCashFlow: number;

  // Key BRRR Metrics
  totalROIOnCashInvested: number;
  cashOnCashReturn: number;
  capRate: number;
  isInfiniteReturn: boolean; // True if all cash is pulled out
  dealScore: number; // 1-5 rating

  // Multi-family metrics
  pricePerUnit: number;
  rentPerUnit: number;

  // Long-term projections
  yearlyProjections: BRRRYearlyProjection[];
  projectedSalePrice: number;
  totalProfit: number;
}

export interface BRRRYearlyProjection {
  year: number;
  grossIncome: number;
  operatingExpenses: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  cumulativeCashFlow: number;
}

export function analyzeBRRR(input: BRRRInput): BRRRAnalysis {
  const units = input.numberOfUnits || 1;

  // === PHASE 1: PURCHASE ===
  const totalPurchaseCost = input.purchasePrice + input.purchaseClosingCosts;
  const initialLoanAmount = input.purchasePrice * (input.initialLoanPercent / 100);
  const cashAtPurchase = totalPurchaseCost - initialLoanAmount;

  // === PHASE 2: RENOVATION ===
  // Interest-only payments during renovation (typical for hard money)
  const monthlyHardMoneyInterest = initialLoanAmount * (input.initialInterestRate / 100 / 12);
  const totalHoldingCosts =
    (input.holdingCostsDuringReno + monthlyHardMoneyInterest) * input.renovationTimeMonths;

  const allInCost = totalPurchaseCost + input.renovationCosts + totalHoldingCosts;
  const totalCashInvested = cashAtPurchase + input.renovationCosts + totalHoldingCosts;

  // === PHASE 3: REFINANCE ===
  const refinanceLoanAmount = input.afterRepairValue * (input.refinanceLTV / 100);

  // Pay off initial loan and closing costs
  const cashOutAtRefinance = refinanceLoanAmount - initialLoanAmount - input.refinanceClosingCosts;
  const cashLeftInDeal = Math.max(0, totalCashInvested - cashOutAtRefinance);

  // Equity captured = ARV - Refinance Loan
  const equityCaptured = input.afterRepairValue - refinanceLoanAmount;
  const equityCapturedPercent = (equityCaptured / input.afterRepairValue) * 100;

  // === PHASE 4: RENT ===
  const monthlyMortgageAfterRefi = calculateMonthlyMortgage(
    refinanceLoanAmount,
    input.refinanceInterestRate,
    input.refinanceLoanTermYears
  );

  // Income calculations
  const totalMonthlyRent = input.monthlyRent * units;
  const grossAnnualIncome = (totalMonthlyRent + input.otherMonthlyIncome) * 12;
  const effectiveGrossIncome = grossAnnualIncome * (1 - input.vacancyRatePercent / 100);

  // Expenses
  const maintenanceAnnual = totalMonthlyRent * 12 * (input.maintenancePercent / 100);
  const propertyMgmtAnnual = totalMonthlyRent * 12 * (input.propertyMgmtPercent / 100);
  const annualOperatingExpenses =
    input.propertyTaxAnnual +
    input.insuranceAnnual +
    maintenanceAnnual +
    propertyMgmtAnnual +
    input.otherMonthlyExpenses * 12;

  const noi = effectiveGrossIncome - annualOperatingExpenses;
  const annualDebtService = monthlyMortgageAfterRefi * 12;
  const annualCashFlow = noi - annualDebtService;
  const monthlyCashFlow = annualCashFlow / 12;

  // === KEY BRRR METRICS ===

  // Cash-on-Cash return (on remaining cash in deal)
  const cashOnCashReturn = cashLeftInDeal > 0
    ? (annualCashFlow / cashLeftInDeal) * 100
    : Infinity; // Infinite return if no cash left in deal

  const isInfiniteReturn = cashLeftInDeal <= 0 || cashOutAtRefinance >= totalCashInvested;

  // Cap Rate on ARV
  const capRate = (noi / input.afterRepairValue) * 100;

  // Total ROI on actual cash invested
  const totalROIOnCashInvested = totalCashInvested > 0
    ? ((annualCashFlow + equityCaptured) / totalCashInvested) * 100
    : 0;

  // Multi-family metrics
  const pricePerUnit = input.purchasePrice / units;
  const rentPerUnit = input.monthlyRent;

  // Deal Score (1-5)
  let dealScore = 1;
  if (isInfiniteReturn) dealScore += 2;
  else if (cashOnCashReturn >= 15) dealScore += 1.5;
  else if (cashOnCashReturn >= 10) dealScore += 1;

  if (equityCapturedPercent >= 25) dealScore += 1;
  else if (equityCapturedPercent >= 15) dealScore += 0.5;

  if (annualCashFlow > 0) dealScore += 0.5;
  if (capRate >= 8) dealScore += 0.5;

  dealScore = Math.min(5, Math.max(1, dealScore));

  // === YEARLY PROJECTIONS ===
  const yearlyProjections: BRRRYearlyProjection[] = [];
  let cumulativeCashFlow = 0;

  for (let year = 1; year <= input.holdingPeriodYears; year++) {
    const rentMultiplier = Math.pow(1 + input.annualRentIncreasePercent / 100, year - 1);
    const appreciationMultiplier = Math.pow(1 + input.annualAppreciationPercent / 100, year);

    const yearGrossIncome = grossAnnualIncome * rentMultiplier;
    const yearEffectiveIncome = yearGrossIncome * (1 - input.vacancyRatePercent / 100);
    const expenseMultiplier = Math.pow(1.02, year - 1); // 2% expense inflation
    const yearOperatingExpenses = annualOperatingExpenses * expenseMultiplier;

    const yearNOI = yearEffectiveIncome - yearOperatingExpenses;
    const yearCashFlow = yearNOI - annualDebtService;

    const propertyValue = input.afterRepairValue * appreciationMultiplier;
    const monthsElapsed = year * 12;
    const loanBalance = calculateLoanBalance(
      refinanceLoanAmount,
      input.refinanceInterestRate,
      input.refinanceLoanTermYears,
      monthsElapsed
    );
    const equity = propertyValue - loanBalance;

    cumulativeCashFlow += yearCashFlow;

    yearlyProjections.push({
      year,
      grossIncome: yearGrossIncome,
      operatingExpenses: yearOperatingExpenses,
      noi: yearNOI,
      debtService: annualDebtService,
      cashFlow: yearCashFlow,
      propertyValue,
      loanBalance,
      equity,
      cumulativeCashFlow,
    });
  }

  // Final exit projections
  const lastYear = yearlyProjections[yearlyProjections.length - 1];
  const projectedSalePrice = lastYear?.propertyValue ?? input.afterRepairValue;
  const finalLoanBalance = lastYear?.loanBalance ?? refinanceLoanAmount;
  const sellingCosts = projectedSalePrice * 0.06;
  const netSaleProceeds = projectedSalePrice - finalLoanBalance - sellingCosts;

  const totalProfit = cumulativeCashFlow + netSaleProceeds + cashOutAtRefinance - totalCashInvested;

  return {
    // Phase 1
    totalPurchaseCost,
    initialLoanAmount,
    cashAtPurchase,

    // Phase 2
    allInCost,
    totalHoldingCosts,
    totalCashInvested,

    // Phase 3
    refinanceLoanAmount,
    cashOutAtRefinance,
    cashLeftInDeal,
    equityCaptured,
    equityCapturedPercent,

    // Phase 4
    monthlyMortgageAfterRefi,
    grossAnnualIncome,
    effectiveGrossIncome,
    annualOperatingExpenses,
    noi,
    annualDebtService,
    annualCashFlow,
    monthlyCashFlow,

    // Key metrics
    totalROIOnCashInvested,
    cashOnCashReturn: isInfiniteReturn ? Infinity : cashOnCashReturn,
    capRate,
    isInfiniteReturn,
    dealScore,

    // Multi-family
    pricePerUnit,
    rentPerUnit,

    // Projections
    yearlyProjections,
    projectedSalePrice,
    totalProfit,
  };
}

/**
 * Calculate 70% Rule for BRRR deals
 * Max Purchase = (ARV × 70%) - Repairs
 */
export function calculate70PercentRule(arv: number, repairCosts: number): number {
  return arv * 0.7 - repairCosts;
}

/**
 * Calculate Maximum Allowable Offer (MAO)
 */
export function calculateMAO(
  arv: number,
  repairCosts: number,
  desiredProfit: number,
  closingCosts: number
): number {
  return arv - repairCosts - desiredProfit - closingCosts;
}

/**
 * Get deal verdict based on analysis
 */
export function getBRRRVerdict(analysis: BRRRAnalysis): {
  verdict: string;
  color: string;
  description: string;
} {
  if (analysis.isInfiniteReturn && analysis.annualCashFlow > 0) {
    return {
      verdict: "Excellent BRRR",
      color: "#16a34a",
      description: "All cash out with positive cash flow - infinite returns!",
    };
  }

  if (analysis.dealScore >= 4) {
    return {
      verdict: "Great Deal",
      color: "#22c55e",
      description: "Strong equity capture and good cash flow",
    };
  }

  if (analysis.dealScore >= 3) {
    return {
      verdict: "Good Deal",
      color: "#84cc16",
      description: "Solid returns, meets BRRR criteria",
    };
  }

  if (analysis.dealScore >= 2) {
    return {
      verdict: "Marginal",
      color: "#eab308",
      description: "Consider negotiating better terms",
    };
  }

  return {
    verdict: "Pass",
    color: "#dc2626",
    description: "Does not meet BRRR criteria",
  };
}
