/**
 * Hawaii School Attendance Zone Lookup via State GIS
 *
 * Uses the official Hawaii DOE school attendance boundaries from the
 * State of Hawaii GIS (geodata.hawaii.gov) to determine exactly which
 * schools serve a given property location.
 *
 * Layers:
 *   17 - Elementary School Areas
 *   18 - Middle School Areas
 *   19 - High School Areas
 *   16 - School Complex Areas
 *
 * Point-in-polygon query returns the designated school for each level.
 */

const BASE_URL = "https://geodata.hawaii.gov/arcgis/rest/services/AdminBnd/MapServer";

const LAYERS = {
  elementary: 17,
  middle: 18,
  high: 19,
  complex: 16,
};

export interface SchoolZoneResult {
  elementary?: { name: string; gradeFrom?: string; gradeTo?: string };
  middle?: { name: string; gradeFrom?: string; gradeTo?: string };
  high?: { name: string; gradeFrom?: string; gradeTo?: string };
  complex?: { name: string };
}

/**
 * Query a single school zone layer with a point-in-polygon query.
 */
async function querySchoolZone(
  layerId: number,
  latitude: number,
  longitude: number,
): Promise<{ name?: string; gradeFrom?: string; gradeTo?: string } | null> {
  try {
    const geometry = encodeURIComponent(`{"x":${longitude},"y":${latitude}}`);
    const url = `${BASE_URL}/${layerId}/query?geometry=${geometry}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;

    const data = await response.json();
    const attrs = data.features?.[0]?.attributes;
    if (!attrs) return null;

    // Field names vary by layer:
    // Elementary: elem_desc, grade_from, grade_to
    // Middle: mid_desc, grade_from, grade_to
    // High: high_desc, grade_from, grade_to
    // Complex: complex_desc or complex_area
    const name =
      attrs.elem_desc || attrs.mid_desc || attrs.high_desc ||
      attrs.complex_desc || attrs.complex_area ||
      attrs.name || attrs.NAME || attrs.SCHOOL || null;

    if (!name) return null;

    return {
      name,
      gradeFrom: attrs.grade_from || attrs.GRADE_FROM || undefined,
      gradeTo: attrs.grade_to || attrs.GRADE_TO || undefined,
    };
  } catch (err) {
    console.warn(`[SchoolZones] Layer ${layerId} query failed:`, err);
    return null;
  }
}

/**
 * Get the designated schools for a property location in Hawaii.
 * Uses point-in-polygon queries against the official DOE attendance boundaries.
 *
 * All three queries run in parallel for speed.
 */
export async function getHawaiiSchoolZones(latitude: number, longitude: number): Promise<SchoolZoneResult> {
  const [elementary, middle, high, complex] = await Promise.all([
    querySchoolZone(LAYERS.elementary, latitude, longitude),
    querySchoolZone(LAYERS.middle, latitude, longitude),
    querySchoolZone(LAYERS.high, latitude, longitude),
    querySchoolZone(LAYERS.complex, latitude, longitude),
  ]);

  const result: SchoolZoneResult = {};
  if (elementary?.name) result.elementary = { name: elementary.name, gradeFrom: elementary.gradeFrom, gradeTo: elementary.gradeTo };
  if (middle?.name) result.middle = { name: middle.name, gradeFrom: middle.gradeFrom, gradeTo: middle.gradeTo };
  if (high?.name) result.high = { name: high.name, gradeFrom: high.gradeFrom, gradeTo: high.gradeTo };
  if (complex?.name) result.complex = { name: complex.name };

  console.log(
    `[SchoolZones] ${latitude.toFixed(4)}, ${longitude.toFixed(4)}: ` +
    `elementary=${elementary?.name || "none"}, middle=${middle?.name || "none"}, high=${high?.name || "none"}`,
  );

  return result;
}
