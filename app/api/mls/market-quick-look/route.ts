import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";

/**
 * GET /api/mls/market-quick-look
 *
 * Returns aggregate MLS market statistics for a county computed from
 * Trestle OData queries. Powers the Market Snapshot dashboard.
 *
 * Query params:
 *   county  -- County name (default: "Honolulu")
 *   state   -- State code (default: "HI")
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = request.nextUrl.searchParams;
    const county = params.get("county") || "Honolulu";
    const state = params.get("state") || "HI";

    // Check cache first (24-hour TTL)
    const cacheKey = `mls-quick-look-${county}-${state}`;
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    const { data: cached } = await supabase
      .from("area_data_cache")
      .select("data, fetched_at")
      .eq("zip_code", cacheKey)
      .eq("data_type", "mls_quick_look")
      .gte("fetched_at", cutoff.toISOString())
      .maybeSingle();

    if (cached?.data) {
      console.log(`[Market Snapshot] Cache HIT for ${county}, ${state}`);
      return NextResponse.json(cached.data);
    }

    const client = await getTrestleClient(supabase, user.id);
    if (!client) {
      return NextResponse.json({ error: "Trestle MLS not connected" }, { status: 400 });
    }

    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);
    const prevNinetyStart = new Date(ninetyDaysAgo);
    prevNinetyStart.setDate(prevNinetyStart.getDate() - 90);
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(now.getMonth() - 12);

    // HiCentral MLS uses CountyOrParish with island names (not county names).
    // Map our county selector values to the Trestle field values.
    const COUNTY_TO_ISLAND: Record<string, string> = {
      Honolulu: "Oahu",
      Maui: "Maui",
      Hawaii: "Hawaii",
      Kauai: "Kauai",
    };

    const island = COUNTY_TO_ISLAND[county] || county;
    const countyFilter = `CountyOrParish eq '${island}'`;

    // Parallel queries for counts and detailed data
    const [activeRes, pendingRes, closedDetailRes, prevClosedRes] = await Promise.allSettled([
      // Active count
      client.getProperties({
        $filter: `${countyFilter} and StandardStatus eq 'Active'`,
        $top: 1,
        $count: true,
        $select: "ListingKey",
      }),
      // Pending count
      client.getProperties({
        $filter: `${countyFilter} and StandardStatus eq 'Pending'`,
        $top: 1,
        $count: true,
        $select: "ListingKey",
      }),
      // Closed last 90 days -- detailed for stats
      client.getProperties({
        $filter: `${countyFilter} and StandardStatus eq 'Closed' and CloseDate gt ${ninetyDaysAgo.toISOString()}`,
        $top: 500,
        $count: true,
        $select: "ListingKey,ClosePrice,ListPrice,DaysOnMarket,CloseDate,PropertyType,PropertySubType",
        $orderby: "CloseDate desc",
      }),
      // Previous 90-day period closed count (for trend comparison)
      client.getProperties({
        $filter: `${countyFilter} and StandardStatus eq 'Closed' and CloseDate gt ${prevNinetyStart.toISOString()} and CloseDate le ${ninetyDaysAgo.toISOString()}`,
        $top: 1,
        $count: true,
        $select: "ListingKey",
      }),
    ]);

    // 12-month trend: query each month separately for accurate counts
    // Fetch count + avg price per month in parallel
    const monthQueries: Promise<any>[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      monthQueries.push(
        client.getProperties({
          $filter: `${countyFilter} and StandardStatus eq 'Closed' and CloseDate ge ${monthStart.toISOString()} and CloseDate lt ${monthEnd.toISOString()}`,
          $top: 200,
          $count: true,
          $select: "ListingKey,ClosePrice",
        }).catch(() => ({ value: [], "@odata.count": 0 })),
      );
    }
    const monthResults = await Promise.all(monthQueries);

    // Extract counts
    const activeCount = activeRes.status === "fulfilled" ? (activeRes.value as any)["@odata.count"] || 0 : 0;
    const pendingCount = pendingRes.status === "fulfilled" ? (pendingRes.value as any)["@odata.count"] || 0 : 0;

    // Process closed listings (last 90 days)
    const closedListings = closedDetailRes.status === "fulfilled" ? (closedDetailRes.value.value || []) : [];
    const closedCount = closedDetailRes.status === "fulfilled" ? (closedDetailRes.value as any)["@odata.count"] || closedListings.length : 0;
    const prevClosedCount = prevClosedRes.status === "fulfilled" ? (prevClosedRes.value as any)["@odata.count"] || 0 : 0;

    // Compute stats from closed listings
    const closePrices = closedListings.map((l: any) => l.ClosePrice).filter((p: number) => p > 0).sort((a: number, b: number) => a - b);
    const domValues = closedListings.map((l: any) => l.DaysOnMarket).filter((d: number) => d != null && d >= 0);
    const ratios = closedListings
      .filter((l: any) => l.ClosePrice > 0 && l.ListPrice > 0)
      .map((l: any) => l.ClosePrice / l.ListPrice);

    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
    };
    const avg = (arr: number[]) => (arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length);

    const medianClosePrice = Math.round(median(closePrices));
    const avgClosePrice = Math.round(avg(closePrices));
    const medianDOM = Math.round(median(domValues.sort((a: number, b: number) => a - b)));
    const avgDOM = Math.round(avg(domValues));
    const saleToListRatio = ratios.length > 0 ? Math.round(avg(ratios) * 100) : 0;

    // Monthly averages (divide by 3 for 90-day period)
    const closedMonthlyAvg = Math.round(closedCount / 3);
    const pendingMonthlyAvg = pendingCount; // Pending is a point-in-time count
    const activeMonthlyAvg = activeCount; // Active is point-in-time

    // Months of inventory
    const monthlyClosedRate = closedCount / 3;
    const monthsOfInventory = monthlyClosedRate > 0 ? Math.round((activeCount / monthlyClosedRate) * 10) / 10 : 0;

    // Market temperature (0-100, higher = more seller's market)
    // Based on months of inventory: <2 = very hot (90+), 2-4 = seller's (70-90), 4-6 = balanced (40-70), 6-8 = buyer's (20-40), >8 = very cold (<20)
    let marketTemp = 50;
    if (monthsOfInventory <= 2) marketTemp = 90;
    else if (monthsOfInventory <= 3) marketTemp = 80;
    else if (monthsOfInventory <= 4) marketTemp = 70;
    else if (monthsOfInventory <= 5) marketTemp = 55;
    else if (monthsOfInventory <= 6) marketTemp = 45;
    else if (monthsOfInventory <= 7) marketTemp = 35;
    else if (monthsOfInventory <= 8) marketTemp = 25;
    else marketTemp = 15;

    // Trend percentages (compare current 90 days to previous 90 days)
    const prevClosedMonthlyAvg = Math.round(prevClosedCount / 3);
    const closedTrend = prevClosedMonthlyAvg > 0 ? Math.round(((closedMonthlyAvg - prevClosedMonthlyAvg) / prevClosedMonthlyAvg) * 100) : 0;

    // 12-month trends from per-month queries
    const monthlyData: { month: string; count: number; avgPrice: number; totalPrice: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const monthIdx = 11 - i; // monthResults[0] = oldest, monthResults[11] = newest
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const result = monthResults[i];
      const count = (result as any)?.["@odata.count"] ?? (result?.value?.length || 0);
      const listings = result?.value || [];
      const prices = listings.map((l: any) => l.ClosePrice).filter((p: number) => p > 0);
      const totalPrice = prices.reduce((s: number, p: number) => s + p, 0);
      monthlyData.push({
        month: label,
        count,
        avgPrice: prices.length > 0 ? Math.round(totalPrice / prices.length) : 0,
        totalPrice,
      });
    }

    const response = {
      county,
      state,
      marketTemperature: marketTemp,
      quickStats: {
        closedSales: { value: closedMonthlyAvg, trend: closedTrend, label: "Total Closed Sales Count (Monthly Average)" },
        pendingSales: { value: pendingCount, trend: 0, label: "Total Pending Sales Count (Monthly Average)" },
        activeListings: { value: activeCount, trend: 0, label: "Total Active Listings Count (Monthly Average)" },
        monthsOfInventory: { value: monthsOfInventory, trend: 0, label: "Months of Inventory (Monthly Average)" },
        daysOnMarket: { value: avgDOM, trend: 0, label: "Days On Market (Monthly Average)" },
        saleToListRatio: { value: saleToListRatio, trend: 0, label: "Sale Price to List Price (Monthly Average)" },
      },
      priceStats: {
        medianClosePrice,
        avgClosePrice,
        medianDOM,
        avgDOM,
        saleToListRatio,
      },
      monthlyTrends: monthlyData,
      closedCount,
      prevClosedCount,
    };

    // Cache the response (use admin client to bypass RLS)
    supabaseAdmin
      .from("area_data_cache")
      .upsert(
        {
          zip_code: cacheKey,
          data_type: "mls_quick_look",
          data: response,
          fetched_at: now.toISOString(),
        },
        { onConflict: "zip_code,data_type" },
      )
      .then(({ error: upsertErr }) => {
        if (upsertErr) console.warn(`[Market Snapshot] Cache write failed:`, upsertErr.message);
        else console.log(`[Market Snapshot] Cached ${county}, ${state}`);
      });

    console.log(`[Market Snapshot] ${county}: ${closedCount} closed (90d), ${activeCount} active, ${pendingCount} pending, temp=${marketTemp}`);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Market Snapshot] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch market statistics" }, { status: 500 });
  }
}
