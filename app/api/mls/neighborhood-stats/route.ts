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

    // Helper functions
    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    };
    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    const isSFR = (s: any) => {
      const sub = (s.PropertySubType || "").toLowerCase();
      return sub.includes("single") || sub === "sfr" || sub === "";
    };
    const isCondo = (s: any) => {
      const sub = (s.PropertySubType || "").toLowerCase();
      return sub.includes("condo") || sub.includes("townhouse") || sub.includes("apartment");
    };

    // Compute stats for a subset
    const computeStats = (subset: any[]) => {
      const prices = subset.map((s) => s.ClosePrice).filter((p: number) => p > 0).sort((a: number, b: number) => a - b);
      const sqftPrices = subset.filter((s) => s.ClosePrice > 0 && s.LivingArea > 0).map((s) => s.ClosePrice / s.LivingArea);
      const doms = subset.map((s) => s.DaysOnMarket).filter((d: number) => d != null && d >= 0);
      const lps = subset.filter((s) => s.ListPrice > 0 && s.ClosePrice > 0).map((s) => ({ list: s.ListPrice, close: s.ClosePrice }));
      return {
        totalSales: subset.length,
        medianPrice: median(prices),
        avgPrice: avg(prices),
        minPrice: prices[0] || 0,
        maxPrice: prices[prices.length - 1] || 0,
        medianPricePerSqft: median(sqftPrices.map((p: number) => Math.round(p))),
        avgPricePerSqft: avg(sqftPrices.map((p: number) => Math.round(p))),
        medianDOM: median(doms),
        avgDOM: avg(doms),
        listToSaleRatio: lps.length > 0
          ? Math.round((lps.reduce((sum: number, p: any) => sum + (p.close / p.list), 0) / lps.length) * 1000) / 10
          : null,
      };
    };

    // All, SFR, and Condo stats
    const sfrSales = sales.filter(isSFR);
    const condoSales = sales.filter(isCondo);

    const stats = computeStats(sales);
    const sfrStats = sfrSales.length > 0 ? computeStats(sfrSales) : null;
    const condoStats = condoSales.length > 0 ? computeStats(condoSales) : null;

    // Monthly breakdown by type
    const monthlyMap = new Map<string, { sfrSales: number; condoSales: number; totalSales: number; sfrPrice: number; condoPrice: number; totalPrice: number }>();
    for (const s of sales) {
      if (!s.CloseDate) continue;
      const month = s.CloseDate.substring(0, 7);
      const existing = monthlyMap.get(month) || { sfrSales: 0, condoSales: 0, totalSales: 0, sfrPrice: 0, condoPrice: 0, totalPrice: 0 };
      existing.totalSales++;
      if (s.ClosePrice && s.ClosePrice > 0) existing.totalPrice += s.ClosePrice;
      if (isSFR(s)) {
        existing.sfrSales++;
        if (s.ClosePrice && s.ClosePrice > 0) existing.sfrPrice += s.ClosePrice;
      } else if (isCondo(s)) {
        existing.condoSales++;
        if (s.ClosePrice && s.ClosePrice > 0) existing.condoPrice += s.ClosePrice;
      }
      monthlyMap.set(month, existing);
    }

    const monthly = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        sfrSales: data.sfrSales,
        condoSales: data.condoSales,
        totalSales: data.totalSales,
        sfrAvgPrice: data.sfrSales > 0 ? Math.round(data.sfrPrice / data.sfrSales) : 0,
        condoAvgPrice: data.condoSales > 0 ? Math.round(data.condoPrice / data.condoSales) : 0,
        avgPrice: data.totalSales > 0 ? Math.round(data.totalPrice / data.totalSales) : 0,
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
      sfrStats,
      condoStats,
      monthly,
      propertyTypes: Object.fromEntries(typeMap),
      dateRange: { from: sinceStr, to: new Date().toISOString().split("T")[0] },
    });
  } catch (error: any) {
    console.error("[NeighborhoodStats] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
