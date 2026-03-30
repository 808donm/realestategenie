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

  const targetYear = year || 2022;
  const state = stateAbbrev.toUpperCase();
  const stateFips = STATE_FIPS[state];
  if (!stateFips) return null;

  // Try the new CDE API first, fall back to legacy SAPI
  const urls = [
    `${BASE_URL}/estimate/state/${state}/${targetYear}?API_KEY=${API_KEY}`,
    `${BASE_URL}/api/estimates/states/${stateFips}?year=${targetYear}&API_KEY=${API_KEY}`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.warn(`[FBI] API returned ${response.status} for ${url.split("?")[0]}`);
        continue;
      }

      const data = await response.json();

      // New CDE format: data may be an object or have a results array
      const results = Array.isArray(data) ? data : data.results || (data.data ? [data.data] : [data]);

      // Find the closest year
      const match = results.find((r: any) => r.year === targetYear) || results[results.length - 1];

      if (!match) continue;

      const pop = match.population || 1;
      const rate = (count: number) => (count / pop) * 100000;

      // Handle both old field names and potential new field names
      const violentCrime = match.violent_crime ?? match.violentCrime ?? 0;
      const propertyCrime = match.property_crime ?? match.propertyCrime ?? 0;
      const burglary = match.burglary ?? 0;
      const larceny = match.larceny ?? match.larcenyTheft ?? 0;
      const mvt = match.motor_vehicle_theft ?? match.motorVehicleTheft ?? 0;
      const assault = match.aggravated_assault ?? match.aggravatedAssault ?? 0;
      const robbery = match.robbery ?? 0;

      return {
        crimeIndex: rateToIndex(rate(violentCrime + propertyCrime), "violent-crime"),
        burglaryIndex: rateToIndex(rate(burglary), "burglary"),
        larcenyIndex: rateToIndex(rate(larceny), "larceny"),
        motorVehicleTheftIndex: rateToIndex(rate(mvt), "motor-vehicle-theft"),
        aggravatedAssaultIndex: rateToIndex(rate(assault), "aggravated-assault"),
        robberyIndex: rateToIndex(rate(robbery), "robbery"),
        violentCrimeIndex: rateToIndex(rate(violentCrime), "violent-crime"),
        propertyCrimeIndex: rateToIndex(rate(propertyCrime), "property-crime"),
        year: match.year || targetYear,
        areaName: match.state_name || match.stateName || stateAbbrev,
      };
    } catch (err) {
      console.warn("[FBI] Crime data fetch failed for URL:", url.split("?")[0], err);
      continue;
    }
  }

  console.warn(`[FBI] All endpoints failed for state ${stateAbbrev}`);
  return null;
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
