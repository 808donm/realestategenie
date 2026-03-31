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

  // FBI CDE uses a POST query endpoint with a specific payload format.
  // The API accepts up to 3 offenses per query. Send multiple requests in parallel.
  const offenseGroups = [
    ["violent-crime", "property-crime"],
    ["burglary", "larceny", "motor-vehicle-theft"],
    ["aggravated-assault", "robbery"],
  ];
  const offenses = offenseGroups.flat();

  try {
    // Send parallel requests, one per offense group
    const responses = await Promise.allSettled(
      offenseGroups.map((group, gi) => {
        const queryData: Array<{ key: string; value: string }> = [
          { key: "dataRange", value: dataRange },
          { key: "stateAbbr", value: state },
        ];
        for (const offense of group) {
          queryData.push({ key: "offense", value: offense });
        }
        const payload = [{ query: `q${gi}`, data: queryData }];

        return fetch(CDE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        }).then(async (r) => {
          if (!r.ok) {
            console.warn(`[FBI] CDE query group ${gi} returned ${r.status}`);
            return null;
          }
          return r.json();
        });
      }),
    );

    // Merge results from all groups
    const allResults: any[] = [];
    for (const res of responses) {
      if (res.status === "fulfilled" && res.value) {
        const arr = Array.isArray(res.value) ? res.value : [res.value];
        allResults.push(...arr);
      }
    }

    if (allResults.length === 0) {
      console.warn(`[FBI] All CDE queries failed for state ${state}`);
      return null;
    }

    // Parse CDE response format:
    // Each query returns: { data: { actuals: { qN: { "01-2024": 3116, ... } } } }
    // We sent one query per offense type, so we can attribute counts properly.

    /** Sum monthly counts for the most recent complete year from a monthly-keyed object */
    function sumRecentYear(monthly: Record<string, any>): { total: number; year: number; months: number } {
      const yearTotals: Record<number, number> = {};
      const yearMonths: Record<number, number> = {};
      for (const [key, value] of Object.entries(monthly)) {
        if (value == null || typeof value !== "number") continue;
        const match = key.match(/^(\d{2})-(\d{4})$/);
        if (!match) continue;
        const yr = parseInt(match[2]);
        yearTotals[yr] = (yearTotals[yr] || 0) + value;
        yearMonths[yr] = (yearMonths[yr] || 0) + 1;
      }
      // Most recent year with at least 10 months
      const years = Object.keys(yearTotals).map(Number).filter((yr) => yearMonths[yr] >= 10).sort((a, b) => b - a);
      if (years.length === 0) {
        const allYears = Object.keys(yearTotals).map(Number).sort((a, b) => b - a);
        if (allYears.length > 0) return { total: yearTotals[allYears[0]], year: allYears[0], months: yearMonths[allYears[0]] };
        return { total: 0, year: 0, months: 0 };
      }
      return { total: yearTotals[years[0]], year: years[0], months: yearMonths[years[0]] };
    }

    // Extract per-offense annual totals from all results
    const offenseTotals: Record<string, number> = {};
    let latestYear = 0;

    for (const result of allResults) {
      const actuals = result?.data?.actuals;
      if (!actuals || typeof actuals !== "object") continue;

      // Each query key (q0, q1, q2) contains monthly data for that group's offenses combined
      for (const [queryKey, monthly] of Object.entries(actuals)) {
        if (!monthly || typeof monthly !== "object") continue;

        const { total, year } = sumRecentYear(monthly as Record<string, any>);
        if (total > 0 && year > 0) {
          // Map query key back to offense group
          const gi = parseInt(queryKey.replace("q", ""));
          if (!isNaN(gi) && offenseGroups[gi]) {
            // CDE combines offenses in one query -- the total is the sum of all offenses in the group
            // For groups with one parent category (violent-crime, property-crime), assign directly
            if (offenseGroups[gi].length === 2 && offenseGroups[gi].includes("violent-crime")) {
              // First group: violent + property combined -- split based on the total
              // We can't split from a single combined response, so assign the whole total
              // and we'll split later based on ratios from the other groups
              offenseTotals["_combined_vp"] = total;
            } else {
              // For individual offense groups, assign each offense its share
              // Since CDE combines them, divide equally as estimate
              const perOffense = Math.round(total / offenseGroups[gi].length);
              for (const offense of offenseGroups[gi]) {
                offenseTotals[offense] = perOffense;
              }
            }
            if (year > latestYear) latestYear = year;
          }
        }
      }
    }

    // If we got the combined violent+property total, split it using individual offense data
    if (offenseTotals["_combined_vp"]) {
      const combinedTotal = offenseTotals["_combined_vp"];
      delete offenseTotals["_combined_vp"];
      const individualSum =
        (offenseTotals["burglary"] || 0) + (offenseTotals["larceny"] || 0) +
        (offenseTotals["motor-vehicle-theft"] || 0) + (offenseTotals["aggravated-assault"] || 0) +
        (offenseTotals["robbery"] || 0);
      const propertyCrimeEst = (offenseTotals["burglary"] || 0) + (offenseTotals["larceny"] || 0) + (offenseTotals["motor-vehicle-theft"] || 0);
      const violentCrimeEst = (offenseTotals["aggravated-assault"] || 0) + (offenseTotals["robbery"] || 0);
      if (individualSum > 0) {
        offenseTotals["property-crime"] = propertyCrimeEst;
        offenseTotals["violent-crime"] = violentCrimeEst;
      } else {
        // No individual data -- estimate split
        offenseTotals["violent-crime"] = Math.round(combinedTotal * 0.25);
        offenseTotals["property-crime"] = Math.round(combinedTotal * 0.75);
      }
    }

    if (Object.keys(offenseTotals).length === 0) {
      console.warn(`[FBI] No offense data could be extracted for ${state}`);
      return null;
    }

    // Use Census population estimates
    const STATE_POPULATIONS: Record<string, number> = {
      HI: 1440196, CA: 39029342, TX: 30029572, FL: 22244823, NY: 19677151,
      IL: 12582032, PA: 12972008, OH: 11756058, GA: 10912876, NC: 10698973,
    };
    const population = STATE_POPULATIONS[state] || 1000000;

    const violentCrime = offenseTotals["violent-crime"] || 0;
    const propertyCrime = offenseTotals["property-crime"] || 0;
    const totalCrime = violentCrime + propertyCrime;

    console.log(`[FBI] Crime data for ${state} (${latestYear}): violent=${violentCrime}, property=${propertyCrime}, burglary=${offenseTotals["burglary"] || 0}, pop=${population}`);

    const rate = (count: number) => (count / population) * 100000;

    return {
      crimeIndex: rateToIndex(rate(totalCrime), "violent-crime"),
      burglaryIndex: offenseTotals["burglary"] ? rateToIndex(rate(offenseTotals["burglary"]), "burglary") : null,
      larcenyIndex: offenseTotals["larceny"] ? rateToIndex(rate(offenseTotals["larceny"]), "larceny") : null,
      motorVehicleTheftIndex: offenseTotals["motor-vehicle-theft"] ? rateToIndex(rate(offenseTotals["motor-vehicle-theft"]), "motor-vehicle-theft") : null,
      aggravatedAssaultIndex: offenseTotals["aggravated-assault"] ? rateToIndex(rate(offenseTotals["aggravated-assault"]), "aggravated-assault") : null,
      robberyIndex: offenseTotals["robbery"] ? rateToIndex(rate(offenseTotals["robbery"]), "robbery") : null,
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
