import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";
import { generateCMA, generateCMAFromFallback } from "@/lib/mls/cma-engine";
import { getConfiguredRentcastClient, getConfiguredRealieClient } from "@/lib/integrations/property-data-service";
import {
  buildPropertyCacheKey,
  propertyCacheGet,
  propertyCacheSet,
  propertyDbRead,
  propertyDbWrite,
} from "@/lib/integrations/property-data-cache";

/**
 * POST /api/mls/cma
 *
 * Feature 3: On-Demand CMA (Comparative Market Analysis)
 *
 * Generates a CMA report by pulling comps from the MLS first,
 * then falling back to RentCast and Realie if MLS returns no comps.
 *
 * Body: {
 *   postalCode: string (required)
 *   city?: string
 *   address?: string
 *   listPrice?: number
 *   beds?: number
 *   baths?: number
 *   sqft?: number
 *   yearBuilt?: number
 *   propertyType?: string
 *   save?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { postalCode, city, address, listPrice, beds, baths, sqft, yearBuilt, propertyType, save } = body;

    if (!postalCode?.trim()) {
      return NextResponse.json({ error: "Postal code is required" }, { status: 400 });
    }

    const cmaOptions = {
      postalCode: postalCode.trim(),
      city: city?.trim(),
      subjectAddress: address?.trim(),
      subjectListPrice: listPrice ? Number(listPrice) : undefined,
      subjectBeds: beds ? Number(beds) : undefined,
      subjectBaths: baths ? Number(baths) : undefined,
      subjectSqft: sqft ? Number(sqft) : undefined,
      subjectYearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
      subjectPropertyType: propertyType,
    };

    // Build a cache key for this CMA request
    const cacheParams: Record<string, any> = {
      postalCode: postalCode.trim(),
      ...(address ? { address: address.trim() } : {}),
      ...(beds ? { beds } : {}),
      ...(baths ? { baths } : {}),
      ...(propertyType ? { propertyType } : {}),
    };
    const cacheKey = buildPropertyCacheKey("unified", "cma", cacheParams);

    // 0. Check cache first (memory, then DB)
    const memoryCached = propertyCacheGet(cacheKey);
    if (memoryCached && memoryCached.data?.comps?.length > 0) {
      console.log(`[CMA] Memory cache hit: ${memoryCached.data.comps.length} comps`);
      return NextResponse.json({ success: true, report: memoryCached.data, cacheHit: "memory" });
    }

    const dbCached = await propertyDbRead(cacheKey, "cma");
    if (dbCached && dbCached.data?.comps?.length > 0) {
      console.log(`[CMA] DB cache hit: ${dbCached.data.comps.length} comps`);
      propertyCacheSet(cacheKey, dbCached.data, dbCached.source as any);
      return NextResponse.json({ success: true, report: dbCached.data, cacheHit: "db" });
    }

    // 1. Try MLS (Trestle) first
    let report;
    const client = await getTrestleClient(supabase, user.id);
    if (client) {
      report = await generateCMA(client, cmaOptions);
    }

    // 2. If MLS returned zero comps, fall back to RentCast + Realie
    if (!report || report.comps.length === 0) {
      console.log(`[CMA] MLS returned 0 comps for ${postalCode}, trying RentCast + Realie fallback`);
      const [rcClient, realieClient] = await Promise.all([
        getConfiguredRentcastClient(),
        getConfiguredRealieClient(),
      ]);
      const fallbackReport = await generateCMAFromFallback({
        ...cmaOptions,
        rentcastClient: rcClient || undefined,
        realieClient: realieClient || undefined,
      });
      if (fallbackReport && fallbackReport.comps.length > 0) {
        report = fallbackReport;
      }
    }

    // Cache the result if we got comps
    if (report && report.comps.length > 0) {
      propertyCacheSet(cacheKey, report, "unified");
      propertyDbWrite(cacheKey, "cma", report, "unified").catch(() => {});
    }

    if (!report) {
      return NextResponse.json({
        success: true,
        report: {
          subjectAddress: address || "",
          subjectCity: city || "",
          subjectPostalCode: postalCode,
          subjectListPrice: listPrice || null,
          subjectBeds: beds || null,
          subjectBaths: baths || null,
          subjectSqft: sqft || null,
          subjectYearBuilt: yearBuilt || null,
          subjectPropertyType: propertyType || null,
          comps: [],
          stats: { totalComps: 0, activeComps: 0, pendingComps: 0, soldComps: 0, avgListPrice: 0, medianListPrice: 0, avgClosePrice: 0, medianClosePrice: 0, avgPricePerSqft: 0, medianPricePerSqft: 0, avgDOM: 0, medianDOM: 0, suggestedPriceLow: 0, suggestedPriceHigh: 0, listToSaleRatio: 0 },
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // Optionally save to database
    let savedId: string | null = null;
    if (save) {
      const { data: saved } = await supabase
        .from("cma_reports")
        .insert({
          agent_id: user.id,
          subject_address: report.subjectAddress,
          subject_city: report.subjectCity,
          subject_postal_code: report.subjectPostalCode,
          subject_listing_key: null,
          subject_list_price: report.subjectListPrice,
          subject_beds: report.subjectBeds,
          subject_baths: report.subjectBaths,
          subject_sqft: report.subjectSqft,
          subject_year_built: report.subjectYearBuilt,
          subject_property_type: report.subjectPropertyType,
          comps: report.comps,
          stats: report.stats,
        })
        .select("id")
        .single();

      savedId = saved?.id || null;
    }

    return NextResponse.json({
      success: true,
      report,
      savedId,
    });
  } catch (error) {
    console.error("Error generating CMA:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CMA generation failed" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/mls/cma - List saved CMA reports
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: reports } = await supabase
      .from("cma_reports")
      .select("id, subject_address, subject_city, subject_postal_code, subject_list_price, stats, created_at")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ reports: reports || [] });
  } catch (error) {
    console.error("Error listing CMA reports:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list reports" },
      { status: 500 },
    );
  }
}
