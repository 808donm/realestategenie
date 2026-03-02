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
 * GET - Search properties / get property detail from ATTOM API
 *
 * Supports all ATTOM resources, packages, and filter parameters:
 *
 * Identifiers: attomId, ID, fips + APN, address, address1 + address2
 * Geographic:  postalCode, latitude + longitude + radius, geoID, geoIDV4
 * Filters:     propertyType, propertyIndicator, beds, bathsTotal,
 *              universalSize, lotSize1/2, yearBuilt, assessment values,
 *              AVM value, sale amount/date, tax amount, absenteeowner,
 *              calendarDate, addedDate
 * Trends:      interval, year/month/quarter ranges
 * Pagination:  page, pagesize, orderby
 *
 * endpoint param selects the ATTOM resource+package to query (default: "expanded")
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

    // Build params from query string — string-valued filters
    const params: Record<string, any> = {};
    const stringKeys = [
      "address1", "address2", "address",
      "postalcode", "postalCode",
      "apn", "APN", "fips",
      "propertytype", "propertyType",
      "absenteeowner",
      "geoID", "geoIDV4", "geoidv4", "geoIdV4",
      "orderby",
      // Date ranges (string format YYYY/MM/DD)
      "startSaleSearchDate", "endSaleSearchDate",
      "startSaleTransDate", "endSaleTransDate",
      "startCalendarDate", "endCalendarDate",
      "startAddedDate", "endAddedDate",
      // Sales trend
      "interval", "startmonth", "endmonth",
      // Sales trend v4 filters
      "transactiontype",
    ];

    for (const key of stringKeys) {
      const val = searchParams.get(key);
      if (val) params[key] = val;
    }

    // Numeric-valued filters
    const numericKeys = [
      "attomId", "attomid", "ID",
      "latitude", "longitude", "radius",
      "propertyIndicator",
      // Beds & Baths
      "minBeds", "maxBeds",
      "minBathsTotal", "maxBathsTotal",
      // Size
      "minUniversalSize", "maxUniversalSize",
      "minLotSize1", "maxLotSize1",
      "minLotSize2", "maxLotSize2",
      "minYearBuilt", "maxYearBuilt",
      // Assessment
      "minApprImprValue", "maxApprImprValue",
      "minApprLandValue", "maxApprLandValue",
      "minApprTtlValue", "maxApprTtlValue",
      "minAssdImprValue", "maxAssdImprValue",
      "minAssdLandValue", "maxAssdLandValue",
      "minAssdTtlValue", "maxAssdTtlValue",
      "minMktImprValue", "maxMktImprValue",
      "minMktLandValue", "maxMktLandValue",
      "minMktTtlValue", "maxMktTtlValue",
      "minTaxAmt", "maxTaxAmt",
      // AVM
      "minAVMValue", "maxAVMValue",
      "minavmvalue", "maxavmvalue",
      // Sale
      "minSaleAmt", "maxSaleAmt",
      // Sales trend intervals
      "startyear", "endyear",
      "startQuarter", "endQuarter",
      // Pagination
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
      // ── Property Resource ────────────────────────────────────────────────
      case "id":
        result = await client.getPropertyDetail(params); // /property/id
        break;
      case "detail":
        result = await client.getPropertyDetail(params);
        break;
      case "detailowner":
        result = await client.getPropertyDetailOwner(params);
        break;
      case "detailmortgage":
        result = await client.getPropertyDetailMortgage(params);
        break;
      case "detailmortgageowner":
        result = await client.getPropertyDetailMortgageOwner(params);
        break;
      case "detailwithschools":
        result = await client.getPropertyDetailWithSchools(params);
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
      case "buildingpermits":
        result = await client.getBuildingPermits(params);
        break;

      // ── Assessment Resource ──────────────────────────────────────────────
      case "assessment":
        result = await client.getAssessmentDetail(params);
        break;
      case "assessmentsnapshot":
        result = await client.getAssessmentSnapshot(params);
        break;
      case "assessmenthistory":
        result = await client.getAssessmentHistory(params);
        break;

      // ── Sale Resource ────────────────────────────────────────────────────
      case "sale":
        result = await client.getSaleDetail(params);
        break;
      case "salesnapshot":
        result = await client.getSaleSnapshot(params);
        break;

      // ── Sales History Resource ───────────────────────────────────────────
      case "saleshistory":
        result = await client.getSalesHistory(params);
        break;
      case "saleshistorybasic":
        result = await client.getSalesHistoryBasic(params);
        break;
      case "saleshistoryexpanded":
        result = await client.getSalesHistoryExpanded(params);
        break;
      case "saleshistorysnapshot":
        result = await client.getSalesHistorySnapshot(params);
        break;

      // ── AVM Resource ─────────────────────────────────────────────────────
      case "avm":
        result = await client.getAvmSnapshot(params);
        break;
      case "attomavm":
        result = await client.getAttomAvmDetail(params);
        break;
      case "avmhistory":
        result = await client.getAvmHistory(params);
        break;

      // ── Valuation Resource ───────────────────────────────────────────────
      case "rentalavm":
        result = await client.getRentalAvm(params);
        break;
      case "homeequity":
        result = await client.getHomeEquity(params);
        break;

      // ── All Events Resource ──────────────────────────────────────────────
      case "allevents":
        result = await client.getAllEvents(params);
        break;

      // ── Sales Trend Resource ─────────────────────────────────────────────
      case "salestrend":
        result = await client.getSalesTrend(params);
        break;
      case "transactionsalestrend":
        result = await client.getTransactionSalesTrend(params);
        break;
      case "ibuyer":
        result = await client.getIBuyerTrends(params);
        break;
      case "marketanalytics":
        result = await client.getMarketAnalytics(params);
        break;

      // ── School Resource ──────────────────────────────────────────────────
      case "schools":
        result = await client.getSchoolSearch(params);
        break;
      case "schooldistrict":
        result = await client.getSchoolDistrict(params);
        break;
      case "schoolprofile":
        result = await client.getSchoolProfile(params);
        break;

      // ── Community / Neighborhood ─────────────────────────────────────────
      case "community":
        result = await client.getCommunityProfile(params);
        break;
      case "poi":
        result = await client.getPOISearch(params);
        break;
      case "poicategories":
        result = await client.getPOICategoryLookup();
        break;
      case "neighborhood":
        result = await client.getNeighborhoodProfile(params);
        break;

      // ── Hazard & Climate Risk ────────────────────────────────────────────
      case "hazardrisk":
        result = await client.getHazardRisk(params);
        break;
      case "climaterisk":
        result = await client.getClimateRisk(params);
        break;
      case "riskprofile":
        result = await client.getRiskProfile(params);
        break;

      // ── Recorder / Deeds ─────────────────────────────────────────────────
      case "recorder":
        result = await client.getRecorderDeed(params);
        break;

      // ── Boundaries ───────────────────────────────────────────────────────
      case "parcelboundary":
        result = await client.getParcelBoundary(params);
        break;
      case "schoolboundary":
        result = await client.getSchoolBoundary(params);
        break;
      case "neighborhoodboundary":
        result = await client.getNeighborhoodBoundary(params);
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
