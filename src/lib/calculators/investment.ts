/**
 * Investment Property Calculator Utilities
 *
 * Provides calculations for:
 * - Net Operating Income (NOI)
 * - Cap Rate
 * - Cash-on-Cash Return
 * - Total ROI
 * - Internal Rate of Return (IRR)
 * - Monthly Mortgage Payment
 */

export interface PropertyInput {
  // Purchase
  purchasePrice: number;
  closingCosts: number;
  renovationCosts: number;
  downPaymentPercent: number;
  loanInterestRate: number;
  loanTermYears: number;

  // Income
  monthlyRent: number;
  otherMonthlyIncome: number;
  vacancyRatePercent: number;

  // Expenses
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  maintenancePercent: number; // % of rent
  propertyMgmtPercent: number; // % of rent
  otherMonthlyExpenses: number;

  // Growth
  annualAppreciationPercent: number;
  annualRentIncreasePercent: number;

  // Analysis
  holdingPeriodYears: number;
}

export interface PropertyAnalysis {
  // Initial Investment
  totalInvestment: number;
  downPayment: number;
  loanAmount: number;
  monthlyMortgage: number;

  // Annual Income
  grossAnnualIncome: number;
  effectiveGrossIncome: number; // After vacancy
  annualOperatingExpenses: number;
  noi: number; // Net Operating Income
  annualDebtService: number;
  annualCashFlow: number;

  // Returns
  capRate: number;
  cashOnCash: number;

  // Multi-year projections
  yearlyProjections: YearlyProjection[];
  totalCashFlow: number;
  projectedSalePrice: number;
  projectedEquity: number;
  totalProfit: number;
  totalROI: number;
  irr: number;
}

export interface YearlyProjection {
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

/**
 * Calculate monthly mortgage payment (Principal & Interest)
 */
export function calculateMonthlyMortgage(
  loanAmount: number,
  annualInterestRate: number,
  termYears: number
): number {
  if (loanAmount <= 0 || termYears <= 0) return 0;
  if (annualInterestRate <= 0) return loanAmount / (termYears * 12);

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = termYears * 12;

  const payment =
    (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return payment;
}

/**
 * Calculate remaining loan balance after n months
 */
export function calculateLoanBalance(
  originalLoanAmount: number,
  annualInterestRate: number,
  termYears: number,
  monthsElapsed: number
): number {
  if (originalLoanAmount <= 0 || monthsElapsed <= 0) return originalLoanAmount;
  if (monthsElapsed >= termYears * 12) return 0;

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = termYears * 12;

  if (monthlyRate <= 0) {
    return originalLoanAmount * (1 - monthsElapsed / numPayments);
  }

  const balance =
    originalLoanAmount *
    ((Math.pow(1 + monthlyRate, numPayments) -
      Math.pow(1 + monthlyRate, monthsElapsed)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1));

  return Math.max(0, balance);
}

/**
 * Calculate Net Operating Income (NOI)
 */
export function calculateNOI(
  grossAnnualIncome: number,
  vacancyRatePercent: number,
  operatingExpenses: number
): number {
  const effectiveIncome = grossAnnualIncome * (1 - vacancyRatePercent / 100);
  return effectiveIncome - operatingExpenses;
}

/**
 * Calculate Cap Rate
 */
export function calculateCapRate(noi: number, propertyValue: number): number {
  if (propertyValue <= 0) return 0;
  return (noi / propertyValue) * 100;
}

/**
 * Calculate Cash-on-Cash Return
 */
export function calculateCashOnCash(
  annualCashFlow: number,
  totalCashInvested: number
): number {
  if (totalCashInvested <= 0) return 0;
  return (annualCashFlow / totalCashInvested) * 100;
}

/**
 * Calculate Internal Rate of Return (IRR) using Newton-Raphson method
 */
export function calculateIRR(cashFlows: number[], maxIterations = 100): number {
  // Initial guess
  let rate = 0.1;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const discountFactor = Math.pow(1 + rate, t);
      npv += cashFlows[t] / discountFactor;
      if (t > 0) {
        dnpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(dnpv) < 1e-10) break;

    const newRate = rate - npv / dnpv;

    if (Math.abs(newRate - rate) < 1e-7) {
      return newRate * 100;
    }

    rate = newRate;

    // Bound the rate to prevent divergence
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  return rate * 100;
}

/**
 * Full property analysis
 */
export function analyzeProperty(input: PropertyInput): PropertyAnalysis {
  // Initial Investment
  const downPayment = input.purchasePrice * (input.downPaymentPercent / 100);
  const loanAmount = input.purchasePrice - downPayment;
  const totalInvestment =
    downPayment + input.closingCosts + input.renovationCosts;

  // Monthly mortgage
  const monthlyMortgage = calculateMonthlyMortgage(
    loanAmount,
    input.loanInterestRate,
    input.loanTermYears
  );

  // Annual Income
  const grossAnnualIncome =
    (input.monthlyRent + input.otherMonthlyIncome) * 12;
  const effectiveGrossIncome =
    grossAnnualIncome * (1 - input.vacancyRatePercent / 100);

  // Annual Operating Expenses (excluding debt service)
  const maintenanceAnnual =
    input.monthlyRent * 12 * (input.maintenancePercent / 100);
  const propertyMgmtAnnual =
    input.monthlyRent * 12 * (input.propertyMgmtPercent / 100);

  const annualOperatingExpenses =
    input.propertyTaxAnnual +
    input.insuranceAnnual +
    input.hoaMonthly * 12 +
    maintenanceAnnual +
    propertyMgmtAnnual +
    input.otherMonthlyExpenses * 12;

  // NOI
  const noi = effectiveGrossIncome - annualOperatingExpenses;

  // Cash Flow
  const annualDebtService = monthlyMortgage * 12;
  const annualCashFlow = noi - annualDebtService;

  // Returns
  const capRate = calculateCapRate(noi, input.purchasePrice);
  const cashOnCash = calculateCashOnCash(annualCashFlow, totalInvestment);

  // Year-by-year projections
  const yearlyProjections: YearlyProjection[] = [];
  let cumulativeCashFlow = 0;
  const cashFlows: number[] = [-totalInvestment]; // Initial investment (negative)

  for (let year = 1; year <= input.holdingPeriodYears; year++) {
    const rentMultiplier = Math.pow(
      1 + input.annualRentIncreasePercent / 100,
      year - 1
    );
    const appreciationMultiplier = Math.pow(
      1 + input.annualAppreciationPercent / 100,
      year
    );

    const yearGrossIncome = grossAnnualIncome * rentMultiplier;
    const yearEffectiveIncome =
      yearGrossIncome * (1 - input.vacancyRatePercent / 100);

    // Operating expenses grow with inflation (assume 2%)
    const expenseMultiplier = Math.pow(1.02, year - 1);
    const yearOperatingExpenses = annualOperatingExpenses * expenseMultiplier;

    const yearNOI = yearEffectiveIncome - yearOperatingExpenses;
    const yearCashFlow = yearNOI - annualDebtService;

    const propertyValue = input.purchasePrice * appreciationMultiplier;
    const monthsElapsed = year * 12;
    const loanBalance = calculateLoanBalance(
      loanAmount,
      input.loanInterestRate,
      input.loanTermYears,
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

    cashFlows.push(yearCashFlow);
  }

  // Final year: add sale proceeds
  const lastYear = yearlyProjections[yearlyProjections.length - 1];
  const projectedSalePrice = lastYear?.propertyValue ?? input.purchasePrice;
  const finalLoanBalance = lastYear?.loanBalance ?? loanAmount;
  const sellingCosts = projectedSalePrice * 0.06; // Assume 6% selling costs
  const netSaleProceeds = projectedSalePrice - finalLoanBalance - sellingCosts;

  // Add sale proceeds to final cash flow for IRR
  cashFlows[cashFlows.length - 1] += netSaleProceeds;

  const totalCashFlow = cumulativeCashFlow;
  const projectedEquity = netSaleProceeds;
  const totalProfit = totalCashFlow + netSaleProceeds - totalInvestment;
  const totalROI = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
  const irr = calculateIRR(cashFlows);

  return {
    totalInvestment,
    downPayment,
    loanAmount,
    monthlyMortgage,
    grossAnnualIncome,
    effectiveGrossIncome,
    annualOperatingExpenses,
    noi,
    annualDebtService,
    annualCashFlow,
    capRate,
    cashOnCash,
    yearlyProjections,
    totalCashFlow,
    projectedSalePrice,
    projectedEquity,
    totalProfit,
    totalROI,
    irr,
  };
}

/**
 * Compare multiple properties and rank them
 */
export interface PropertyComparison {
  propertyId: string;
  name: string;
  analysis: PropertyAnalysis;
  rankings: {
    capRate: number;
    cashOnCash: number;
    irr: number;
    totalROI: number;
    overall: number;
  };
}

export function compareProperties(
  properties: Array<{ id: string; name: string; input: PropertyInput }>
): PropertyComparison[] {
  const analyses = properties.map((p) => ({
    propertyId: p.id,
    name: p.name,
    analysis: analyzeProperty(p.input),
  }));

  // Sort by each metric to assign rankings
  const sortedByCapRate = [...analyses].sort(
    (a, b) => b.analysis.capRate - a.analysis.capRate
  );
  const sortedByCashOnCash = [...analyses].sort(
    (a, b) => b.analysis.cashOnCash - a.analysis.cashOnCash
  );
  const sortedByIRR = [...analyses].sort(
    (a, b) => b.analysis.irr - a.analysis.irr
  );
  const sortedByROI = [...analyses].sort(
    (a, b) => b.analysis.totalROI - a.analysis.totalROI
  );

  const comparisons: PropertyComparison[] = analyses.map((a) => {
    const capRateRank =
      sortedByCapRate.findIndex((x) => x.propertyId === a.propertyId) + 1;
    const cashOnCashRank =
      sortedByCashOnCash.findIndex((x) => x.propertyId === a.propertyId) + 1;
    const irrRank =
      sortedByIRR.findIndex((x) => x.propertyId === a.propertyId) + 1;
    const roiRank =
      sortedByROI.findIndex((x) => x.propertyId === a.propertyId) + 1;

    // Overall rank is average of all rankings
    const overallScore = (capRateRank + cashOnCashRank + irrRank + roiRank) / 4;

    return {
      propertyId: a.propertyId,
      name: a.name,
      analysis: a.analysis,
      rankings: {
        capRate: capRateRank,
        cashOnCash: cashOnCashRank,
        irr: irrRank,
        totalROI: roiRank,
        overall: overallScore,
      },
    };
  });

  // Sort by overall rank
  return comparisons.sort((a, b) => a.rankings.overall - b.rankings.overall);
}
