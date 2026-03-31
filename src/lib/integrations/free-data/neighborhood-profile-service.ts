/**
 * Neighborhood Profile Service — Orchestrator for free data sources
 *
 * Combines: NCES Schools, FBI Crime, USGS/FEMA Hazards, OSM POI, FRED Trends
 * into a single getNeighborhoodProfile() response that matches the shape
 * the property-detail-modal UI expects.
 *
 * All data is from free public APIs — no ATTOM dependency.
 */

import { searchSchoolsByLocation, searchSchoolsByZip, type SchoolResult } from "./nces-schools-client";
import { getCrimeIndicesByState, getCrimeIndicesByFips, type CrimeIndices } from "./fbi-crime-client";
import { getHazardRiskProfile, type HazardRiskProfile } from "./usgs-hazards-client";
import { searchPOI, type POIResult } from "./osm-poi-client";
import { getSalesTrends, type SalesTrendsResult } from "./fred-trends-client";

export interface NeighborhoodProfileResult {
  community: {
    community?: {
      geography?: { geographyName?: string; geographyTypeName?: string };
      crime?: {
        crime_Index?: number;
        burglary_Index?: number;
        larceny_Index?: number;
        motor_Vehicle_Theft_Index?: number;
        aggravated_Assault_Index?: number;
        forcible_Robbery_Index?: number;
      };
      naturalDisasters?: {
        earthquake?: { risk: string; score: number | null; details?: string };
        flood?: { risk: string; score: number | null };
        tornado?: { risk: string; score: number | null };
        hurricane?: { risk: string; score: number | null };
        wildfire?: { risk: string; score: number | null };
        hail?: { risk: string; score: number | null };
        wind?: { risk: string; score: number | null };
        overall?: { risk: string; score: number | null };
      };
    };
  } | null;
  schools: {
    school: Array<{
      InstitutionName?: string;
      School_Name?: string;
      schoolName?: string;
      schoolType?: string;
      gradeRange?: string;
      Enrollment?: number;
      enrollment?: number;
      distance?: number;
      distanceMiles?: number;
      latitude?: number;
      longitude?: number;
      city?: string;
      state?: string;
      districtName?: string;
    }>;
  } | null;
  poi: {
    poi: Array<{
      BusinessName?: string;
      name?: string;
      CategoryName?: string;
      category?: string;
      Distance?: number;
      distanceMiles?: number;
      latitude?: number;
      longitude?: number;
    }>;
    categories?: string[];
  } | null;
  salesTrends: {
    salesTrends: Array<{
      dateRange?: { start?: string; interval?: string };
      location?: { geographyName?: string };
      salesTrend?: {
        medSalePrice?: number;
        avgSalePrice?: number;
        homeSaleCount?: number;
      };
      vintage?: { pubDate?: string };
    }>;
  } | null;
}

/**
 * Fetch a complete neighborhood profile from free data sources.
 * All API calls run in parallel for speed.
 */
export async function getNeighborhoodProfile(params: {
  latitude?: number;
  longitude?: number;
  postalCode?: string;
  state?: string;
  fips?: string;
  address1?: string;
  address2?: string;
}): Promise<NeighborhoodProfileResult> {
  const { latitude, longitude, postalCode, state } = params;
  let { fips } = params;

  // Derive state from address2 or fips if not provided
  let stateAbbrev = state?.toUpperCase();
  if (!stateAbbrev && params.address2) {
    const match = params.address2.match(/\b([A-Z]{2})\b/);
    if (match) stateAbbrev = match[1];
  }

  // Resolve county FIPS from zip for Hawaii (needed for county-level NRI data)
  if (!fips && stateAbbrev === "HI" && postalCode) {
    const HAWAII_COUNTY_FIPS: Record<string, string> = {
      HONOLULU: "15003", HAWAII: "15001", MAUI: "15009", KAUAI: "15007",
    };
    try {
      const { getCountyByZip } = await import("@/lib/hawaii-zip-county");
      const county = getCountyByZip(postalCode);
      if (county && HAWAII_COUNTY_FIPS[county]) {
        fips = HAWAII_COUNTY_FIPS[county];
      }
    } catch {}
  }

  // Area name for display
  const areaName = postalCode
    ? `ZIP ${postalCode}`
    : params.address2 || (latitude && longitude ? `${latitude.toFixed(2)}, ${longitude.toFixed(2)}` : "");

  console.log(`[Neighborhood] Fetching profile: lat=${latitude}, lng=${longitude}, zip=${postalCode}, state=${stateAbbrev}, fips=${fips}`);

  // Run all free API calls in parallel
  const [schoolsResult, crimeResult, hazardResult, poiResult, trendsResult] = await Promise.allSettled([
    // Schools -- prefer zip-based search to keep results local to the property's area
    postalCode
      ? searchSchoolsByZip(postalCode, 15)
      : latitude && longitude
        ? searchSchoolsByLocation(latitude, longitude, 3, 15)
        : Promise.resolve({ schools: [] as SchoolResult[], totalCount: 0 }),

    // Crime indices
    fips
      ? getCrimeIndicesByFips(fips)
      : stateAbbrev
        ? getCrimeIndicesByState(stateAbbrev)
        : Promise.resolve(null as CrimeIndices | null),

    // Natural hazard risk
    latitude && longitude
      ? getHazardRiskProfile(latitude, longitude, stateAbbrev, fips)
      : Promise.resolve(null as HazardRiskProfile | null),

    // Points of interest
    latitude && longitude
      ? searchPOI(latitude, longitude, 3000, 30)
      : Promise.resolve({ pois: [] as POIResult[], totalCount: 0, categories: [] as string[] }),

    // Sales trends (MSA → state → national fallback)
    getSalesTrends({
      countyFips: fips,
      stateAbbrev,
      startYear: new Date().getFullYear() - 3,
      endYear: new Date().getFullYear(),
    }),
  ]);

  // Log results for debugging
  console.log(`[Neighborhood] Results: schools=${schoolsResult.status === "fulfilled" ? (schoolsResult.value?.schools?.length || 0) : "FAILED:" + (schoolsResult as any).reason?.message}, crime=${crimeResult.status}, hazards=${hazardResult.status}, poi=${poiResult.status === "fulfilled" ? (poiResult.value?.pois?.length || 0) : "FAILED"}, trends=${trendsResult.status}`);

  // Build community object (crime + hazards)
  const crime = crimeResult.status === "fulfilled" ? crimeResult.value : null;
  const hazards = hazardResult.status === "fulfilled" ? hazardResult.value : null;

  const community =
    crime || hazards
      ? {
          community: {
            geography: { geographyName: areaName, geographyTypeName: "Area" },
            ...(crime
              ? {
                  crime: {
                    crime_Index: crime.crimeIndex ?? undefined,
                    burglary_Index: crime.burglaryIndex ?? undefined,
                    larceny_Index: crime.larcenyIndex ?? undefined,
                    motor_Vehicle_Theft_Index: crime.motorVehicleTheftIndex ?? undefined,
                    aggravated_Assault_Index: crime.aggravatedAssaultIndex ?? undefined,
                    forcible_Robbery_Index: crime.robberyIndex ?? undefined,
                  },
                }
              : {}),
            ...(hazards
              ? {
                  naturalDisasters: {
                    earthquake: hazards.earthquake,
                    flood: hazards.flood,
                    tornado: hazards.tornado,
                    hurricane: hazards.hurricane,
                    wildfire: hazards.wildfire,
                    hail: hazards.hail,
                    wind: hazards.wind,
                    overall: hazards.overall,
                  },
                }
              : {}),
          },
        }
      : null;

  // Build schools response
  const schools =
    schoolsResult.status === "fulfilled" && schoolsResult.value.schools.length > 0
      ? {
          school: schoolsResult.value.schools.map((s) => ({
            InstitutionName: s.schoolName,
            School_Name: s.schoolName,
            schoolName: s.schoolName,
            schoolType: s.schoolType,
            gradeRange: s.gradeRange,
            Enrollment: s.enrollment,
            enrollment: s.enrollment,
            distance: s.distanceMiles,
            distanceMiles: s.distanceMiles,
            latitude: s.latitude,
            longitude: s.longitude,
            city: s.city,
            state: s.state,
            districtName: s.districtName,
          })),
        }
      : null;

  // Build POI response
  const poiData =
    poiResult.status === "fulfilled" && poiResult.value.pois.length > 0
      ? {
          poi: poiResult.value.pois.map((p) => ({
            BusinessName: p.name,
            name: p.name,
            CategoryName: p.category,
            category: p.category,
            Distance: p.distanceMiles,
            distanceMiles: p.distanceMiles,
            latitude: p.latitude,
            longitude: p.longitude,
          })),
          categories: poiResult.value.categories,
        }
      : null;

  // Build sales trends response (matching ATTOM v4 format)
  const trends =
    trendsResult.status === "fulfilled" && trendsResult.value.trends.length > 0
      ? {
          salesTrends: trendsResult.value.trends.map((t) => ({
            dateRange: { start: t.period, interval: "quarterly" },
            location: { geographyName: trendsResult.value.areaName },
            salesTrend: {
              medSalePrice: t.medianSalePrice ?? undefined,
              avgSalePrice: t.avgSalePrice ?? undefined,
              homeSaleCount: t.homeSaleCount ?? undefined,
            },
            vintage: { pubDate: new Date().toISOString().split("T")[0] },
          })),
        }
      : null;

  return { community, schools, poi: poiData, salesTrends: trends };
}
