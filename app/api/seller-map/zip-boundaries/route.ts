import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/seller-map/zip-boundaries
 *
 * Returns GeoJSON FeatureCollection of ZIP Code Tabulation Area (ZCTA)
 * boundaries from the US Census Bureau TIGERweb ArcGIS service.
 *
 * Query params:
 *   swLat, swLng, neLat, neLng — bounding box of the current map viewport
 *   state — FIPS state code (default "15" for Hawaii)
 */

const TIGERWEB_ZCTA_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/2/query";

// In-memory cache: we cache per state since Hawaii ZCTAs are small and stable
const cache = new Map<string, { data: GeoJSON.FeatureCollection; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl;
    const stateFips = url.searchParams.get("state") || "15"; // Hawaii = 15

    // Check cache
    const cached = cache.get(stateFips);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json(cached.data, {
        headers: { "Cache-Control": "public, max-age=86400" },
      });
    }

    // Query Census TIGERweb for all ZCTAs in the state
    // Use a spatial envelope covering Hawaii (or the specified state)
    const queryUrl = new URL(TIGERWEB_ZCTA_URL);
    queryUrl.searchParams.set("where", `STATE='${stateFips}'`);
    queryUrl.searchParams.set("outFields", "ZCTA5,BASENAME,AREALAND");
    queryUrl.searchParams.set("returnGeometry", "true");
    queryUrl.searchParams.set("outSR", "4326");
    queryUrl.searchParams.set("resultRecordCount", "500");
    queryUrl.searchParams.set("f", "geojson");

    const response = await fetch(queryUrl.toString());
    if (!response.ok) {
      // Fallback: try the geometry envelope approach if WHERE on STATE fails
      const fallbackUrl = new URL(TIGERWEB_ZCTA_URL);
      // Hawaii bounding box
      const envelope = stateFips === "15" ? "-160.3,18.9,-154.8,22.3" : "-160.3,18.9,-154.8,22.3";
      fallbackUrl.searchParams.set(
        "geometry",
        JSON.stringify({
          xmin: -160.3,
          ymin: 18.9,
          xmax: -154.8,
          ymax: 22.3,
          spatialReference: { wkid: 4326 },
        }),
      );
      fallbackUrl.searchParams.set("geometryType", "esriGeometryEnvelope");
      fallbackUrl.searchParams.set("spatialRel", "esriSpatialRelIntersects");
      fallbackUrl.searchParams.set("outFields", "ZCTA5,BASENAME,AREALAND");
      fallbackUrl.searchParams.set("returnGeometry", "true");
      fallbackUrl.searchParams.set("outSR", "4326");
      fallbackUrl.searchParams.set("resultRecordCount", "500");
      fallbackUrl.searchParams.set("f", "geojson");

      const fallbackRes = await fetch(fallbackUrl.toString());
      if (!fallbackRes.ok) {
        throw new Error(`Census TIGERweb query failed: ${fallbackRes.status}`);
      }
      const geojson = await fallbackRes.json();
      if (geojson.features?.length) {
        cache.set(stateFips, { data: geojson, ts: Date.now() });
      }
      return NextResponse.json(geojson, {
        headers: { "Cache-Control": "public, max-age=86400" },
      });
    }

    const geojson = await response.json();

    // If the STATE filter didn't work (some layers don't have STATE field),
    // fall back to spatial query
    if (!geojson.features?.length) {
      const spatialUrl = new URL(TIGERWEB_ZCTA_URL);
      spatialUrl.searchParams.set(
        "geometry",
        JSON.stringify({
          xmin: -160.3,
          ymin: 18.9,
          xmax: -154.8,
          ymax: 22.3,
          spatialReference: { wkid: 4326 },
        }),
      );
      spatialUrl.searchParams.set("geometryType", "esriGeometryEnvelope");
      spatialUrl.searchParams.set("spatialRel", "esriSpatialRelIntersects");
      spatialUrl.searchParams.set("outFields", "ZCTA5,BASENAME,AREALAND");
      spatialUrl.searchParams.set("returnGeometry", "true");
      spatialUrl.searchParams.set("outSR", "4326");
      spatialUrl.searchParams.set("resultRecordCount", "500");
      spatialUrl.searchParams.set("f", "geojson");

      const spatialRes = await fetch(spatialUrl.toString());
      if (!spatialRes.ok) {
        throw new Error(`Census TIGERweb spatial query failed: ${spatialRes.status}`);
      }
      const spatialGeojson = await spatialRes.json();
      if (spatialGeojson.features?.length) {
        cache.set(stateFips, { data: spatialGeojson, ts: Date.now() });
      }
      return NextResponse.json(spatialGeojson, {
        headers: { "Cache-Control": "public, max-age=86400" },
      });
    }

    cache.set(stateFips, { data: geojson, ts: Date.now() });
    return NextResponse.json(geojson, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch (error: any) {
    console.error("[ZipBoundaries] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch zip code boundaries" }, { status: 500 });
  }
}
