/**
 * NCES Schools Client — Free school data from Education Data API
 *
 * Source: Urban Institute Education Data Portal (https://educationdata.urban.org/)
 * No API key required. Rate-limited but generous.
 *
 * Provides: School names, grades, enrollment, type, location, distance
 */

const BASE_URL = "https://educationdata.urban.org/api/v1";

export interface SchoolResult {
  schoolName: string;
  schoolType: string; // "Public", "Private", "Charter"
  gradeRange: string; // e.g. "K-5", "6-8", "9-12"
  enrollment?: number;
  latitude?: number;
  longitude?: number;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  districtName?: string;
  distanceMiles?: number;
  ncesschid?: string;
}

export interface SchoolSearchResult {
  schools: SchoolResult[];
  totalCount: number;
}

/**
 * Calculate distance between two lat/lng points in miles (Haversine formula)
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Map NCES grade levels to human-readable range
 */
function gradeRangeLabel(loGrade: string | number | null, hiGrade: string | number | null): string {
  const map: Record<string, string> = {
    "-1": "PK",
    "0": "K",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    "10": "10",
    "11": "11",
    "12": "12",
    "13": "UG",
  };
  const lo = map[String(loGrade)] || String(loGrade ?? "");
  const hi = map[String(hiGrade)] || String(hiGrade ?? "");
  if (!lo && !hi) return "";
  if (lo === hi) return lo;
  return `${lo}-${hi}`;
}

/**
 * Map NCES school level codes
 */
function schoolTypeLabel(level: number | null, charterStatus: number | null): string {
  if (charterStatus === 1) return "Charter";
  switch (level) {
    case 1:
      return "Primary";
    case 2:
      return "Middle";
    case 3:
      return "High";
    case 4:
      return "Other";
    default:
      return "Public";
  }
}

/**
 * Search for schools near a lat/lng coordinate.
 * Uses the NCES CCD (Common Core of Data) directory.
 */
export async function searchSchoolsByLocation(
  latitude: number,
  longitude: number,
  radiusMiles: number = 5,
  maxResults: number = 20,
): Promise<SchoolSearchResult> {
  try {
    // NCES API doesn't support radius search directly, so we query by state/zip
    // and filter by distance. Use a bounding box approach.
    const latDelta = radiusMiles / 69; // ~69 miles per degree latitude
    const lonDelta = radiusMiles / (69 * Math.cos((latitude * Math.PI) / 180));

    // Use the most recent year available (2022-2023 school year)
    const year = 2022;
    const url = `${BASE_URL}/schools/ccd/directory/${year}/?latitude__gte=${(latitude - latDelta).toFixed(4)}&latitude__lte=${(latitude + latDelta).toFixed(4)}&longitude__gte=${(longitude - lonDelta).toFixed(4)}&longitude__lte=${(longitude + lonDelta).toFixed(4)}&per_page=100`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[NCES] API returned ${response.status}: ${response.statusText}`);
      return { schools: [], totalCount: 0 };
    }

    const data = await response.json();
    const results = data.results || [];

    const schools: SchoolResult[] = results
      .map((s: any) => {
        const dist = haversineDistance(latitude, longitude, s.latitude, s.longitude);
        return {
          schoolName: s.school_name || "",
          schoolType: schoolTypeLabel(s.school_level, s.charter),
          gradeRange: gradeRangeLabel(s.gslo, s.gshi),
          enrollment: s.enrollment ?? undefined,
          latitude: s.latitude,
          longitude: s.longitude,
          streetAddress: s.street_location || undefined,
          city: s.city_location || undefined,
          state: s.state_location || undefined,
          zip: s.zip_location || undefined,
          phone: s.phone || undefined,
          districtName: s.lea_name || undefined,
          distanceMiles: Math.round(dist * 100) / 100,
          ncesschid: s.ncessch || undefined,
        };
      })
      .filter((s: SchoolResult) => s.distanceMiles! <= radiusMiles)
      .sort((a: SchoolResult, b: SchoolResult) => (a.distanceMiles || 0) - (b.distanceMiles || 0))
      .slice(0, maxResults);

    return { schools, totalCount: schools.length };
  } catch (err) {
    console.error("[NCES] School search failed:", err);
    return { schools: [], totalCount: 0 };
  }
}

/**
 * Search schools by ZIP code (simpler — no lat/lng needed)
 */
export async function searchSchoolsByZip(zipCode: string, maxResults: number = 20): Promise<SchoolSearchResult> {
  try {
    const year = 2022;
    const url = `${BASE_URL}/schools/ccd/directory/${year}/?zip_location=${zipCode}&per_page=100`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return { schools: [], totalCount: 0 };
    }

    const data = await response.json();
    const results = data.results || [];

    const schools: SchoolResult[] = results
      .map((s: any) => ({
        schoolName: s.school_name || "",
        schoolType: schoolTypeLabel(s.school_level, s.charter),
        gradeRange: gradeRangeLabel(s.gslo, s.gshi),
        enrollment: s.enrollment ?? undefined,
        latitude: s.latitude,
        longitude: s.longitude,
        streetAddress: s.street_location || undefined,
        city: s.city_location || undefined,
        state: s.state_location || undefined,
        zip: s.zip_location || undefined,
        phone: s.phone || undefined,
        districtName: s.lea_name || undefined,
        ncesschid: s.ncessch || undefined,
      }))
      .slice(0, maxResults);

    return { schools, totalCount: schools.length };
  } catch (err) {
    console.error("[NCES] School search by ZIP failed:", err);
    return { schools: [], totalCount: 0 };
  }
}
