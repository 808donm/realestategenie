/**
 * FRED Sales Trends Client — Free housing market data
 *
 * Source: Federal Reserve Economic Data (FRED) API
 * Requires free API key from https://fred.stlouisfed.org/docs/api/api_key.html
 *
 * Provides: Median home prices, sales volume, housing starts by metro area
 * Falls back to national data when metro-specific data is unavailable.
 */

const BASE_URL = "https://api.stlouisfed.org/fred";

// Key FRED series IDs for housing
const SERIES = {
  // National
  NATIONAL_MEDIAN_PRICE: "MSPUS",        // Median Sales Price of Houses Sold (US)
  NATIONAL_HOMES_SOLD: "HSN1F",          // New One Family Houses Sold
  NATIONAL_SUPPLY: "MSACSR",             // Monthly Supply of New Houses
  NATIONAL_CASE_SHILLER: "CSUSHPINSA",   // S&P/Case-Shiller Home Price Index
  // State-level HPI
  STATE_HPI_PREFIX: "STHPI",             // e.g., HISTHPI for Hawaii
};

// State abbreviation to FRED series suffix mapping
const STATE_HPI_SERIES: Record<string, string> = {
  AL: "ALSTHPI", AK: "AKSTHPI", AZ: "AZSTHPI", AR: "ARSTHPI", CA: "CASTHPI",
  CO: "COSTHPI", CT: "CTSTHPI", DE: "DESTHPI", FL: "FLSTHPI", GA: "GASTHPI",
  HI: "HISTHPI", ID: "IDSTHPI", IL: "ILSTHPI", IN: "INSTHPI", IA: "IASTHPI",
  KS: "KSSTHPI", KY: "KYSTHPI", LA: "LASTHPI", ME: "MESTHPI", MD: "MDSTHPI",
  MA: "MASTHPI", MI: "MISTHPI", MN: "MNSTHPI", MS: "MSSTHPI", MO: "MOSTHPI",
  MT: "MTSTHPI", NE: "NESTHPI", NV: "NVSTHPI", NH: "NHSTHPI", NJ: "NJSTHPI",
  NM: "NMSTHPI", NY: "NYSTHPI", NC: "NCSTHPI", ND: "NDSTHPI", OH: "OHSTHPI",
  OK: "OKSTHPI", OR: "ORSTHPI", PA: "PASTHPI", RI: "RISTHPI", SC: "SCSTHPI",
  SD: "SDSTHPI", TN: "TNSTHPI", TX: "TXSTHPI", UT: "UTSTHPI", VT: "VTSTHPI",
  VA: "VASTHPI", WA: "WASTHPI", WV: "WVSTHPI", WI: "WISTHPI", WY: "WYSTHPI",
};

export interface SalesTrendData {
  period: string;       // "2024-Q1", "2024-01", etc.
  medianSalePrice?: number;
  avgSalePrice?: number;
  homeSaleCount?: number;
  hpi?: number;          // House Price Index
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
    console.warn("[FRED] No API key — set FRED_API_KEY env var or add key via Federal Data integration. Free at https://fred.stlouisfed.org/docs/api/api_key.html");
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
    const existing = trends.find(t => t.period === period);
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
 * Get sales trends for an area.
 * Tries state-level first, falls back to national.
 */
export async function getSalesTrends(
  params: {
    stateAbbrev?: string;
    startYear?: number;
    endYear?: number;
  },
): Promise<SalesTrendsResult> {
  const { stateAbbrev, startYear = 2022, endYear = 2026 } = params;

  if (stateAbbrev) {
    return getStateSalesTrends(stateAbbrev, startYear, endYear);
  }
  return getNationalSalesTrends(startYear, endYear);
}
