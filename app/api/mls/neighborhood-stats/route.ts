import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";

/**
 * GET /api/mls/neighborhood-stats
 *
 * Queries MLS for closed sales in a specific neighborhood/subdivision
 * and computes market statistics (median price, avg DOM, etc.)
 *
 * Query params:
 *   subdivision -- neighborhood/subdivision name (required)
 *   months     -- lookback period (default 12, max 24)
 *   zip        -- optional ZIP code to narrow
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = request.nextUrl.searchParams;
    const subdivision = params.get("subdivision");
    const months = Math.min(Number(params.get("months") || "12"), 24);
    const zip = params.get("zip");

    if (!subdivision) return NextResponse.json({ error: "subdivision is required" }, { status: 400 });

    const trestle = await getTrestleClient(supabase, user.id);
    if (!trestle) return NextResponse.json({ error: "MLS not connected" }, { status: 503 });

    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const sinceStr = since.toISOString().split("T")[0];

    const escaped = subdivision.replace(/'/g, "''").toLowerCase();
    let filter = `StandardStatus eq 'Closed' and CloseDate ge ${sinceStr} and contains(tolower(SubdivisionName), '${escaped}')`;
    if (zip) filter += ` and startswith(PostalCode, '${zip}')`;

    const result = await trestle.getProperties({
      $filter: filter,
      $select: [
        "ListingKey", "ClosePrice", "ListPrice", "CloseDate", "OnMarketDate",
        "DaysOnMarket", "PropertyType", "PropertySubType", "SubdivisionName",
        "BedroomsTotal", "BathroomsTotalInteger", "LivingArea", "YearBuilt",
        "City", "PostalCode",
      ].join(","),
      $orderby: "CloseDate desc",
      $top: 500,
      $count: true,
    });

    const sales = result.value || [];

    if (sales.length === 0) {
      return NextResponse.json({
        subdivision,
        sales: 0,
        stats: null,
        monthly: [],
        message: "No closed sales found for this neighborhood in the selected period",
      });
    }

    // Compute statistics
    const prices = sales.map((s: any) => s.ClosePrice).filter((p: number) => p > 0).sort((a: number, b: number) => a - b);
    const sqftPrices = sales.filter((s: any) => s.ClosePrice > 0 && s.LivingArea > 0).map((s: any) => s.ClosePrice / s.LivingArea);
    const doms = sales.map((s: any) => s.DaysOnMarket).filter((d: number) => d != null && d >= 0);
    const listPrices = sales.filter((s: any) => s.ListPrice > 0 && s.ClosePrice > 0).map((s: any) => ({ list: s.ListPrice, close: s.ClosePrice }));

    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    };

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    const stats = {
      totalSales: sales.length,
      medianPrice: median(prices),
      avgPrice: avg(prices),
      minPrice: prices[0] || 0,
      maxPrice: prices[prices.length - 1] || 0,
      medianPricePerSqft: median(sqftPrices.map((p: number) => Math.round(p))),
      avgPricePerSqft: avg(sqftPrices.map((p: number) => Math.round(p))),
      medianDOM: median(doms),
      avgDOM: avg(doms),
      listToSaleRatio: listPrices.length > 0
        ? Math.round((listPrices.reduce((sum: number, p: any) => sum + (p.close / p.list), 0) / listPrices.length) * 1000) / 10
        : null,
    };

    // Monthly breakdown
    const monthlyMap = new Map<string, { sales: number; totalPrice: number; totalDOM: number }>();
    for (const s of sales) {
      if (!s.CloseDate) continue;
      const month = s.CloseDate.substring(0, 7); // YYYY-MM
      const existing = monthlyMap.get(month) || { sales: 0, totalPrice: 0, totalDOM: 0 };
      existing.sales++;
      if (s.ClosePrice && s.ClosePrice > 0) existing.totalPrice += s.ClosePrice;
      if (s.DaysOnMarket != null && s.DaysOnMarket >= 0) existing.totalDOM += s.DaysOnMarket;
      monthlyMap.set(month, existing);
    }

    const monthly = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        sales: data.sales,
        avgPrice: data.sales > 0 ? Math.round(data.totalPrice / data.sales) : 0,
        avgDOM: data.sales > 0 ? Math.round(data.totalDOM / data.sales) : 0,
      }));

    // Property type breakdown
    const typeMap = new Map<string, number>();
    for (const s of sales) {
      const type = s.PropertySubType || s.PropertyType || "Other";
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    }

    return NextResponse.json({
      subdivision,
      sales: sales.length,
      stats,
      monthly,
      propertyTypes: Object.fromEntries(typeMap),
      dateRange: { from: sinceStr, to: new Date().toISOString().split("T")[0] },
    });
  } catch (error: any) {
    console.error("[NeighborhoodStats] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
