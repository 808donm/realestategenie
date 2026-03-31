/**
 * Neighborhood Profile Service — Orchestrator for free data sources
 *
 * Combines: NCES Schools, FBI Crime, USGS/FEMA Hazards, OSM POI, FRED Trends
 * into a single getNeighborhoodProfile() response that matches the shape
 * the property-detail-modal UI expects.
 *
 * All data is from free public APIs — no ATTOM dependency.
 */

import { searchSchoolsByLocation, searchSchoolsByZip, type SchoolResult, type SchoolSearchResult } from "./nces-schools-client";
import { getCrimeIndicesByState, getCrimeIndicesByFips, type CrimeIndices } from "./fbi-crime-client";
import { getHazardRiskProfile, type HazardRiskProfile } from "./usgs-hazards-client";
import { searchPOI, type POIResult } from "./osm-poi-client";
import { getSalesTrends, type SalesTrendsResult } from "./fred-trends-client";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
    // Schools -- zip-based primary, use Hawaii school zone data for feeder schools
    (async (): Promise<SchoolSearchResult> => {
      let schools: SchoolResult[] = [];
      if (postalCode) {
        const zipResult = await searchSchoolsByZip(postalCode, 15);
        schools = zipResult.schools;
      }

      // For Hawaii: use the complex area mapping to ensure correct feeder schools
      if (stateAbbrev === "HI" && postalCode) {
        try {
          const { getSchoolComplexByZip } = await import("@/lib/hawaii-school-zones");
          const complexes = getSchoolComplexByZip(postalCode);
          if (complexes.length > 0) {
            // Add designated high school and middle schools if not already in results
            const designatedNames = new Set<string>();
            for (const ca of complexes) {
              designatedNames.add(ca.complex.highSchool);
              ca.complex.middleSchools.forEach((s) => designatedNames.add(s));
            }

            // Search nearby to find the designated schools with full data
            if (latitude && longitude) {
              const nearby = await searchSchoolsByLocation(latitude, longitude, 5, 30);
              for (const s of nearby.schools) {
                const isDesignated = [...designatedNames].some(
                  (name) => s.schoolName.toLowerCase().includes(name.toLowerCase().split(" ")[0]) ||
                            name.toLowerCase().includes(s.schoolName.toLowerCase().split(" ")[0]),
                );
                if (isDesignated && !schools.some((existing) => existing.schoolName === s.schoolName)) {
                  schools.push(s);
                }
              }
            }
          }
        } catch {}
      } else {
        // Non-Hawaii: use school district boundary lookup
        if (latitude && longitude) {
          try {
            // 1. Find which district the property is in via point-in-polygon
            const districtUrl = `https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services/School_Districts_Current/FeatureServer/0/query?geometry=${encodeURIComponent(`{"x":${longitude},"y":${latitude}}`)}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=NAME,GEOID,LOGRADE,HIGRADE&returnGeometry=false&f=json`;
            const districtRes = await fetch(districtUrl, { signal: AbortSignal.timeout(10000) });
            if (districtRes.ok) {
              const districtData = await districtRes.json();
              const district = districtData.features?.[0]?.attributes;
              if (district?.GEOID) {
                console.log(`[Schools] District: ${district.NAME} (${district.GEOID})`);
                // 2. Get all schools in this district
                const distSchoolUrl = `https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services/School_Characteristics_Current/FeatureServer/0/query?where=LEAID+%3D+%27${district.GEOID}%27&outFields=SCH_NAME,LCITY,LSTATE,LZIP,SCHOOL_LEVEL,SCHOOL_TYPE_TEXT,TOTAL,GSLO,GSHI,LATCOD,LONCOD,CHARTER_TEXT,LEA_NAME,LSTREET1,PHONE&returnGeometry=false&f=json&resultRecordCount=200`;
                const distSchoolRes = await fetch(distSchoolUrl, { signal: AbortSignal.timeout(10000) });
                if (distSchoolRes.ok) {
                  const distSchoolData = await distSchoolRes.json();
                  const allDistrictSchools = (distSchoolData.features || []).map((f: any) => {
                    const s = f.attributes;
                    const dist = s.LATCOD && s.LONCOD ? Math.round(haversineDistance(latitude!, longitude!, s.LATCOD, s.LONCOD) * 100) / 100 : undefined;
                    let schoolType = s.SCHOOL_TYPE_TEXT || "Public";
                    if (s.CHARTER_TEXT === "Yes") schoolType = "Charter";
                    else if (s.SCHOOL_LEVEL === "Elementary") schoolType = "Elementary";
                    else if (s.SCHOOL_LEVEL === "Middle") schoolType = "Middle";
                    else if (s.SCHOOL_LEVEL === "High") schoolType = "High";
                    return {
                      schoolName: s.SCH_NAME || "",
                      schoolType,
                      gradeRange: s.GSLO && s.GSHI ? `${s.GSLO}-${s.GSHI}` : "",
                      enrollment: s.TOTAL ?? undefined,
                      latitude: s.LATCOD,
                      longitude: s.LONCOD,
                      city: s.LCITY,
                      state: s.LSTATE,
                      zip: s.LZIP,
                      phone: s.PHONE,
                      districtName: district.NAME,
                      distanceMiles: dist,
                    } as SchoolResult;
                  });

                  // 3. Show closest schools by level: nearest 3 elementary, nearest 2 middle, nearest high
                  const elementary = allDistrictSchools
                    .filter((s: SchoolResult) => s.schoolType === "Elementary" || s.gradeRange?.match(/^(PK|KG|K|01|1)/))
                    .sort((a: SchoolResult, b: SchoolResult) => (a.distanceMiles || 99) - (b.distanceMiles || 99))
                    .slice(0, 3);
                  const middle = allDistrictSchools
                    .filter((s: SchoolResult) => s.schoolType === "Middle" || (s.gradeRange?.includes("6") && s.gradeRange?.includes("8")))
                    .sort((a: SchoolResult, b: SchoolResult) => (a.distanceMiles || 99) - (b.distanceMiles || 99))
                    .slice(0, 2);
                  const high = allDistrictSchools
                    .filter((s: SchoolResult) => s.schoolType === "High" || s.gradeRange?.includes("12"))
                    .sort((a: SchoolResult, b: SchoolResult) => (a.distanceMiles || 99) - (b.distanceMiles || 99))
                    .slice(0, 2);

                  // Merge district results with zip results, avoiding duplicates
                  const districtSchools = [...elementary, ...middle, ...high];
                  for (const ds of districtSchools) {
                    if (!schools.some((existing) => existing.schoolName === ds.schoolName)) {
                      schools.push(ds);
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.warn("[Schools] District boundary lookup failed:", err);
          }
        }
      }

      return { schools, totalCount: schools.length };
    })(),

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
                    crimeIndex: crime.crimeIndex ?? undefined,
                    violentCrimeIndex: crime.violentCrimeIndex ?? undefined,
                    propertyCrimeIndex: crime.propertyCrimeIndex ?? undefined,
                    homicideIndex: crime.homicideIndex ?? undefined,
                    burglaryIndex: crime.burglaryIndex ?? undefined,
                    larcenyIndex: crime.larcenyIndex ?? undefined,
                    motorVehicleTheftIndex: crime.motorVehicleTheftIndex ?? undefined,
                    aggravatedAssaultIndex: crime.aggravatedAssaultIndex ?? undefined,
                    robberyIndex: crime.robberyIndex ?? undefined,
                    year: crime.year ?? undefined,
                    areaName: crime.areaName ?? undefined,
                    // Legacy field names for backward compatibility
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
                    coastalFlood: hazards.coastalFlood,
                    tornado: hazards.tornado,
                    hurricane: hazards.hurricane,
                    wildfire: hazards.wildfire,
                    hail: hazards.hail,
                    wind: hazards.wind,
                    tsunami: hazards.tsunami,
                    volcanic: hazards.volcanic,
                    landslide: hazards.landslide,
                    lightning: hazards.lightning,
                    drought: hazards.drought,
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
