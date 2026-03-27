/**
 * REALTORS® Association of Maui, Inc.
 * Monthly Residential Market Statistics
 * Source: ShowingTime Plus, LLC / RAM MLS data
 */

export type MauiMonthlyMarketData = {
  month: string; // "YYYY-MM"
  label: string; // "February 2026"
  singleFamily: {
    closedSales: number;
    closedSalesYoY: number;
    medianPrice: number;
    medianPriceYoY: number;
    avgPrice: number;
    avgPriceYoY: number;
    dom: number; // days on market until sale
    domYoY: number;
    pendingSales: number;
    pendingSalesYoY: number;
    newListings: number;
    newListingsYoY: number;
    inventory: number;
    inventoryYoY: number;
    monthsSupply: number;
    monthsSupplyYoY: number;
    pctListPriceReceived: number;
    pctListPriceReceivedYoY: number;
  };
  condo: {
    closedSales: number;
    closedSalesYoY: number;
    medianPrice: number;
    medianPriceYoY: number;
    avgPrice: number;
    avgPriceYoY: number;
    dom: number;
    domYoY: number;
    pendingSales: number;
    pendingSalesYoY: number;
    newListings: number;
    newListingsYoY: number;
    inventory: number;
    inventoryYoY: number;
    monthsSupply: number;
    monthsSupplyYoY: number;
    pctListPriceReceived: number;
    pctListPriceReceivedYoY: number;
  };
  headline: string;
  highlights: string[];
};

export const MAUI_MONTHLY_DATA: MauiMonthlyMarketData[] = [
  {
    month: "2026-01",
    label: "January 2026",
    singleFamily: {
      closedSales: 52,
      closedSalesYoY: -11.9,
      medianPrice: 1445000,
      medianPriceYoY: 20.4,
      avgPrice: 1934139,
      avgPriceYoY: 34.2,
      dom: 186,
      domYoY: 53.7,
      pendingSales: 73,
      pendingSalesYoY: 55.3,
      newListings: 115,
      newListingsYoY: 8.5,
      inventory: 457,
      inventoryYoY: 10.7,
      monthsSupply: 7.9,
      monthsSupplyYoY: 11.3,
      pctListPriceReceived: 95.2,
      pctListPriceReceivedYoY: -0.4,
    },
    condo: {
      closedSales: 44,
      closedSalesYoY: -20.0,
      medianPrice: 629950,
      medianPriceYoY: -6.7,
      avgPrice: 926475,
      avgPriceYoY: -11.2,
      dom: 166,
      domYoY: 20.3,
      pendingSales: 65,
      pendingSalesYoY: 4.8,
      newListings: 144,
      newListingsYoY: -14.3,
      inventory: 923,
      inventoryYoY: 13.1,
      monthsSupply: 15.8,
      monthsSupplyYoY: 17.9,
      pctListPriceReceived: 93.9,
      pctListPriceReceivedYoY: -0.7,
    },
    headline: "SF prices surge while sales decline; condo market slows across the board",
    highlights: [
      "SF median price surged to $1,445,000 (+20.4% YoY) — highest January on record for Maui.",
      "SF closed sales fell 11.9% (52 vs 59 YoY), despite pending sales jumping 55.3%.",
      "SF DOM spiked to 186 days (+53.7%) — homes taking significantly longer to sell.",
      "Condo closed sales dropped 20.0% (44 vs 55) with median price declining 6.7% to $629,950.",
      "New listings mixed: SF up 8.5% (115) while condo listings fell 14.3% (144).",
      "Condo inventory rose 13.1% to 923 units with 15.8 months supply — deep buyer's market.",
    ],
  },
  {
    month: "2026-02",
    label: "February 2026",
    singleFamily: {
      closedSales: 46,
      closedSalesYoY: -4.2,
      medianPrice: 1250000,
      medianPriceYoY: -10.4,
      avgPrice: 1367394,
      avgPriceYoY: -27.6,
      dom: 156,
      domYoY: 23.8,
      pendingSales: 70,
      pendingSalesYoY: 22.8,
      newListings: 80,
      newListingsYoY: -20.0,
      inventory: 448,
      inventoryYoY: 4.4,
      monthsSupply: 7.7,
      monthsSupplyYoY: 4.1,
      pctListPriceReceived: 95.4,
      pctListPriceReceivedYoY: -2.5,
    },
    condo: {
      closedSales: 64,
      closedSalesYoY: 25.5,
      medianPrice: 847500,
      medianPriceYoY: -11.7,
      avgPrice: 1150544,
      avgPriceYoY: -15.8,
      dom: 138,
      domYoY: 5.3,
      pendingSales: 88,
      pendingSalesYoY: 63.0,
      newListings: 133,
      newListingsYoY: -7.6,
      inventory: 916,
      inventoryYoY: 7.5,
      monthsSupply: 14.9,
      monthsSupplyYoY: 0.7,
      pctListPriceReceived: 94.4,
      pctListPriceReceivedYoY: -0.3,
    },
    headline: "Maui condo sales surge while prices pull back across property types",
    highlights: [
      "Condo closed sales jumped 25.5% year-over-year while SF sales dipped 4.2%.",
      "SF median price declined 10.4% to $1,250,000; condo median fell 11.7% to $847,500.",
      "Pending sales showed strong momentum: SF +22.8% and condo +63.0% year-over-year.",
      "Days on market increased significantly — SF homes now taking 156 days (up 23.8%).",
      "New listings declined sharply for SF (-20.0%) while condo listings fell 7.6%.",
      "Condo inventory reached 916 units with a 14.9-month supply, signaling a strong buyer's market.",
    ],
  },
];

/**
 * Monthly rolling data for Maui (Mar 2025 – Feb 2026)
 * Used for historical trend line charts
 */
export type MauiMonthlyTrendRow = {
  month: string;
  label: string;
  sfClosedSales: number;
  condoClosedSales: number;
  sfMedianPrice: number;
  condoMedianPrice: number;
  sfDOM: number;
  condoDOM: number;
  sfNewListings: number;
  condoNewListings: number;
  sfPendingSales: number;
  condoPendingSales: number;
  sfPctListPrice: number;
  condoPctListPrice: number;
};

export const MAUI_MONTHLY_TRENDS: MauiMonthlyTrendRow[] = [
  {
    month: "2025-03",
    label: "Mar '25",
    sfClosedSales: 49,
    condoClosedSales: 61,
    sfMedianPrice: 1295000,
    condoMedianPrice: 820000,
    sfDOM: 125,
    condoDOM: 147,
    sfNewListings: 109,
    condoNewListings: 151,
    sfPendingSales: 62,
    condoPendingSales: 65,
    sfPctListPrice: 96.0,
    condoPctListPrice: 96.2,
  },
  {
    month: "2025-04",
    label: "Apr '25",
    sfClosedSales: 70,
    condoClosedSales: 67,
    sfMedianPrice: 1377500,
    condoMedianPrice: 715000,
    sfDOM: 127,
    condoDOM: 144,
    sfNewListings: 90,
    condoNewListings: 197,
    sfPendingSales: 63,
    condoPendingSales: 62,
    sfPctListPrice: 95.7,
    condoPctListPrice: 94.4,
  },
  {
    month: "2025-05",
    label: "May '25",
    sfClosedSales: 56,
    condoClosedSales: 64,
    sfMedianPrice: 1290000,
    condoMedianPrice: 762500,
    sfDOM: 144,
    condoDOM: 138,
    sfNewListings: 113,
    condoNewListings: 148,
    sfPendingSales: 55,
    condoPendingSales: 57,
    sfPctListPrice: 96.0,
    condoPctListPrice: 95.2,
  },
  {
    month: "2025-06",
    label: "Jun '25",
    sfClosedSales: 67,
    condoClosedSales: 58,
    sfMedianPrice: 1300000,
    condoMedianPrice: 685000,
    sfDOM: 144,
    condoDOM: 122,
    sfNewListings: 90,
    condoNewListings: 132,
    sfPendingSales: 49,
    condoPendingSales: 49,
    sfPctListPrice: 96.4,
    condoPctListPrice: 95.3,
  },
  {
    month: "2025-07",
    label: "Jul '25",
    sfClosedSales: 60,
    condoClosedSales: 53,
    sfMedianPrice: 1315000,
    condoMedianPrice: 675000,
    sfDOM: 169,
    condoDOM: 126,
    sfNewListings: 98,
    condoNewListings: 126,
    sfPendingSales: 63,
    condoPendingSales: 62,
    sfPctListPrice: 96.3,
    condoPctListPrice: 96.2,
  },
  {
    month: "2025-08",
    label: "Aug '25",
    sfClosedSales: 62,
    condoClosedSales: 57,
    sfMedianPrice: 1302500,
    condoMedianPrice: 650000,
    sfDOM: 137,
    condoDOM: 168,
    sfNewListings: 98,
    condoNewListings: 134,
    sfPendingSales: 51,
    condoPendingSales: 51,
    sfPctListPrice: 94.9,
    condoPctListPrice: 94.0,
  },
  {
    month: "2025-09",
    label: "Sep '25",
    sfClosedSales: 56,
    condoClosedSales: 46,
    sfMedianPrice: 1292500,
    condoMedianPrice: 652500,
    sfDOM: 127,
    condoDOM: 127,
    sfNewListings: 88,
    condoNewListings: 142,
    sfPendingSales: 54,
    condoPendingSales: 55,
    sfPctListPrice: 95.4,
    condoPctListPrice: 93.6,
  },
  {
    month: "2025-10",
    label: "Oct '25",
    sfClosedSales: 64,
    condoClosedSales: 61,
    sfMedianPrice: 1245000,
    condoMedianPrice: 637500,
    sfDOM: 138,
    condoDOM: 183,
    sfNewListings: 105,
    condoNewListings: 143,
    sfPendingSales: 58,
    condoPendingSales: 69,
    sfPctListPrice: 96.0,
    condoPctListPrice: 94.7,
  },
  {
    month: "2025-11",
    label: "Nov '25",
    sfClosedSales: 51,
    condoClosedSales: 51,
    sfMedianPrice: 1150000,
    condoMedianPrice: 625000,
    sfDOM: 148,
    condoDOM: 158,
    sfNewListings: 110,
    condoNewListings: 174,
    sfPendingSales: 53,
    condoPendingSales: 49,
    sfPctListPrice: 95.1,
    condoPctListPrice: 92.6,
  },
  {
    month: "2025-12",
    label: "Dec '25",
    sfClosedSales: 65,
    condoClosedSales: 78,
    sfMedianPrice: 1330000,
    condoMedianPrice: 641250,
    sfDOM: 128,
    condoDOM: 162,
    sfNewListings: 95,
    condoNewListings: 150,
    sfPendingSales: 57,
    condoPendingSales: 65,
    sfPctListPrice: 96.8,
    condoPctListPrice: 94.2,
  },
  {
    month: "2026-01",
    label: "Jan '26",
    sfClosedSales: 52,
    condoClosedSales: 44,
    sfMedianPrice: 1445000,
    condoMedianPrice: 629950,
    sfDOM: 186,
    condoDOM: 166,
    sfNewListings: 115,
    condoNewListings: 144,
    sfPendingSales: 73,
    condoPendingSales: 65,
    sfPctListPrice: 95.2,
    condoPctListPrice: 93.9,
  },
  {
    month: "2026-02",
    label: "Feb '26",
    sfClosedSales: 46,
    condoClosedSales: 64,
    sfMedianPrice: 1250000,
    condoMedianPrice: 847500,
    sfDOM: 156,
    condoDOM: 138,
    sfNewListings: 80,
    condoNewListings: 133,
    sfPendingSales: 70,
    condoPendingSales: 88,
    sfPctListPrice: 95.4,
    condoPctListPrice: 94.4,
  },
];

/**
 * Housing Affordability Index by month (Mar 2025 – Feb 2026)
 * Higher number = greater affordability
 */
export type MauiAffordabilityRow = {
  month: string;
  label: string;
  sfIndex: number;
  condoIndex: number;
};

export const MAUI_AFFORDABILITY_TRENDS: MauiAffordabilityRow[] = [
  { month: "2025-03", label: "Mar '25", sfIndex: 32, condoIndex: 50 },
  { month: "2025-04", label: "Apr '25", sfIndex: 30, condoIndex: 57 },
  { month: "2025-05", label: "May '25", sfIndex: 31, condoIndex: 53 },
  { month: "2025-06", label: "Jun '25", sfIndex: 31, condoIndex: 60 },
  { month: "2025-07", label: "Jul '25", sfIndex: 31, condoIndex: 61 },
  { month: "2025-08", label: "Aug '25", sfIndex: 32, condoIndex: 64 },
  { month: "2025-09", label: "Sep '25", sfIndex: 33, condoIndex: 65 },
  { month: "2025-10", label: "Oct '25", sfIndex: 35, condoIndex: 67 },
  { month: "2025-11", label: "Nov '25", sfIndex: 37, condoIndex: 68 },
  { month: "2025-12", label: "Dec '25", sfIndex: 32, condoIndex: 67 },
  { month: "2026-01", label: "Jan '26", sfIndex: 30, condoIndex: 69 },
  { month: "2026-02", label: "Feb '26", sfIndex: 35, condoIndex: 52 },
];

/**
 * Single Family Monthly Sales Volume by Area — February 2026
 */
export type MauiAreaSalesRow = {
  area: string;
  feb2026Units: number;
  feb2026Volume: number | null;
  feb2026MedianPrice: number | null;
  jan2026Units: number;
  jan2026Volume: number | null;
  jan2026MedianPrice: number | null;
};

export const MAUI_AREA_SALES_FEB2026: MauiAreaSalesRow[] = [
  {
    area: "Haiku",
    feb2026Units: 4,
    feb2026Volume: 4474000,
    feb2026MedianPrice: 1112500,
    jan2026Units: 4,
    jan2026Volume: 4515000,
    jan2026MedianPrice: 1060000,
  },
  {
    area: "Kaanapali",
    feb2026Units: 2,
    feb2026Volume: 3800000,
    feb2026MedianPrice: 1900000,
    jan2026Units: 1,
    jan2026Volume: 5500000,
    jan2026MedianPrice: 5500000,
  },
  {
    area: "Kahului",
    feb2026Units: 7,
    feb2026Volume: 7411109,
    feb2026MedianPrice: 880000,
    jan2026Units: 6,
    jan2026Volume: 7543224,
    jan2026MedianPrice: 1354829,
  },
  {
    area: "Kihei",
    feb2026Units: 8,
    feb2026Volume: 10810000,
    feb2026MedianPrice: 1225000,
    jan2026Units: 10,
    jan2026Volume: 19000000,
    jan2026MedianPrice: 1382500,
  },
  {
    area: "Kula/Ulupalakua/Kanaio",
    feb2026Units: 3,
    feb2026Volume: 4165000,
    feb2026MedianPrice: 1530000,
    jan2026Units: 1,
    jan2026Volume: 1350000,
    jan2026MedianPrice: 1350000,
  },
  {
    area: "Lahaina",
    feb2026Units: 4,
    feb2026Volume: 5775000,
    feb2026MedianPrice: 1400000,
    jan2026Units: 2,
    jan2026Volume: 8799000,
    jan2026MedianPrice: 4399500,
  },
  {
    area: "Makawao/Olinda/Haliimaile",
    feb2026Units: 5,
    feb2026Volume: 8260000,
    feb2026MedianPrice: 1625000,
    jan2026Units: 8,
    jan2026Volume: 15999000,
    jan2026MedianPrice: 1592500,
  },
  {
    area: "Wailuku",
    feb2026Units: 7,
    feb2026Volume: 7305000,
    feb2026MedianPrice: 1050000,
    jan2026Units: 5,
    jan2026Volume: 4750000,
    jan2026MedianPrice: 805000,
  },
  {
    area: "Spreckelsville/Paia/Kuau",
    feb2026Units: 1,
    feb2026Volume: 1300000,
    feb2026MedianPrice: 1300000,
    jan2026Units: 3,
    jan2026Volume: 12990000,
    jan2026MedianPrice: 3850000,
  },
  {
    area: "Maui Meadows",
    feb2026Units: 1,
    feb2026Volume: 2360000,
    feb2026MedianPrice: 2360000,
    jan2026Units: 1,
    jan2026Volume: 2200000,
    jan2026MedianPrice: 2200000,
  },
  {
    area: "Lanai",
    feb2026Units: 1,
    feb2026Volume: 650000,
    feb2026MedianPrice: 650000,
    jan2026Units: 1,
    jan2026Volume: 650000,
    jan2026MedianPrice: 650000,
  },
  {
    area: "Molokai",
    feb2026Units: 1,
    feb2026Volume: 365000,
    feb2026MedianPrice: 365000,
    jan2026Units: 3,
    jan2026Volume: 1109000,
    jan2026MedianPrice: 330000,
  },
];

/**
 * Condo Monthly Sales Volume by Area — February 2026
 */
export const MAUI_CONDO_AREA_SALES_FEB2026: MauiAreaSalesRow[] = [
  {
    area: "Kaanapali",
    feb2026Units: 8,
    feb2026Volume: 9015000,
    feb2026MedianPrice: 992500,
    jan2026Units: 4,
    jan2026Volume: 6010000,
    jan2026MedianPrice: 967500,
  },
  {
    area: "Kihei",
    feb2026Units: 19,
    feb2026Volume: 15738800,
    feb2026MedianPrice: 695000,
    jan2026Units: 12,
    jan2026Volume: 7912000,
    jan2026MedianPrice: 504500,
  },
  {
    area: "Napili/Kahana/Honokowai",
    feb2026Units: 10,
    feb2026Volume: 5949000,
    feb2026MedianPrice: 590000,
    jan2026Units: 11,
    jan2026Volume: 6512900,
    jan2026MedianPrice: 620000,
  },
  {
    area: "Wailea/Makena",
    feb2026Units: 13,
    feb2026Volume: 35499000,
    feb2026MedianPrice: 2650000,
    jan2026Units: 6,
    jan2026Volume: 13355000,
    jan2026MedianPrice: 1572500,
  },
  {
    area: "Lahaina",
    feb2026Units: 3,
    feb2026Volume: 2099000,
    feb2026MedianPrice: 815000,
    jan2026Units: 3,
    jan2026Volume: 2477500,
    jan2026MedianPrice: 652500,
  },
  {
    area: "Wailuku",
    feb2026Units: 3,
    feb2026Volume: 2379000,
    feb2026MedianPrice: 850000,
    jan2026Units: 3,
    jan2026Volume: 1882500,
    jan2026MedianPrice: 722500,
  },
  {
    area: "Molokai",
    feb2026Units: 5,
    feb2026Volume: 790000,
    feb2026MedianPrice: 150000,
    jan2026Units: 3,
    jan2026Volume: 1750000,
    jan2026MedianPrice: 300000,
  },
  {
    area: "Kahului",
    feb2026Units: 1,
    feb2026Volume: 115000,
    feb2026MedianPrice: 115000,
    jan2026Units: 0,
    jan2026Volume: null,
    jan2026MedianPrice: null,
  },
  {
    area: "Kapalua",
    feb2026Units: 1,
    feb2026Volume: 1335000,
    feb2026MedianPrice: 1335000,
    jan2026Units: 0,
    jan2026Volume: null,
    jan2026MedianPrice: null,
  },
  {
    area: "Maalaea",
    feb2026Units: 1,
    feb2026Volume: 715000,
    feb2026MedianPrice: 715000,
    jan2026Units: 2,
    jan2026Volume: null,
    jan2026MedianPrice: 432500,
  },
];
