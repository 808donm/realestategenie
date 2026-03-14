/**
 * Hawai'i Realtors® — Statewide Real Estate Statistics
 * Official statewide totals from Hawai'i Realtors®
 * Source: Hawai'i Realtors® / All four county MLS systems
 */

export type StatewideMonthlyData = {
  month: string;
  label: string;
  highlights: string[];
  singleFamily: {
    counties: {
      county: string;
      sales2026: number;
      sales2025: number;
      salesChange: number;
      medianPrice2026: number;
      medianPrice2025: number;
      medianPriceChange: number;
    }[];
    totalSales2026: number;
    totalSales2025: number;
    totalSalesChange: number;
    totalMedianPrice2026: number;
    totalMedianPrice2025: number;
    totalMedianPriceChange: number;
  };
  condo: {
    counties: {
      county: string;
      sales2026: number;
      sales2025: number;
      salesChange: number;
      medianPrice2026: number;
      medianPrice2025: number;
      medianPriceChange: number;
    }[];
    totalSales2026: number;
    totalSales2025: number;
    totalSalesChange: number;
    totalMedianPrice2026: number;
    totalMedianPrice2025: number;
    totalMedianPriceChange: number;
  };
  ytd?: {
    singleFamily: {
      counties: {
        county: string;
        sales2026: number;
        sales2025: number;
        salesChange: number;
        medianPrice2026: number;
        medianPrice2025: number;
        medianPriceChange: number;
      }[];
      totalSales2026: number;
      totalSales2025: number;
      totalSalesChange: number;
      totalMedianPrice2026: number;
      totalMedianPrice2025: number;
      totalMedianPriceChange: number;
    };
    condo: {
      counties: {
        county: string;
        sales2026: number;
        sales2025: number;
        salesChange: number;
        medianPrice2026: number;
        medianPrice2025: number;
        medianPriceChange: number;
      }[];
      totalSales2026: number;
      totalSales2025: number;
      totalSalesChange: number;
      totalMedianPrice2026: number;
      totalMedianPrice2025: number;
      totalMedianPriceChange: number;
    };
  };
};

export const STATEWIDE_MONTHLY_DATA: StatewideMonthlyData[] = [
  {
    month: "2026-01",
    label: "January 2026",
    highlights: [
      "Statewide single-family median held above $1M at $1,010,000, down 2.5% year-over-year.",
      "Total SF sales fell 8.3% statewide (418 vs 456) with declines across all four counties.",
      "Maui SF median surged 20.4% to $1,445,000 — the highest of any county.",
      "Kaua'i saw the steepest SF sales drop at −37.9% (18 vs 29), though small sample sizes amplify swings.",
      "Condo sales declined 7.8% statewide with a median of $565,000, down 5.0% from last year.",
      "O'ahu accounted for 59% of all statewide sales (491 of 821 combined SF + condo).",
    ],
    singleFamily: {
      counties: [
        { county: "Hawai'i", sales2026: 154, sales2025: 172, salesChange: -10.47, medianPrice2026: 574500, medianPrice2025: 590000, medianPriceChange: -2.63 },
        { county: "Kaua'i", sales2026: 18, sales2025: 29, salesChange: -37.93, medianPrice2026: 987500, medianPrice2025: 1325000, medianPriceChange: -25.47 },
        { county: "Maui", sales2026: 52, sales2025: 59, salesChange: -11.86, medianPrice2026: 1445000, medianPrice2025: 1200000, medianPriceChange: 20.42 },
        { county: "O'ahu", sales2026: 194, sales2025: 196, salesChange: -1.02, medianPrice2026: 1122500, medianPrice2025: 1120000, medianPriceChange: 0.22 },
      ],
      totalSales2026: 418,
      totalSales2025: 456,
      totalSalesChange: -8.33,
      totalMedianPrice2026: 1010000,
      totalMedianPrice2025: 1035500,
      totalMedianPriceChange: -2.46,
    },
    condo: {
      counties: [
        { county: "Hawai'i", sales2026: 41, sales2025: 39, salesChange: 5.13, medianPrice2026: 615000, medianPrice2025: 680000, medianPriceChange: -9.56 },
        { county: "Kaua'i", sales2026: 21, sales2025: 31, salesChange: -32.26, medianPrice2026: 965000, medianPrice2025: 800000, medianPriceChange: 20.63 },
        { county: "Maui", sales2026: 44, sales2025: 55, salesChange: -20.00, medianPrice2026: 629950, medianPrice2025: 675000, medianPriceChange: -6.67 },
        { county: "O'ahu", sales2026: 297, sales2025: 312, salesChange: -4.81, medianPrice2026: 529000, medianPrice2025: 539500, medianPriceChange: -1.95 },
      ],
      totalSales2026: 403,
      totalSales2025: 437,
      totalSalesChange: -7.78,
      totalMedianPrice2026: 565000,
      totalMedianPrice2025: 595000,
      totalMedianPriceChange: -5.04,
    },
  },
  {
    month: "2026-02",
    label: "February 2026",
    highlights: [
      "Statewide SF median rose to $1,080,000, up 2.4% year-over-year — the first positive month of 2026.",
      "SF sales dipped just 1.5% (383 vs 389), a much narrower decline than January's −8.3%.",
      "Kaua'i SF median jumped 29.3% to $1,369,000, the largest price gain of any county.",
      "Maui condo sales surged 25.5% (64 vs 51), the only county with double-digit condo sales growth.",
      "Statewide condo median slipped to $546,000, down 0.7% year-over-year.",
      "Year-to-date: 803 SF sales (−5.0%) and 810 condo sales (−4.3%) with a combined statewide SF median of $1,035,000.",
    ],
    singleFamily: {
      counties: [
        { county: "Hawai'i", sales2026: 128, sales2025: 142, salesChange: -9.86, medianPrice2026: 575000, medianPrice2025: 565000, medianPriceChange: 1.77 },
        { county: "Kaua'i", sales2026: 32, sales2025: 32, salesChange: 0.00, medianPrice2026: 1369000, medianPrice2025: 1059000, medianPriceChange: 29.27 },
        { county: "Maui", sales2026: 46, sales2025: 48, salesChange: -4.17, medianPrice2026: 1250000, medianPrice2025: 1395319, medianPriceChange: -10.41 },
        { county: "O'ahu", sales2026: 177, sales2025: 167, salesChange: 5.99, medianPrice2026: 1205000, medianPrice2025: 1185000, medianPriceChange: 1.69 },
      ],
      totalSales2026: 383,
      totalSales2025: 389,
      totalSalesChange: -1.54,
      totalMedianPrice2026: 1080000,
      totalMedianPrice2025: 1055000,
      totalMedianPriceChange: 2.37,
    },
    condo: {
      counties: [
        { county: "Hawai'i", sales2026: 40, sales2025: 46, salesChange: -13.04, medianPrice2026: 736500, medianPrice2025: 749999, medianPriceChange: -1.80 },
        { county: "Kaua'i", sales2026: 11, sales2025: 19, salesChange: -42.11, medianPrice2026: 636700, medianPrice2025: 979000, medianPriceChange: -34.96 },
        { county: "Maui", sales2026: 64, sales2025: 51, salesChange: 25.49, medianPrice2026: 847500, medianPrice2025: 960000, medianPriceChange: -11.72 },
        { county: "O'ahu", sales2026: 291, sales2025: 293, salesChange: -0.68, medianPrice2026: 500000, medianPrice2025: 494000, medianPriceChange: 1.21 },
      ],
      totalSales2026: 406,
      totalSales2025: 409,
      totalSalesChange: -0.73,
      totalMedianPrice2026: 546000,
      totalMedianPrice2025: 550000,
      totalMedianPriceChange: -0.73,
    },
    ytd: {
      singleFamily: {
        counties: [
          { county: "Hawai'i", sales2026: 282, sales2025: 314, salesChange: -10.19, medianPrice2026: 574500, medianPrice2025: 574250, medianPriceChange: 0.04 },
          { county: "Kaua'i", sales2026: 51, sales2025: 61, salesChange: -16.39, medianPrice2026: 1325000, medianPrice2025: 1200000, medianPriceChange: 10.42 },
          { county: "Maui", sales2026: 99, sales2025: 107, salesChange: -7.48, medianPrice2026: 1350000, medianPrice2025: 1295000, medianPriceChange: 4.25 },
          { county: "O'ahu", sales2026: 371, sales2025: 363, salesChange: 2.20, medianPrice2026: 1160000, medianPrice2025: 1150000, medianPriceChange: 0.87 },
        ],
        totalSales2026: 803,
        totalSales2025: 845,
        totalSalesChange: -4.97,
        totalMedianPrice2026: 1035000,
        totalMedianPrice2025: 1050000,
        totalMedianPriceChange: -1.43,
      },
      condo: {
        counties: [
          { county: "Hawai'i", sales2026: 81, sales2025: 85, salesChange: -4.71, medianPrice2026: 655000, medianPrice2025: 699000, medianPriceChange: -6.29 },
          { county: "Kaua'i", sales2026: 33, sales2025: 50, salesChange: -34.00, medianPrice2026: 855000, medianPrice2025: 900000, medianPriceChange: -5.00 },
          { county: "Maui", sales2026: 108, sales2025: 106, salesChange: 1.89, medianPrice2026: 712500, medianPrice2025: 777500, medianPriceChange: -8.36 },
          { county: "O'ahu", sales2026: 588, sales2025: 605, salesChange: -2.81, medianPrice2026: 510000, medianPrice2025: 513125, medianPriceChange: -0.61 },
        ],
        totalSales2026: 810,
        totalSales2025: 846,
        totalSalesChange: -4.26,
        totalMedianPrice2026: 555500,
        totalMedianPrice2025: 568179,
        totalMedianPriceChange: -2.23,
      },
    },
  },
];
