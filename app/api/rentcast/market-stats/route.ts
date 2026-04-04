import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RentcastClient, createRentcastClient } from "@/lib/integrations/rentcast-client";

/**
 * GET /api/rentcast/market-stats
 *
 * Fetch aggregate sale & rental market statistics from RentCast's /markets endpoint.
 *
 * Query params:
 *   zipCode       — zip code (required)
 *   historyRange  — months of history (optional, default 12)
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
    if (!zipCode) {
      return NextResponse.json({ error: "zipCode is required" }, { status: 400 });
    }

    const historyRange = Number(url.searchParams.get("historyRange")) || 12;

    // Check area_data_cache first.
    // Market stats change monthly -- cache for 30 days, refresh on the 10th of each month.
    const now = new Date();
    const dayOfMonth = now.getDate();
    // On or after the 10th, data from before the 1st of this month is stale
    // Before the 10th, data from before the 1st of last month is stale
    const staleDate = new Date(now.getFullYear(), now.getMonth() - (dayOfMonth >= 10 ? 0 : 1), 1);

    const { data: cached } = await supabase
      .from("area_data_cache")
      .select("data, fetched_at")
      .eq("zip_code", zipCode)
      .eq("data_type", "market_stats")
      .gte("fetched_at", staleDate.toISOString())
      .maybeSingle();

    if (cached?.data) {
      console.log(`[RentCast Market Stats] Cache HIT for ${zipCode} (fetched ${cached.fetched_at})`);
      return NextResponse.json(cached.data);
    }

    // Cache miss — fetch live from RentCast
    console.log(`[RentCast Market Stats] Cache MISS for ${zipCode}, fetching live`);
    const rentcast = await getRentcastClient();
    if (!rentcast) {
      return NextResponse.json({ error: "RentCast not configured" }, { status: 503 });
    }

    const marketData = await rentcast.getMarketData({
      zipCode,
      dataType: "All",
      historyRange: Math.min(Math.max(historyRange, 1), 36),
    });

    // Save to cache for future requests
    const admin = supabaseAdmin;
    admin
      .from("area_data_cache")
      .upsert(
        {
          zip_code: zipCode,
          data_type: "market_stats",
          data: marketData,
          fetched_at: now.toISOString(),
        },
        { onConflict: "zip_code,data_type" },
      )
      .then(({ error }) => {
        if (error) console.warn(`[RentCast Market Stats] Cache write failed for ${zipCode}:`, error.message);
        else console.log(`[RentCast Market Stats] Cached ${zipCode}`);
      });

    return NextResponse.json(marketData);
  } catch (error: any) {
    console.error("[RentCast Market Stats] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch market statistics" }, { status: 500 });
  }
}

async function getRentcastClient(): Promise<RentcastClient | null> {
  try {
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("config")
      .eq("provider", "rentcast")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (integration?.config) {
      const config = typeof integration.config === "string" ? JSON.parse(integration.config) : integration.config;
      if (config.api_key) return new RentcastClient({ apiKey: config.api_key });
    }

    return createRentcastClient();
  } catch {
    return null;
  }
}
