// Wholesale MAO Calculator

export interface WholesaleMaoInput {
  arv: number; // After Repair Value
  repairEstimate: number;
  investorMarginPercent: number; // desired investor profit margin (% of ARV, e.g. 30)
  assignmentFee: number; // wholesaler's assignment fee
}

export interface WholesaleMaoAnalysis {
  arv: number;
  repairEstimate: number;
  investorMargin: number;
  assignmentFee: number;
  // MAO = ARV - repairs - investor margin - assignment fee
  mao: number;
  // Offer range
  lowOffer: number; // aggressive: MAO - 10%
  midOffer: number; // MAO
  highOffer: number; // MAO + 5% (less room but still workable)
  // 70% rule check
  mao70Rule: number; // ARV * 0.70 - repairs
  meets70Rule: boolean;
  // Investor's numbers at MAO
  investorAllIn: number; // MAO + repairs + assignment fee
  investorProfit: number; // ARV - investorAllIn
  investorROI: number;
}

export function calculateWholesaleMao(input: WholesaleMaoInput): WholesaleMaoAnalysis {
  const { arv, repairEstimate, investorMarginPercent, assignmentFee } = input;

  const investorMargin = arv * (investorMarginPercent / 100);

  // MAO = ARV - repairs - investor margin - assignment fee
  const mao = arv - repairEstimate - investorMargin - assignmentFee;

  // Offer range
  const lowOffer = mao * 0.9;
  const midOffer = mao;
  const highOffer = mao * 1.05;

  // 70% rule
  const mao70Rule = arv * 0.7 - repairEstimate;
  const meets70Rule = mao <= mao70Rule;

  // Investor numbers at MAO
  const investorAllIn = mao + repairEstimate + assignmentFee;
  const investorProfit = arv - investorAllIn;
  const investorROI = investorAllIn > 0 ? (investorProfit / investorAllIn) * 100 : 0;

  return {
    arv,
    repairEstimate,
    investorMargin,
    assignmentFee,
    mao,
    lowOffer,
    midOffer,
    highOffer,
    mao70Rule,
    meets70Rule,
    investorAllIn,
    investorProfit,
    investorROI,
  };
}
