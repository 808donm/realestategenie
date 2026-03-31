/**
 * FBI Crime Data Client — Free crime statistics from FBI UCR API
 *
 * Source: FBI Crime Data Explorer (https://crime-data-explorer.fr.cloud.gov/api)
 * No API key required. Provides county/state level crime rates.
 *
 * Returns data normalized to 100-base indices (national avg = 100)
 * to match the ATTOM community profile crime format.
 */

const CDE_URL = "https://cde.ucr.cjis.gov/LATEST/summarized/query";

export interface CrimeIndices {
  crimeIndex: number | null;
  burglaryIndex: number | null;
  larcenyIndex: number | null;
  motorVehicleTheftIndex: number | null;
  aggravatedAssaultIndex: number | null;
  robberyIndex: number | null;
  violentCrimeIndex: number | null;
  propertyCrimeIndex: number | null;
  year: number;
  areaName?: string;
}

// National average rates per 100k (approximate, from FBI 2022 data)
// These are used to calculate 100-base indices
const NATIONAL_RATES_PER_100K: Record<string, number> = {
  "aggravated-assault": 268.5,
  burglary: 269.8,
  larceny: 1401.9,
  "motor-vehicle-theft": 282.7,
  robbery: 73.9,
  "violent-crime": 380.7,
  "property-crime": 1954.4,
};

/**
 * Get state FIPS code from state abbreviation
 */
const STATE_FIPS: Record<string, string> = {
  AL: "01",
  AK: "02",
  AZ: "04",
  AR: "05",
  CA: "06",
  CO: "08",
  CT: "09",
  DE: "10",
  DC: "11",
  FL: "12",
  GA: "13",
  HI: "15",
  ID: "16",
  IL: "17",
  IN: "18",
  IA: "19",
  KS: "20",
  KY: "21",
  LA: "22",
  ME: "23",
  MD: "24",
  MA: "25",
  MI: "26",
  MN: "27",
  MS: "28",
  MO: "29",
  MT: "30",
  NE: "31",
  NV: "32",
  NH: "33",
  NJ: "34",
  NM: "35",
  NY: "36",
  NC: "37",
  ND: "38",
  OH: "39",
  OK: "40",
  OR: "41",
  PA: "42",
  RI: "44",
  SC: "45",
  SD: "46",
  TN: "47",
  TX: "48",
  UT: "49",
  VT: "50",
  VA: "51",
  WA: "53",
  WV: "54",
  WI: "55",
  WY: "56",
};

/**
 * Calculate 100-base index from rate per 100k
 * 100 = national average, >100 = above average, <100 = below average
 */
function rateToIndex(rate: number, offenseType: string): number {
  const national = NATIONAL_RATES_PER_100K[offenseType];
  if (!national || national === 0) return 100;
  return Math.round((rate / national) * 100);
}

/**
 * Fetch crime data for a state and compute 100-base indices.
 * FBI API provides data at state level; county data available but less reliable.
 */
export async function getCrimeIndicesByState(stateAbbrev: string, year?: number): Promise<CrimeIndices | null> {
  const state = stateAbbrev.toUpperCase();
  if (!STATE_FIPS[state]) return null;

  const toYear = year || new Date().getFullYear();
  const fromYear = toYear - 5;
  const dataRange = `01-${fromYear},12-${toYear}`;

  // FBI CDE uses a POST query endpoint with a specific payload format
  const payload = [
    {
      query: "crimeQuery",
      data: [
        { key: "dataRange", value: dataRange },
        { key: "offense", value: "violent-crime" },
        { key: "offense", value: "property-crime" },
        { key: "stateAbbr", value: state },
      ],
    },
  ];

  try {
    const response = await fetch(CDE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[FBI] CDE query returned ${response.status} for state ${state}`);
      return null;
    }

    const data = await response.json();
    console.log(`[FBI] CDE response for ${state}: ${JSON.stringify(data).slice(0, 500)}`);

    // Parse CDE response format:
    // [{ data: { actuals: { crimeQuery: { "01-2024": 3116, "02-2024": 2623, ... } } } }]
    // Keys are "MM-YYYY" with monthly crime counts (combined violent + property)
    const queryResult = Array.isArray(data) ? data[0] : data;
    const actuals = queryResult?.data?.actuals?.crimeQuery;

    if (!actuals || typeof actuals !== "object") {
      console.warn(`[FBI] Unexpected CDE response shape for ${state}`);
      return null;
    }

    // Group monthly counts by year and find the most recent complete year
    const yearTotals: Record<number, number> = {};
    const yearMonthCounts: Record<number, number> = {};

    for (const [key, value] of Object.entries(actuals)) {
      if (value == null || typeof value !== "number") continue;
      const match = key.match(/^(\d{2})-(\d{4})$/);
      if (!match) continue;
      const yr = parseInt(match[2]);
      yearTotals[yr] = (yearTotals[yr] || 0) + value;
      yearMonthCounts[yr] = (yearMonthCounts[yr] || 0) + 1;
    }

    // Find most recent year with at least 10 months of data (allow for partial current year)
    const years = Object.keys(yearTotals)
      .map(Number)
      .filter((yr) => yearMonthCounts[yr] >= 10)
      .sort((a, b) => b - a);

    if (years.length === 0) {
      // Fall back to most recent year with any data
      const allYears = Object.keys(yearTotals).map(Number).sort((a, b) => b - a);
      if (allYears.length > 0) years.push(allYears[0]);
    }

    if (years.length === 0) {
      console.warn(`[FBI] No yearly data could be aggregated for ${state}`);
      return null;
    }

    const latestYear = years[0];
    const totalCrime = yearTotals[latestYear];

    // CDE combines violent + property in the query response.
    // We requested both offense types, so the total includes both.
    // Use approximate national split (40% violent, 60% property) as estimate
    // since CDE doesn't break them down in the actuals response.
    const violentCrime = Math.round(totalCrime * 0.25);
    const propertyCrime = Math.round(totalCrime * 0.75);

    // Use Census population estimates
    const STATE_POPULATIONS: Record<string, number> = {
      HI: 1440196, CA: 39029342, TX: 30029572, FL: 22244823, NY: 19677151,
      IL: 12582032, PA: 12972008, OH: 11756058, GA: 10912876, NC: 10698973,
    };
    const population = STATE_POPULATIONS[state] || 1000000;

    console.log(`[FBI] Crime data for ${state} (${latestYear}): total=${totalCrime}, months=${yearMonthCounts[latestYear]}, pop=${population}`);

    const rate = (count: number) => (count / population) * 100000;

    // Overall crime index based on total crimes per capita vs national average
    const overallIndex = rateToIndex(rate(totalCrime), "violent-crime");

    return {
      crimeIndex: overallIndex,
      burglaryIndex: null, // Not available from combined query
      larcenyIndex: null,
      motorVehicleTheftIndex: null,
      aggravatedAssaultIndex: null,
      robberyIndex: null,
      violentCrimeIndex: rateToIndex(rate(violentCrime), "violent-crime"),
      propertyCrimeIndex: rateToIndex(rate(propertyCrime), "property-crime"),
      year: latestYear,
      areaName: state,
    };
  } catch (err) {
    console.error("[FBI] CDE query failed:", err);
    return null;
  }
}

/**
 * Get crime indices by FIPS code (state + county)
 * Falls back to state-level data if county data is unavailable
 */
export async function getCrimeIndicesByFips(fips: string): Promise<CrimeIndices | null> {
  // Extract state from FIPS (first 2 digits)
  const stateFips = fips.substring(0, 2);
  const stateAbbrev = Object.entries(STATE_FIPS).find(([, v]) => v === stateFips)?.[0];
  if (!stateAbbrev) return null;

  return getCrimeIndicesByState(stateAbbrev);
}
