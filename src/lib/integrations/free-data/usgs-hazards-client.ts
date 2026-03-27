/**
 * USGS/NOAA Natural Hazard Risk Client
 *
 * Sources:
 * - USGS Earthquake Hazards API (free, no key)
 * - NOAA Storm Events Database (free, no key)
 * - FEMA National Risk Index API (free, no key)
 *
 * Provides earthquake, flood, tornado, hurricane, wildfire risk data.
 */

export interface HazardRiskProfile {
  earthquake: { risk: string; score: number | null; details?: string };
  flood: { risk: string; score: number | null; details?: string };
  tornado: { risk: string; score: number | null; details?: string };
  hurricane: { risk: string; score: number | null; details?: string };
  wildfire: { risk: string; score: number | null; details?: string };
  hail: { risk: string; score: number | null; details?: string };
  wind: { risk: string; score: number | null; details?: string };
  overall: { risk: string; score: number | null };
  source: string;
}

/**
 * Get earthquake hazard data from USGS
 * Uses the Earthquake Hazards Program probabilistic seismic hazard data
 */
async function getEarthquakeRisk(
  latitude: number,
  longitude: number,
): Promise<{ risk: string; score: number | null; details?: string }> {
  try {
    // USGS Design Maps API — provides seismic hazard parameters
    const url = `https://earthquake.usgs.gov/ws/designmaps/asce7-22.json?latitude=${latitude}&longitude=${longitude}&riskCategory=II&siteClass=D&title=query`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return { risk: "Unknown", score: null };
    }

    const data = await response.json();
    const ss = data.response?.data?.ss; // Short-period spectral acceleration
    const s1 = data.response?.data?.s1; // 1-second spectral acceleration

    if (ss == null) {
      return { risk: "Unknown", score: null };
    }

    // Classify risk based on short-period spectral acceleration
    let risk: string;
    let score: number;
    if (ss >= 1.5) {
      risk = "Very High";
      score = 90;
    } else if (ss >= 1.0) {
      risk = "High";
      score = 70;
    } else if (ss >= 0.5) {
      risk = "Moderate";
      score = 50;
    } else if (ss >= 0.2) {
      risk = "Low";
      score = 25;
    } else {
      risk = "Very Low";
      score = 10;
    }

    return {
      risk,
      score,
      details: `Ss=${ss.toFixed(2)}g, S1=${s1?.toFixed(2) ?? "N/A"}g`,
    };
  } catch (err) {
    console.warn("[USGS] Earthquake risk fetch failed:", err);
    return { risk: "Unknown", score: null };
  }
}

/**
 * Get hazard risk from FEMA National Risk Index.
 * This provides community-level risk scores for 18 natural hazards.
 */
async function getFEMARiskIndex(
  stateAbbrev: string,
  countyFips?: string,
): Promise<Record<string, { risk: string; score: number | null }>> {
  const defaults: Record<string, { risk: string; score: number | null }> = {
    flood: { risk: "Unknown", score: null },
    tornado: { risk: "Unknown", score: null },
    hurricane: { risk: "Unknown", score: null },
    wildfire: { risk: "Unknown", score: null },
    hail: { risk: "Unknown", score: null },
    wind: { risk: "Unknown", score: null },
  };

  try {
    // FEMA NRI API — county-level risk scores
    const fips = countyFips || "";
    const url = fips
      ? `https://hazards.fema.gov/nri/services/nriData?countyFips=${fips}`
      : `https://hazards.fema.gov/nri/services/nriData?stateAbbrev=${stateAbbrev}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return defaults;

    const data = await response.json();
    const record = Array.isArray(data) ? data[0] : data;

    if (!record) return defaults;

    const ratingFromScore = (score: number | null): string => {
      if (score == null) return "Unknown";
      if (score >= 80) return "Very High";
      if (score >= 60) return "High";
      if (score >= 40) return "Moderate";
      if (score >= 20) return "Low";
      return "Very Low";
    };

    return {
      flood: { risk: ratingFromScore(record.RFLD_RISKR), score: record.RFLD_RISKR ?? null },
      tornado: { risk: ratingFromScore(record.TRND_RISKR), score: record.TRND_RISKR ?? null },
      hurricane: { risk: ratingFromScore(record.HRCN_RISKR), score: record.HRCN_RISKR ?? null },
      wildfire: { risk: ratingFromScore(record.WFIR_RISKR), score: record.WFIR_RISKR ?? null },
      hail: { risk: ratingFromScore(record.HAIL_RISKR), score: record.HAIL_RISKR ?? null },
      wind: { risk: ratingFromScore(record.SWND_RISKR), score: record.SWND_RISKR ?? null },
    };
  } catch (err) {
    console.warn("[FEMA NRI] Risk index fetch failed:", err);
    return defaults;
  }
}

/**
 * Build a complete hazard risk profile for a location.
 * Combines USGS earthquake data with FEMA National Risk Index.
 */
export async function getHazardRiskProfile(
  latitude: number,
  longitude: number,
  stateAbbrev?: string,
  countyFips?: string,
): Promise<HazardRiskProfile> {
  const [earthquake, femaRisks] = await Promise.all([
    getEarthquakeRisk(latitude, longitude),
    stateAbbrev
      ? getFEMARiskIndex(stateAbbrev, countyFips)
      : Promise.resolve({
          flood: { risk: "Unknown" as string, score: null as number | null },
          tornado: { risk: "Unknown" as string, score: null as number | null },
          hurricane: { risk: "Unknown" as string, score: null as number | null },
          wildfire: { risk: "Unknown" as string, score: null as number | null },
          hail: { risk: "Unknown" as string, score: null as number | null },
          wind: { risk: "Unknown" as string, score: null as number | null },
        }),
  ]);

  // Compute overall risk as average of available scores
  const scores = [
    earthquake.score,
    femaRisks.flood?.score,
    femaRisks.tornado?.score,
    femaRisks.hurricane?.score,
    femaRisks.wildfire?.score,
  ].filter((s): s is number => s != null);

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const riskFromAvg = (s: number | null): string => {
    if (s == null) return "Unknown";
    if (s >= 70) return "High";
    if (s >= 40) return "Moderate";
    return "Low";
  };

  return {
    earthquake,
    flood: femaRisks.flood,
    tornado: femaRisks.tornado,
    hurricane: femaRisks.hurricane,
    wildfire: femaRisks.wildfire,
    hail: femaRisks.hail,
    wind: femaRisks.wind,
    overall: { risk: riskFromAvg(avgScore), score: avgScore },
    source: "USGS Earthquake Hazards + FEMA National Risk Index",
  };
}
