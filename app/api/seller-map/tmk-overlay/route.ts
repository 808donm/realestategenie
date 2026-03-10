import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createHawaiiStatewideParcelClient } from "@/lib/integrations/hawaii-statewide-parcels-client";

/**
 * GET /api/seller-map/tmk-overlay
 *
 * Returns GeoJSON FeatureCollection of Hawaii TMK parcel boundaries
 * for rendering on the Seller Opportunity Map.
 *
 * Query params:
 *   county   — HONOLULU, HAWAII, MAUI, KAUAI
 *   zone     — TMK zone
 *   section  — TMK section (optional, narrows results)
 *   limit    — max parcels (default 50, max 200)
 */
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
    const county = url.searchParams.get("county")?.toUpperCase();
    const zone = url.searchParams.get("zone");
    const section = url.searchParams.get("section");
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);

    if (!county || !zone) {
      return NextResponse.json(
        { error: "county and zone are required" },
        { status: 400 }
      );
    }

    const client = createHawaiiStatewideParcelClient();

    let features;
    if (section) {
      // Query parcels in a specific section with geometry
      const parcelsUrl = new URL(
        `${process.env.HAWAII_STATEWIDE_PARCELS_URL || "https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer/25"}/query`
      );
      parcelsUrl.searchParams.set(
        "where",
        `UPPER(county)='${county}' AND zone='${zone}' AND section='${section}'`
      );
      parcelsUrl.searchParams.set("outFields", "tmk,tmk_txt,county,zone,section,plat,parcel,gisacres");
      parcelsUrl.searchParams.set("returnGeometry", "true");
      parcelsUrl.searchParams.set("outSR", "4326");
      parcelsUrl.searchParams.set("resultRecordCount", String(limit));
      parcelsUrl.searchParams.set("f", "geojson");

      const response = await fetch(parcelsUrl.toString());
      if (!response.ok) {
        throw new Error(`ArcGIS query failed: ${response.status}`);
      }
      const geojson = await response.json();
      return NextResponse.json(geojson);
    } else {
      // Query parcels in a zone with geometry — use GeoJSON output directly
      const parcelsUrl = new URL(
        `${process.env.HAWAII_STATEWIDE_PARCELS_URL || "https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer/25"}/query`
      );
      parcelsUrl.searchParams.set(
        "where",
        `UPPER(county)='${county}' AND zone='${zone}'`
      );
      parcelsUrl.searchParams.set("outFields", "tmk,tmk_txt,county,zone,section,plat,parcel,gisacres");
      parcelsUrl.searchParams.set("returnGeometry", "true");
      parcelsUrl.searchParams.set("outSR", "4326");
      parcelsUrl.searchParams.set("resultRecordCount", String(limit));
      parcelsUrl.searchParams.set("f", "geojson");

      const response = await fetch(parcelsUrl.toString());
      if (!response.ok) {
        throw new Error(`ArcGIS query failed: ${response.status}`);
      }
      const geojson = await response.json();
      return NextResponse.json(geojson);
    }
  } catch (error: any) {
    console.error("[TMKOverlay] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch TMK overlay data" },
      { status: 500 }
    );
  }
}
