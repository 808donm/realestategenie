/**
 * Hawaii Information Service
 * Kauai Market Statistics — February 2026
 * Source: Hawaii Information Service MLS data
 */

export type KauaiMonthlyData = {
  month: string;
  label: string;
  singleFamily: {
    medianPrice: number;
    dom: number;
    domDirection: "up" | "down";
    activeListings: number;
    newListings: number;
    prevYearNewListings: number;
    soldListings: number;
    prevYearSoldListings: number;
  };
  condo: {
    medianPrice: number;
    dom: number;
    domDirection: "up" | "down";
    activeListings: number;
    newListings: number;
    prevYearNewListings: number;
    soldListings: number;
    prevYearSoldListings: number;
  };
  land: {
    medianPrice: number;
    dom: number;
    domDirection: "up" | "down";
    activeListings: number;
    newListings: number;
    prevYearNewListings: number;
    soldListings: number;
    prevYearSoldListings: number;
  };
  headline: string;
  highlights: string[];
};

export const KAUAI_MONTHLY_DATA: KauaiMonthlyData[] = [
  {
    month: "2026-02",
    label: "February 2026",
    singleFamily: {
      medianPrice: 1369000,
      dom: 114,
      domDirection: "up",
      activeListings: 173,
      newListings: 39,
      prevYearNewListings: 44,
      soldListings: 32,
      prevYearSoldListings: 32,
    },
    condo: {
      medianPrice: 636700,
      dom: 43,
      domDirection: "down",
      activeListings: 185,
      newListings: 35,
      prevYearNewListings: 36,
      soldListings: 11,
      prevYearSoldListings: 19,
    },
    land: {
      medianPrice: 1234500,
      dom: 171,
      domDirection: "down",
      activeListings: 103,
      newListings: 7,
      prevYearNewListings: 19,
      soldListings: 6,
      prevYearSoldListings: 7,
    },
    headline: "Kauai SF sales hold steady; condo and land activity declines sharply",
    highlights: [
      "SF median price $1,369,000 (up from Jan 2026) — highest among neighbor islands.",
      "SF sales held flat at 32 year-over-year, with DOM rising to 114 days.",
      "Condo sales dropped 42% (11 vs 19 YoY) despite median price declining to $636,700.",
      "Condo DOM at 43 days — fastest-selling property type on the island.",
      "Land median price surged to $1,234,500, but only 6 sales closed (vs 7 last year).",
      "New listings declining across all types: SF -11.4%, Condo -2.8%, Land -63.2%.",
    ],
  },
];
