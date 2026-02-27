import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AttomClient, createAttomClient } from "@/lib/integrations/attom-client";

/**
 * Helper: get a working ATTOM client (from DB config or env var)
 */
async function getAttomClient(): Promise<AttomClient> {
  // Try DB-stored integration first
  const { data: integration } = await supabaseAdmin
    .from("integrations")
    .select("config")
    .eq("provider", "attom")
    .eq("status", "connected")
    .limit(1)
    .maybeSingle();

  if (integration?.config) {
    const config =
      typeof integration.config === "string"
        ? JSON.parse(integration.config)
        : integration.config;

    if (config.api_key) {
      return new AttomClient({ apiKey: config.api_key });
    }
  }

  // Fall back to env var
  return createAttomClient();
}

/**
 * GET - Search properties / get property detail
 *
 * Query params:
 * - address1 + address2  (two-part address lookup)
 * - address              (single-line address)
 * - postalcode           (zip code area search)
 * - latitude + longitude + radius  (radius search)
 * - attomid              (direct lookup by ATTOM ID)
 * - endpoint: "detail" | "detailowner" | "profile" | "expanded" | "snapshot" | "assessment" |
 *             "assessmenthistory" | "sale" | "saleshistory" | "saleshistoryexpanded" |
 *             "avm" | "attomavm" | "rentalavm" | "allevents" |
 *             "community" | "schools" | "poi" | "neighborhood" |
 *             "buildingpermits" | "hazardrisk" | "climaterisk" | "riskprofile" |
 *             "recorder" | "parcelboundary" | "schoolboundary" | "neighborhoodboundary" |
 *             "salestrend" | "ibuyer" | "marketanalytics" (default: "expanded")
 * - propertytype         (SFR, APARTMENT, CONDO, etc.)
 * - page, pagesize       (pagination)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get("endpoint") || "expanded";

    // Build params from query string
    const params: Record<string, any> = {};
    const passthrough = [
      "address1", "address2", "address", "postalcode", "apn", "fips",
      "propertytype", "startSaleSearchDate", "endSaleSearchDate",
      "geoidv4", "orderby", "absenteeowner",
    ];

    for (const key of passthrough) {
      const val = searchParams.get(key);
      if (val) params[key] = val;
    }

    const numericKeys = [
      "attomid", "latitude", "longitude", "radius",
      "minBeds", "maxBeds", "minBaths", "maxBaths",
      "minBuildingSize", "maxBuildingSize",
      "minLotSize1", "maxLotSize1",
      "minYearBuilt", "maxYearBuilt",
      "minAssdTtlValue", "maxAssdTtlValue",
      "minavmvalue", "maxavmvalue",
      "page", "pagesize",
    ];

    for (const key of numericKeys) {
      const val = searchParams.get(key);
      if (val) params[key] = Number(val);
    }

    // Default pagination
    if (!params.pagesize) params.pagesize = 25;
    if (!params.page) params.page = 1;

    const client = await getAttomClient();

    let result;
    switch (endpoint) {
      case "detail":
        result = await client.getPropertyDetail(params);
        break;
      case "detailowner":
        result = await client.getPropertyDetailOwner(params);
        break;
      case "detailmortgageowner":
        result = await client.getPropertyDetailMortgageOwner(params);
        break;
      case "profile":
        result = await client.getPropertyBasicProfile(params);
        break;
      case "expanded":
        result = await client.getPropertyExpandedProfile(params);
        break;
      case "snapshot":
        result = await client.getPropertySnapshot(params);
        break;
      case "assessment":
        result = await client.getAssessmentDetail(params);
        break;
      case "sale":
        result = await client.getSaleDetail(params);
        break;
      case "saleshistory":
        result = await client.getSalesHistory(params);
        break;
      case "avm":
        result = await client.getAvmDetail(params);
        break;
      case "allevents":
        result = await client.getAllEvents(params);
        break;
      case "community":
        result = await client.getCommunityProfile(params);
        break;
      case "schools":
        result = await client.getSchoolSearch(params);
        break;
      case "poi":
        result = await client.getPOISearch(params);
        break;
      case "neighborhood":
        result = await client.getNeighborhoodProfile(params);
        break;

      // ── Previously unexposed existing endpoints ────────────────────────
      case "assessmenthistory":
        result = await client.getAssessmentHistory(params);
        break;
      case "saleshistoryexpanded":
        result = await client.getSalesHistoryExpanded(params);
        break;
      case "attomavm":
        result = await client.getAttomAvmDetail(params);
        break;

      // ── Building Permits ───────────────────────────────────────────────
      case "buildingpermits":
        result = await client.getBuildingPermits(params);
        break;

      // ── Hazard & Climate Risk ──────────────────────────────────────────
      case "hazardrisk":
        result = await client.getHazardRisk(params);
        break;
      case "climaterisk":
        result = await client.getClimateRisk(params);
        break;
      case "riskprofile":
        result = await client.getRiskProfile(params);
        break;

      // ── Rental AVM ─────────────────────────────────────────────────────
      case "rentalavm":
        result = await client.getRentalAvm(params);
        break;

      // ── Recorder / Deeds ───────────────────────────────────────────────
      case "recorder":
        result = await client.getRecorderDeed(params);
        break;

      // ── Boundaries ─────────────────────────────────────────────────────
      case "parcelboundary":
        result = await client.getParcelBoundary(params);
        break;
      case "schoolboundary":
        result = await client.getSchoolBoundary(params);
        break;
      case "neighborhoodboundary":
        result = await client.getNeighborhoodBoundary(params);
        break;

      // ── Sale Snapshot (recent sales in area) ─────────────────────────
      case "salesnapshot":
        result = await client.getSaleSnapshot(params);
        break;

      // ── Sales Trends & Analytics ───────────────────────────────────────
      case "salestrend":
        result = await client.getSalesTrend(params);
        break;
      case "ibuyer":
        result = await client.getIBuyerTrends(params);
        break;
      case "marketanalytics":
        result = await client.getMarketAnalytics(params);
        break;

      default:
        result = await client.getPropertyExpandedProfile(params);
    }

    return NextResponse.json({
      success: true,
      endpoint,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching ATTOM property:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch property data" },
      { status: 500 }
    );
  }
}
