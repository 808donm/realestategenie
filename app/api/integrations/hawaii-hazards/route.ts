import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { HawaiiHazardsClient } from "@/lib/integrations/hawaii-hazards-client";

/**
 * GET - Query Hawaii hazard/environmental zones for a property by lat/lng
 *
 * Endpoints:
 *   ?endpoint=profile&lat=21.3069&lng=-157.8583  — Full hazard profile (all layers in parallel)
 *   ?endpoint=test                                — Test endpoint connectivity
 *
 * Returns which hazard/regulatory zones the property falls within:
 *   - Tsunami evacuation zones
 *   - Sea level rise / coastal flood zones (3.2ft SLR scenario)
 *   - Lava flow hazard zones (Big Island)
 *   - DHHL (Hawaiian Home Lands) parcels
 *   - SMA (Special Management Areas) — coastal zone
 *   - State Land Use Districts
 *   - Cesspool / OSDS priority areas
 *
 * No API key required — public open data from the State of Hawaii.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get("endpoint") || "profile";
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    const client = new HawaiiHazardsClient();

    switch (endpoint) {
      case "profile": {
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

        const profile = await client.getPropertyHazardProfile(
          latitude,
          longitude
        );

        return NextResponse.json({ success: true, ...profile });
      }

      case "test": {
        const results = await client.testConnection();
        return NextResponse.json({ success: true, endpoints: results });
      }

      default:
        return NextResponse.json(
          { error: `Unknown endpoint: ${endpoint}. Use: profile, test` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error fetching Hawaii hazard data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Hawaii hazard data",
      },
      { status: 500 }
    );
  }
}
