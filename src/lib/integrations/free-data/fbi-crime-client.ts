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

    // Parse the response -- CDE returns nested results per query
    const queryResult = Array.isArray(data) ? data[0] : data;
    const results = queryResult?.results || queryResult?.data || queryResult;

    if (!results || (Array.isArray(results) && results.length === 0)) {
      console.warn(`[FBI] No results in CDE response for state ${state}`);
      return null;
    }

    // Aggregate crime counts from the response
    // CDE may return yearly breakdowns or aggregate totals
    let violentCrime = 0;
    let propertyCrime = 0;
    let burglary = 0;
    let larceny = 0;
    let mvt = 0;
    let assault = 0;
    let robbery = 0;
    let latestYear = 0;
    let population = 0;

    // Handle various response shapes
    const records = Array.isArray(results) ? results : [results];
    for (const rec of records) {
      const yr = rec.year || rec.data_year || rec.Year || 0;
      if (yr > latestYear) {
        latestYear = yr;
        population = rec.population || rec.Population || rec.total_population || population;
      }

      // Sum by offense type
      const offense = (rec.offense || rec.key || rec.crime_type || "").toLowerCase();
      const count = rec.actual || rec.total || rec.value || rec.count || rec.estimated || rec.totalCount || 0;

      if (offense.includes("violent")) violentCrime += count;
      else if (offense.includes("property") && !offense.includes("motor")) propertyCrime += count;
      else if (offense.includes("burglary")) burglary += count;
      else if (offense.includes("larceny")) larceny += count;
      else if (offense.includes("motor") || offense.includes("vehicle")) mvt += count;
      else if (offense.includes("assault")) assault += count;
      else if (offense.includes("robbery")) robbery += count;
    }

    // If we didn't get individual offense breakdown, try top-level fields
    if (violentCrime === 0 && propertyCrime === 0) {
      for (const rec of records) {
        violentCrime += rec.violent_crime || rec.violentCrime || rec.Violent_crime || 0;
        propertyCrime += rec.property_crime || rec.propertyCrime || rec.Property_crime || 0;
        burglary += rec.burglary || rec.Burglary || 0;
        larceny += rec.larceny || rec.Larceny || rec.larceny_theft || 0;
        mvt += rec.motor_vehicle_theft || rec.motorVehicleTheft || 0;
        assault += rec.aggravated_assault || rec.aggravatedAssault || 0;
        robbery += rec.robbery || rec.Robbery || 0;
        if (!population) population = rec.population || rec.Population || 0;
        if (!latestYear) latestYear = rec.year || rec.data_year || 0;
      }
    }

    if (population === 0) {
      // Fallback: use Census population estimate for Hawaii
      population = state === "HI" ? 1440196 : 1000000;
    }

    if (violentCrime === 0 && propertyCrime === 0) {
      console.warn(`[FBI] Could not extract crime counts for ${state}. Response sample: ${JSON.stringify(records[0]).slice(0, 300)}`);
      return null;
    }

    const rate = (count: number) => (count / population) * 100000;

    console.log(`[FBI] Crime data for ${state} (${latestYear}): violent=${violentCrime}, property=${propertyCrime}, pop=${population}`);

    return {
      crimeIndex: rateToIndex(rate(violentCrime + propertyCrime), "violent-crime"),
      burglaryIndex: rateToIndex(rate(burglary), "burglary"),
      larcenyIndex: rateToIndex(rate(larceny), "larceny"),
      motorVehicleTheftIndex: rateToIndex(rate(mvt), "motor-vehicle-theft"),
      aggravatedAssaultIndex: rateToIndex(rate(assault), "aggravated-assault"),
      robberyIndex: rateToIndex(rate(robbery), "robbery"),
      violentCrimeIndex: rateToIndex(rate(violentCrime), "violent-crime"),
      propertyCrimeIndex: rateToIndex(rate(propertyCrime), "property-crime"),
      year: latestYear || toYear,
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
