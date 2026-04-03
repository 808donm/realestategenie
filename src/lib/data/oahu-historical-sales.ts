/**
 * Oahu Historical Residential Resales Data (1985-2025)
 *
 * Source: HiCentral MLS (www.hicentral.com/oahu-historical-data.php)
 * Updated annually. Last updated: 2025.
 */

export interface OahuAnnualData {
  year: number;
  sfSales: number;
  sfMedianPrice: number;
  sfAvgPrice: number;
  condoSales: number;
  condoMedianPrice: number;
  condoAvgPrice: number;
}

export const OAHU_HISTORICAL_DATA: OahuAnnualData[] = [
  { year: 1985, sfSales: 2200, sfMedianPrice: 158600, sfAvgPrice: 205400, condoSales: 2950, condoMedianPrice: 89800, condoAvgPrice: 105900 },
  { year: 1986, sfSales: 2770, sfMedianPrice: 171200, sfAvgPrice: 211100, condoSales: 3841, condoMedianPrice: 94000, condoAvgPrice: 108100 },
  { year: 1987, sfSales: 3179, sfMedianPrice: 190200, sfAvgPrice: 281963, condoSales: 5508, condoMedianPrice: 104500, condoAvgPrice: 126394 },
  { year: 1988, sfSales: 3026, sfMedianPrice: 210000, sfAvgPrice: 312300, condoSales: 6546, condoMedianPrice: 114000, condoAvgPrice: 140377 },
  { year: 1989, sfSales: 2919, sfMedianPrice: 270000, sfAvgPrice: 372361, condoSales: 6486, condoMedianPrice: 135500, condoAvgPrice: 164496 },
  { year: 1990, sfSales: 2744, sfMedianPrice: 352000, sfAvgPrice: 498511, condoSales: 6149, condoMedianPrice: 187000, condoAvgPrice: 225901 },
  { year: 1991, sfSales: 1912, sfMedianPrice: 340000, sfAvgPrice: 432338, condoSales: 3607, condoMedianPrice: 192000, condoAvgPrice: 219318 },
  { year: 1992, sfSales: 1985, sfMedianPrice: 349000, sfAvgPrice: 411868, condoSales: 3341, condoMedianPrice: 193000, condoAvgPrice: 211649 },
  { year: 1993, sfSales: 1944, sfMedianPrice: 358500, sfAvgPrice: 436898, condoSales: 3262, condoMedianPrice: 193000, condoAvgPrice: 210573 },
  { year: 1994, sfSales: 2175, sfMedianPrice: 360000, sfAvgPrice: 423371, condoSales: 3370, condoMedianPrice: 190000, condoAvgPrice: 210762 },
  { year: 1995, sfSales: 1642, sfMedianPrice: 349000, sfAvgPrice: 429613, condoSales: 2260, condoMedianPrice: 182000, condoAvgPrice: 206134 },
  { year: 1996, sfSales: 1749, sfMedianPrice: 335000, sfAvgPrice: 409441, condoSales: 1990, condoMedianPrice: 175000, condoAvgPrice: 202494 },
  { year: 1997, sfSales: 2025, sfMedianPrice: 307000, sfAvgPrice: 380507, condoSales: 2100, condoMedianPrice: 150000, condoAvgPrice: 178090 },
  { year: 1998, sfSales: 2495, sfMedianPrice: 297000, sfAvgPrice: 370021, condoSales: 2632, condoMedianPrice: 135000, condoAvgPrice: 160978 },
  { year: 1999, sfSales: 2853, sfMedianPrice: 290000, sfAvgPrice: 377497, condoSales: 3298, condoMedianPrice: 125000, condoAvgPrice: 157418 },
  { year: 2000, sfSales: 3181, sfMedianPrice: 295000, sfAvgPrice: 406331, condoSales: 3926, condoMedianPrice: 125000, condoAvgPrice: 165674 },
  { year: 2001, sfSales: 3406, sfMedianPrice: 299900, sfAvgPrice: 375857, condoSales: 4261, condoMedianPrice: 133000, condoAvgPrice: 168013 },
  { year: 2002, sfSales: 3906, sfMedianPrice: 335000, sfAvgPrice: 418231, condoSales: 5406, condoMedianPrice: 152000, condoAvgPrice: 181933 },
  { year: 2003, sfSales: 4419, sfMedianPrice: 380000, sfAvgPrice: 479377, condoSales: 6907, condoMedianPrice: 175000, condoAvgPrice: 205165 },
  { year: 2004, sfSales: 4702, sfMedianPrice: 460000, sfAvgPrice: 591354, condoSales: 7888, condoMedianPrice: 208500, condoAvgPrice: 251328 },
  { year: 2005, sfSales: 4617, sfMedianPrice: 590000, sfAvgPrice: 744174, condoSales: 7990, condoMedianPrice: 269000, condoAvgPrice: 320003 },
  { year: 2006, sfSales: 4041, sfMedianPrice: 630000, sfAvgPrice: 778393, condoSales: 6380, condoMedianPrice: 310000, condoAvgPrice: 363639 },
  { year: 2007, sfSales: 3627, sfMedianPrice: 643500, sfAvgPrice: 794183, condoSales: 5499, condoMedianPrice: 325000, condoAvgPrice: 381263 },
  { year: 2008, sfSales: 2741, sfMedianPrice: 624000, sfAvgPrice: 792520, condoSales: 3933, condoMedianPrice: 325000, condoAvgPrice: 383418 },
  { year: 2009, sfSales: 2585, sfMedianPrice: 575000, sfAvgPrice: 684341, condoSales: 3467, condoMedianPrice: 302000, condoAvgPrice: 346103 },
  { year: 2010, sfSales: 3051, sfMedianPrice: 592750, sfAvgPrice: 712251, condoSales: 3934, condoMedianPrice: 305000, condoAvgPrice: 359151 },
  { year: 2011, sfSales: 2974, sfMedianPrice: 575000, sfAvgPrice: 707402, condoSales: 4029, condoMedianPrice: 300000, condoAvgPrice: 357881 },
  { year: 2012, sfSales: 3078, sfMedianPrice: 620000, sfAvgPrice: 754142, condoSales: 4203, condoMedianPrice: 317500, condoAvgPrice: 374343 },
  { year: 2013, sfSales: 3341, sfMedianPrice: 650000, sfAvgPrice: 804933, condoSales: 4800, condoMedianPrice: 332000, condoAvgPrice: 393396 },
  { year: 2014, sfSales: 3285, sfMedianPrice: 675000, sfAvgPrice: 856826, condoSales: 4810, condoMedianPrice: 350000, condoAvgPrice: 418186 },
  { year: 2015, sfSales: 3455, sfMedianPrice: 700000, sfAvgPrice: 875373, condoSales: 5028, condoMedianPrice: 360000, condoAvgPrice: 415533 },
  { year: 2016, sfSales: 3678, sfMedianPrice: 735000, sfAvgPrice: 891332, condoSales: 5449, condoMedianPrice: 390000, condoAvgPrice: 447512 },
  { year: 2017, sfSales: 3908, sfMedianPrice: 755000, sfAvgPrice: 916506, condoSales: 5824, condoMedianPrice: 405000, condoAvgPrice: 469381 },
  { year: 2018, sfSales: 3609, sfMedianPrice: 790000, sfAvgPrice: 991420, condoSales: 5679, condoMedianPrice: 420000, condoAvgPrice: 497974 },
  { year: 2019, sfSales: 3750, sfMedianPrice: 789000, sfAvgPrice: 953772, condoSales: 5408, condoMedianPrice: 425000, condoAvgPrice: 519375 },
  { year: 2020, sfSales: 3838, sfMedianPrice: 830000, sfAvgPrice: 1014167, condoSales: 4706, condoMedianPrice: 435000, condoAvgPrice: 502965 },
  { year: 2021, sfSales: 4526, sfMedianPrice: 990000, sfAvgPrice: 1250113, condoSales: 7203, condoMedianPrice: 475000, condoAvgPrice: 558067 },
  { year: 2022, sfSales: 3474, sfMedianPrice: 1105000, sfAvgPrice: 1381088, condoSales: 6353, condoMedianPrice: 510000, condoAvgPrice: 610446 },
  { year: 2023, sfSales: 2560, sfMedianPrice: 1050000, sfAvgPrice: 1326664, condoSales: 4573, condoMedianPrice: 508500, condoAvgPrice: 623257 },
  { year: 2024, sfSales: 2793, sfMedianPrice: 1100000, sfAvgPrice: 1347176, condoSales: 4459, condoMedianPrice: 515000, condoAvgPrice: 616895 },
  { year: 2025, sfSales: 2890, sfMedianPrice: 1139000, sfAvgPrice: 1401379, condoSales: 4408, condoMedianPrice: 507250, condoAvgPrice: 642152 },
];
