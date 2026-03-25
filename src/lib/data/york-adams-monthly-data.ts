/**
 * RAYAC (REALTORS Association of York & Adams Counties)
 * Monthly Housing Statistics
 * Source: Bright MLS
 */

export interface YorkAdamsSchoolDistrict {
  name: string;
  medianPrice2026: number;
  medianPrice2025: number;
  priceChangeYoY: number; // percent
  sold2026: number;
  sold2025: number;
  salesChangeYoY: number; // percent
}

export interface YorkAdamsCountyData {
  county: string;
  medianSoldPrice: number;
  medianSoldPricePrevYear: number;
  priceChangeYoY: number;
  homesSold: number;
  homesSoldPrevYear: number;
  salesChangeYoY: number;
  newListings: number;
  activeListings: number;
  activeListingsPrevYear: number;
  pendingSales: number;
  pendingSalesChangeYoY: number;
  daysOnMarket: number;
  monthsSupply: number;
  listPriceReceivedPct: number;
  schoolDistricts: YorkAdamsSchoolDistrict[];
}

export interface YorkAdamsMonthlyData {
  month: string; // "YYYY-MM"
  label: string; // "January 2026"
  counties: YorkAdamsCountyData[];
  headline: string;
  highlights: string[];
}

export const YORK_ADAMS_MONTHLY_DATA: YorkAdamsMonthlyData[] = [
  {
    month: "2026-01",
    label: "January 2026",
    headline: "The median home sale price surpassed $300,000 for the first time this January in York County. Adams County saw a 16% increase in homes sold year-over-year.",
    highlights: [
      "York County median sold price: $302,990 (+12% YoY)",
      "Adams County median sold price: $321,670 (-2% YoY)",
      "York County homes sold: 337 (-4% YoY)",
      "Adams County homes sold: 72 (+16% YoY)",
      "Active inventory up significantly: York 698 (+25%), Adams 199 (+19%)",
      "Days on market: York 14 days, Adams 32 days",
    ],
    counties: [
      {
        county: "York County",
        medianSoldPrice: 302990,
        medianSoldPricePrevYear: 269900,
        priceChangeYoY: 12,
        homesSold: 337,
        homesSoldPrevYear: 350,
        salesChangeYoY: -4,
        newListings: 428,
        activeListings: 698,
        activeListingsPrevYear: 557,
        pendingSales: 560,
        pendingSalesChangeYoY: 10,
        daysOnMarket: 14,
        monthsSupply: 1.54,
        listPriceReceivedPct: 100,
        schoolDistricts: [
          { name: "Central York", medianPrice2026: 275000, medianPrice2025: 274950, priceChangeYoY: 0, sold2026: 25, sold2025: 21, salesChangeYoY: 19 },
          { name: "Dallastown", medianPrice2026: 323250, medianPrice2025: 300000, priceChangeYoY: 8, sold2026: 32, sold2025: 25, salesChangeYoY: 28 },
          { name: "Dover", medianPrice2026: 267500, medianPrice2025: 256000, priceChangeYoY: 4, sold2026: 20, sold2025: 18, salesChangeYoY: 11 },
          { name: "Eastern York", medianPrice2026: 442450, medianPrice2025: 217500, priceChangeYoY: 103, sold2026: 8, sold2025: 10, salesChangeYoY: -20 },
          { name: "Hanover", medianPrice2026: 222250, medianPrice2025: 275000, priceChangeYoY: -19, sold2026: 16, sold2025: 15, salesChangeYoY: 7 },
          { name: "Northeastern York", medianPrice2026: 376550, medianPrice2025: 251100, priceChangeYoY: 50, sold2026: 16, sold2025: 27, salesChangeYoY: -41 },
          { name: "Northern York", medianPrice2026: 494500, medianPrice2025: 349000, priceChangeYoY: 42, sold2026: 14, sold2025: 10, salesChangeYoY: 40 },
          { name: "Red Lion", medianPrice2026: 310000, medianPrice2025: 325000, priceChangeYoY: -5, sold2026: 27, sold2025: 15, salesChangeYoY: 80 },
          { name: "South Eastern York", medianPrice2026: 340000, medianPrice2025: 440892, priceChangeYoY: -23, sold2026: 7, sold2025: 14, salesChangeYoY: -50 },
          { name: "South Western York", medianPrice2026: 330000, medianPrice2025: 342500, priceChangeYoY: -4, sold2026: 37, sold2025: 52, salesChangeYoY: -29 },
          { name: "Southern York", medianPrice2026: 405380, medianPrice2025: 326895, priceChangeYoY: 24, sold2026: 14, sold2025: 20, salesChangeYoY: -30 },
          { name: "Spring Grove", medianPrice2026: 314900, medianPrice2025: 320000, priceChangeYoY: -2, sold2026: 21, sold2025: 19, salesChangeYoY: 11 },
          { name: "West Shore", medianPrice2026: 330000, medianPrice2025: 280000, priceChangeYoY: 18, sold2026: 29, sold2025: 31, salesChangeYoY: -6 },
          { name: "West York", medianPrice2026: 261500, medianPrice2025: 196500, priceChangeYoY: 33, sold2026: 20, sold2025: 22, salesChangeYoY: -9 },
          { name: "York City", medianPrice2026: 170000, medianPrice2025: 156325, priceChangeYoY: 9, sold2026: 29, sold2025: 26, salesChangeYoY: 12 },
          { name: "York Suburban", medianPrice2026: 315000, medianPrice2025: 235000, priceChangeYoY: 34, sold2026: 22, sold2025: 25, salesChangeYoY: -12 },
        ],
      },
      {
        county: "Adams County",
        medianSoldPrice: 321670,
        medianSoldPricePrevYear: 329200,
        priceChangeYoY: -2,
        homesSold: 72,
        homesSoldPrevYear: 62,
        salesChangeYoY: 16,
        newListings: 110,
        activeListings: 199,
        activeListingsPrevYear: 167,
        pendingSales: 134,
        pendingSalesChangeYoY: 18,
        daysOnMarket: 32,
        monthsSupply: 2.14,
        listPriceReceivedPct: 97.1,
        schoolDistricts: [
          { name: "Bermudian Springs", medianPrice2026: 361495, medianPrice2025: 334900, priceChangeYoY: 8, sold2026: 8, sold2025: 7, salesChangeYoY: 14 },
          { name: "Conewago Valley", medianPrice2026: 291000, medianPrice2025: 264900, priceChangeYoY: 10, sold2026: 25, sold2025: 17, salesChangeYoY: 47 },
          { name: "Fairfield", medianPrice2026: 357950, medianPrice2025: 337500, priceChangeYoY: 6, sold2026: 8, sold2025: 6, salesChangeYoY: 33 },
          { name: "Gettysburg", medianPrice2026: 355000, medianPrice2025: 386400, priceChangeYoY: -8, sold2026: 19, sold2025: 18, salesChangeYoY: 6 },
          { name: "Littlestown", medianPrice2026: 292500, medianPrice2025: 275700, priceChangeYoY: 6, sold2026: 6, sold2025: 8, salesChangeYoY: -25 },
          { name: "Upper Adams", medianPrice2026: 324000, medianPrice2025: 345000, priceChangeYoY: -6, sold2026: 6, sold2025: 6, salesChangeYoY: 0 },
        ],
      },
    ],
  },
  {
    month: "2026-02",
    label: "February 2026",
    headline: "York County median home sale price increased 11% to $299,950 YTD. Adams County saw 146 homes sold YTD, an 11% increase. Pending sales are up in both counties, reflecting continued demand.",
    highlights: [
      "York County YTD median sold price: $299,950 (+11% YoY)",
      "Adams County YTD median sold price: $310,000 (-4% YoY)",
      "York County YTD homes sold: 702 (flat YoY)",
      "Adams County YTD homes sold: 146 (+11% YoY)",
      "Pending sales up: York +6%, Adams +4%",
      "Active inventory growing: York 682 (prev 618), Adams 218 (prev 167)",
      "York County DOM: 16 days, Adams County DOM: 19 days",
    ],
    counties: [
      {
        county: "York County",
        medianSoldPrice: 299950,
        medianSoldPricePrevYear: 269900,
        priceChangeYoY: 11,
        homesSold: 702,
        homesSoldPrevYear: 699,
        salesChangeYoY: 0,
        newListings: 392,
        activeListings: 682,
        activeListingsPrevYear: 618,
        pendingSales: 585,
        pendingSalesChangeYoY: 6,
        daysOnMarket: 16,
        monthsSupply: 1.50,
        listPriceReceivedPct: 100,
        schoolDistricts: [
          { name: "Central York", medianPrice2026: 284950, medianPrice2025: 286450, priceChangeYoY: -1, sold2026: 40, sold2025: 28, salesChangeYoY: 43 },
          { name: "Dallastown", medianPrice2026: 299900, medianPrice2025: 301450, priceChangeYoY: -1, sold2026: 29, sold2025: 32, salesChangeYoY: -9 },
          { name: "Dover", medianPrice2026: 296641, medianPrice2025: 269505, priceChangeYoY: 10, sold2026: 30, sold2025: 19, salesChangeYoY: 58 },
          { name: "Eastern York", medianPrice2026: 473370, medianPrice2025: 202000, priceChangeYoY: 134, sold2026: 4, sold2025: 13, salesChangeYoY: -69 },
          { name: "Hanover", medianPrice2026: 254900, medianPrice2025: 251000, priceChangeYoY: 2, sold2026: 17, sold2025: 18, salesChangeYoY: -6 },
          { name: "Northeastern York", medianPrice2026: 307500, medianPrice2025: 289900, priceChangeYoY: 6, sold2026: 20, sold2025: 13, salesChangeYoY: 54 },
          { name: "Northern York", medianPrice2026: 364900, medianPrice2025: 305000, priceChangeYoY: 20, sold2026: 11, sold2025: 11, salesChangeYoY: 0 },
          { name: "Red Lion", medianPrice2026: 263950, medianPrice2025: 269900, priceChangeYoY: -2, sold2026: 22, sold2025: 25, salesChangeYoY: -12 },
          { name: "South Eastern", medianPrice2026: 327500, medianPrice2025: 372500, priceChangeYoY: -12, sold2026: 12, sold2025: 16, salesChangeYoY: -25 },
          { name: "South Western York", medianPrice2026: 339995, medianPrice2025: 319998, priceChangeYoY: 6, sold2026: 29, sold2025: 40, salesChangeYoY: -28 },
          { name: "Southern York", medianPrice2026: 370025, medianPrice2025: 290000, priceChangeYoY: 28, sold2026: 12, sold2025: 10, salesChangeYoY: 20 },
          { name: "Spring Grove", medianPrice2026: 315000, medianPrice2025: 284000, priceChangeYoY: 11, sold2026: 23, sold2025: 31, salesChangeYoY: -26 },
          { name: "West Shore", medianPrice2026: 332000, medianPrice2025: 364875, priceChangeYoY: -9, sold2026: 23, sold2025: 16, salesChangeYoY: 44 },
          { name: "West York", medianPrice2026: 243000, medianPrice2025: 223500, priceChangeYoY: 9, sold2026: 25, sold2025: 16, salesChangeYoY: 56 },
          { name: "York City", medianPrice2026: 160000, medianPrice2025: 145000, priceChangeYoY: 10, sold2026: 35, sold2025: 32, salesChangeYoY: 9 },
          { name: "York Suburban", medianPrice2026: 327500, medianPrice2025: 262500, priceChangeYoY: 25, sold2026: 26, sold2025: 22, salesChangeYoY: 18 },
        ],
      },
      {
        county: "Adams County",
        medianSoldPrice: 310000,
        medianSoldPricePrevYear: 323000,
        priceChangeYoY: -4,
        homesSold: 146,
        homesSoldPrevYear: 132,
        salesChangeYoY: 11,
        newListings: 101,
        activeListings: 218,
        activeListingsPrevYear: 167,
        pendingSales: 125,
        pendingSalesChangeYoY: 4,
        daysOnMarket: 19,
        monthsSupply: 2.33,
        listPriceReceivedPct: 99.6,
        schoolDistricts: [
          { name: "Bermudian Springs", medianPrice2026: 290000, medianPrice2025: 300000, priceChangeYoY: -3, sold2026: 11, sold2025: 5, salesChangeYoY: 120 },
          { name: "Conewago Valley", medianPrice2026: 291000, medianPrice2025: 243000, priceChangeYoY: 20, sold2026: 21, sold2025: 11, salesChangeYoY: 91 },
          { name: "Fairfield", medianPrice2026: 407000, medianPrice2025: 370000, priceChangeYoY: 10, sold2026: 6, sold2025: 11, salesChangeYoY: -45 },
          { name: "Gettysburg", medianPrice2026: 350000, medianPrice2025: 365203, priceChangeYoY: -4, sold2026: 15, sold2025: 25, salesChangeYoY: -40 },
          { name: "Littlestown", medianPrice2026: 290000, medianPrice2025: 300000, priceChangeYoY: -3, sold2026: 10, sold2025: 15, salesChangeYoY: -33 },
          { name: "Upper Adams", medianPrice2026: 247000, medianPrice2025: 210000, priceChangeYoY: 18, sold2026: 9, sold2025: 2, salesChangeYoY: 350 },
        ],
      },
    ],
  },
];
