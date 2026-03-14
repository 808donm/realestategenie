/**
 * Hawaii Information Service
 * Hawaii Island Market Statistics — February 2026
 * Source: Hawaii Information Service MLS data
 */

export type HawaiiIslandMonthlyData = {
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

export const HAWAII_ISLAND_MONTHLY_DATA: HawaiiIslandMonthlyData[] = [
  {
    month: "2026-02",
    label: "February 2026",
    singleFamily: {
      medianPrice: 575000,
      dom: 83,
      domDirection: "up",
      activeListings: 979,
      newListings: 263,
      prevYearNewListings: 270,
      soldListings: 128,
      prevYearSoldListings: 142,
    },
    condo: {
      medianPrice: 736500,
      dom: 52,
      domDirection: "down",
      activeListings: 350,
      newListings: 72,
      prevYearNewListings: 90,
      soldListings: 40,
      prevYearSoldListings: 46,
    },
    land: {
      medianPrice: 68500,
      dom: 103,
      domDirection: "down",
      activeListings: 1173,
      newListings: 198,
      prevYearNewListings: 285,
      soldListings: 103,
      prevYearSoldListings: 162,
    },
    headline: "Median prices rising across all property types, activity softening",
    highlights: [
      "SF median price at $575,000 (up from Jan 2026), DOM 83 days (increasing).",
      "Condo median price $736,500 with only 52 DOM — fastest-moving segment.",
      "SF new listings down slightly (263 vs 270 YoY), sold listings also down (128 vs 142).",
      "Condo activity contracted: new listings dropped 20% (72 vs 90), sales fell 13% (40 vs 46).",
      "Land market slowing significantly: new listings -30.5% (198 vs 285), sales -36.4% (103 vs 162).",
      "Land inventory remains large at 1,173 active listings with a $68,500 median price.",
    ],
  },
];
