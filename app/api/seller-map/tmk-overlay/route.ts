import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const BASE_URL = "https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer";

// TMK layer IDs on Hawaii State GIS
const LAYERS = {
  parcels: 25,     // Individual parcel boundaries (Statewide TMKs)
  plats: 26,       // TMK Plat boundaries
  zones: 27,       // TMK Zone boundaries
  sections: 28,    // TMK Section boundaries
} as const;

/**
 * GET /api/seller-map/tmk-overlay
 *
 * Returns GeoJSON FeatureCollection of Hawaii TMK boundaries.
 *
 * Query params:
 *   layer    -- "parcels" | "plats" | "zones" | "sections" (default: parcels)
 *   tmk      -- Full or partial TMK (e.g. 1-3-1-042-026)
 *   county   -- HONOLULU | HAWAII | MAUI | KAUAI
 *   zone     -- TMK zone number
 *   section  -- TMK section number (optional)
 *   plat     -- TMK plat number (optional)
 *   limit    -- max features (default 100, max 500)
 *   bbox     -- Bounding box: minLng,minLat,maxLng,maxLat (for viewport queries)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = request.nextUrl;
    const layer = (url.searchParams.get("layer") || "parcels") as keyof typeof LAYERS;
    const tmk = url.searchParams.get("tmk");
    const county = url.searchParams.get("county")?.toUpperCase();
    const zone = url.searchParams.get("zone");
    const section = url.searchParams.get("section");
    const plat = url.searchParams.get("plat");
    const bbox = url.searchParams.get("bbox");
    const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);

    const layerId = LAYERS[layer] || LAYERS.parcels;

    // Build the where clause based on provided parameters
    let whereClause = "1=1";
    const conditions: string[] = [];

    if (tmk) {
      const cleanTmk = tmk.replace(/[-\s.:()]/g, "");
      if (cleanTmk.length >= 9) {
        conditions.push(`(tmk='${cleanTmk}' OR cty_tmk='${cleanTmk}')`);
      } else {
        conditions.push(`(tmk LIKE '%${cleanTmk}%' OR cty_tmk LIKE '%${cleanTmk}%')`);
      }
    }

    if (county) conditions.push(`UPPER(county)='${county}'`);
    if (zone) conditions.push(`zone='${zone}'`);
    if (section) conditions.push(`section='${section}'`);
    if (plat && layerId !== LAYERS.zones && layerId !== LAYERS.sections) {
      conditions.push(`plat='${plat}'`);
    }

    if (conditions.length > 0) {
      whereClause = conditions.join(" AND ");
    }

    // Build outFields based on layer type
    let outFields = "objectid";
    switch (layerId) {
      case LAYERS.parcels:
        outFields = "tmk,tmk_txt,county,zone,section,plat,parcel,gisacres";
        break;
      case LAYERS.plats:
        outFields = "county,island,zone,section,plat";
        break;
      case LAYERS.sections:
        outFields = "county,zone,section";
        break;
      case LAYERS.zones:
        outFields = "county,zone";
        break;
    }

    const queryUrl = new URL(`${BASE_URL}/${layerId}/query`);
    queryUrl.searchParams.set("where", whereClause);
    queryUrl.searchParams.set("outFields", outFields);
    queryUrl.searchParams.set("returnGeometry", "true");
    queryUrl.searchParams.set("outSR", "4326");
    queryUrl.searchParams.set("resultRecordCount", String(limit));
    queryUrl.searchParams.set("f", "geojson");

    // Add bounding box filter for viewport queries
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
      if (!isNaN(minLng) && !isNaN(minLat) && !isNaN(maxLng) && !isNaN(maxLat)) {
        queryUrl.searchParams.set("geometry", `${minLng},${minLat},${maxLng},${maxLat}`);
        queryUrl.searchParams.set("geometryType", "esriGeometryEnvelope");
        queryUrl.searchParams.set("inSR", "4326");
        queryUrl.searchParams.set("spatialRel", "esriSpatialRelIntersects");
      }
    }

    console.log(`[TMK] Querying layer ${layer}(${layerId}): ${whereClause}`);
    const response = await fetch(queryUrl.toString(), { signal: AbortSignal.timeout(15000) });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[TMK] ArcGIS error ${response.status}: ${errorText.slice(0, 200)}`);
      throw new Error(`ArcGIS query failed: ${response.status}`);
    }

    const geojson = await response.json();

    // Add layer metadata to the response
    geojson._layer = layer;
    geojson._query = whereClause;

    console.log(`[TMK] Returned ${geojson.features?.length || 0} features for ${layer}`);
    return NextResponse.json(geojson);
  } catch (error: any) {
    console.error("[TMK] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch TMK overlay data" }, { status: 500 });
  }
}
