import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { HawaiiStatewideParcelClient } from "@/lib/integrations/hawaii-statewide-parcels-client";

/**
 * GET - Query Hawaii Statewide TMK parcel data via the State ArcGIS MapServer
 *
 * Endpoints:
 *   ?endpoint=tmk&tmk=...                      — Get parcel by TMK
 *   ?endpoint=tmk&tmk=...&geometry=true         — Get parcel + polygon geometry
 *   ?endpoint=county&county=HAWAII              — Get parcels by county
 *   ?endpoint=island&island=OAHU                — Get parcels by island
 *   ?endpoint=zone&zone=1&county=HONOLULU       — Get parcels by TMK zone
 *   ?endpoint=section&zone=1&section=2          — Get parcels by zone + section
 *   ?endpoint=acreage&min=5&county=MAUI         — Find parcels by min acreage
 *   ?endpoint=point&lat=21.3069&lng=-157.8583   — Find parcel at lat/lng
 *   ?endpoint=test                              — Test endpoint connectivity
 *
 * No API key required — this is public open data from the State of Hawaii.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get("endpoint") || "tmk";
    const tmk = searchParams.get("tmk");
    const county = searchParams.get("county");
    const island = searchParams.get("island");
    const zone = searchParams.get("zone");
    const section = searchParams.get("section");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const minAcres = searchParams.get("min");
    const includeGeometry = searchParams.get("geometry") === "true";
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!, 10)
      : undefined;

    const client = new HawaiiStatewideParcelClient();

    switch (endpoint) {
      case "tmk": {
        if (!tmk) {
          return NextResponse.json(
            { error: "tmk parameter required" },
            { status: 400 }
          );
        }
        if (includeGeometry) {
          const feature = await client.getParcelWithGeometry(tmk);
          return NextResponse.json({ success: true, tmk, feature });
        }
        const parcel = await client.getParcelByTMK(tmk);
        return NextResponse.json({ success: true, tmk, parcel });
      }

      case "county": {
        if (!county) {
          return NextResponse.json(
            { error: "county parameter required (HAWAII, MAUI, KAUAI, HONOLULU)" },
            { status: 400 }
          );
        }
        const parcels = await client.getParcelsByCounty(county, {
          limit,
          offset,
        });
        return NextResponse.json({ success: true, county, parcels });
      }

      case "island": {
        if (!island) {
          return NextResponse.json(
            { error: "island parameter required" },
            { status: 400 }
          );
        }
        const parcels = await client.getParcelsByIsland(island, {
          limit,
          offset,
        });
        return NextResponse.json({ success: true, island, parcels });
      }

      case "zone": {
        if (!zone) {
          return NextResponse.json(
            { error: "zone parameter required" },
            { status: 400 }
          );
        }
        const parcels = await client.getParcelsByZone(zone, {
          limit,
          offset,
          county: county || undefined,
        });
        return NextResponse.json({ success: true, zone, county, parcels });
      }

      case "section": {
        if (!zone || !section) {
          return NextResponse.json(
            { error: "zone and section parameters required" },
            { status: 400 }
          );
        }
        const parcels = await client.getParcelsBySection(zone, section, {
          limit,
          offset,
          county: county || undefined,
        });
        return NextResponse.json({
          success: true,
          zone,
          section,
          county,
          parcels,
        });
      }

      case "acreage": {
        if (!minAcres) {
          return NextResponse.json(
            { error: "min parameter required (minimum acreage)" },
            { status: 400 }
          );
        }
        const acres = parseFloat(minAcres);
        if (isNaN(acres)) {
          return NextResponse.json(
            { error: "min must be a valid number" },
            { status: 400 }
          );
        }
        const parcels = await client.getParcelsByMinAcreage(acres, {
          limit,
          offset,
          county: county || undefined,
          island: island || undefined,
        });
        return NextResponse.json({
          success: true,
          minAcres: acres,
          county,
          island,
          parcels,
        });
      }

      case "point": {
        if (!lat || !lng) {
          return NextResponse.json(
            { error: "lat and lng parameters required" },
            { status: 400 }
          );
        }
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        if (isNaN(latitude) || isNaN(longitude)) {
          return NextResponse.json(
            { error: "lat and lng must be valid numbers" },
            { status: 400 }
          );
        }
        const parcel = await client.getParcelAtPoint(latitude, longitude);
        return NextResponse.json({
          success: true,
          lat: latitude,
          lng: longitude,
          parcel,
        });
      }

      case "test": {
        const results = await client.testConnection();
        return NextResponse.json({ success: true, endpoint: results });
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown endpoint: ${endpoint}. Use: tmk, county, island, zone, section, acreage, point, test`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error fetching Hawaii statewide parcel data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Hawaii statewide parcel data",
      },
      { status: 500 }
    );
  }
}
