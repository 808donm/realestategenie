// Commission Split Calculator

export interface CommissionSplitInput {
  salePrice: number;
  commissionPercent: number;
  // Split: agent's share of the commission (e.g. 70 means 70/30 agent/brokerage)
  agentSplitPercent: number;
  // Cap: annual cap on brokerage share; 0 = no cap
  brokerageCap: number;
  // Amount already paid toward cap this year
  capAlreadyPaid: number;
  // Flat transaction fee charged by brokerage
  transactionFee: number;
  // E&O or other per-deal fees
  otherFees: number;
  // Team override: % of agent's share that goes to team lead / team
  teamOverridePercent: number;
}

export interface CommissionSplitAnalysis {
  grossCommission: number;
  // Brokerage split (before cap)
  brokerageSharePreCap: number;
  // Actual brokerage share after cap
  brokerageShare: number;
  capApplied: boolean;
  capRemaining: number;
  // Agent side
  agentSharePreOverride: number;
  teamOverrideAmount: number;
  agentGrossAfterSplit: number;
  // Fees
  transactionFee: number;
  otherFees: number;
  totalFees: number;
  // Final
  agentNet: number;
  brokerageGross: number;
  // Percentages for display
  agentNetPercent: number; // agent net as % of gross commission
  effectiveSplitPercent: number; // agent net as % of sale price
}

export function calculateCommissionSplit(input: CommissionSplitInput): CommissionSplitAnalysis {
  const {
    salePrice,
    commissionPercent,
    agentSplitPercent,
    brokerageCap,
    capAlreadyPaid,
    transactionFee,
    otherFees,
    teamOverridePercent,
  } = input;

  const grossCommission = salePrice * (commissionPercent / 100);

  // Brokerage share before cap
  const brokerageSharePreCap = grossCommission * ((100 - agentSplitPercent) / 100);

  // Apply cap if set
  let brokerageShare = brokerageSharePreCap;
  let capApplied = false;
  let capRemaining = 0;

  if (brokerageCap > 0) {
    const remainingCap = Math.max(0, brokerageCap - capAlreadyPaid);
    if (brokerageSharePreCap > remainingCap) {
      brokerageShare = remainingCap;
      capApplied = true;
    }
    capRemaining = Math.max(0, remainingCap - brokerageShare);
  }

  // Agent share = gross commission - actual brokerage share
  const agentSharePreOverride = grossCommission - brokerageShare;

  // Team override
  const teamOverrideAmount = agentSharePreOverride * (teamOverridePercent / 100);
  const agentGrossAfterSplit = agentSharePreOverride - teamOverrideAmount;

  // Fees
  const totalFees = transactionFee + otherFees;

  // Agent net
  const agentNet = agentGrossAfterSplit - totalFees;

  // Brokerage gross = their split share + transaction fee + other fees
  const brokerageGross = brokerageShare + totalFees + teamOverrideAmount;

  // Percentages
  const agentNetPercent = grossCommission > 0 ? (agentNet / grossCommission) * 100 : 0;
  const effectiveSplitPercent = salePrice > 0 ? (agentNet / salePrice) * 100 : 0;

  return {
    grossCommission,
    brokerageSharePreCap,
    brokerageShare,
    capApplied,
    capRemaining,
    agentSharePreOverride,
    teamOverrideAmount,
    agentGrossAfterSplit,
    transactionFee,
    otherFees,
    totalFees,
    agentNet,
    brokerageGross,
    agentNetPercent,
    effectiveSplitPercent,
  };
}
