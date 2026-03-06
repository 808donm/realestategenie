import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AttomClient, createAttomClient, normalizeAttomProperty } from "@/lib/integrations/attom-client";
import {
  RealieClient, createRealieClient,
  mapAttomParamsToRealie, mapRealieToAttomShape,
} from "@/lib/integrations/realie-client";
import {
  buildPropertyCacheKey, propertyCacheGet, propertyCacheSet,
  propertyDiskRead, propertyDiskWrite,
  mergePropertyData,
} from "@/lib/integrations/property-data-cache";

// ── ATTOM-only endpoints (not available in Realie) ─────────────────────────
const ATTOM_ONLY_ENDPOINTS = new Set([
  "rentalavm", "homeequity",
  // AVM endpoints: Realie already returns AVM (modelValue/modelValueMin/
  // modelValueMax) in every property response, so standalone AVM lookups
  // should go to ATTOM directly to avoid burning Realie tokens.
  "avm", "attomavm", "avmhistory",
  "neighborhood", "community", "poi", "poicategories",
  "schools", "schooldistrict", "schoolprofile",
  "hazardrisk", "climaterisk", "riskprofile",
  "salestrend", "transactionsalestrend", "ibuyer", "marketanalytics",
  "preforeclosure", "recorder", "allevents",
  "schoolboundary", "neighborhoodboundary",
  "buildingpermits", "detailwithschools",
]);

// ── Realie-capable endpoints (property data we can get from Realie) ────────
const REALIE_CAPABLE_ENDPOINTS = new Set([
  "expanded", "detail", "detailowner", "detailmortgage",
  "detailmortgageowner", "profile", "snapshot", "id",
  "assessment", "assessmentsnapshot", "assessmenthistory",
  "sale", "salesnapshot", "saleshistory", "saleshistorybasic",
  "saleshistoryexpanded", "saleshistorysnapshot",
  // avm/attomavm/avmhistory moved to ATTOM_ONLY — Realie already embeds AVM
  "parcelboundary",
  "comparables",
]);

// ── Non-disclosure states ──────────────────────────────────────────────────
// These states do not require public disclosure of real estate sale prices.
// Comparables and sale data may be limited or unavailable.
const NON_DISCLOSURE_STATES = new Set([
  "AK", "HI", "ID", "IN", "KS", "LA", "ME", "MS", "MO",
  "MT", "NM", "ND", "SD", "TX", "UT", "WY",
]);

/**
 * Helper: get a working ATTOM client (from DB config or env var)
 */
async function getAttomClient(): Promise<AttomClient | null> {
  try {
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
  } catch {
    return null;
  }
}

/**
 * Helper: get a working Realie client (from DB config or env var)
 */
async function getRealieClient(): Promise<RealieClient | null> {
  try {
    // Try DB-stored integration first
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("config")
      .eq("provider", "realie")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (integration?.config) {
      const config =
        typeof integration.config === "string"
          ? JSON.parse(integration.config)
          : integration.config;

      if (config.api_key) {
        return new RealieClient({ apiKey: config.api_key });
      }
    }

    // Fall back to env var
    return createRealieClient();
  } catch {
    return null;
  }
}

/**
 * Fetch property data from Realie, mapped to ATTOM-compatible shape.
 * Returns null if Realie is unavailable or doesn't support this query.
 */
async function fetchFromRealie(
  endpoint: string,
  params: Record<string, any>
): Promise<any | null> {
  const realieParams = mapAttomParamsToRealie(endpoint, params);
  if (!realieParams) return null;

  const client = await getRealieClient();
  if (!client) return null;

  try {
    let response;

    if (endpoint === "comparables" && realieParams.latitude && realieParams.longitude) {
      response = await client.getComparables({
        latitude: realieParams.latitude,
        longitude: realieParams.longitude,
        radius: realieParams.radius,
        timeFrame: realieParams.timeFrame,
        maxResults: realieParams.maxResults,
      });
    } else if (realieParams.address) {
      response = await client.searchByAddress({
        address: realieParams.address,
        state: realieParams.state,
        city: realieParams.city,
        zip: realieParams.zip,
        page: realieParams.page,
        limit: realieParams.limit,
      });
    } else if (realieParams.zip) {
      response = await client.searchByZip(realieParams);
    } else if (realieParams.latitude && realieParams.longitude) {
      response = await client.searchByRadius({
        latitude: realieParams.latitude,
        longitude: realieParams.longitude,
        radius: realieParams.radius || 1,
        page: realieParams.page,
        limit: realieParams.limit,
        property_type: realieParams.property_type,
      });
    } else if (realieParams.apn && realieParams.fips) {
      response = await client.getByApn(realieParams.apn, realieParams.fips);
    } else {
      return null;
    }

    if (!response?.properties || response.properties.length === 0) {
      console.log(`[Realie] No results for ${endpoint}`);
      return null;
    }

    // Map Realie parcels to ATTOM-compatible property shape
    const properties = response.properties.map(mapRealieToAttomShape);

    console.log(`[Realie] Got ${properties.length} properties for ${endpoint}`);

    return {
      status: {
        version: "realie-v1",
        code: 0,
        msg: "Success",
        total: response.metadata?.count || properties.length,
        page: response.metadata?.offset ? Math.floor(response.metadata.offset / (response.metadata.limit || 25)) + 1 : 1,
        pagesize: response.metadata?.limit || properties.length,
      },
      property: properties,
    };
  } catch (error) {
    console.error(`[Realie] Error fetching ${endpoint}:`, error);
    return null;
  }
}

/**
 * Fetch property data from ATTOM.
 */
async function fetchFromAttom(
  client: AttomClient,
  endpoint: string,
  params: Record<string, any>
): Promise<any> {
  let result;
  switch (endpoint) {
    // ── Property Resource ────────────────────────────────────────────────
    case "id":
      result = await client.getPropertyDetail(params);
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

    // ── Pre-Foreclosure ──────────────────────────────────────────────────
    case "preforeclosure":
      result = await client.getPreForeclosureDetail(params);
      break;

    // ── Sale Comparables ──────────────────────────────────────────────────
    case "comparables": {
      result = await client.getSaleComparablesByAttomId(params);
      const rawProps = result?.RESPONSE_GROUP?.RESPONSE?.RESPONSE_DATA
        ?.PROPERTY_INFORMATION_RESPONSE_ext?.SUBJECT_PROPERTY_ext?.PROPERTY;
      if (Array.isArray(rawProps) && rawProps.length > 0) {
        const normalized = rawProps.map((raw: any, idx: number) => {
          const src = idx === 0 ? raw : (raw.COMPARABLE_PROPERTY_ext || raw);
          const street = src["@_StreetAddress"] || "";
          const city = src["@_City"] || "";
          const state = src["@_State"] || "";
          const zip = src["@_PostalCode"] || "";
          const sh = src.SALES_HISTORY || {};
          const st = src.STRUCTURE || {};
          return {
            identifier: {
              attomId: Number(src._IDENTIFICATION?.["@RTPropertyID_ext"]) || undefined,
              fips: src._IDENTIFICATION?.["@CountyFIPSName_ext"],
              apn: src._IDENTIFICATION?.["@AssessorsParcelIdentifier"]
                || src._IDENTIFICATION?.["@AssessorsSecondParcelIdentifier"],
            },
            address: {
              oneLine: [street, city, state, zip].filter(Boolean).join(", "),
              line1: street,
              locality: city,
              countrySubd: state,
              postal1: zip,
            },
            sale: {
              amount: {
                saleAmt: Number(sh["@PropertySalesAmount"]) || undefined,
                saleTransDate: sh["@PropertySalesDate"] || sh["@TransferDate_ext"] || undefined,
                saleRecDate: sh["@PropertySalesDate"] || sh["@TransferDate_ext"] || undefined,
              },
              calculation: {
                pricePerSizeUnit: Number(sh["@PricePerSquareFootAmount"]) || undefined,
              },
            },
            building: {
              size: {
                livingSize: Number(st["@GrossLivingAreaSquareFeetCount"]) || undefined,
                universalSize: Number(st["@GrossLivingAreaSquareFeetCount"]) || undefined,
              },
              rooms: {
                beds: Number(st["@TotalBedroomCount"]) || undefined,
                bathsFull: Number(st["@TotalBathroomCount"]) || undefined,
                bathsTotal: Number(st["@TotalBathroomCount"]) || undefined,
              },
              summary: {
                yearBuilt: Number(st.STRUCTURE_ANALYSIS?.["@PropertyStructureBuiltYear"]) || undefined,
              },
            },
            lot: {
              lotSize1: Number(src.SITE?.["@LotSquareFeetCount"]) || undefined,
            },
            owner: {
              owner1: {
                fullName: src._OWNER?.["@_Name"] || undefined,
              },
              owner2: {
                fullName: src._OWNER?.["@_SecondaryOwnerName_ext"] || undefined,
              },
              mailingAddressOneLine: src.MAILING_ADDRESS_ext
                ? [src.MAILING_ADDRESS_ext["@_StreetAddress"], src.MAILING_ADDRESS_ext["@_City"],
                   src.MAILING_ADDRESS_ext["@_State"], src.MAILING_ADDRESS_ext["@_PostalCode"]]
                  .filter(Boolean).join(", ")
                : undefined,
            },
            assessment: {
              assessed: {
                assdTtlValue: Number(src._TAX?.["@_TotalAssessedValueAmount"]) || undefined,
              },
              market: {
                mktTtlValue: Number(src._TAX?.["@_AssessorMarketValue_ext"]) || undefined,
              },
            },
            proximity: idx > 0 ? {
              distanceFromSubject: Number(src["@DistanceFromSubjectPropertyMilesCount"]) || undefined,
            } : undefined,
          };
        });
        result = { property: normalized };
      }
      break;
    }

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

  // Normalize property data: expandedprofile nests owner/mortgage inside assessment
  if (result?.property && Array.isArray(result.property)) {
    result = {
      ...result,
      property: result.property.map(normalizeAttomProperty),
    };
  }

  return result;
}

/**
 * GET - Search properties / get property detail
 *
 * Strategy: Realie.ai first for property data, ATTOM for supplemental/missing data.
 * All results cached for 7 days regardless of source.
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
 * endpoint param selects the resource+package to query (default: "expanded")
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

    // source=attom: skip Realie entirely (saves Realie tokens for supplement calls)
    const preferredSource = searchParams.get("source") || "auto";

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
      // Comparables
      "timeFrame", "maxResults",
      // Pagination
      "page", "pagesize",
    ];

    for (const key of numericKeys) {
      const val = searchParams.get(key);
      if (val) params[key] = Number(val);
    }

    // Default pagination (only for endpoints that support it)
    if (!params.pagesize) params.pagesize = 25;
    if (!params.page) params.page = 1;

    // Valuation and single-property endpoints reject pagination params.
    const noPaginationEndpoints = ["rentalavm", "homeequity", "comparables"];
    if (noPaginationEndpoints.includes(endpoint)) {
      delete params.pagesize;
      delete params.page;
    }

    // ── Unified 7-Day Cache ───────────────────────────────────────────────
    // All property data cached for 7 days regardless of source (Realie or ATTOM).
    // New zip codes / properties get fetched fresh and added to cache.
    // Cache refreshes weekly.
    const cacheKey = buildPropertyCacheKey("unified", endpoint, params);

    // Layer 1: in-memory cache (fastest)
    const memoryCached = propertyCacheGet(cacheKey);
    if (memoryCached) {
      return NextResponse.json(memoryCached.data, {
        headers: {
          "X-Property-Cache": "MEMORY",
          "X-Property-Source": memoryCached.source,
        },
      });
    }

    // Layer 2: disk cache (persists across restarts, shared across users)
    const diskCached = propertyDiskRead(cacheKey, "unified");
    if (diskCached) {
      const payload = { success: true, endpoint, ...diskCached.data };
      propertyCacheSet(cacheKey, payload, diskCached.source as any); // promote to memory
      return NextResponse.json(payload, {
        headers: {
          "X-Property-Cache": "DISK",
          "X-Property-Source": diskCached.source,
        },
      });
    }

    // ── Layer 3: API calls ──────────────────────────────────────────────
    // Strategy: Realie first for property data, ATTOM for gaps + exclusive data
    let result: any = null;
    let dataSource: "realie" | "attom" | "merged" = "attom";

    if (ATTOM_ONLY_ENDPOINTS.has(endpoint)) {
      // ── ATTOM-only endpoints (neighborhood, schools, risk, trends, etc.)
      const attomClient = await getAttomClient();
      if (!attomClient) {
        return NextResponse.json(
          { error: "No property data provider configured" },
          { status: 503 }
        );
      }
      result = await fetchFromAttom(attomClient, endpoint, params);
      dataSource = "attom";

    } else if (REALIE_CAPABLE_ENDPOINTS.has(endpoint)) {
      // ── Realie-first for property data endpoints (unless source=attom)
      const realieResult = preferredSource === "attom"
        ? null
        : await fetchFromRealie(endpoint, params);

      if (realieResult?.property?.length > 0) {
        result = realieResult;
        dataSource = "realie";

        // Realie returns comprehensive property data (owner, mortgage,
        // assessment, AVM, building, lot) — no ATTOM supplement needed.
        // ATTOM is only needed for its exclusive endpoints (neighborhood,
        // schools, hazard/risk, trends) which go through ATTOM_ONLY_ENDPOINTS.
        console.log(`[PropertyData] Realie returned ${result.property.length} properties for ${endpoint} — skipping ATTOM supplement`);
      } else {
        // Realie didn't return data — fall back entirely to ATTOM
        console.log(`[PropertyData] Realie returned no data for ${endpoint}, falling back to ATTOM`);
        const attomClient = await getAttomClient();
        if (!attomClient) {
          return NextResponse.json(
            { error: "No property data provider configured" },
            { status: 503 }
          );
        }
        result = await fetchFromAttom(attomClient, endpoint, params);
        dataSource = "attom";
      }
    } else {
      // Unknown endpoint — try ATTOM directly
      const attomClient = await getAttomClient();
      if (!attomClient) {
        return NextResponse.json(
          { error: "No property data provider configured" },
          { status: 503 }
        );
      }
      result = await fetchFromAttom(attomClient, endpoint, params);
      dataSource = "attom";
    }

    // ── Handle empty results with helpful messaging ───────────────────
    const hasResults = result?.property?.length > 0;
    if (!hasResults) {
      // Try to detect the state from params or result for non-disclosure messaging
      const stateHint =
        params.address2?.match(/\b([A-Z]{2})\b/)?.[1] ||
        params.address?.match(/,\s*([A-Z]{2})\s*\d{0,5}\s*$/)?.[1] ||
        result?.property?.[0]?.address?.countrySubd;

      const isNonDisclosure = stateHint && NON_DISCLOSURE_STATES.has(stateHint);

      let message = "No properties found matching your search criteria.";
      if (endpoint === "comparables") {
        message = isNonDisclosure
          ? `${stateHint} is a non-disclosure state — sale prices are not publicly recorded. ` +
            "Comparable sale data is limited. Try using assessed values or AVM estimates instead."
          : "No comparable properties found. Try increasing the search radius or time frame.";
      } else if (
        ["sale", "salesnapshot", "saleshistory", "saleshistorybasic",
         "saleshistoryexpanded", "saleshistorysnapshot"].includes(endpoint)
      ) {
        message = isNonDisclosure
          ? `${stateHint} is a non-disclosure state — sale prices are not publicly recorded. ` +
            "Transfer dates and parties may still be available, but dollar amounts are typically not disclosed."
          : "No sales records found for this property.";
      }

      return NextResponse.json(
        { success: true, endpoint, property: [], message, nonDisclosureState: isNonDisclosure || false },
        { headers: { "X-Property-Cache": "API", "X-Property-Source": dataSource } },
      );
    }

    // Store in unified 7-day cache (memory + disk)
    const responsePayload = { success: true, endpoint, ...result };
    propertyCacheSet(cacheKey, responsePayload, dataSource);
    propertyDiskWrite(cacheKey, "unified", result, dataSource);

    return NextResponse.json(responsePayload, {
      headers: {
        "X-Property-Cache": "API",
        "X-Property-Source": dataSource,
      },
    });
  } catch (error) {
    console.error("Error fetching property data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch property data" },
      { status: 500 }
    );
  }
}
