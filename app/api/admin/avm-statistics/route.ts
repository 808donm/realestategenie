import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/admin/avm-statistics
 *
 * Returns AVM accuracy statistics for the admin dashboard.
 * Aggregates data from avm_sale_outcomes and comp_history_cache.
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: agent } = await supabase.from("agents").select("is_admin").eq("id", user.id).single();
    if (!agent?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Fetch all data in parallel
    const [predictionsResult, compsResult, ratiosResult] = await Promise.all([
      // All AVM predictions
      supabase
        .from("avm_sale_outcomes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000),

      // Comp cache stats
      supabase.from("comp_history_cache").select("zip_code, property_type, source, close_date", { count: "exact" }),

      // List-to-sale ratios
      supabase.from("list_to_sale_ratio_cache").select("*"),
    ]);

    const predictions = predictionsResult.data || [];
    const comps = compsResult.data || [];
    const compCount = compsResult.count || 0;
    const ratios = ratiosResult.data || [];

    // ── Prediction Statistics ──

    // All predictions (including those without sale price)
    const allPredictions = predictions.length;
    const withListPrice = predictions.filter((p) => p.list_price && p.list_price > 0);

    // Closed predictions (have actual sale price)
    const closed = predictions.filter((p) => p.sale_price > 0);
    const closedAccuracy = closed.length > 0
      ? {
          count: closed.length,
          meanError: Math.round(closed.reduce((s, p) => s + (p.abs_error_pct || 0), 0) / closed.length * 100) / 100,
          medianError: getMedian(closed.map((p) => p.abs_error_pct || 0)),
          within10: closed.filter((p) => (p.abs_error_pct || 100) <= 10).length,
          within20: closed.filter((p) => (p.abs_error_pct || 100) <= 20).length,
        }
      : null;

    // Prediction vs list price accuracy (proxy for accuracy before closings)
    const vsListPrice = withListPrice.map((p) => ({
      ...p,
      listErrorPct: Math.abs((p.genie_avm - p.list_price) / p.list_price) * 100,
    }));

    const listAccuracy = vsListPrice.length > 0
      ? {
          count: vsListPrice.length,
          meanError: Math.round(vsListPrice.reduce((s, p) => s + p.listErrorPct, 0) / vsListPrice.length * 100) / 100,
          medianError: getMedian(vsListPrice.map((p) => p.listErrorPct)),
          within10: vsListPrice.filter((p) => p.listErrorPct <= 10).length,
          within15: vsListPrice.filter((p) => p.listErrorPct <= 15).length,
          within20: vsListPrice.filter((p) => p.listErrorPct <= 20).length,
        }
      : null;

    // By ZIP code
    const byZip: Record<string, { count: number; errors: number[] }> = {};
    for (const p of vsListPrice) {
      if (!byZip[p.zip_code]) byZip[p.zip_code] = { count: 0, errors: [] };
      byZip[p.zip_code].count++;
      byZip[p.zip_code].errors.push(p.listErrorPct);
    }
    const zipStats = Object.entries(byZip)
      .map(([zip, data]) => ({
        zip,
        count: data.count,
        medianError: getMedian(data.errors),
        meanError: Math.round(data.errors.reduce((s, e) => s + e, 0) / data.errors.length * 100) / 100,
        within10: data.errors.filter((e) => e <= 10).length,
        within20: data.errors.filter((e) => e <= 20).length,
        within20Pct: Math.round(data.errors.filter((e) => e <= 20).length / data.count * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // By property type
    const byType: Record<string, { count: number; errors: number[] }> = {};
    for (const p of vsListPrice) {
      const type = p.property_type || "Unknown";
      if (!byType[type]) byType[type] = { count: 0, errors: [] };
      byType[type].count++;
      byType[type].errors.push(p.listErrorPct);
    }
    const typeStats = Object.entries(byType)
      .map(([type, data]) => ({
        type,
        count: data.count,
        medianError: getMedian(data.errors),
        meanError: Math.round(data.errors.reduce((s, e) => s + e, 0) / data.errors.length * 100) / 100,
        within10: data.errors.filter((e) => e <= 10).length,
        within20: data.errors.filter((e) => e <= 20).length,
      }))
      .sort((a, b) => b.count - a.count);

    // By confidence level
    const byConfidence: Record<string, { count: number; errors: number[] }> = {};
    for (const p of vsListPrice) {
      const conf = p.genie_avm_confidence || "Unknown";
      if (!byConfidence[conf]) byConfidence[conf] = { count: 0, errors: [] };
      byConfidence[conf].count++;
      byConfidence[conf].errors.push(p.listErrorPct);
    }
    const confidenceStats = Object.entries(byConfidence)
      .map(([confidence, data]) => ({
        confidence,
        count: data.count,
        medianError: getMedian(data.errors),
        within10: data.errors.filter((e) => e <= 10).length,
        within20: data.errors.filter((e) => e <= 20).length,
      }))
      .sort((a, b) => {
        const order = { High: 0, Medium: 1, Low: 2, Unknown: 3 };
        return (order[a.confidence as keyof typeof order] ?? 4) - (order[b.confidence as keyof typeof order] ?? 4);
      });

    // Recent predictions (last 20)
    const recentPredictions = vsListPrice.slice(0, 20).map((p) => ({
      address: p.address,
      zipCode: p.zip_code,
      propertyType: p.property_type,
      listPrice: p.list_price,
      genieAvm: p.genie_avm,
      errorPct: Math.round(p.listErrorPct * 10) / 10,
      confidence: p.genie_avm_confidence,
      date: p.created_at,
    }));

    // ── Comp Cache Statistics ──

    const compsByZip: Record<string, number> = {};
    const compsBySource: Record<string, number> = {};
    for (const c of comps) {
      compsByZip[c.zip_code] = (compsByZip[c.zip_code] || 0) + 1;
      compsBySource[c.source] = (compsBySource[c.source] || 0) + 1;
    }

    const compStats = {
      totalComps: compCount,
      byZip: Object.entries(compsByZip)
        .map(([zip, count]) => ({ zip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      bySource: compsBySource,
    };

    return NextResponse.json({
      predictions: {
        total: allPredictions,
        withListPrice: withListPrice.length,
        closedAccuracy,
        listAccuracy,
      },
      byZip: zipStats,
      byType: typeStats,
      byConfidence: confidenceStats,
      recentPredictions,
      compCache: compStats,
      listToSaleRatios: ratios,
    });
  } catch (error: any) {
    console.error("[Admin AVM Stats] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(median * 10) / 10;
}
