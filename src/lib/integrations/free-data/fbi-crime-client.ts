/**
 * FBI Crime Data Client — Free crime statistics from FBI UCR API
 *
 * Source: FBI Crime Data Explorer (https://crime-data-explorer.fr.cloud.gov/api)
 * No API key required. Provides county/state level crime rates.
 *
 * Returns data normalized to 100-base indices (national avg = 100)
 * to match the ATTOM community profile crime format.
 */

const BASE_URL = "https://api.usa.gov/crime/fbi/cde";
const API_KEY = process.env.FBI_API_KEY || "";

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
  if (!API_KEY) {
    console.warn("[FBI] FBI_API_KEY not configured, skipping crime data");
    return null;
  }

  const state = stateAbbrev.toUpperCase();
  if (!STATE_FIPS[state]) return null;

  // New CDE API: /summarized/state/{state}/{offense}
  // Each offense is a separate endpoint. Fetch all in parallel.
  const offenses = [
    "violent-crime",
    "property-crime",
    "burglary",
    "larceny",
    "motor-vehicle-theft",
    "aggravated-assault",
    "robbery",
  ];

  try {
    const results = await Promise.allSettled(
      offenses.map((offense) =>
        fetch(`${BASE_URL}/summarized/state/${state}/${offense}?API_KEY=${API_KEY}`, {
          signal: AbortSignal.timeout(10000),
        }).then(async (r) => {
          if (!r.ok) return null;
          const data = await r.json();
          return { offense, data };
        }),
      ),
    );

    // Extract the most recent year's data from each offense response
    const crimeData: Record<string, number> = {};
    let latestYear = 0;
    let population = 0;

    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const { offense, data } = result.value;

      // Log raw response shape for debugging
      console.log(`[FBI] ${offense} response type=${typeof data}, isArray=${Array.isArray(data)}, keys=${typeof data === "object" && data ? Object.keys(data).slice(0, 10).join(",") : "N/A"}, sample=${JSON.stringify(data).slice(0, 200)}`);

      // Response could be: array of records, object with nested data, or keyed by year
      let records: any[] = [];
      if (Array.isArray(data)) {
        records = data;
      } else if (data && typeof data === "object") {
        // Could be { results: [...] }, { data: [...] }, or { "2020": {...}, "2021": {...} }
        if (data.results) records = data.results;
        else if (data.data) records = Array.isArray(data.data) ? data.data : [data.data];
        else {
          // Try treating keys as years (e.g., { "2020": { population: X, ... }, "2021": {...} })
          const yearKeys = Object.keys(data).filter((k) => /^\d{4}$/.test(k));
          if (yearKeys.length > 0) {
            records = yearKeys.map((yr) => ({ year: parseInt(yr), ...data[yr] }));
          } else {
            records = [data];
          }
        }
      }
      if (records.length === 0) continue;

      // Get most recent year's record
      const sorted = [...records].sort((a: any, b: any) => (b.year || b.data_year || 0) - (a.year || a.data_year || 0));
      const recent = sorted[0];
      if (!recent) continue;

      const yr = recent.year || recent.data_year || 0;
      if (yr > latestYear) latestYear = yr;
      if (recent.population && recent.population > population) population = recent.population;

      // Extract the count -- try multiple possible field names
      const count =
        recent.actual || recent.total || recent.value || recent.count || recent.estimated ||
        recent.totalCount || recent.offense_count || recent.incidents || 0;
      crimeData[offense] = count;
    }

    if (Object.keys(crimeData).length === 0 || population === 0) {
      console.warn(`[FBI] No usable crime data for state ${state}`);
      return null;
    }

    const rate = (count: number) => (count / population) * 100000;

    console.log(`[FBI] Crime data for ${state} (${latestYear}): ${JSON.stringify(crimeData)}`);

    return {
      crimeIndex: rateToIndex(rate((crimeData["violent-crime"] || 0) + (crimeData["property-crime"] || 0)), "violent-crime"),
      burglaryIndex: rateToIndex(rate(crimeData["burglary"] || 0), "burglary"),
      larcenyIndex: rateToIndex(rate(crimeData["larceny"] || 0), "larceny"),
      motorVehicleTheftIndex: rateToIndex(rate(crimeData["motor-vehicle-theft"] || 0), "motor-vehicle-theft"),
      aggravatedAssaultIndex: rateToIndex(rate(crimeData["aggravated-assault"] || 0), "aggravated-assault"),
      robberyIndex: rateToIndex(rate(crimeData["robbery"] || 0), "robbery"),
      violentCrimeIndex: rateToIndex(rate(crimeData["violent-crime"] || 0), "violent-crime"),
      propertyCrimeIndex: rateToIndex(rate(crimeData["property-crime"] || 0), "property-crime"),
      year: latestYear,
      areaName: state,
    };
  } catch (err) {
    console.error("[FBI] Crime data fetch failed:", err);
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
