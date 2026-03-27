import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { RentcastClient, createRentcastClient } from "@/lib/integrations/rentcast-client";
import {
  refreshListingsCache,
  searchCachedListings,
  checkMonitoredPropertyTiers,
  createTierAlerts,
} from "@/lib/prospecting/dom-cache-engine";
import type { DomSearchParams } from "@/lib/prospecting/dom-search-engine";

/**
 * DOM Prospect Refresh Cron Job
 *
 * Runs weekly — orchestrates the full DOM prospecting data pipeline:
 * 1. Refresh global listings cache (MLS primary, RentCast fallback)
 * 2. Populate all saved searches from cache
 * 3. Check monitored properties for tier escalations → create alerts
 *
 * Vercel cron schedule: "0 12 * * 1"  (every Monday at 12:00 UTC / 2:00 AM HST)
 * Required header: Authorization: Bearer [CRON_SECRET]
 */

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[DomCron] Starting weekly DOM prospect refresh...");

    // Get system Trestle config (first connected integration)
    const { data: trestleInteg } = await supabase
      .from("integrations")
      .select("config")
      .eq("provider", "trestle")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    const trestleConfig = trestleInteg?.config
      ? typeof trestleInteg.config === "string"
        ? JSON.parse(trestleInteg.config)
        : trestleInteg.config
      : null;

    // Get RentCast client (fallback)
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

    const stats: any = {};

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Refresh global listings cache
    // ═══════════════════════════════════════════════════════════════════
    console.log("[DomCron] Step 1: Refreshing listings cache...");
    stats.cache = await refreshListingsCache(supabase, trestleConfig, rentcastClient);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Populate all saved searches from cache
    // ═══════════════════════════════════════════════════════════════════
    console.log("[DomCron] Step 2: Populating saved searches...");
    const { data: searches } = await supabase.from("dom_prospect_searches").select("*").eq("is_active", true);

    stats.searches = { total: searches?.length || 0, success: 0, failed: 0, totalResults: 0 };

    if (searches?.length) {
      for (const search of searches) {
        try {
          const params: DomSearchParams = {
            zipCodes: search.zip_codes,
            redMultiplier: search.red_multiplier,
            orangeMultiplier: search.orange_multiplier,
            charcoalMultiplier: search.charcoal_multiplier,
            propertyTypes: search.property_types || undefined,
            minPrice: search.min_price || undefined,
            maxPrice: search.max_price || undefined,
          };

          const result = await searchCachedListings(supabase, params);

          // Delete old results and insert new
          await supabase.from("dom_prospect_results").delete().eq("search_id", search.id);

          if (result.results.length > 0) {
            const rows = result.results.map((r) => ({
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

            // Insert in chunks
            for (let i = 0; i < rows.length; i += 200) {
              await supabase.from("dom_prospect_results").insert(rows.slice(i, i + 200));
            }
          }

          await supabase
            .from("dom_prospect_searches")
            .update({
              last_run_at: new Date().toISOString(),
              next_run_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", search.id);

          stats.searches.success++;
          stats.searches.totalResults += result.results.length;
          console.log(`[DomCron] Search "${search.name}": ${result.results.length} results`);
        } catch (err: any) {
          console.error(`[DomCron] Search "${search.name}" failed:`, err.message);
          stats.searches.failed++;
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Check monitored properties for tier escalations
    // ═══════════════════════════════════════════════════════════════════
    console.log("[DomCron] Step 3: Checking monitored properties...");
    const escalations = await checkMonitoredPropertyTiers(supabase);
    stats.monitoring = {
      escalations: escalations.length,
      alertsCreated: 0,
    };

    if (escalations.length > 0) {
      stats.monitoring.alertsCreated = await createTierAlerts(supabase, escalations);
      console.log(`[DomCron] Created ${stats.monitoring.alertsCreated} tier escalation alerts`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Cleanup expired results
    // ═══════════════════════════════════════════════════════════════════
    await supabase.from("dom_prospect_results").delete().lt("expires_at", new Date().toISOString());

    console.log("[DomCron] Weekly refresh complete:", stats);

    return NextResponse.json({
      success: true,
      message: "DOM prospect refresh complete",
      stats,
    });
  } catch (error: any) {
    console.error("[DomCron] Error:", error);
    return NextResponse.json({ error: error.message || "DOM prospect refresh failed" }, { status: 500 });
  }
}
