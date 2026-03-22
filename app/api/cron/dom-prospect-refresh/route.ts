import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runDomSearch, type DomSearchParams } from "@/lib/prospecting/dom-search-engine";
import { RentcastClient, createRentcastClient } from "@/lib/integrations/rentcast-client";

/**
 * DOM Prospect Refresh Cron Job
 *
 * Runs weekly — refreshes all active DOM prospect saved searches.
 * For each saved search, re-runs the DOM engine (MLS primary, RentCast fallback),
 * replaces old results, and updates next_run_at.
 *
 * Vercel cron schedule: "0 12 * * 1"  (every Monday at 12:00 UTC / 2:00 AM HST)
 * Required header: Authorization: Bearer [CRON_SECRET]
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[DomCron] Starting weekly DOM prospect refresh...");

    // Get all active searches that are due
    const { data: searches, error: fetchErr } = await supabase
      .from("dom_prospect_searches")
      .select("*")
      .eq("is_active", true)
      .or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`);

    if (fetchErr) throw fetchErr;

    if (!searches?.length) {
      console.log("[DomCron] No active searches due for refresh.");
      return NextResponse.json({ success: true, message: "No searches to refresh", count: 0 });
    }

    console.log(`[DomCron] Found ${searches.length} searches to refresh.`);

    // Get RentCast client (shared across all searches)
    let rentcastClient: RentcastClient | null = null;
    try {
      const { data: rcInteg } = await supabase
        .from("integrations")
        .select("config")
        .eq("provider", "rentcast")
        .eq("status", "connected")
        .limit(1)
        .maybeSingle();

      if (rcInteg?.config) {
        const config = typeof rcInteg.config === "string" ? JSON.parse(rcInteg.config) : rcInteg.config;
        if (config.api_key) rentcastClient = new RentcastClient({ apiKey: config.api_key });
      }
      if (!rentcastClient) rentcastClient = createRentcastClient();
    } catch {
      // RentCast unavailable
    }

    const stats = { total: searches.length, success: 0, failed: 0, totalResults: 0 };

    for (const search of searches) {
      try {
        // Get the agent's Trestle config
        const { data: trestleInteg } = await supabase
          .from("integrations")
          .select("config")
          .eq("agent_id", search.agent_id)
          .eq("provider", "trestle")
          .eq("status", "connected")
          .maybeSingle();

        const trestleConfig = trestleInteg?.config
          ? (typeof trestleInteg.config === "string" ? JSON.parse(trestleInteg.config) : trestleInteg.config)
          : null;

        // Get cached market stats
        let cachedMarketStats: Record<string, any> = {};
        const { data: cached } = await supabase
          .from("area_data_cache")
          .select("zip_code, data")
          .eq("data_type", "market_stats")
          .in("zip_code", search.zip_codes);

        if (cached) {
          for (const row of cached) {
            cachedMarketStats[row.zip_code] = row.data;
          }
        }

        // Run the search
        const params: DomSearchParams = {
          zipCodes: search.zip_codes,
          redMultiplier: search.red_multiplier,
          orangeMultiplier: search.orange_multiplier,
          charcoalMultiplier: search.charcoal_multiplier,
          propertyTypes: search.property_types || undefined,
          minPrice: search.min_price || undefined,
          maxPrice: search.max_price || undefined,
        };

        const result = await runDomSearch(params, {
          trestleConfig,
          rentcastClient,
          cachedMarketStats,
        });

        // Delete old results
        await supabase
          .from("dom_prospect_results")
          .delete()
          .eq("search_id", search.id);

        // Insert new results
        if (result.results.length > 0) {
          const rows = result.results.map(r => ({
            search_id: search.id,
            listing_key: r.listingKey,
            mls_number: r.mlsNumber,
            address: r.address,
            city: r.city,
            state: r.state,
            zip_code: r.zipCode,
            latitude: r.latitude,
            longitude: r.longitude,
            property_type: r.propertyType,
            list_price: r.listPrice,
            original_list_price: r.originalListPrice,
            beds: r.beds,
            baths: r.baths,
            sqft: r.sqft,
            year_built: r.yearBuilt,
            days_on_market: r.daysOnMarket,
            cumulative_days_on_market: r.cumulativeDaysOnMarket,
            listed_date: r.listedDate,
            avg_dom_for_type: r.avgDomForType,
            dom_ratio: r.domRatio,
            tier: r.tier,
            listing_agent_name: r.listingAgentName,
            listing_agent_phone: r.listingAgentPhone,
            listing_agent_email: r.listingAgentEmail,
            listing_office_name: r.listingOfficeName,
            data_source: r.dataSource,
          }));

          await supabase.from("dom_prospect_results").insert(rows);
        }

        // Update search timestamps
        await supabase
          .from("dom_prospect_searches")
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", search.id);

        stats.success++;
        stats.totalResults += result.results.length;

        console.log(`[DomCron] Search "${search.name}": ${result.results.length} results (${result.dataSource})`);
      } catch (err: any) {
        console.error(`[DomCron] Search "${search.name}" failed:`, err.message);
        stats.failed++;
      }
    }

    // Clean up expired results
    await supabase
      .from("dom_prospect_results")
      .delete()
      .lt("expires_at", new Date().toISOString());

    console.log("[DomCron] Weekly refresh complete:", stats);

    return NextResponse.json({
      success: true,
      message: "DOM prospect refresh complete",
      stats,
    });
  } catch (error: any) {
    console.error("[DomCron] Error:", error);
    return NextResponse.json(
      { error: error.message || "DOM prospect refresh failed" },
      { status: 500 }
    );
  }
}
