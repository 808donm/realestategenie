/**
 * Honolulu Board of REALTORS®
 * Monthly Residential Resales Statistics for Oahu
 * Source: HiCentral MLS, Ltd. data
 */

export type MonthlyMarketData = {
  month: string; // "YYYY-MM"
  label: string; // "January 2026"
  singleFamily: {
    sales: number;
    salesYoY: number; // percent change
    medianPrice: number;
    medianPriceYoY: number;
    medianDOM: number;
    prevYearMedianDOM: number;
    pendingSales: number;
    pendingSalesYoY: number;
    newListings: number;
    newListingsYoY: number;
    activeInventory: number;
    activeInventoryYoY: number;
    aboveAskingPct: number;
    prevYearAboveAskingPct: number;
  };
  condo: {
    sales: number;
    salesYoY: number;
    medianPrice: number;
    medianPriceYoY: number;
    medianDOM: number;
    prevYearMedianDOM: number;
    pendingSales: number;
    pendingSalesYoY: number;
    newListings: number;
    newListingsYoY: number;
    activeInventory: number;
    activeInventoryYoY: number;
    aboveAskingPct: number;
    prevYearAboveAskingPct: number;
  };
  highlights: string[];
};

export const OAHU_MONTHLY_DATA: MonthlyMarketData[] = [
  {
    month: "2026-01",
    label: "January 2026",
    singleFamily: {
      sales: 194,
      salesYoY: -1.0,
      medianPrice: 1122500,
      medianPriceYoY: 0.2,
      medianDOM: 27,
      prevYearMedianDOM: 25,
      pendingSales: 239,
      pendingSalesYoY: 14.4,
      newListings: 343,
      newListingsYoY: 2.1,
      activeInventory: 674,
      activeInventoryYoY: -8.2,
      aboveAskingPct: 31,
      prevYearAboveAskingPct: 23,
    },
    condo: {
      sales: 297,
      salesYoY: -4.8,
      medianPrice: 529000,
      medianPriceYoY: -1.9,
      medianDOM: 47,
      prevYearMedianDOM: 39,
      pendingSales: 375,
      pendingSalesYoY: 5.0,
      newListings: 696,
      newListingsYoY: -5.8,
      activeInventory: 2210,
      activeInventoryYoY: 5.8,
      aboveAskingPct: 7,
      prevYearAboveAskingPct: 10,
    },
    highlights: [
      "Homes priced at $500,000 and below accounted for 146 year-to-date sales with 1,000+ active listings in that range.",
      "Nearly 60% of single-family homes sold between $800,000 to $1,399,999.",
      "Single-family buyer competition increased — 31% of sales closed above asking price vs 23% last year.",
      "Condo sales generally closed below original asking price across all price points.",
      "Pending sales showed positive movement: SF +14.4% and condo +5.0% year-over-year.",
    ],
  },
];

/**
 * Price range breakdown for the latest month
 */
export type PriceRangeData = {
  range: string;
  sfSales: number;
  condoSales: number;
};

export const JAN_2026_PRICE_RANGES: PriceRangeData[] = [
  { range: "Under $300K", sfSales: 2, condoSales: 38 },
  { range: "$300K-$500K", sfSales: 8, condoSales: 98 },
  { range: "$500K-$700K", sfSales: 22, condoSales: 82 },
  { range: "$700K-$900K", sfSales: 36, condoSales: 40 },
  { range: "$900K-$1.1M", sfSales: 38, condoSales: 22 },
  { range: "$1.1M-$1.4M", sfSales: 52, condoSales: 10 },
  { range: "$1.4M-$2M", sfSales: 24, condoSales: 5 },
  { range: "$2M+", sfSales: 12, condoSales: 2 },
];
