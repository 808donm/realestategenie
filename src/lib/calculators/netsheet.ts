// Net Sheet / Seller Proceeds Calculator

export interface ClosingCostLineItem {
  label: string;
  amount: number;
}

export interface NetSheetInput {
  salePrice: number;
  mortgagePayoff: number;
  // Commissions
  commissionMode: "total" | "split";
  totalCommissionPercent: number; // used when mode is "total"
  listingAgentPercent: number; // used when mode is "split"
  buyerAgentPercent: number; // used when mode is "split"
  // Closing costs
  closingCostMode: "percent" | "itemized";
  closingCostPercent: number; // used when mode is "percent"
  closingCostItems: ClosingCostLineItem[]; // used when mode is "itemized"
  // Repairs / credits / concessions
  repairsCredits: number;
  sellerConcessions: number;
  // Additional payoffs
  additionalPayoffs: number; // HELOCs, liens, etc.
}

export interface NetSheetAnalysis {
  salePrice: number;
  totalCommission: number;
  listingAgentCommission: number;
  buyerAgentCommission: number;
  totalClosingCosts: number;
  closingCostBreakdown: ClosingCostLineItem[];
  mortgagePayoff: number;
  repairsCredits: number;
  sellerConcessions: number;
  additionalPayoffs: number;
  totalDeductions: number;
  estimatedProceeds: number;
  proceedsPercent: number; // proceeds as % of sale price
}

export const DEFAULT_CLOSING_COST_ITEMS: ClosingCostLineItem[] = [
  { label: "Title Insurance", amount: 2500 },
  { label: "Escrow / Settlement Fee", amount: 1500 },
  { label: "Transfer Tax / Recording Fees", amount: 1000 },
  { label: "Attorney Fees", amount: 800 },
  { label: "HOA Estoppel / Docs", amount: 0 },
  { label: "Prorated Property Tax", amount: 0 },
];

export function calculateNetSheet(input: NetSheetInput): NetSheetAnalysis {
  const { salePrice, mortgagePayoff, repairsCredits, sellerConcessions, additionalPayoffs } = input;

  // Calculate commissions
  let listingAgentCommission: number;
  let buyerAgentCommission: number;

  if (input.commissionMode === "total") {
    const totalComm = salePrice * (input.totalCommissionPercent / 100);
    listingAgentCommission = totalComm / 2;
    buyerAgentCommission = totalComm / 2;
  } else {
    listingAgentCommission = salePrice * (input.listingAgentPercent / 100);
    buyerAgentCommission = salePrice * (input.buyerAgentPercent / 100);
  }

  const totalCommission = listingAgentCommission + buyerAgentCommission;

  // Calculate closing costs
  let totalClosingCosts: number;
  let closingCostBreakdown: ClosingCostLineItem[];

  if (input.closingCostMode === "percent") {
    totalClosingCosts = salePrice * (input.closingCostPercent / 100);
    closingCostBreakdown = [
      { label: `Closing Costs (${input.closingCostPercent}%)`, amount: totalClosingCosts },
    ];
  } else {
    closingCostBreakdown = input.closingCostItems.filter((item) => item.amount > 0);
    totalClosingCosts = input.closingCostItems.reduce((sum, item) => sum + item.amount, 0);
  }

  const totalDeductions =
    totalCommission +
    totalClosingCosts +
    mortgagePayoff +
    repairsCredits +
    sellerConcessions +
    additionalPayoffs;

  const estimatedProceeds = salePrice - totalDeductions;
  const proceedsPercent = salePrice > 0 ? (estimatedProceeds / salePrice) * 100 : 0;

  return {
    salePrice,
    totalCommission,
    listingAgentCommission,
    buyerAgentCommission,
    totalClosingCosts,
    closingCostBreakdown,
    mortgagePayoff,
    repairsCredits,
    sellerConcessions,
    additionalPayoffs,
    totalDeductions,
    estimatedProceeds,
    proceedsPercent,
  };
}
