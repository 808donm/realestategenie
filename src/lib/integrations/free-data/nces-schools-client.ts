/**
 * NCES Schools Client -- School data from NCES ArcGIS FeatureServer
 *
 * Source: https://data-nces.opendata.arcgis.com/
 * ArcGIS endpoint: School_Characteristics_Current FeatureServer
 * No API key required. Fast and reliable.
 *
 * Provides: School names, grades, enrollment, type, location, distance
 */

const ARCGIS_URL =
  "https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services/School_Characteristics_Current/FeatureServer/0/query";

const SCHOOL_FIELDS = "SCH_NAME,LCITY,LSTATE,LZIP,SCHOOL_LEVEL,SCHOOL_TYPE_TEXT,TOTAL,GSLO,GSHI,LATCOD,LONCOD,CHARTER_TEXT,LEA_NAME,LSTREET1,PHONE";

export interface SchoolResult {
  schoolName: string;
  schoolType: string;
  gradeRange: string;
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
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Map a school record from ArcGIS to our SchoolResult format
 */
function mapSchool(s: any, latitude?: number, longitude?: number): SchoolResult {
  const lo = s.GSLO || "";
  const hi = s.GSHI || "";
  const gradeRange = lo && hi ? `${lo}-${hi}` : lo || hi || "";

  let schoolType = s.SCHOOL_TYPE_TEXT || "Public";
  if (s.CHARTER_TEXT === "Yes") schoolType = "Charter";
  else if (s.SCHOOL_LEVEL === "Elementary") schoolType = "Elementary";
  else if (s.SCHOOL_LEVEL === "Middle") schoolType = "Middle";
  else if (s.SCHOOL_LEVEL === "High") schoolType = "High";

  const dist =
    latitude && longitude && s.LATCOD && s.LONCOD
      ? Math.round(haversineDistance(latitude, longitude, s.LATCOD, s.LONCOD) * 100) / 100
      : undefined;

  return {
    schoolName: s.SCH_NAME || "",
    schoolType,
    gradeRange,
    enrollment: s.TOTAL ?? undefined,
    latitude: s.LATCOD ?? undefined,
    longitude: s.LONCOD ?? undefined,
    streetAddress: s.LSTREET1 ?? undefined,
    city: s.LCITY ?? undefined,
    state: s.LSTATE ?? undefined,
    zip: s.LZIP ?? undefined,
    phone: s.PHONE ?? undefined,
    districtName: s.LEA_NAME ?? undefined,
    distanceMiles: dist,
  };
}

/**
 * Search for schools near a lat/lng coordinate using ArcGIS bounding box.
 */
export async function searchSchoolsByLocation(
  latitude: number,
  longitude: number,
  radiusMiles: number = 5,
  maxResults: number = 20,
): Promise<SchoolSearchResult> {
  try {
    const latDelta = radiusMiles / 69;
    const lonDelta = radiusMiles / (69 * Math.cos((latitude * Math.PI) / 180));

    const bbox = `${(longitude - lonDelta).toFixed(4)},${(latitude - latDelta).toFixed(4)},${(longitude + lonDelta).toFixed(4)},${(latitude + latDelta).toFixed(4)}`;

    const url = `${ARCGIS_URL}?where=1%3D1&geometry=${encodeURIComponent(bbox)}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=${SCHOOL_FIELDS}&returnGeometry=false&f=json&resultRecordCount=100`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      console.warn(`[NCES] ArcGIS returned ${response.status}`);
      return { schools: [], totalCount: 0 };
    }

    const data = await response.json();
    const features = data.features || [];

    const schools = features
      .map((f: any) => mapSchool(f.attributes, latitude, longitude))
      .filter((s: SchoolResult) => s.distanceMiles == null || s.distanceMiles <= radiusMiles)
      .sort((a: SchoolResult, b: SchoolResult) => (a.distanceMiles || 0) - (b.distanceMiles || 0))
      .slice(0, maxResults);

    console.log(`[NCES] Found ${schools.length} schools near ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
    return { schools, totalCount: schools.length };
  } catch (err) {
    console.error("[NCES] School search failed:", err);
    return { schools: [], totalCount: 0 };
  }
}

/**
 * Search schools by ZIP code
 */
export async function searchSchoolsByZip(zipCode: string, maxResults: number = 20): Promise<SchoolSearchResult> {
  try {
    const url = `${ARCGIS_URL}?where=LZIP+%3D+%27${zipCode}%27&outFields=${SCHOOL_FIELDS}&returnGeometry=false&f=json&resultRecordCount=${maxResults}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      console.warn(`[NCES] ArcGIS ZIP search returned ${response.status}`);
      return { schools: [], totalCount: 0 };
    }

    const data = await response.json();
    const features = data.features || [];

    const schools = features.map((f: any) => mapSchool(f.attributes)).slice(0, maxResults);

    console.log(`[NCES] Found ${schools.length} schools in ZIP ${zipCode}`);
    return { schools, totalCount: schools.length };
  } catch (err) {
    console.error("[NCES] School search by ZIP failed:", err);
    return { schools: [], totalCount: 0 };
  }
}
