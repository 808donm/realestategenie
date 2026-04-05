import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// GIS MapServer base URLs (Hawaii State + National FEMA)
const GIS_SERVICES: Record<string, string> = {
  hazards: "https://geodata.hawaii.gov/arcgis/rest/services/Hazards/MapServer",
  parcels: "https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer",
  admin: "https://geodata.hawaii.gov/arcgis/rest/services/AdminBnd/MapServer",
  climate: "https://geodata.hawaii.gov/arcgis/rest/services/Climate/MapServer",
  coastal: "https://geodata.hawaii.gov/arcgis/rest/services/CoastalMarine/MapServer",
  business: "https://geodata.hawaii.gov/arcgis/rest/services/BusinessEconomy/MapServer",
  infrastructure: "https://geodata.hawaii.gov/arcgis/rest/services/Infrastructure/MapServer",
  emergency: "https://geodata.hawaii.gov/arcgis/rest/services/EmergMgmtPubSafety/MapServer",
  // National (all 50 states)
  "fema-nfhl": "https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer",
};

// Pre-defined overlay configurations for the seller map
const OVERLAY_CONFIGS: Record<string, { service: string; layerId: number; outFields: string; label: string }> = {
  // Hazards
  "flood-zones": {
    service: "hazards",
    layerId: 6,
    outFields: "FLD_ZONE,ZONE_SUBTY,SFHA_TF",
    label: "FEMA Flood Zones (DFIRM)",
  },
  "flood-zones-oahu": {
    service: "hazards",
    layerId: 5,
    outFields: "FLD_ZONE,ZONE_SUBTY,SFHA_TF",
    label: "Oahu Flood Zones",
  },
  "tsunami-zones": {
    service: "hazards",
    layerId: 2,
    outFields: "evaczone,island",
    label: "Tsunami Evacuation Zones",
  },
  "tsunami-all": { service: "hazards", layerId: 11, outFields: "evaczone,island", label: "All Tsunami Zones" },
  "lava-flow": { service: "hazards", layerId: 3, outFields: "hazard,zone", label: "Lava Flow Hazard Zones" },
  "fire-risk": { service: "hazards", layerId: 7, outFields: "*", label: "Fire Risk Areas" },
  "slr-32ft": { service: "hazards", layerId: 15, outFields: "*", label: "Sea Level Rise 3.2ft Flood Zone" },
  // Schools
  "school-elementary": {
    service: "admin",
    layerId: 17,
    outFields: "elem_desc,grade_from,grade_to",
    label: "Elementary School Zones",
  },
  "school-middle": {
    service: "admin",
    layerId: 18,
    outFields: "mid_desc,grade_from,grade_to",
    label: "Middle School Zones",
  },
  "school-high": {
    service: "admin",
    layerId: 19,
    outFields: "high_desc,grade_from,grade_to",
    label: "High School Zones",
  },
  "school-complex": {
    service: "admin",
    layerId: 16,
    outFields: "complex_area,complex_desc",
    label: "School Complex Areas",
  },
  // Economy
  "opportunity-zones": { service: "business", layerId: 6, outFields: "*", label: "Opportunity Zones" },
  "enterprise-zones": { service: "business", layerId: 4, outFields: "*", label: "Enterprise Zones" },
  // Infrastructure
  hospitals: { service: "infrastructure", layerId: 5, outFields: "*", label: "Hospitals" },
  "fire-stations": { service: "emergency", layerId: 7, outFields: "*", label: "Fire Stations" },
  "police-stations": { service: "emergency", layerId: 5, outFields: "*", label: "Police Stations" },
  parks: { service: "infrastructure", layerId: 30, outFields: "*", label: "Parks" },
  // TMK
  "tmk-zones": { service: "parcels", layerId: 27, outFields: "county,zone", label: "TMK Zones" },
  "tmk-sections": { service: "parcels", layerId: 28, outFields: "county,zone,section", label: "TMK Sections" },
  "tmk-plats": { service: "parcels", layerId: 26, outFields: "county,zone,section,plat", label: "TMK Plats" },
  // Climate
  "slr-exposure-05": { service: "climate", layerId: 42, outFields: "*", label: "SLR Exposure 0.5ft" },
  "slr-exposure-11": { service: "climate", layerId: 43, outFields: "*", label: "SLR Exposure 1.1ft" },
  "slr-exposure-20": { service: "climate", layerId: 44, outFields: "*", label: "SLR Exposure 2.0ft" },
  "slr-exposure-32": { service: "climate", layerId: 45, outFields: "*", label: "SLR Exposure 3.2ft" },
  // National FEMA layers (all 50 states)
  "fema-nfhl": {
    service: "fema-nfhl",
    layerId: 28,
    outFields: "FLD_ZONE,ZONE_SUBTY,SFHA_TF,DFIRM_ID",
    label: "FEMA National Flood Hazard Layer",
  },
};

/**
 * GET /api/seller-map/gis-overlay
 *
 * Query params:
 *   overlay  -- Overlay key (e.g. "flood-zones", "tsunami-zones")
 *   bbox     -- Bounding box: minLng,minLat,maxLng,maxLat
 *   where    -- Optional additional WHERE clause
 *   limit    -- Max features (default 200, max 1000)
 *
 * Or custom query:
 *   service  -- GIS service key (hazards, admin, etc.)
 *   layer    -- Layer ID
 *   bbox     -- Bounding box
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = request.nextUrl;
    const overlay = url.searchParams.get("overlay");
    const service = url.searchParams.get("service");
    const layer = url.searchParams.get("layer");
    const bbox = url.searchParams.get("bbox");
    const where = url.searchParams.get("where") || "1=1";
    const limit = Math.min(Number(url.searchParams.get("limit") || 200), 1000);

    let baseUrl: string;
    let layerId: number;
    let outFields: string;

    if (overlay && OVERLAY_CONFIGS[overlay]) {
      const config = OVERLAY_CONFIGS[overlay];
      baseUrl = GIS_SERVICES[config.service];
      layerId = config.layerId;
      outFields = config.outFields;
    } else if (service && layer) {
      baseUrl = GIS_SERVICES[service];
      if (!baseUrl) return NextResponse.json({ error: `Unknown service: ${service}` }, { status: 400 });
      layerId = Number(layer);
      outFields = url.searchParams.get("outFields") || "*";
    } else {
      // Return available overlays
      return NextResponse.json({
        overlays: Object.entries(OVERLAY_CONFIGS).map(([key, config]) => ({
          key,
          label: config.label,
          service: config.service,
          layerId: config.layerId,
        })),
      });
    }

    const queryUrl = new URL(`${baseUrl}/${layerId}/query`);
    queryUrl.searchParams.set("where", where);
    queryUrl.searchParams.set("outFields", outFields);
    queryUrl.searchParams.set("returnGeometry", "true");
    queryUrl.searchParams.set("outSR", "4326");
    queryUrl.searchParams.set("resultRecordCount", String(limit));
    queryUrl.searchParams.set("f", "geojson");

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
      if (!isNaN(minLng) && !isNaN(minLat) && !isNaN(maxLng) && !isNaN(maxLat)) {
        queryUrl.searchParams.set("geometry", `${minLng},${minLat},${maxLng},${maxLat}`);
        queryUrl.searchParams.set("geometryType", "esriGeometryEnvelope");
        queryUrl.searchParams.set("inSR", "4326");
        queryUrl.searchParams.set("spatialRel", "esriSpatialRelIntersects");
      }
    }

    console.log(`[GIS] Querying ${overlay || service}/${layerId}: ${where}`);
    const response = await fetch(queryUrl.toString(), { signal: AbortSignal.timeout(15000) });

    if (!response.ok) {
      throw new Error(`ArcGIS query failed: ${response.status}`);
    }

    const geojson = await response.json();
    geojson._overlay = overlay || `${service}/${layer}`;

    return NextResponse.json(geojson);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "GIS query failed";
    console.error("[GIS] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
