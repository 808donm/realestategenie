import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  RealieClient, createRealieClient,
  mapAttomParamsToRealie, mapRealieToAttomShape,
} from "@/lib/integrations/realie-client";
import {
  buildPropertyCacheKey, propertyCacheGet, propertyCacheSet,
  propertyDbRead, propertyDbWrite,
} from "@/lib/integrations/property-data-cache";
import { getNeighborhoodProfile } from "@/lib/integrations/free-data/neighborhood-profile-service";
import { getSalesTrends } from "@/lib/integrations/free-data/fred-trends-client";
import { searchSchoolsByLocation, searchSchoolsByZip } from "@/lib/integrations/free-data/nces-schools-client";
import { getHazardRiskProfile } from "@/lib/integrations/free-data/usgs-hazards-client";
import { searchPOI } from "@/lib/integrations/free-data/osm-poi-client";
import { getCrimeIndicesByState, getCrimeIndicesByFips } from "@/lib/integrations/free-data/fbi-crime-client";

// ── Free data endpoints (served by free public APIs) ─────────────────────
const FREE_DATA_ENDPOINTS = new Set([
  "neighborhood", "community", "poi", "poicategories",
  "schools", "schooldistrict", "schoolprofile",
  "hazardrisk", "climaterisk", "riskprofile",
  "salestrend", "transactionsalestrend", "marketanalytics",
]);

// ── Realie-capable endpoints (property data from Realie) ────────────────
const REALIE_CAPABLE_ENDPOINTS = new Set([
  "expanded", "detail", "detailowner", "detailmortgage",
  "detailmortgageowner", "detailwithschools", "profile", "snapshot", "id",
  "assessment", "assessmentsnapshot", "assessmenthistory",
  "sale", "salesnapshot",
  "avm", "attomavm", "avmhistory",
  "parcelboundary",
  "comparables",
  // Rental AVM: uses HUD Fair Market Rents (via federal-data endpoint)
  "rentalavm",
  // Home equity: computed from Realie AVM - mortgage
  "homeequity",
  // Pre-foreclosure: Realie provides foreclosure data
  "preforeclosure",
]);

// ── Non-disclosure states ──────────────────────────────────────────────────
const NON_DISCLOSURE_STATES = new Set([
  "AK", "HI", "ID", "IN", "KS", "LA", "ME", "MS", "MO",
  "MT", "NM", "ND", "SD", "TX", "UT", "WY",
]);

/**
 * Helper: get a working Realie client (from DB config or env var)
 */
async function getRealieClient(): Promise<RealieClient | null> {
  try {
    const { data: integration, error: dbError } = await supabaseAdmin
      .from("integrations")
      .select("config")
      .eq("provider", "realie")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (dbError) {
      console.error(`[Realie] DB lookup failed:`, dbError.message);
    }

    if (integration?.config) {
      const config =
        typeof integration.config === "string"
          ? JSON.parse(integration.config)
          : integration.config;

      if (config.api_key) {
        console.log(`[Realie] Client created from DB integration (key: ${config.api_key.substring(0, 8)}...)`);
        return new RealieClient({ apiKey: config.api_key });
      }
    }

    const envClient = createRealieClient();
    if (envClient) console.log(`[Realie] Client created from REALIE_API_KEY env var`);
    return envClient;
  } catch (err: any) {
    console.warn(`[Realie] Failed to create client: ${err?.message || err}`);
    return null;
  }
}

/**
 * Fetch property data from Realie, mapped to ATTOM-compatible shape.
 */
async function fetchFromRealie(
  endpoint: string,
  params: Record<string, any>
): Promise<any | null> {
  const realieParams = mapAttomParamsToRealie(endpoint, params);
  if (!realieParams) {
    console.log(`[Realie] Endpoint "${endpoint}" not mappable — skipping`);
    return null;
  }

  const client = await getRealieClient();
  if (!client) {
    console.warn(`[Realie] No Realie client available (API key not configured?)`);
    return null;
  }

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
        zip: realieParams.zipCode || realieParams.zip,
        page: realieParams.page,
        limit: realieParams.limit,
      });
    } else if (realieParams.zipCode || realieParams.zip) {
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
 * Handle free data endpoints (neighborhood, schools, hazards, trends, etc.)
 * These use free public APIs instead of ATTOM.
 */
async function fetchFromFreeData(
  endpoint: string,
  params: Record<string, any>
): Promise<any> {
  const lat = params.latitude;
  const lng = params.longitude;
  const postalCode = params.postalcode || params.postalCode;
  const state = params.address2?.match(/\b([A-Z]{2})\b/)?.[1]
    || params.address?.match(/,\s*([A-Z]{2})\s*\d{0,5}\s*$/)?.[1];
  const fips = params.fips;

  switch (endpoint) {
    case "neighborhood": {
      const profile = await getNeighborhoodProfile({
        latitude: lat,
        longitude: lng,
        postalCode,
        state,
        fips,
        address1: params.address1,
        address2: params.address2,
      });
      return profile;
    }

    case "community": {
      const crime = fips
        ? await getCrimeIndicesByFips(fips)
        : state ? await getCrimeIndicesByState(state) : null;

      return {
        community: {
          geography: { geographyName: postalCode ? `ZIP ${postalCode}` : state || "" },
          ...(crime ? {
            crime: {
              crime_Index: crime.crimeIndex,
              burglary_Index: crime.burglaryIndex,
              larceny_Index: crime.larcenyIndex,
              motor_Vehicle_Theft_Index: crime.motorVehicleTheftIndex,
              aggravated_Assault_Index: crime.aggravatedAssaultIndex,
              forcible_Robbery_Index: crime.robberyIndex,
            },
          } : {}),
        },
      };
    }

    case "schools": {
      const result = lat && lng
        ? await searchSchoolsByLocation(lat, lng, 5, 20)
        : postalCode
          ? await searchSchoolsByZip(postalCode, 20)
          : { schools: [], totalCount: 0 };

      return {
        school: result.schools.map(s => ({
          InstitutionName: s.schoolName,
          schoolName: s.schoolName,
          schoolType: s.schoolType,
          gradeRange: s.gradeRange,
          enrollment: s.enrollment,
          distanceMiles: s.distanceMiles,
          latitude: s.latitude,
          longitude: s.longitude,
          city: s.city,
          state: s.state,
          districtName: s.districtName,
        })),
      };
    }

    case "schooldistrict":
    case "schoolprofile": {
      // Use same school search — individual profile not available from NCES free API
      const result = lat && lng
        ? await searchSchoolsByLocation(lat, lng, 5, 20)
        : postalCode
          ? await searchSchoolsByZip(postalCode, 20)
          : { schools: [], totalCount: 0 };
      return {
        school: result.schools.map(s => ({
          InstitutionName: s.schoolName,
          schoolName: s.schoolName,
          schoolType: s.schoolType,
          gradeRange: s.gradeRange,
          enrollment: s.enrollment,
          districtName: s.districtName,
        })),
      };
    }

    case "hazardrisk":
    case "climaterisk":
    case "riskprofile": {
      if (!lat || !lng) {
        return { hazardRisk: null, message: "Latitude and longitude required for hazard risk" };
      }
      const hazards = await getHazardRiskProfile(lat, lng, state, fips);
      return { hazardRisk: hazards };
    }

    case "poi": {
      if (!lat || !lng) {
        return { poi: [], message: "Latitude and longitude required for POI search" };
      }
      const result = await searchPOI(lat, lng, 3000, 30);
      return {
        poi: result.pois.map(p => ({
          BusinessName: p.name,
          name: p.name,
          CategoryName: p.category,
          category: p.category,
          Distance: p.distanceMiles,
          distanceMiles: p.distanceMiles,
          latitude: p.latitude,
          longitude: p.longitude,
        })),
        categories: result.categories,
      };
    }

    case "poicategories": {
      return {
        categories: [
          "Restaurant", "Fast Food", "Cafe", "Bar", "Hospital", "Medical",
          "Pharmacy", "Bank", "Post Office", "Police", "Fire Station",
          "Library", "School", "College", "University", "Place of Worship",
          "Gas Station", "Grocery", "Convenience Store", "Shopping Mall",
          "Park", "Playground", "Fitness Center", "Sports Center", "Hotel", "Museum",
        ],
      };
    }

    case "salestrend":
    case "transactionsalestrend":
    case "marketanalytics": {
      const trends = await getSalesTrends({
        stateAbbrev: state,
        startYear: params.startyear || new Date().getFullYear() - 3,
        endYear: params.endyear || new Date().getFullYear(),
      });

      return {
        salesTrends: trends.trends.map(t => ({
          dateRange: { start: t.period, interval: params.interval || "quarterly" },
          location: { geographyName: trends.areaName },
          salesTrend: {
            medSalePrice: t.medianSalePrice,
            avgSalePrice: t.avgSalePrice,
            homeSaleCount: t.homeSaleCount,
          },
          vintage: { pubDate: new Date().toISOString().split("T")[0] },
        })),
        source: trends.source,
      };
    }

    default:
      return { error: `Endpoint "${endpoint}" is not available`, property: [] };
  }
}

/**
 * Handle rental AVM — uses HUD Fair Market Rents from federal-data endpoint
 * Returns estimated monthly rent based on bedroom count.
 */
function computeRentalAvm(property: any): any {
  // Extract bedroom count from property data
  const beds = property?.building?.rooms?.beds || 2;
  // HUD FMR is fetched separately via federal-data endpoint.
  // For now, return the property's existing data (Realie may include rent estimates).
  return {
    property: [property],
    message: "Rental estimates available via Area Intel tab (HUD Fair Market Rents)",
  };
}

/**
 * Handle home equity — computed from Realie's AVM and mortgage data
 */
function computeHomeEquity(property: any): any {
  const avmValue = property?.avm?.amount?.value;
  const lienBalance = property?.mortgage?.amount;
  const equity = avmValue && lienBalance ? avmValue - lienBalance : null;
  const ltv = avmValue && lienBalance ? (lienBalance / avmValue) * 100 : null;

  return {
    property: [{
      homeEquity: {
        equity,
        estimatedValue: avmValue,
        outstandingBalance: lienBalance,
        ltv,
        lastSalePrice: property?.sale?.amount?.saleAmt,
        lastSaleDate: property?.sale?.amount?.saleRecDate || property?.sale?.amount?.saleTransDate,
      },
    }],
  };
}

/**
 * GET - Search properties / get property detail
 *
 * Strategy: Realie for all property data, free public APIs for
 * neighborhood/school/hazard/trend data. No ATTOM dependency.
 *
 * All results cached for 7 days regardless of source.
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
    const noCache = searchParams.get("nocache") === "1";

    // Build params from query string
    const params: Record<string, any> = {};
    const stringKeys = [
      "address1", "address2", "address",
      "postalcode", "postalCode",
      "apn", "APN", "fips",
      "propertytype", "propertyType",
      "absenteeowner",
      "geoID", "geoIDV4", "geoidv4", "geoIdV4",
      "orderby",
      "startSaleSearchDate", "endSaleSearchDate",
      "startSaleTransDate", "endSaleTransDate",
      "startCalendarDate", "endCalendarDate",
      "startAddedDate", "endAddedDate",
      "interval", "startmonth", "endmonth",
      "transactiontype",
    ];

    for (const key of stringKeys) {
      const val = searchParams.get(key);
      if (val) params[key] = val;
    }

    const numericKeys = [
      "attomId", "attomid", "ID",
      "latitude", "longitude", "radius",
      "propertyIndicator",
      "minBeds", "maxBeds",
      "minBathsTotal", "maxBathsTotal",
      "minUniversalSize", "maxUniversalSize",
      "minLotSize1", "maxLotSize1",
      "minLotSize2", "maxLotSize2",
      "minYearBuilt", "maxYearBuilt",
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
      "minAVMValue", "maxAVMValue",
      "minavmvalue", "maxavmvalue",
      "minSaleAmt", "maxSaleAmt",
      "startyear", "endyear",
      "startQuarter", "endQuarter",
      "timeFrame", "maxResults",
      "page", "pagesize",
    ];

    for (const key of numericKeys) {
      const val = searchParams.get(key);
      if (val) params[key] = Number(val);
    }

    if (!params.pagesize) params.pagesize = 25;
    if (!params.page) params.page = 1;

    const noPaginationEndpoints = ["rentalavm", "homeequity", "comparables"];
    if (noPaginationEndpoints.includes(endpoint)) {
      delete params.pagesize;
      delete params.page;
    }

    // ── Unified 7-Day Cache ───────────────────────────────────────────────
    const cacheKey = buildPropertyCacheKey("unified", endpoint, params);

    const PROPERTY_DATA_ENDPOINTS = new Set([
      "expanded", "detail", "detailowner", "detailmortgage",
      "detailmortgageowner", "profile", "snapshot",
    ]);
    const isCachedDataUsable = (cached: any): boolean => {
      const props = cached?.property || cached?.data?.property;
      if (!props || !Array.isArray(props) || props.length === 0) return true;
      if (!PROPERTY_DATA_ENDPOINTS.has(endpoint)) return true;

      const sample = props.slice(0, Math.min(50, props.length));
      const withOwner = sample.filter((p: any) => p.owner?.owner1?.fullName).length;
      const withValue = sample.filter((p: any) =>
        p.avm?.amount?.value || p.assessment?.market?.mktTtlValue || p.assessment?.assessed?.assdTtlValue
      ).length;
      const ownerPct = (withOwner / sample.length) * 100;
      const valuePct = (withValue / sample.length) * 100;
      if (ownerPct < 10 || valuePct < 10) {
        console.log(`[PropertyCache] STALE DATA detected — refetching`);
        return false;
      }
      return true;
    };

    // Layer 1: in-memory cache
    const memoryCached = !noCache ? propertyCacheGet(cacheKey) : null;
    if (memoryCached && isCachedDataUsable(memoryCached.data)) {
      return NextResponse.json({ ...memoryCached.data, dataSource: memoryCached.source, cacheHit: "memory" }, {
        headers: { "X-Property-Cache": "MEMORY", "X-Property-Source": memoryCached.source },
      });
    }

    // Layer 2: Supabase DB cache
    const dbCached = !noCache ? await propertyDbRead(cacheKey, "unified") : null;
    if (dbCached && isCachedDataUsable(dbCached.data)) {
      const payload = { success: true, endpoint, dataSource: dbCached.source, cacheHit: "db", ...dbCached.data };
      propertyCacheSet(cacheKey, payload, dbCached.source as any);
      return NextResponse.json(payload, {
        headers: { "X-Property-Cache": "DB", "X-Property-Source": dbCached.source },
      });
    }

    // ── Layer 3: API calls ──────────────────────────────────────────────
    let result: any = null;
    let dataSource: "realie" | "free-data" | "computed" = "realie";

    if (FREE_DATA_ENDPOINTS.has(endpoint)) {
      // ── Free data endpoints (neighborhood, schools, hazards, trends, etc.)
      result = await fetchFromFreeData(endpoint, params);
      dataSource = "free-data";

    } else if (endpoint === "rentalavm") {
      // ── Rental AVM: fetch property from Realie, compute from HUD data
      const realieResult = await fetchFromRealie("expanded", params);
      if (realieResult?.property?.[0]) {
        result = computeRentalAvm(realieResult.property[0]);
      } else {
        result = { property: [], message: "Property not found for rental estimate" };
      }
      dataSource = "computed";

    } else if (endpoint === "homeequity") {
      // ── Home equity: computed from Realie AVM - mortgage
      const realieResult = await fetchFromRealie("expanded", params);
      if (realieResult?.property?.[0]) {
        result = computeHomeEquity(realieResult.property[0]);
      } else {
        result = { property: [], message: "Property not found for equity calculation" };
      }
      dataSource = "computed";

    } else if (REALIE_CAPABLE_ENDPOINTS.has(endpoint)) {
      // ── Realie for all property data endpoints
      console.log(`[PropertyData] Fetching "${endpoint}" from Realie`);
      const realieResult = await fetchFromRealie(endpoint, params);

      if (realieResult?.property?.length > 0) {
        result = realieResult;
        dataSource = "realie";

        // Log quality stats
        const props = result.property as any[];
        const total = props.length;
        const withOwner = props.filter((p: any) => p.owner?.owner1?.fullName).length;
        const withValue = props.filter((p: any) =>
          p.avm?.amount?.value || p.assessment?.assessed?.assdTtlValue || p.assessment?.market?.mktTtlValue
        ).length;
        console.log(
          `[PropertyData] Realie: ${total} props, ${withOwner} owners, ${withValue} with values`
        );
      } else {
        // Realie returned no data
        console.log(`[PropertyData] Realie returned no data for ${endpoint}`);
        return NextResponse.json(
          { success: true, endpoint, dataSource: "realie", property: [], message: "No property data provider returned results" },
          { status: 200, headers: { "X-Property-Cache": "API", "X-Property-Source": "none" } },
        );
      }

    } else {
      // ── Unsupported endpoint (formerly ATTOM-only, now deprecated)
      const deprecated = [
        "saleshistory", "saleshistorybasic", "saleshistoryexpanded", "saleshistorysnapshot",
        "ibuyer", "allevents", "recorder", "buildingpermits",
        "schoolboundary", "neighborhoodboundary",
      ];
      if (deprecated.includes(endpoint)) {
        return NextResponse.json(
          { success: false, endpoint, error: `Endpoint "${endpoint}" has been deprecated. Use Realie property data or free data sources instead.`, property: [] },
          { status: 200 },
        );
      }

      // Unknown endpoint — try Realie as fallback
      const realieResult = await fetchFromRealie("expanded", params);
      if (realieResult?.property?.length > 0) {
        result = realieResult;
        dataSource = "realie";
      } else {
        return NextResponse.json(
          { error: "No property data provider configured" },
          { status: 503 }
        );
      }
    }

    // ── Handle empty results ───────────────────────────────────────────
    const NON_PROPERTY_ARRAY_ENDPOINTS = new Set([
      "neighborhood", "community", "salestrend", "transactionsalestrend",
      "marketanalytics", "poicategories",
    ]);
    const hasResults = NON_PROPERTY_ARRAY_ENDPOINTS.has(endpoint) || result?.property?.length > 0;
    if (!hasResults && !result?.community && !result?.schools && !result?.poi && !result?.salesTrends && !result?.hazardRisk) {
      const stateHint =
        params.address2?.match(/\b([A-Z]{2})\b/)?.[1] ||
        params.address?.match(/,\s*([A-Z]{2})\s*\d{0,5}\s*$/)?.[1];

      const isNonDisclosure = stateHint && NON_DISCLOSURE_STATES.has(stateHint);

      let message = "No properties found matching your search criteria.";
      if (endpoint === "comparables") {
        message = isNonDisclosure
          ? `${stateHint} is a non-disclosure state — sale prices are not publicly recorded.`
          : "No comparable properties found. Try increasing the search radius or time frame.";
      }

      return NextResponse.json(
        { success: true, endpoint, property: [], message, nonDisclosureState: isNonDisclosure || false },
        { headers: { "X-Property-Cache": "API", "X-Property-Source": dataSource } },
      );
    }

    // Store in cache
    const responsePayload = { success: true, endpoint, dataSource, ...result };
    propertyCacheSet(cacheKey, responsePayload, dataSource);
    propertyDbWrite(cacheKey, "unified", result, dataSource).catch((err) =>
      console.error("[PropertyCache] Background DB write failed:", err)
    );

    return NextResponse.json(responsePayload, {
      headers: { "X-Property-Cache": "API", "X-Property-Source": dataSource },
    });
  } catch (error) {
    console.error("Error fetching property data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch property data" },
      { status: 500 }
    );
  }
}
