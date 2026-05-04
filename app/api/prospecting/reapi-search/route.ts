import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getReapiClient, mapReapiToAttomShape } from "@/lib/integrations/reapi-client";
import { scoreLead } from "@/lib/bird-dog/bird-dog-engine";
import { resolveStateFromZip } from "@/lib/zip-to-state";

/**
 * GET /api/prospecting/reapi-search
 *
 * REAPI-powered prospecting search that replaces the Realie/RentCast pipeline.
 * Returns properties with full financial data (value, equity, mortgage, owner)
 * that the old pipeline couldn't provide for Hawaii (non-disclosure state).
 *
 * Query params:
 *   zip          — ZIP code (required)
 *   mode         — absentee, equity, foreclosure, investor (default: absentee)
 *   propertyType — SFR, CONDO, MFR, LAND
 *   minYearsOwned — minimum ownership years
 *   minAvm       — minimum property value
 *   size         — results per page (default 50, max 250)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const reapi = getReapiClient();
    if (!reapi) return NextResponse.json({ error: "Property data API not configured" }, { status: 503 });

    const params = request.nextUrl.searchParams;
    const zip = params.get("zip");
    const mode = params.get("mode") || "absentee";
    const propertyType = params.get("propertyType");
    const minYearsOwned = params.get("minYearsOwned") ? Number(params.get("minYearsOwned")) : undefined;
    const minAvm = params.get("minAvm") ? Number(params.get("minAvm")) : undefined;
    const minEquity = params.get("minEquity") ? Number(params.get("minEquity")) : undefined;
    const size = Math.min(Number(params.get("size") || "250"), 500);

    if (!zip) return NextResponse.json({ error: "zip is required" }, { status: 400 });

    // Build REAPI search criteria based on prospecting mode
    // Always request a large pool of IDs (free) to get enough results after filtering
    const hasPostFilter = minYearsOwned || minEquity;
    const searchSize = hasPostFilter ? Math.min(size * 3, 1500) : Math.min(size * 2, 1000);

    // Derive state from the ZIP prefix. REAPI's search treats ZIP as a
    // hint, not a unique key — without `state` it can return matches from
    // the wrong region or none at all. Hardcoding "HI" was a leftover
    // from the Hawaii-only era and broke every mainland search.
    const state = resolveStateFromZip(zip);

    const criteria: Record<string, any> = {
      zip,
      size: searchSize,
    };
    if (state) criteria.state = state;

    if (propertyType) criteria.property_type = propertyType;
    if (minAvm) criteria.value_min = minAvm;

    switch (mode) {
      case "absentee":
        criteria.absentee_owner = true;
        break;
      case "equity":
        criteria.high_equity = true;
        break;
      case "foreclosure":
        criteria.pre_foreclosure = true;
        break;
      case "investor":
        criteria.absentee_owner = true; // Investors are typically absentee
        break;
      default:
        criteria.absentee_owner = true;
    }

    // Step 1: Get property IDs (FREE)
    const idsResult = await reapi.searchPropertyIds(criteria as any);
    const allIdsRaw = idsResult.data
      .map((item: any) => (typeof item === "number" || typeof item === "string" ? String(item) : String(item.id || "")))
      .filter(Boolean);

    if (allIdsRaw.length === 0) {
      return NextResponse.json({ properties: [], total: 0, scanned: 0, mode });
    }

    // ── Dedup: exclude IDs the agent has seen for this (zip, mode, type)
    // tuple within the last 30 days. Lets agents build a call list across
    // multiple search passes without burning REAPI detail calls on the
    // same properties they already reviewed.
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const { data: alreadySeen } = await supabase
      .from("prospecting_fetched_ids")
      .select("attom_id")
      .eq("agent_id", user.id)
      .eq("zip", zip)
      .eq("mode", mode)
      .eq("property_type", propertyType || "")
      .gte("fetched_at", cutoffDate.toISOString())
      .limit(5000);

    const seenSet = new Set((alreadySeen || []).map((r) => r.attom_id));
    const allIds = allIdsRaw.filter((id) => !seenSet.has(id));
    const skippedCount = allIdsRaw.length - allIds.length;

    if (allIds.length === 0) {
      return NextResponse.json({
        properties: [],
        total: idsResult.resultCount || allIdsRaw.length,
        scanned: 0,
        skippedAlreadyReviewed: skippedCount,
        exhausted: true,
        mode,
      });
    }

    // Step 2: Get full details for top results.
    // Each detail call is METERED. Conservative caps to control spend:
    //   - target 25 results by default (was 100 — agents only review top
    //     results anyway, can re-run if they want more)
    //   - detail cap = 60 (was 200) without post-filter, 120 (was 300)
    //     with post-filter to allow rejection slack
    // The full result set is cached for 7 days so re-running the same
    // search is free.
    const detailCap = hasPostFilter ? Math.min(allIds.length, 120) : Math.min(allIds.length, 60);
    const targetResults = Math.min(size, 25);
    const idsToFetch = allIds.slice(0, detailCap);
    const properties: any[] = [];
    const errors: string[] = [];

    // Fetch details in parallel batches of 10 for speed (vs sequential)
    const BATCH_SIZE = 10;
    for (let i = 0; i < idsToFetch.length; i += BATCH_SIZE) {
      if (properties.length >= targetResults) break;

      const batch = idsToFetch.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((id) => reapi.getPropertyDetail({ id: Number(id), prior_owner: true, comps: false })),
      );

      for (let j = 0; j < batchResults.length; j++) {
        if (properties.length >= targetResults) break;
        const result = batchResults[j];
        if (result.status === "rejected") {
          errors.push(`ID ${batch[j]}: ${result.reason?.message || "Failed"}`);
          if (errors.length >= 5) break;
          continue;
        }

        const detail = result.value;
        if (detail.data) {
          const mapped = mapReapiToAttomShape(detail.data);
          const raw = detail.data as any;
          const score = scoreLead({ ...mapped, ...raw });

          // Post-filter by min years owned
          if (minYearsOwned && raw.ownerInfo?.ownershipLength) {
            const yearsOwned = raw.ownerInfo.ownershipLength / 12;
            if (yearsOwned < minYearsOwned) continue;
          }

          // Post-filter by min equity (dollar amount)
          if (minEquity && raw.estimatedEquity != null) {
            if (Number(raw.estimatedEquity) < minEquity) continue;
          }

          properties.push({
            ...mapped,
            _reapi: {
              id: raw.id,
              estimatedValue: raw.estimatedValue,
              estimatedEquity: raw.estimatedEquity,
              equityPercent: raw.equityPercent,
              openMortgageBalance: raw.openMortgageBalance,
              ownershipLength: raw.ownerInfo?.ownershipLength,
              absenteeOwner: raw.absenteeOwner,
              outOfStateAbsenteeOwner: raw.outOfStateAbsenteeOwner,
              highEquity: raw.highEquity,
              freeClear: raw.freeClear,
              vacant: raw.vacant,
              preForeclosure: raw.preForeclosure,
              inherited: raw.inherited,
              cashBuyer: raw.cashBuyer,
              investorBuyer: raw.investorBuyer,
            },
            _leadScore: score,
          });
        }
      }

      if (errors.length >= 5) break;
    }

    // Sort by lead score (hot first, then warm, then cold)
    // Within same tier, sort by number of reasons (more signals = stronger lead)
    // Then by equity as final tiebreaker
    const sortOrder = { hot: 0, warm: 1, cold: 2 };
    properties.sort((a, b) => {
      const scoreA = sortOrder[a._leadScore?.score as keyof typeof sortOrder] ?? 3;
      const scoreB = sortOrder[b._leadScore?.score as keyof typeof sortOrder] ?? 3;
      if (scoreA !== scoreB) return scoreA - scoreB;
      const reasonsA = a._leadScore?.reasons?.length || 0;
      const reasonsB = b._leadScore?.reasons?.length || 0;
      if (reasonsA !== reasonsB) return reasonsB - reasonsA;
      return (b._reapi?.estimatedEquity || 0) - (a._reapi?.estimatedEquity || 0);
    });

    console.log(
      `[Prospecting] REAPI ${mode} search for ${zip}: ${allIdsRaw.length} total, ${skippedCount} dedup-skipped, ${properties.length} fetched, ${errors.length} errors`,
    );

    // Persist the IDs we just returned so subsequent searches in the same
    // (zip, mode, type) context skip them. Use upsert with onConflict so
    // re-running an identical search (cache miss for some reason) is
    // idempotent rather than duplicating rows.
    if (properties.length > 0) {
      const fetchedRows = properties
        .map((p) => p._reapi?.id || p.identifier?.attomId)
        .filter(Boolean)
        .map((attomId) => ({
          agent_id: user.id,
          attom_id: String(attomId),
          zip,
          mode,
          property_type: propertyType || "",
        }));
      if (fetchedRows.length > 0) {
        supabase
          .from("prospecting_fetched_ids")
          .upsert(fetchedRows, { onConflict: "agent_id,attom_id,zip,mode,property_type" })
          .then(({ error: insertErr }) => {
            if (insertErr) console.warn("[Prospecting] Failed to record fetched IDs:", insertErr.message);
          });
      }
    }

    const response = {
      properties,
      total: idsResult.resultCount || allIdsRaw.length,
      fetched: properties.length,
      scanned: allIds.length,
      skippedAlreadyReviewed: skippedCount,
      mode,
      errors: errors.length > 0 ? errors : undefined,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Prospecting] REAPI search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
