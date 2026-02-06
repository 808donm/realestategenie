// Quick Flip Deal Analyzer

export interface QuickFlipInput {
  arv: number; // After Repair Value
  purchasePrice: number;
  rehabCost: number;
  holdingCosts: number; // total holding costs (taxes, insurance, utilities, etc.)
  sellingCosts: number; // agent commissions, closing costs, transfer tax
  financingCosts: number; // points, interest, loan fees
}

export interface QuickFlipAnalysis {
  totalInvestment: number;
  grossProfit: number;
  netProfit: number;
  roi: number; // ROI on total cash invested
  profitMargin: number; // net profit as % of ARV
  // MAO using 70% rule
  mao70: number;
  // MAO using custom formula: ARV - rehab - desired profit margin
  meetsRule70: boolean;
  rule70Spread: number; // purchase price vs MAO (positive = under MAO, good)
  // Deal verdict
  dealScore: number; // 1-5
  verdict: string;
}

export function calculateQuickFlip(input: QuickFlipInput): QuickFlipAnalysis {
  const { arv, purchasePrice, rehabCost, holdingCosts, sellingCosts, financingCosts } = input;

  const totalInvestment = purchasePrice + rehabCost + holdingCosts + sellingCosts + financingCosts;
  const grossProfit = arv - purchasePrice - rehabCost;
  const netProfit = arv - totalInvestment;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const profitMargin = arv > 0 ? (netProfit / arv) * 100 : 0;

  // 70% rule: MAO = ARV * 0.70 - rehab
  const mao70 = arv * 0.7 - rehabCost;
  const meetsRule70 = purchasePrice <= mao70;
  const rule70Spread = mao70 - purchasePrice;

  // Deal score 1-5
  let dealScore = 1;
  if (roi >= 30 && meetsRule70) dealScore = 5;
  else if (roi >= 20 && profitMargin >= 10) dealScore = 4;
  else if (roi >= 15) dealScore = 3;
  else if (roi >= 5) dealScore = 2;

  let verdict: string;
  if (dealScore >= 4) verdict = "Strong deal";
  else if (dealScore === 3) verdict = "Decent deal - proceed with caution";
  else if (dealScore === 2) verdict = "Marginal - negotiate harder";
  else verdict = "Pass - numbers don't work";

  return {
    totalInvestment,
    grossProfit,
    netProfit,
    roi,
    profitMargin,
    mao70,
    meetsRule70,
    rule70Spread,
    dealScore,
    verdict,
  };
}
