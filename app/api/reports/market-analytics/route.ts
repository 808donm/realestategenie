import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/reports/market-analytics?county=honolulu&zipCode=96815
 *
 * Returns market analytics data for a county or zip code.
 * Aggregates from RentCast market stats, MLS closed sales, Census, and HUD.
 *
 * Query params:
 *   county   -- County name (default: "honolulu")
 *   zipCode  -- Optional zip code for zip-level stats
 *   city     -- Optional city filter
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const county = request.nextUrl.searchParams.get("county") || "honolulu";
    const zipCode = request.nextUrl.searchParams.get("zipCode");
    const city = request.nextUrl.searchParams.get("city");

    // Honolulu County zip codes
    const honoluluZips = [
      "96701", "96706", "96707", "96709", "96712", "96717", "96730", "96731",
      "96734", "96744", "96759", "96762", "96782", "96786", "96789", "96791",
      "96792", "96795", "96797", "96813", "96814", "96815", "96816", "96817",
      "96818", "96819", "96821", "96822", "96825", "96826",
    ];

    // If a specific zip is requested, just get that one
    const targetZips = zipCode ? [zipCode] : honoluluZips;

    // Fetch RentCast market stats for target zips (parallel, batched)
    const { getConfiguredRentcastClient } = await import("@/lib/integrations/property-data-service");
    const rcClient = await getConfiguredRentcastClient();

    const zipStats: Array<{
      zipCode: string;
      city?: string;
      medianPrice?: number;
      avgPrice?: number;
      medianPricePerSqft?: number;
      avgPricePerSqft?: number;
      medianDOM?: number;
      totalListings?: number;
      newListings?: number;
      medianRent?: number;
      lastUpdated?: string;
    }> = [];

    // Check cache first
    const cacheKey = `market-analytics-${county}-${zipCode || "all"}`;
    const { data: cached } = await supabase
      .from("area_data_cache")
      .select("data, fetched_at")
      .eq("cache_key", cacheKey)
      .eq("data_type", "market_analytics")
      .maybeSingle();

    if (cached?.data && cached.fetched_at) {
      const cacheAge = Date.now() - new Date(cached.fetched_at).getTime();
      if (cacheAge < 24 * 60 * 60 * 1000) { // 24-hour cache
        return NextResponse.json({ ...cached.data, cacheHit: true });
      }
    }

    // Fetch market stats from RentCast for each zip
    if (rcClient) {
      // Batch: fetch up to 5 at a time to respect rate limits
      const batchSize = 5;
      for (let i = 0; i < targetZips.length; i += batchSize) {
        const batch = targetZips.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (zip) => {
            try {
              const stats = await rcClient.getMarketData({ zipCode: zip, historyRange: 12 });
              const sale = stats?.saleData;
              const rental = stats?.rentalData;
              return {
                zipCode: zip,
                city: (stats as any)?.city || undefined,
                medianPrice: sale?.medianPrice,
                avgPrice: sale?.averagePrice,
                medianPricePerSqft: sale?.medianPricePerSquareFoot,
                avgPricePerSqft: sale?.averagePricePerSquareFoot,
                medianDOM: sale?.medianDaysOnMarket,
                totalListings: sale?.totalListings,
                newListings: sale?.newListings,
                medianRent: rental?.medianRent,
                lastUpdated: sale?.lastUpdatedDate,
                // Per-type breakdown
                byPropertyType: sale?.dataByPropertyType,
                // History for trends
                history: sale?.history,
              };
            } catch {
              return { zipCode: zip };
            }
          }),
        );
        for (const r of results) {
          if (r.status === "fulfilled" && r.value) zipStats.push(r.value);
        }
      }
    }

    // Aggregate county-level stats
    const pricesAll = zipStats.map((z) => z.medianPrice).filter((p): p is number => p != null && p > 0);
    const ppsqftAll = zipStats.map((z) => z.medianPricePerSqft).filter((p): p is number => p != null && p > 0);
    const domAll = zipStats.map((z) => z.medianDOM).filter((d): d is number => d != null);
    const listingsAll = zipStats.map((z) => z.totalListings).filter((l): l is number => l != null);
    const rentsAll = zipStats.map((z) => z.medianRent).filter((r): r is number => r != null && r > 0);

    const median = (arr: number[]) => {
      if (arr.length === 0) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    };

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

    const overview = {
      county: county.charAt(0).toUpperCase() + county.slice(1),
      state: "HI",
      medianSalePrice: median(pricesAll),
      avgSalePrice: avg(pricesAll),
      medianPricePerSqft: median(ppsqftAll),
      avgPricePerSqft: avg(ppsqftAll),
      medianDOM: median(domAll),
      totalListings: listingsAll.reduce((a, b) => a + b, 0),
      medianRent: median(rentsAll),
      zipCodesTracked: zipStats.length,
    };

    // ZIP-level table (sorted by median price descending)
    const zipTable = zipStats
      .filter((z) => z.medianPrice != null)
      .map((z) => ({
        zipCode: z.zipCode,
        city: z.city,
        medianPrice: z.medianPrice,
        avgPrice: z.avgPrice,
        medianPricePerSqft: z.medianPricePerSqft,
        totalListings: z.totalListings,
        medianDOM: z.medianDOM,
        medianRent: z.medianRent,
      }))
      .sort((a, b) => (b.medianPrice || 0) - (a.medianPrice || 0));

    // Try to get MLS stats for the county
    let mlsStats: any = null;
    try {
      const { data: trestleIntegration } = await supabase
        .from("integrations")
        .select("config, status")
        .eq("agent_id", user.id)
        .eq("provider", "trestle")
        .maybeSingle();

      if (trestleIntegration?.status === "connected") {
        const config = typeof trestleIntegration.config === "string" ? JSON.parse(trestleIntegration.config) : trestleIntegration.config;
        const { createTrestleClient } = await import("@/lib/integrations/trestle-client");
        const client = createTrestleClient(config);

        // Get closed sales count for county (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [activeRes, closedRes] = await Promise.allSettled([
          client.getProperties({
            $filter: `StandardStatus eq 'Active' and City eq 'Honolulu'`,
            $top: 1,
            $count: true,
            $select: "ListingKey",
          }),
          client.getProperties({
            $filter: `StandardStatus eq 'Closed' and ModificationTimestamp gt ${thirtyDaysAgo.toISOString()}`,
            $top: 1,
            $count: true,
            $select: "ListingKey",
          }),
        ]);

        mlsStats = {
          activeListings: activeRes.status === "fulfilled" ? (activeRes.value as any)["@odata.count"] || 0 : null,
          closedLast30Days: closedRes.status === "fulfilled" ? (closedRes.value as any)["@odata.count"] || 0 : null,
        };
      }
    } catch {
      // MLS stats are optional
    }

    // Fetch HUD Fair Market Rents
    let hudRents: any = null;
    try {
      const { createFederalDataClient } = await import("@/lib/integrations/federal-data-client");
      const fedClient = createFederalDataClient();
      const hudResult = await (fedClient as any).getHUDFairMarketRents?.("15", "003"); // Hawaii, Honolulu
      if (hudResult?.success) hudRents = hudResult.data;
    } catch {
      // HUD data is optional
    }

    const response = {
      overview,
      zipTable,
      mlsStats,
      hudRents,
      generatedAt: new Date().toISOString(),
    };

    // Cache the result
    try {
      await supabase.from("area_data_cache").upsert({
        cache_key: cacheKey,
        data_type: "market_analytics",
        data: response,
        fetched_at: new Date().toISOString(),
      }, { onConflict: "cache_key,data_type" });
    } catch {
      // Cache write is optional
    }

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("[MarketAnalytics] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch market analytics" }, { status: 500 });
  }
}
