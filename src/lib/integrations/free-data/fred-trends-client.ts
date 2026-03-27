/**
 * FRED Sales Trends Client — Free housing market data
 *
 * Source: Federal Reserve Economic Data (FRED) API
 * Requires free API key from https://fred.stlouisfed.org/docs/api/api_key.html
 *
 * Provides: Median home prices, sales volume, housing starts by metro/county area
 * Resolution: MSA (county) → State → National fallback chain.
 */

const BASE_URL = "https://api.stlouisfed.org/fred";

// Key FRED series IDs for housing
const SERIES = {
  // National
  NATIONAL_MEDIAN_PRICE: "MSPUS", // Median Sales Price of Houses Sold (US)
  NATIONAL_HOMES_SOLD: "HSN1F", // New One Family Houses Sold
  NATIONAL_SUPPLY: "MSACSR", // Monthly Supply of New Houses
  NATIONAL_CASE_SHILLER: "CSUSHPINSA", // S&P/Case-Shiller Home Price Index
  // State-level HPI
  STATE_HPI_PREFIX: "STHPI", // e.g., HISTHPI for Hawaii
};

// ---------------------------------------------------------------------------
// MSA / CBSA series patterns (county-level via metro statistical area)
// FRED provides these series using CBSA FIPS codes:
//   ATNHPIUS{CBSA}Q  — FHFA All-Transactions HPI (quarterly)
//   MEDLISPRI{CBSA}   — Median Listing Price (monthly, Realtor.com via FRED)
//   ACTLISCOU{CBSA}   — Active Listing Count (monthly)
//   MEDDAYONMAR{CBSA}  — Median Days on Market (monthly)
// ---------------------------------------------------------------------------

function msaHpiSeries(cbsa: string): string {
  return `ATNHPIUS${cbsa}Q`;
}
function msaMedianListPriceSeries(cbsa: string): string {
  return `MEDLISPRI${cbsa}`;
}
function msaActiveListingSeries(cbsa: string): string {
  return `ACTLISCOU${cbsa}`;
}

// County FIPS (5-digit) → CBSA code + metro name
// Covers major US metros; add more as needed.
interface CbsaEntry {
  cbsa: string;
  name: string;
}
const COUNTY_FIPS_TO_CBSA: Record<string, CbsaEntry> = {
  // Hawaii
  "15003": { cbsa: "46520", name: "Urban Honolulu" },
  "15009": { cbsa: "27980", name: "Kahului-Wailuku-Lahaina" },
  "15001": { cbsa: "25900", name: "Hilo" },
  // California
  "06037": { cbsa: "31080", name: "Los Angeles-Long Beach-Anaheim" },
  "06059": { cbsa: "31080", name: "Los Angeles-Long Beach-Anaheim" },
  "06073": { cbsa: "41740", name: "San Diego-Chula Vista-Carlsbad" },
  "06075": { cbsa: "41860", name: "San Francisco-Oakland-Berkeley" },
  "06085": { cbsa: "41940", name: "San Jose-Sunnyvale-Santa Clara" },
  "06067": { cbsa: "40900", name: "Sacramento-Roseville-Folsom" },
  // New York
  "36061": { cbsa: "35620", name: "New York-Newark-Jersey City" },
  "36047": { cbsa: "35620", name: "New York-Newark-Jersey City" },
  "36081": { cbsa: "35620", name: "New York-Newark-Jersey City" },
  "36005": { cbsa: "35620", name: "New York-Newark-Jersey City" },
  "36085": { cbsa: "35620", name: "New York-Newark-Jersey City" },
  // Texas
  "48201": { cbsa: "26420", name: "Houston-The Woodlands-Sugar Land" },
  "48113": { cbsa: "19100", name: "Dallas-Fort Worth-Arlington" },
  "48029": { cbsa: "41700", name: "San Antonio-New Braunfels" },
  "48453": { cbsa: "12420", name: "Austin-Round Rock-Georgetown" },
  // Florida
  "12086": { cbsa: "33100", name: "Miami-Fort Lauderdale-Pompano Beach" },
  "12099": { cbsa: "36740", name: "Orlando-Kissimmee-Sanford" },
  "12057": { cbsa: "45300", name: "Tampa-St. Petersburg-Clearwater" },
  "12031": { cbsa: "27260", name: "Jacksonville" },
  // Illinois
  "17031": { cbsa: "16980", name: "Chicago-Naperville-Elgin" },
  // Washington
  "53033": { cbsa: "42660", name: "Seattle-Tacoma-Bellevue" },
  // Arizona
  "04013": { cbsa: "38060", name: "Phoenix-Mesa-Chandler" },
  // Nevada
  "32003": { cbsa: "29820", name: "Las Vegas-Henderson-Paradise" },
  // Colorado
  "08031": { cbsa: "19740", name: "Denver-Aurora-Lakewood" },
  // Oregon
  "41051": { cbsa: "38900", name: "Portland-Vancouver-Hillsboro" },
  // Georgia
  "13121": { cbsa: "12060", name: "Atlanta-Sandy Springs-Alpharetta" },
  // Massachusetts
  "25025": { cbsa: "14460", name: "Boston-Cambridge-Newton" },
  // Pennsylvania
  "42101": { cbsa: "37980", name: "Philadelphia-Camden-Wilmington" },
  // Michigan
  "26163": { cbsa: "19820", name: "Detroit-Warren-Dearborn" },
  // Minnesota
  "27053": { cbsa: "33460", name: "Minneapolis-St. Paul-Bloomington" },
  // Tennessee
  "47037": { cbsa: "34980", name: "Nashville-Davidson-Murfreesboro-Franklin" },
  // North Carolina
  "37119": { cbsa: "16740", name: "Charlotte-Concord-Gastonia" },
  "37183": { cbsa: "39580", name: "Raleigh-Cary" },
  // District of Columbia
  "11001": { cbsa: "47900", name: "Washington-Arlington-Alexandria" },
  // Maryland
  "24510": { cbsa: "12580", name: "Baltimore-Columbia-Towson" },
  // Missouri
  "29510": { cbsa: "41180", name: "St. Louis" },
};

// State abbreviation to FRED series suffix mapping
const STATE_HPI_SERIES: Record<string, string> = {
  AL: "ALSTHPI",
  AK: "AKSTHPI",
  AZ: "AZSTHPI",
  AR: "ARSTHPI",
  CA: "CASTHPI",
  CO: "COSTHPI",
  CT: "CTSTHPI",
  DE: "DESTHPI",
  FL: "FLSTHPI",
  GA: "GASTHPI",
  HI: "HISTHPI",
  ID: "IDSTHPI",
  IL: "ILSTHPI",
  IN: "INSTHPI",
  IA: "IASTHPI",
  KS: "KSSTHPI",
  KY: "KYSTHPI",
  LA: "LASTHPI",
  ME: "MESTHPI",
  MD: "MDSTHPI",
  MA: "MASTHPI",
  MI: "MISTHPI",
  MN: "MNSTHPI",
  MS: "MSSTHPI",
  MO: "MOSTHPI",
  MT: "MTSTHPI",
  NE: "NESTHPI",
  NV: "NVSTHPI",
  NH: "NHSTHPI",
  NJ: "NJSTHPI",
  NM: "NMSTHPI",
  NY: "NYSTHPI",
  NC: "NCSTHPI",
  ND: "NDSTHPI",
  OH: "OHSTHPI",
  OK: "OKSTHPI",
  OR: "ORSTHPI",
  PA: "PASTHPI",
  RI: "RISTHPI",
  SC: "SCSTHPI",
  SD: "SDSTHPI",
  TN: "TNSTHPI",
  TX: "TXSTHPI",
  UT: "UTSTHPI",
  VT: "VTSTHPI",
  VA: "VASTHPI",
  WA: "WASTHPI",
  WV: "WVSTHPI",
  WI: "WISTHPI",
  WY: "WYSTHPI",
};

export interface SalesTrendData {
  period: string; // "2024-Q1", "2024-01", etc.
  medianSalePrice?: number;
  avgSalePrice?: number;
  homeSaleCount?: number;
  hpi?: number; // House Price Index
  monthsSupply?: number;
}

export interface SalesTrendsResult {
  trends: SalesTrendData[];
  areaName: string;
  source: string;
}

/** Resolve FRED API key: env var first, then Supabase federal_data integration config */
let _fredKeyCache: string | null | undefined = undefined;
async function getFredApiKey(): Promise<string | null> {
  if (process.env.FRED_API_KEY) return process.env.FRED_API_KEY;
  if (_fredKeyCache !== undefined) return _fredKeyCache;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const { data } = await sb
        .from("integrations")
        .select("config")
        .eq("provider", "federal_data")
        .eq("status", "connected")
        .limit(1)
        .maybeSingle();
      const cfg = typeof data?.config === "string" ? JSON.parse(data.config) : data?.config;
      const fredKey: string | null = cfg?.fred_api_key || null;
      _fredKeyCache = fredKey;
      return fredKey;
    }
  } catch (err) {
    console.warn("[FRED] Could not read key from DB:", err);
  }
  _fredKeyCache = null;
  return null;
}

async function fetchFREDSeries(
  seriesId: string,
  startDate: string,
  endDate?: string,
  frequency?: string,
): Promise<any[]> {
  const apiKey = await getFredApiKey();
  if (!apiKey) {
    console.warn(
      "[FRED] No API key — set FRED_API_KEY env var or add key via Federal Data integration. Free at https://fred.stlouisfed.org/docs/api/api_key.html",
    );
    return [];
  }

  try {
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: apiKey,
      file_type: "json",
      observation_start: startDate,
      ...(endDate ? { observation_end: endDate } : {}),
      ...(frequency ? { frequency } : {}),
    });

    const response = await fetch(`${BASE_URL}/series/observations?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[FRED] API returned ${response.status} for series ${seriesId}`);
      return [];
    }

    const data = await response.json();
    return (data.observations || []).filter((o: any) => o.value !== ".");
  } catch (err) {
    console.warn(`[FRED] Failed to fetch series ${seriesId}:`, err);
    return [];
  }
}

/**
 * Get national housing market trends from FRED.
 */
export async function getNationalSalesTrends(
  startYear: number = 2022,
  endYear: number = 2026,
): Promise<SalesTrendsResult> {
  const startDate = `${startYear}-01-01`;
  const endDate = `${endYear}-12-31`;

  const [medianPrices, supply] = await Promise.all([
    fetchFREDSeries(SERIES.NATIONAL_MEDIAN_PRICE, startDate, endDate, "q"),
    fetchFREDSeries(SERIES.NATIONAL_SUPPLY, startDate, endDate, "m"),
  ]);

  // Map quarterly median prices
  const trends: SalesTrendData[] = medianPrices.map((obs: any) => {
    const date = obs.date;
    const month = parseInt(date.split("-")[1]);
    const year = date.split("-")[0];
    const quarter = Math.ceil(month / 3);

    return {
      period: `${year}-Q${quarter}`,
      medianSalePrice: parseFloat(obs.value) * 1000, // FRED reports in thousands
    };
  });

  // Merge monthly supply data into nearest quarter
  for (const obs of supply) {
    const date = obs.date;
    const month = parseInt(date.split("-")[1]);
    const year = date.split("-")[0];
    const quarter = Math.ceil(month / 3);
    const period = `${year}-Q${quarter}`;
    const existing = trends.find((t) => t.period === period);
    if (existing && !existing.monthsSupply) {
      existing.monthsSupply = parseFloat(obs.value);
    }
  }

  return {
    trends,
    areaName: "United States (National)",
    source: "Federal Reserve Economic Data (FRED)",
  };
}

/**
 * Get state-level House Price Index trends.
 */
export async function getStateSalesTrends(
  stateAbbrev: string,
  startYear: number = 2022,
  endYear: number = 2026,
): Promise<SalesTrendsResult> {
  const seriesId = STATE_HPI_SERIES[stateAbbrev.toUpperCase()];
  if (!seriesId) {
    return getNationalSalesTrends(startYear, endYear);
  }

  const startDate = `${startYear}-01-01`;
  const endDate = `${endYear}-12-31`;

  const [hpiData, nationalMedian] = await Promise.all([
    fetchFREDSeries(seriesId, startDate, endDate, "q"),
    fetchFREDSeries(SERIES.NATIONAL_MEDIAN_PRICE, startDate, endDate, "q"),
  ]);

  const trends: SalesTrendData[] = hpiData.map((obs: any) => {
    const date = obs.date;
    const month = parseInt(date.split("-")[1]);
    const year = date.split("-")[0];
    const quarter = Math.ceil(month / 3);
    const period = `${year}-Q${quarter}`;

    // Try to find matching national median to estimate state median
    const nationalMatch = nationalMedian.find((n: any) => {
      const nMonth = parseInt(n.date.split("-")[1]);
      const nYear = n.date.split("-")[0];
      return nYear === year && Math.ceil(nMonth / 3) === quarter;
    });

    return {
      period,
      hpi: parseFloat(obs.value),
      medianSalePrice: nationalMatch ? parseFloat(nationalMatch.value) * 1000 : undefined,
    };
  });

  return {
    trends,
    areaName: `${stateAbbrev} (State HPI)`,
    source: "FHFA State House Price Index via FRED",
  };
}

/**
 * Get MSA-level housing market trends from FRED (county granularity).
 * Uses CBSA code derived from county FIPS to fetch metro-area HPI and listing data.
 */
export async function getMsaSalesTrends(
  countyFips: string,
  startYear: number = 2022,
  endYear: number = 2026,
): Promise<SalesTrendsResult | null> {
  const entry = COUNTY_FIPS_TO_CBSA[countyFips];
  if (!entry) return null;

  const { cbsa, name } = entry;
  const startDate = `${startYear}-01-01`;
  const endDate = `${endYear}-12-31`;

  const [hpiData, listingPrices, activeListings] = await Promise.all([
    fetchFREDSeries(msaHpiSeries(cbsa), startDate, endDate, "q"),
    fetchFREDSeries(msaMedianListPriceSeries(cbsa), startDate, endDate, "m"),
    fetchFREDSeries(msaActiveListingSeries(cbsa), startDate, endDate, "m"),
  ]);

  // If no MSA data at all, signal caller to fall back
  if (hpiData.length === 0 && listingPrices.length === 0) return null;

  // Build quarterly trend map from HPI data
  const trendMap = new Map<string, SalesTrendData>();

  for (const obs of hpiData) {
    const [year, monthStr] = obs.date.split("-");
    const quarter = Math.ceil(parseInt(monthStr) / 3);
    const period = `${year}-Q${quarter}`;
    if (!trendMap.has(period)) {
      trendMap.set(period, { period, hpi: parseFloat(obs.value) });
    }
  }

  // Merge monthly listing prices into quarterly buckets
  for (const obs of listingPrices) {
    const [year, monthStr] = obs.date.split("-");
    const quarter = Math.ceil(parseInt(monthStr) / 3);
    const period = `${year}-Q${quarter}`;
    const existing = trendMap.get(period);
    if (existing && !existing.medianSalePrice) {
      existing.medianSalePrice = parseFloat(obs.value);
    } else if (!existing) {
      trendMap.set(period, { period, medianSalePrice: parseFloat(obs.value) });
    }
  }

  // Merge active listing counts
  for (const obs of activeListings) {
    const [year, monthStr] = obs.date.split("-");
    const quarter = Math.ceil(parseInt(monthStr) / 3);
    const period = `${year}-Q${quarter}`;
    const existing = trendMap.get(period);
    if (existing && !existing.homeSaleCount) {
      existing.homeSaleCount = Math.round(parseFloat(obs.value));
    }
  }

  const trends = Array.from(trendMap.values()).sort((a, b) => a.period.localeCompare(b.period));

  return {
    trends,
    areaName: `${name} Metro Area`,
    source: "FHFA HPI & Realtor.com via FRED",
  };
}

/**
 * Get sales trends for an area.
 * Resolution chain: MSA (county FIPS) → State → National.
 */
export async function getSalesTrends(params: {
  countyFips?: string;
  stateAbbrev?: string;
  startYear?: number;
  endYear?: number;
}): Promise<SalesTrendsResult> {
  const { countyFips, stateAbbrev, startYear = 2022, endYear = 2026 } = params;

  // Try MSA-level first if county FIPS is provided
  if (countyFips) {
    const msaResult = await getMsaSalesTrends(countyFips, startYear, endYear);
    if (msaResult) return msaResult;
  }

  if (stateAbbrev) {
    return getStateSalesTrends(stateAbbrev, startYear, endYear);
  }
  return getNationalSalesTrends(startYear, endYear);
}
