import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";

/**
 * GET /api/mls/market-quick-look
 *
 * Returns aggregate MLS market statistics for a county computed from
 * Trestle OData queries. Powers the Market Quick Look dashboard.
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
      console.log(`[Market Quick Look] Cache HIT for ${county}, ${state}`);
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

    const countyFilter = `CountyOrParish eq '${county}'`;

    // Parallel queries for counts and detailed data
    const [activeRes, pendingRes, closedDetailRes, prevClosedRes, trendRes] = await Promise.allSettled([
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
      // 12-month closed for trend charts
      client.getProperties({
        $filter: `${countyFilter} and StandardStatus eq 'Closed' and CloseDate gt ${twelveMonthsAgo.toISOString()}`,
        $top: 500,
        $count: true,
        $select: "ListingKey,ClosePrice,ListPrice,DaysOnMarket,CloseDate",
        $orderby: "CloseDate desc",
      }),
    ]);

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

    // 12-month trends for charts
    const trendListings = trendRes.status === "fulfilled" ? (trendRes.value.value || []) : [];
    const monthlyData: { month: string; count: number; avgPrice: number; totalPrice: number }[] = [];
    const monthBuckets: Record<string, { count: number; totalPrice: number }> = {};

    for (const l of trendListings) {
      if (!l.CloseDate) continue;
      const d = new Date(l.CloseDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthBuckets[key]) monthBuckets[key] = { count: 0, totalPrice: 0 };
      monthBuckets[key].count++;
      if (l.ClosePrice != null && l.ClosePrice > 0) monthBuckets[key].totalPrice += l.ClosePrice;
    }

    // Fill 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const bucket = monthBuckets[key] || { count: 0, totalPrice: 0 };
      monthlyData.push({
        month: label,
        count: bucket.count,
        avgPrice: bucket.count > 0 ? Math.round(bucket.totalPrice / bucket.count) : 0,
        totalPrice: bucket.totalPrice,
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

    // Cache the response
    supabase
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
        if (upsertErr) console.warn(`[Market Quick Look] Cache write failed:`, upsertErr.message);
        else console.log(`[Market Quick Look] Cached ${county}, ${state}`);
      });

    console.log(`[Market Quick Look] ${county}: ${closedCount} closed (90d), ${activeCount} active, ${pendingCount} pending, temp=${marketTemp}`);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Market Quick Look] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch market statistics" }, { status: 500 });
  }
}
