import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runDomSearch, type DomSearchParams } from "@/lib/prospecting/dom-search-engine";
import { RentcastClient, createRentcastClient } from "@/lib/integrations/rentcast-client";

/**
 * POST /api/dom-prospecting/search
 *
 * Run a DOM prospecting search. Uses MLS (Trestle) as primary data source,
 * falls back to RentCast where MLS is unavailable.
 *
 * Body:
 *   zipCodes:           string[] (required)
 *   redMultiplier:      number (default 2.0)
 *   orangeMultiplier:   number (default 1.5)
 *   charcoalMultiplier: number (default 1.15)
 *   propertyTypes:      string[] (optional)
 *   minPrice:           number (optional)
 *   maxPrice:           number (optional)
 *   saveSearchId:       string (optional — save results to an existing search)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const zipCodes: string[] = body.zipCodes;
    if (!zipCodes?.length) {
      return NextResponse.json({ error: "zipCodes is required" }, { status: 400 });
    }

    const params: DomSearchParams = {
      zipCodes,
      redMultiplier: body.redMultiplier ?? 2.0,
      orangeMultiplier: body.orangeMultiplier ?? 1.5,
      charcoalMultiplier: body.charcoalMultiplier ?? 1.15,
      propertyTypes: body.propertyTypes || undefined,
      minPrice: body.minPrice || undefined,
      maxPrice: body.maxPrice || undefined,
    };

    // Get Trestle config (MLS) for this agent
    const { data: trestleInteg } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", user.id)
      .eq("provider", "trestle")
      .eq("status", "connected")
      .maybeSingle();

    const trestleConfig = trestleInteg?.config
      ? (typeof trestleInteg.config === "string" ? JSON.parse(trestleInteg.config) : trestleInteg.config)
      : null;

    // Get RentCast client as fallback
    let rentcastClient: RentcastClient | null = null;
    try {
      const { data: rcInteg } = await supabaseAdmin
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

    // Get cached market stats from area_data_cache for RentCast fallback
    let cachedMarketStats: Record<string, any> = {};
    try {
      const { data: cached } = await supabase
        .from("area_data_cache")
        .select("zip_code, data")
        .eq("data_type", "market_stats")
        .in("zip_code", zipCodes);

      if (cached) {
        for (const row of cached) {
          cachedMarketStats[row.zip_code] = row.data;
        }
      }
    } catch {
      // Cache miss is fine
    }

    // Run the search
    const searchResult = await runDomSearch(params, {
      trestleConfig,
      rentcastClient,
      cachedMarketStats,
    });

    // If saveSearchId provided, persist results to DB
    if (body.saveSearchId) {
      try {
        // Delete old results for this search
        await supabaseAdmin
          .from("dom_prospect_results")
          .delete()
          .eq("search_id", body.saveSearchId);

        // Insert new results
        if (searchResult.results.length > 0) {
          const rows = searchResult.results.map(r => ({
            search_id: body.saveSearchId,
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

          await supabaseAdmin.from("dom_prospect_results").insert(rows);
        }

        // Update last_run_at on the search
        await supabaseAdmin
          .from("dom_prospect_searches")
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.saveSearchId);
      } catch (err: any) {
        console.error("[DomSearch] Failed to save results:", err.message);
      }
    }

    // Summary counts
    const summary = {
      red: searchResult.results.filter(r => r.tier === "red").length,
      orange: searchResult.results.filter(r => r.tier === "orange").length,
      charcoal: searchResult.results.filter(r => r.tier === "charcoal").length,
    };

    return NextResponse.json({
      ...searchResult,
      summary,
      total: searchResult.results.length,
    });
  } catch (error: any) {
    console.error("[DomSearch] Error:", error);
    return NextResponse.json(
      { error: error.message || "DOM prospecting search failed" },
      { status: 500 }
    );
  }
}
