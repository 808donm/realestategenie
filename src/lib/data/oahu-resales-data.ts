/**
 * Honolulu Board of REALTORS®
 * Annual Residential Resales Data for Oahu
 * Source: HiCentral MLS, Ltd. data
 * 1985 through 2025
 */

export type OahuResalesYear = {
  year: number;
  singleFamily: {
    sales: number;
    medianPrice: number;
    avgPrice: number;
  };
  condo: {
    sales: number;
    medianPrice: number;
    avgPrice: number;
  };
  totalSales: number;
};

export const OAHU_RESALES_DATA: OahuResalesYear[] = [
  { year: 1985, singleFamily: { sales: 2200, medianPrice: 158600, avgPrice: 205400 }, condo: { sales: 2950, medianPrice: 89800, avgPrice: 105900 }, totalSales: 5150 },
  { year: 1986, singleFamily: { sales: 2770, medianPrice: 171200, avgPrice: 211400 }, condo: { sales: 3841, medianPrice: 94000, avgPrice: 108100 }, totalSales: 6611 },
  { year: 1987, singleFamily: { sales: 3179, medianPrice: 190100, avgPrice: 281963 }, condo: { sales: 5508, medianPrice: 104500, avgPrice: 126394 }, totalSales: 8687 },
  { year: 1988, singleFamily: { sales: 3026, medianPrice: 210000, avgPrice: 312300 }, condo: { sales: 6546, medianPrice: 114000, avgPrice: 140377 }, totalSales: 9572 },
  { year: 1989, singleFamily: { sales: 2919, medianPrice: 270000, avgPrice: 372361 }, condo: { sales: 6486, medianPrice: 135500, avgPrice: 164496 }, totalSales: 9405 },
  { year: 1990, singleFamily: { sales: 2744, medianPrice: 352000, avgPrice: 498511 }, condo: { sales: 6149, medianPrice: 187000, avgPrice: 225901 }, totalSales: 8893 },
  { year: 1991, singleFamily: { sales: 1912, medianPrice: 340000, avgPrice: 432338 }, condo: { sales: 3607, medianPrice: 192000, avgPrice: 219318 }, totalSales: 5519 },
  { year: 1992, singleFamily: { sales: 1985, medianPrice: 349000, avgPrice: 411868 }, condo: { sales: 3341, medianPrice: 193000, avgPrice: 211649 }, totalSales: 5326 },
  { year: 1993, singleFamily: { sales: 1944, medianPrice: 358500, avgPrice: 436998 }, condo: { sales: 3262, medianPrice: 193000, avgPrice: 210573 }, totalSales: 5206 },
  { year: 1994, singleFamily: { sales: 2175, medianPrice: 360000, avgPrice: 423371 }, condo: { sales: 3370, medianPrice: 190000, avgPrice: 210762 }, totalSales: 5545 },
  { year: 1995, singleFamily: { sales: 1642, medianPrice: 349000, avgPrice: 429613 }, condo: { sales: 2260, medianPrice: 182000, avgPrice: 206134 }, totalSales: 3902 },
  { year: 1996, singleFamily: { sales: 1749, medianPrice: 335000, avgPrice: 409441 }, condo: { sales: 1990, medianPrice: 175000, avgPrice: 202494 }, totalSales: 3739 },
  { year: 1997, singleFamily: { sales: 2025, medianPrice: 307000, avgPrice: 380507 }, condo: { sales: 2100, medianPrice: 150000, avgPrice: 178990 }, totalSales: 4125 },
  { year: 1998, singleFamily: { sales: 2495, medianPrice: 297000, avgPrice: 370021 }, condo: { sales: 2632, medianPrice: 135000, avgPrice: 160978 }, totalSales: 5127 },
  { year: 1999, singleFamily: { sales: 2853, medianPrice: 290000, avgPrice: 377497 }, condo: { sales: 3298, medianPrice: 125000, avgPrice: 157418 }, totalSales: 6151 },
  { year: 2000, singleFamily: { sales: 3181, medianPrice: 295000, avgPrice: 406331 }, condo: { sales: 3926, medianPrice: 125000, avgPrice: 165674 }, totalSales: 7107 },
  { year: 2001, singleFamily: { sales: 3406, medianPrice: 299900, avgPrice: 375857 }, condo: { sales: 4261, medianPrice: 130000, avgPrice: 168013 }, totalSales: 7667 },
  { year: 2002, singleFamily: { sales: 3906, medianPrice: 335000, avgPrice: 418231 }, condo: { sales: 5406, medianPrice: 152000, avgPrice: 181933 }, totalSales: 9312 },
  { year: 2003, singleFamily: { sales: 4419, medianPrice: 380000, avgPrice: 479377 }, condo: { sales: 6907, medianPrice: 175000, avgPrice: 205165 }, totalSales: 11326 },
  { year: 2004, singleFamily: { sales: 4702, medianPrice: 460000, avgPrice: 591354 }, condo: { sales: 7888, medianPrice: 208500, avgPrice: 251328 }, totalSales: 12590 },
  { year: 2005, singleFamily: { sales: 4617, medianPrice: 590000, avgPrice: 744174 }, condo: { sales: 7990, medianPrice: 269500, avgPrice: 320033 }, totalSales: 12607 },
  { year: 2006, singleFamily: { sales: 4041, medianPrice: 630000, avgPrice: 778393 }, condo: { sales: 6380, medianPrice: 310000, avgPrice: 363639 }, totalSales: 10421 },
  { year: 2007, singleFamily: { sales: 3627, medianPrice: 643500, avgPrice: 794183 }, condo: { sales: 5499, medianPrice: 325000, avgPrice: 381263 }, totalSales: 9126 },
  { year: 2008, singleFamily: { sales: 2741, medianPrice: 624000, avgPrice: 792520 }, condo: { sales: 3933, medianPrice: 325000, avgPrice: 383418 }, totalSales: 6674 },
  { year: 2009, singleFamily: { sales: 2585, medianPrice: 575000, avgPrice: 684341 }, condo: { sales: 3467, medianPrice: 302000, avgPrice: 346103 }, totalSales: 6052 },
  { year: 2010, singleFamily: { sales: 3051, medianPrice: 592750, avgPrice: 712251 }, condo: { sales: 3934, medianPrice: 305000, avgPrice: 359151 }, totalSales: 6985 },
  { year: 2011, singleFamily: { sales: 2974, medianPrice: 575000, avgPrice: 707402 }, condo: { sales: 4029, medianPrice: 300000, avgPrice: 357881 }, totalSales: 7003 },
  { year: 2012, singleFamily: { sales: 3078, medianPrice: 620000, avgPrice: 754142 }, condo: { sales: 4203, medianPrice: 317500, avgPrice: 374343 }, totalSales: 7281 },
  { year: 2013, singleFamily: { sales: 3341, medianPrice: 650000, avgPrice: 804933 }, condo: { sales: 4800, medianPrice: 332000, avgPrice: 393396 }, totalSales: 8141 },
  { year: 2014, singleFamily: { sales: 3285, medianPrice: 675000, avgPrice: 856826 }, condo: { sales: 4810, medianPrice: 350000, avgPrice: 418186 }, totalSales: 8095 },
  { year: 2015, singleFamily: { sales: 3455, medianPrice: 700000, avgPrice: 875373 }, condo: { sales: 5028, medianPrice: 360000, avgPrice: 415533 }, totalSales: 8483 },
  { year: 2016, singleFamily: { sales: 3678, medianPrice: 735000, avgPrice: 891332 }, condo: { sales: 5449, medianPrice: 385000, avgPrice: 447512 }, totalSales: 9127 },
  { year: 2017, singleFamily: { sales: 3908, medianPrice: 755000, avgPrice: 916506 }, condo: { sales: 5824, medianPrice: 405000, avgPrice: 469381 }, totalSales: 9732 },
  { year: 2018, singleFamily: { sales: 3609, medianPrice: 790000, avgPrice: 991420 }, condo: { sales: 5679, medianPrice: 420000, avgPrice: 497974 }, totalSales: 9288 },
  { year: 2019, singleFamily: { sales: 3750, medianPrice: 789000, avgPrice: 953772 }, condo: { sales: 5408, medianPrice: 425000, avgPrice: 519375 }, totalSales: 9158 },
  { year: 2020, singleFamily: { sales: 3838, medianPrice: 830000, avgPrice: 1014167 }, condo: { sales: 4706, medianPrice: 435000, avgPrice: 502965 }, totalSales: 8544 },
  { year: 2021, singleFamily: { sales: 4526, medianPrice: 990000, avgPrice: 1250113 }, condo: { sales: 7203, medianPrice: 475000, avgPrice: 558067 }, totalSales: 11729 },
  { year: 2022, singleFamily: { sales: 3474, medianPrice: 1105000, avgPrice: 1381088 }, condo: { sales: 6353, medianPrice: 510000, avgPrice: 610446 }, totalSales: 9827 },
  { year: 2023, singleFamily: { sales: 2560, medianPrice: 1050000, avgPrice: 1325664 }, condo: { sales: 4573, medianPrice: 508500, avgPrice: 623257 }, totalSales: 7133 },
  { year: 2024, singleFamily: { sales: 2793, medianPrice: 1100000, avgPrice: 1347176 }, condo: { sales: 4459, medianPrice: 515000, avgPrice: 616895 }, totalSales: 7252 },
  { year: 2025, singleFamily: { sales: 2890, medianPrice: 1139000, avgPrice: 1401379 }, condo: { sales: 4408, medianPrice: 507250, avgPrice: 642152 }, totalSales: 7298 },
];

// Comparative statistics from the source
export const COMPARATIVE_STATS = {
  period: "1985 through 2025",
  singleFamily: {
    medianPriceChange: 618.2,
    medianPriceAnnual: 5.05,
    avgPriceChange: 582.3,
    avgPriceAnnual: 4.92,
  },
  condo: {
    medianPriceChange: 464.9,
    medianPriceAnnual: 4.42,
    avgPriceChange: 506.4,
    avgPriceAnnual: 4.61,
  },
};

// Helper: compute YoY percent change
export function computeYoYChanges(data: OahuResalesYear[]) {
  return data.map((row, i) => {
    const prev = i > 0 ? data[i - 1] : null;
    return {
      ...row,
      sfSalesChange: prev ? ((row.singleFamily.sales - prev.singleFamily.sales) / prev.singleFamily.sales) * 100 : null,
      condoSalesChange: prev ? ((row.condo.sales - prev.condo.sales) / prev.condo.sales) * 100 : null,
      totalSalesChange: prev ? ((row.totalSales - prev.totalSales) / prev.totalSales) * 100 : null,
      sfMedianChange: prev ? ((row.singleFamily.medianPrice - prev.singleFamily.medianPrice) / prev.singleFamily.medianPrice) * 100 : null,
      condoMedianChange: prev ? ((row.condo.medianPrice - prev.condo.medianPrice) / prev.condo.medianPrice) * 100 : null,
      sfAvgChange: prev ? ((row.singleFamily.avgPrice - prev.singleFamily.avgPrice) / prev.singleFamily.avgPrice) * 100 : null,
      condoAvgChange: prev ? ((row.condo.avgPrice - prev.condo.avgPrice) / prev.condo.avgPrice) * 100 : null,
    };
  });
}
