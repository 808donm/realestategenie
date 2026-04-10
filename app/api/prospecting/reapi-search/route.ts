import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getReapiClient, mapReapiToAttomShape } from "@/lib/integrations/reapi-client";
import { scoreLead } from "@/lib/bird-dog/bird-dog-engine";

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
    const size = Math.min(Number(params.get("size") || "50"), 250);

    if (!zip) return NextResponse.json({ error: "zip is required" }, { status: 400 });

    // Build REAPI search criteria based on prospecting mode
    const criteria: Record<string, any> = {
      zip,
      size,
      state: "HI",
    };

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
    const allIds = idsResult.data.map((item: any) =>
      typeof item === "number" || typeof item === "string" ? String(item) : String(item.id || ""),
    ).filter(Boolean);

    if (allIds.length === 0) {
      return NextResponse.json({ properties: [], total: 0, scanned: 0, mode });
    }

    // Step 2: Get full details for top results (capped at size)
    const idsToFetch = allIds.slice(0, Math.min(size, 50)); // Cap at 50 detail calls
    const properties: any[] = [];
    const errors: string[] = [];

    for (const id of idsToFetch) {
      try {
        const detail = await reapi.getPropertyDetail({ id: Number(id), prior_owner: true, comps: false });
        if (detail.data) {
          const mapped = mapReapiToAttomShape(detail.data);
          const raw = detail.data as any;
          const score = scoreLead({ ...mapped, ...raw });

          // Post-filter by min years owned
          if (minYearsOwned && raw.ownerInfo?.ownershipLength) {
            const yearsOwned = raw.ownerInfo.ownershipLength / 12;
            if (yearsOwned < minYearsOwned) continue;
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
      } catch (err: any) {
        errors.push(`ID ${id}: ${err.message}`);
        if (errors.length >= 3) break;
      }
    }

    // Sort by lead score (hot first) then by equity
    const sortOrder = { hot: 0, warm: 1, cold: 2 };
    properties.sort((a, b) => {
      const scoreA = sortOrder[a._leadScore?.score as keyof typeof sortOrder] ?? 3;
      const scoreB = sortOrder[b._leadScore?.score as keyof typeof sortOrder] ?? 3;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return (b._reapi?.estimatedEquity || 0) - (a._reapi?.estimatedEquity || 0);
    });

    console.log(`[Prospecting] REAPI ${mode} search for ${zip}: ${allIds.length} total, ${properties.length} fetched, ${errors.length} errors`);

    return NextResponse.json({
      properties,
      total: idsResult.resultCount || allIds.length,
      fetched: properties.length,
      scanned: allIds.length,
      mode,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("[Prospecting] REAPI search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
