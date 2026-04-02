/**
 * Hawaii GIS Property Enrichment
 *
 * Point-in-polygon queries against Hawaii State GIS to determine
 * what zones/areas a property falls within. Used to enrich property
 * detail views with authoritative state data.
 *
 * All queries run in parallel for speed.
 */

const HAZARDS_URL = "https://geodata.hawaii.gov/arcgis/rest/services/Hazards/MapServer";
const ADMIN_URL = "https://geodata.hawaii.gov/arcgis/rest/services/AdminBnd/MapServer";
const BUSINESS_URL = "https://geodata.hawaii.gov/arcgis/rest/services/BusinessEconomy/MapServer";
const EMERGENCY_URL = "https://geodata.hawaii.gov/arcgis/rest/services/EmergMgmtPubSafety/MapServer";

export interface GISPropertyEnrichment {
  // Hazard zones
  floodZone?: { zone: string; subtype?: string; isSpecialFloodHazard?: boolean };
  tsunamiZone?: { zone: string };
  lavaFlowZone?: { zone: string; hazardLevel?: string };
  fireRiskArea?: { risk: string };
  seaLevelRise?: { inZone: boolean; scenario?: string };

  // School attendance zones
  elementarySchool?: { name: string; gradeFrom?: string; gradeTo?: string };
  middleSchool?: { name: string; gradeFrom?: string; gradeTo?: string };
  highSchool?: { name: string; gradeFrom?: string; gradeTo?: string };

  // Economy
  opportunityZone?: { name: string; tract?: string };
  enterpriseZone?: { name: string };

  // Emergency services
  fireResponseZone?: { zone: string };
}

/**
 * Query a single GIS layer with a point-in-polygon query.
 */
async function queryPoint(baseUrl: string, layerId: number, lat: number, lng: number, outFields: string = "*"): Promise<any | null> {
  try {
    const geometry = encodeURIComponent(`{"x":${lng},"y":${lat}}`);
    const url = `${baseUrl}/${layerId}/query?geometry=${geometry}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=${outFields}&returnGeometry=false&f=json`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const data = await response.json();
    return data.features?.[0]?.attributes || null;
  } catch {
    return null;
  }
}

/**
 * Enrich a property with Hawaii GIS data.
 * All queries run in parallel.
 */
export async function enrichPropertyWithGIS(latitude: number, longitude: number): Promise<GISPropertyEnrichment> {
  const result: GISPropertyEnrichment = {};

  const [
    floodData,
    tsunamiData,
    lavaData,
    fireData,
    slrData,
    elemSchool,
    midSchool,
    highSchool,
    oppZone,
    entZone,
    fireZone,
  ] = await Promise.allSettled([
    // DFIRM Flood Zone (State layer 6)
    queryPoint(HAZARDS_URL, 6, latitude, longitude, "FLD_ZONE,ZONE_SUBTY,SFHA_TF"),
    // Tsunami Evacuation (layer 2)
    queryPoint(HAZARDS_URL, 2, latitude, longitude, "evaczone,island"),
    // Lava Flow (layer 3)
    queryPoint(HAZARDS_URL, 3, latitude, longitude, "hazard,zone"),
    // Fire Risk (layer 7)
    queryPoint(HAZARDS_URL, 7, latitude, longitude, "*"),
    // Sea Level Rise 3.2ft (layer 15)
    queryPoint(HAZARDS_URL, 15, latitude, longitude, "*"),
    // Elementary School Zone (layer 17)
    queryPoint(ADMIN_URL, 17, latitude, longitude, "elem_desc,grade_from,grade_to"),
    // Middle School Zone (layer 18)
    queryPoint(ADMIN_URL, 18, latitude, longitude, "mid_desc,grade_from,grade_to"),
    // High School Zone (layer 19)
    queryPoint(ADMIN_URL, 19, latitude, longitude, "high_desc,grade_from,grade_to"),
    // Opportunity Zone (layer 6)
    queryPoint(BUSINESS_URL, 6, latitude, longitude, "*"),
    // Enterprise Zone (layer 4)
    queryPoint(BUSINESS_URL, 4, latitude, longitude, "*"),
    // Fire Response Zone (layer 6)
    queryPoint(EMERGENCY_URL, 6, latitude, longitude, "*"),
  ]);

  // Map results
  if (floodData.status === "fulfilled" && floodData.value) {
    const d = floodData.value;
    result.floodZone = {
      zone: d.FLD_ZONE || d.fld_zone || "Unknown",
      subtype: d.ZONE_SUBTY || d.zone_subty,
      isSpecialFloodHazard: d.SFHA_TF === "T" || d.sfha_tf === "T",
    };
  }

  if (tsunamiData.status === "fulfilled" && tsunamiData.value) {
    const d = tsunamiData.value;
    result.tsunamiZone = { zone: d.evaczone || d.EVACZONE || "Yes" };
  }

  if (lavaData.status === "fulfilled" && lavaData.value) {
    const d = lavaData.value;
    result.lavaFlowZone = {
      zone: d.hazard || d.zone || "In zone",
      hazardLevel: d.hazard || d.zone,
    };
  }

  if (fireData.status === "fulfilled" && fireData.value) {
    result.fireRiskArea = { risk: "In fire risk area" };
  }

  if (slrData.status === "fulfilled" && slrData.value) {
    result.seaLevelRise = { inZone: true, scenario: "3.2ft" };
  }

  if (elemSchool.status === "fulfilled" && elemSchool.value) {
    const d = elemSchool.value;
    result.elementarySchool = {
      name: d.elem_desc || d.ELEM_DESC,
      gradeFrom: d.grade_from || d.GRADE_FROM,
      gradeTo: d.grade_to || d.GRADE_TO,
    };
  }

  if (midSchool.status === "fulfilled" && midSchool.value) {
    const d = midSchool.value;
    result.middleSchool = {
      name: d.mid_desc || d.MID_DESC,
      gradeFrom: d.grade_from || d.GRADE_FROM,
      gradeTo: d.grade_to || d.GRADE_TO,
    };
  }

  if (highSchool.status === "fulfilled" && highSchool.value) {
    const d = highSchool.value;
    result.highSchool = {
      name: d.high_desc || d.HIGH_DESC,
      gradeFrom: d.grade_from || d.GRADE_FROM,
      gradeTo: d.grade_to || d.GRADE_TO,
    };
  }

  if (oppZone.status === "fulfilled" && oppZone.value) {
    result.opportunityZone = { name: "Opportunity Zone", tract: oppZone.value.TRACT || oppZone.value.tract };
  }

  if (entZone.status === "fulfilled" && entZone.value) {
    result.enterpriseZone = { name: entZone.value.name || entZone.value.NAME || "Enterprise Zone" };
  }

  if (fireZone.status === "fulfilled" && fireZone.value) {
    result.fireResponseZone = { zone: fireZone.value.zone || fireZone.value.ZONE || "Covered" };
  }

  const enrichedFields = Object.keys(result).length;
  console.log(`[GIS Enrichment] ${latitude.toFixed(4)}, ${longitude.toFixed(4)}: ${enrichedFields} fields enriched`);

  return result;
}
