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
  coastalFlood?: { risk: string; score: number | null };
  tornado: { risk: string; score: number | null; details?: string };
  hurricane: { risk: string; score: number | null; details?: string };
  wildfire: { risk: string; score: number | null; details?: string };
  hail: { risk: string; score: number | null; details?: string };
  wind: { risk: string; score: number | null; details?: string };
  tsunami?: { risk: string; score: number | null };
  landslide?: { risk: string; score: number | null };
  lightning?: { risk: string; score: number | null };
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

  // FEMA NRI via ArcGIS — county-level risk scores
  // Source: https://resilience.climate.gov/datasets/FEMA::national-risk-index-counties
  try {
    // Resolve county name for query (ArcGIS uses COUNTY field, not FIPS)
    let countyName: string | undefined;
    if (countyFips && stateAbbrev?.toUpperCase() === "HI") {
      const FIPS_TO_COUNTY: Record<string, string> = {
        "15003": "Honolulu", "15001": "Hawaii", "15009": "Maui", "15007": "Kauai",
      };
      countyName = FIPS_TO_COUNTY[countyFips];
    }

    const countyQuery = countyName
      ? `COUNTY+%3D+%27${countyName}%27`
      : stateAbbrev
        ? `STATE+%3D+%27${stateAbbrev === "HI" ? "Hawaii" : stateAbbrev}%27`
        : null;

    if (!countyQuery) return defaults;

    // Use outFields=* because comma-separated field lists cause 400 errors on this endpoint
    const nriUrl = `https://services.arcgis.com/XG15cJAlne2vxtgt/ArcGIS/rest/services/National_Risk_Index_Counties/FeatureServer/0/query?where=${countyQuery}&outFields=*&returnGeometry=false&f=json&resultRecordCount=1`;

    const response = await fetch(nriUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return defaults;

    const data = await response.json();
    const record = data.features?.[0]?.attributes;
    if (!record) return defaults;

    const mapRating = (r: string | null): { risk: string; score: number | null } => {
      if (!r || r === "No Rating" || r === "Not Applicable") return { risk: "Unknown", score: null };
      // Simplify FEMA's verbose ratings
      const ratingMap: Record<string, string> = {
        "Very High": "Very High",
        "Relatively High": "High",
        "Relatively Moderate": "Moderate",
        "Relatively Low": "Low",
        "Very Low": "Very Low",
      };
      return { risk: ratingMap[r] || r, score: null };
    };

    console.log(`[FEMA NRI] Data for ${countyQuery}: flood=${record.IFLD_RISKR}, hurricane=${record.HRCN_RISKR}, wildfire=${record.WFIR_RISKR}, earthquake=${record.ERQK_RISKR}, tsunami=${record.TSUN_RISKR}`);

    return {
      flood: mapRating(record.IFLD_RISKR || record.RFLD_RISKR), // IFLD = inland flood (more common), RFLD = riverine
      coastalFlood: mapRating(record.CFLD_RISKR),
      tornado: mapRating(record.TRND_RISKR),
      hurricane: mapRating(record.HRCN_RISKR),
      wildfire: mapRating(record.WFIR_RISKR),
      earthquake: mapRating(record.ERQK_RISKR),
      wind: mapRating(record.SWND_RISKR),
      tsunami: mapRating(record.TSUN_RISKR),
      landslide: mapRating(record.LNDS_RISKR),
      lightning: mapRating(record.LTNG_RISKR),
      overall: mapRating(record.RISK_RATNG),
    };
  } catch (err) {
    console.warn("[FEMA NRI] ArcGIS risk index fetch failed:", err);
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
          earthquake: { risk: "Unknown" as string, score: null as number | null },
          hail: { risk: "Unknown" as string, score: null as number | null },
          wind: { risk: "Unknown" as string, score: null as number | null },
          overall: { risk: "Unknown" as string, score: null as number | null },
        } as Record<string, { risk: string; score: number | null }>),
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
    earthquake: femaRisks.earthquake?.risk !== "Unknown" ? femaRisks.earthquake : earthquake,
    flood: femaRisks.flood,
    coastalFlood: (femaRisks as any).coastalFlood,
    tornado: femaRisks.tornado,
    hurricane: femaRisks.hurricane,
    wildfire: femaRisks.wildfire,
    hail: femaRisks.hail,
    wind: femaRisks.wind,
    tsunami: (femaRisks as any).tsunami,
    landslide: (femaRisks as any).landslide,
    lightning: (femaRisks as any).lightning,
    overall: (femaRisks as any).overall?.risk !== "Unknown" ? (femaRisks as any).overall : { risk: riskFromAvg(avgScore), score: avgScore },
    source: "FEMA National Risk Index + USGS",
  };
}
