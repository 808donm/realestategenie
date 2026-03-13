import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createHawaiiStatewideParcelClient } from "@/lib/integrations/hawaii-statewide-parcels-client";

/**
 * GET /api/seller-map/tmk-overlay
 *
 * Returns GeoJSON FeatureCollection of Hawaii TMK parcel boundaries
 * for rendering on the Seller Opportunity Map.
 *
 * Query params (zone-based search):
 *   county   — HONOLULU, HAWAII, MAUI, KAUAI
 *   zone     — TMK zone
 *   section  — TMK section (optional, narrows results)
 *   limit    — max parcels (default 50, max 200)
 *
 * Query params (direct TMK lookup):
 *   tmk      — Full or partial TMK number (e.g. 1-2-3-004-005)
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
    const tmk = url.searchParams.get("tmk");
    const county = url.searchParams.get("county")?.toUpperCase();
    const zone = url.searchParams.get("zone");
    const section = url.searchParams.get("section");
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);

    const baseUrl =
      process.env.HAWAII_STATEWIDE_PARCELS_URL ||
      "https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer/25";

    // ── Direct TMK lookup ──
    if (tmk) {
      const cleanTmk = tmk.replace(/[-\s.:()]/g, "");
      const whereClause =
        cleanTmk.length >= 9
          ? `tmk='${cleanTmk}' OR cty_tmk='${cleanTmk}'`
          : `tmk LIKE '%${cleanTmk}%' OR cty_tmk LIKE '%${cleanTmk}%'`;

      const parcelsUrl = new URL(`${baseUrl}/query`);
      parcelsUrl.searchParams.set("where", whereClause);
      parcelsUrl.searchParams.set(
        "outFields",
        "tmk,tmk_txt,county,zone,section,plat,parcel,gisacres"
      );
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

    // ── Zone-based search ──
    if (!county || !zone) {
      return NextResponse.json(
        { error: "county and zone are required (or provide tmk)" },
        { status: 400 }
      );
    }

    const whereClause = section
      ? `UPPER(county)='${county}' AND zone='${zone}' AND section='${section}'`
      : `UPPER(county)='${county}' AND zone='${zone}'`;

    const parcelsUrl = new URL(`${baseUrl}/query`);
    parcelsUrl.searchParams.set("where", whereClause);
    parcelsUrl.searchParams.set(
      "outFields",
      "tmk,tmk_txt,county,zone,section,plat,parcel,gisacres"
    );
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
  } catch (error: any) {
    console.error("[TMKOverlay] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch TMK overlay data" },
      { status: 500 }
    );
  }
}
