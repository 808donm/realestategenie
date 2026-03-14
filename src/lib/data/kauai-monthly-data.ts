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
    month: "2026-01",
    label: "January 2026",
    singleFamily: {
      medianPrice: 987500,
      dom: 100,
      domDirection: "up",
      activeListings: 181,
      newListings: 37,
      prevYearNewListings: 47,
      soldListings: 18,
      prevYearSoldListings: 29,
    },
    condo: {
      medianPrice: 965000,
      dom: 105,
      domDirection: "up",
      activeListings: 186,
      newListings: 36,
      prevYearNewListings: 40,
      soldListings: 21,
      prevYearSoldListings: 31,
    },
    land: {
      medianPrice: 445000,
      dom: 284,
      domDirection: "up",
      activeListings: 108,
      newListings: 13,
      prevYearNewListings: 22,
      soldListings: 4,
      prevYearSoldListings: 11,
    },
    headline: "Kauai sales contract sharply across all property types in January",
    highlights: [
      "SF median price $987,500 (down from Dec 2025), DOM 100 days (rising).",
      "SF sales dropped 37.9% (18 vs 29 YoY) with new listings down 21.3% (37 vs 47).",
      "Condo median surged to $965,000 (up from Dec 2025) but sales fell 32.3% (21 vs 31).",
      "Land DOM at 284 days — extremely slow, with only 4 sales (vs 11 last year).",
      "New listings declining across all types: SF -21.3%, Condo -10.0%, Land -40.9%.",
      "Land median price at $445,000 (down from Dec 2025).",
    ],
  },
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
