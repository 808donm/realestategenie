import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/area-cache
 *
 * Read pre-cached area data (neighborhood, federal, market_stats) for a zip code.
 * Returns cached data if available and fresh (< 45 days old), otherwise returns null.
 *
 * Query params:
 *   zipCode   — zip code (required)
 *   dataType  — "neighborhood" | "federal" | "market_stats" (required)
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
    const zipCode = url.searchParams.get("zipCode");
    const dataType = url.searchParams.get("dataType");

    if (!zipCode || !dataType) {
      return NextResponse.json(
        { error: "zipCode and dataType are required" },
        { status: 400 }
      );
    }

    if (!["neighborhood", "federal", "market_stats"].includes(dataType)) {
      return NextResponse.json(
        { error: "dataType must be neighborhood, federal, or market_stats" },
        { status: 400 }
      );
    }

    // Look up cached data — consider stale after 45 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 45);

    const { data: cached, error } = await supabase
      .from("area_data_cache")
      .select("data, fetched_at")
      .eq("zip_code", zipCode)
      .eq("data_type", dataType)
      .gte("fetched_at", cutoff.toISOString())
      .maybeSingle();

    if (error) {
      console.error("[AreaCache] Query error:", error.message);
      return NextResponse.json({ cached: false });
    }

    if (cached?.data) {
      return NextResponse.json({
        cached: true,
        data: cached.data,
        fetchedAt: cached.fetched_at,
      });
    }

    return NextResponse.json({ cached: false });
  } catch (error: any) {
    console.error("[AreaCache] Error:", error);
    return NextResponse.json({ cached: false });
  }
}

/**
 * POST /api/area-cache
 *
 * Save area data to cache. Used by client-side fetches to cache live API
 * results so the next agent searching the same zip gets instant data.
 *
 * Body: { zipCode, dataType, data }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { zipCode, dataType, data } = body;

    if (!zipCode || !dataType || !data) {
      return NextResponse.json({ error: "zipCode, dataType, and data are required" }, { status: 400 });
    }

    if (!["neighborhood", "federal", "market_stats"].includes(dataType)) {
      return NextResponse.json({ error: "Invalid dataType" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("area_data_cache")
      .upsert({
        zip_code: zipCode,
        data_type: dataType,
        data,
        fetched_at: new Date().toISOString(),
      }, {
        onConflict: "zip_code,data_type",
      });

    if (error) {
      console.error("[AreaCache] Save error:", error.message);
      return NextResponse.json({ saved: false, error: error.message });
    }

    return NextResponse.json({ saved: true });
  } catch (error: any) {
    console.error("[AreaCache] POST error:", error);
    return NextResponse.json({ saved: false });
  }
}
