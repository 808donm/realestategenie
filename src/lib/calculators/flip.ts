/**
 * House Flip Calculator
 *
 * For fix-and-flip investors who:
 * 1. Purchase undervalued properties
 * 2. Renovate/repair
 * 3. Sell for profit
 *
 * Key metrics:
 * - After Repair Value (ARV)
 * - All-in costs
 * - Gross profit
 * - Net profit (after all costs)
 * - ROI on cash invested
 * - Annualized ROI
 */

export interface FlipInput {
  // Purchase
  purchasePrice: number;
  purchaseClosingCosts: number;

  // Financing (if using)
  useFinancing: boolean;
  loanToValuePercent: number; // LTV on purchase
  loanInterestRate: number; // Annual
  loanPoints: number; // Upfront points (1 point = 1% of loan)

  // Renovation
  renovationCosts: number;
  contingencyPercent: number; // Additional buffer (typically 10-20%)

  // Holding Period
  holdingPeriodMonths: number;

  // Monthly Holding Costs
  propertyTaxMonthly: number;
  insuranceMonthly: number;
  utilitiesMonthly: number;
  otherHoldingCostsMonthly: number;

  // Sale
  afterRepairValue: number;
  sellingCostsPercent: number; // Agent fees, closing (typically 8-10%)

  // Additional costs
  stagingCosts: number;
  permitsCosts: number;
}

export interface FlipAnalysis {
  // Purchase Phase
  totalPurchaseCost: number;
  loanAmount: number;
  cashAtPurchase: number;
  loanPointsCost: number;

  // Renovation
  totalRenovationCost: number; // Including contingency
  contingencyAmount: number;

  // Holding Costs
  monthlyHoldingCosts: number;
  totalHoldingCosts: number;
  interestCostsDuringHold: number;

  // All-in Costs
  allInCost: number;
  totalCashRequired: number;

  // Sale
  grossSalePrice: number;
  sellingCosts: number;
  netSaleProceeds: number;

  // Profits
  grossProfit: number;
  netProfit: number;
  profitMargin: number;

  // Returns
  roiOnCash: number;
  roiOnTotalCost: number;
  annualizedROI: number;

  // 70% Rule Check
  maxPurchaseAt70: number;
  meetsRule70: boolean;

  // Deal Analysis
  dealScore: number; // 1-5
  profitPerMonth: number;

  // Break-even
  breakEvenSalePrice: number;
  safetyMargin: number; // % below ARV before losing money

  // Monthly breakdown
  monthlyBreakdown: FlipMonthlyBreakdown[];
}

export interface FlipMonthlyBreakdown {
  month: number;
  cumulativeCosts: number;
  interestAccrued: number;
  holdingCosts: number;
  totalInvested: number;
}

export function analyzeFlip(input: FlipInput): FlipAnalysis {
  // === PURCHASE PHASE ===
  const totalPurchaseCost = input.purchasePrice + input.purchaseClosingCosts;

  let loanAmount = 0;
  let cashAtPurchase = totalPurchaseCost;
  let loanPointsCost = 0;

  if (input.useFinancing) {
    loanAmount = input.purchasePrice * (input.loanToValuePercent / 100);
    loanPointsCost = loanAmount * (input.loanPoints / 100);
    cashAtPurchase = totalPurchaseCost - loanAmount + loanPointsCost;
  }

  // === RENOVATION ===
  const contingencyAmount = input.renovationCosts * (input.contingencyPercent / 100);
  const totalRenovationCost = input.renovationCosts + contingencyAmount + input.permitsCosts;

  // === HOLDING COSTS ===
  const monthlyBaseHolding =
    input.propertyTaxMonthly +
    input.insuranceMonthly +
    input.utilitiesMonthly +
    input.otherHoldingCostsMonthly;

  // Interest-only loan payments during holding
  const monthlyInterest = loanAmount * (input.loanInterestRate / 100 / 12);
  const monthlyHoldingCosts = monthlyBaseHolding + monthlyInterest;

  const totalHoldingCosts = monthlyBaseHolding * input.holdingPeriodMonths;
  const interestCostsDuringHold = monthlyInterest * input.holdingPeriodMonths;

  // === ALL-IN COSTS ===
  const allInCost =
    totalPurchaseCost +
    totalRenovationCost +
    totalHoldingCosts +
    interestCostsDuringHold +
    loanPointsCost +
    input.stagingCosts;

  const totalCashRequired =
    cashAtPurchase +
    totalRenovationCost +
    totalHoldingCosts +
    interestCostsDuringHold +
    input.stagingCosts;

  // === SALE ===
  const grossSalePrice = input.afterRepairValue;
  const sellingCosts = grossSalePrice * (input.sellingCostsPercent / 100);
  const netSaleProceeds = grossSalePrice - sellingCosts - loanAmount;

  // === PROFITS ===
  const grossProfit = grossSalePrice - allInCost;
  const netProfit = netSaleProceeds - totalCashRequired;
  const profitMargin = (netProfit / grossSalePrice) * 100;

  // === RETURNS ===
  const roiOnCash = totalCashRequired > 0 ? (netProfit / totalCashRequired) * 100 : 0;
  const roiOnTotalCost = allInCost > 0 ? (grossProfit / allInCost) * 100 : 0;

  // Annualized ROI
  const yearsHeld = input.holdingPeriodMonths / 12;
  const annualizedROI = yearsHeld > 0 ? roiOnCash / yearsHeld : roiOnCash * 12;

  // === 70% RULE ===
  const maxPurchaseAt70 = input.afterRepairValue * 0.7 - input.renovationCosts;
  const meetsRule70 = input.purchasePrice <= maxPurchaseAt70;

  // === DEAL SCORE ===
  let dealScore = 1;

  // Profit margin scoring
  if (profitMargin >= 15) dealScore += 1.5;
  else if (profitMargin >= 10) dealScore += 1;
  else if (profitMargin >= 5) dealScore += 0.5;

  // ROI scoring
  if (roiOnCash >= 30) dealScore += 1.5;
  else if (roiOnCash >= 20) dealScore += 1;
  else if (roiOnCash >= 10) dealScore += 0.5;

  // 70% rule bonus
  if (meetsRule70) dealScore += 0.5;

  // Positive profit
  if (netProfit > 0) dealScore += 0.5;

  dealScore = Math.min(5, Math.max(1, dealScore));

  // === PROFIT METRICS ===
  const profitPerMonth = input.holdingPeriodMonths > 0
    ? netProfit / input.holdingPeriodMonths
    : netProfit;

  // === BREAK-EVEN ===
  const breakEvenSalePrice = allInCost + sellingCosts + loanAmount;
  const safetyMargin = ((grossSalePrice - breakEvenSalePrice) / grossSalePrice) * 100;

  // === MONTHLY BREAKDOWN ===
  const monthlyBreakdown: FlipMonthlyBreakdown[] = [];
  let cumulativeCosts = cashAtPurchase + totalRenovationCost + loanPointsCost + input.stagingCosts;

  for (let month = 1; month <= input.holdingPeriodMonths; month++) {
    const interestAccrued = monthlyInterest;
    const holdingCosts = monthlyBaseHolding;
    cumulativeCosts += interestAccrued + holdingCosts;

    monthlyBreakdown.push({
      month,
      cumulativeCosts,
      interestAccrued,
      holdingCosts,
      totalInvested: cumulativeCosts,
    });
  }

  return {
    // Purchase
    totalPurchaseCost,
    loanAmount,
    cashAtPurchase,
    loanPointsCost,

    // Renovation
    totalRenovationCost,
    contingencyAmount,

    // Holding
    monthlyHoldingCosts,
    totalHoldingCosts,
    interestCostsDuringHold,

    // All-in
    allInCost,
    totalCashRequired,

    // Sale
    grossSalePrice,
    sellingCosts,
    netSaleProceeds,

    // Profits
    grossProfit,
    netProfit,
    profitMargin,

    // Returns
    roiOnCash,
    roiOnTotalCost,
    annualizedROI,

    // Rules
    maxPurchaseAt70,
    meetsRule70,

    // Score
    dealScore,
    profitPerMonth,

    // Break-even
    breakEvenSalePrice,
    safetyMargin,

    // Breakdown
    monthlyBreakdown,
  };
}

/**
 * Calculate Maximum Allowable Offer for flips
 */
export function calculateFlipMAO(
  arv: number,
  repairCosts: number,
  desiredProfitPercent: number = 15,
  closingBuyPercent: number = 3,
  closingSellPercent: number = 8
): { mao: number; breakdown: Record<string, number> } {
  const desiredProfit = arv * (desiredProfitPercent / 100);
  const closingBuy = arv * (closingBuyPercent / 100);
  const closingSell = arv * (closingSellPercent / 100);

  const mao = arv - repairCosts - desiredProfit - closingBuy - closingSell;

  return {
    mao,
    breakdown: {
      arv,
      repairCosts,
      desiredProfit,
      closingBuy,
      closingSell,
      mao,
    },
  };
}

/**
 * Get flip verdict based on analysis
 */
export function getFlipVerdict(analysis: FlipAnalysis): {
  verdict: string;
  color: string;
  description: string;
} {
  if (analysis.netProfit < 0) {
    return {
      verdict: "Loss",
      color: "#dc2626",
      description: "This deal will lose money",
    };
  }

  if (analysis.dealScore >= 4.5) {
    return {
      verdict: "Home Run",
      color: "#16a34a",
      description: "Exceptional profit potential with strong margins",
    };
  }

  if (analysis.dealScore >= 3.5) {
    return {
      verdict: "Solid Flip",
      color: "#22c55e",
      description: "Good profit margins and meets key criteria",
    };
  }

  if (analysis.dealScore >= 2.5) {
    return {
      verdict: "Acceptable",
      color: "#84cc16",
      description: "Moderate returns, proceed with caution",
    };
  }

  if (analysis.dealScore >= 1.5) {
    return {
      verdict: "Marginal",
      color: "#eab308",
      description: "Thin margins, negotiate for better price",
    };
  }

  return {
    verdict: "Pass",
    color: "#f97316",
    description: "Does not meet minimum flip criteria",
  };
}

/**
 * Calculate rehab cost estimates by property type
 */
export function estimateRehabCosts(
  squareFeet: number,
  rehabLevel: "cosmetic" | "moderate" | "major" | "gut"
): { low: number; mid: number; high: number } {
  const costPerSqFt = {
    cosmetic: { low: 15, mid: 25, high: 35 },
    moderate: { low: 30, mid: 45, high: 60 },
    major: { low: 50, mid: 75, high: 100 },
    gut: { low: 80, mid: 120, high: 175 },
  };

  const costs = costPerSqFt[rehabLevel];

  return {
    low: squareFeet * costs.low,
    mid: squareFeet * costs.mid,
    high: squareFeet * costs.high,
  };
}
