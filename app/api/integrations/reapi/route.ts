import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getReapiClient,
  mapReapiToAttomShape,
  mapReapiMLSToTrestleShape,
  mapReapiSkipTrace,
} from "@/lib/integrations/reapi-client";
import {
  buildPropertyCacheKey,
  propertyCacheGet,
  propertyCacheSet,
  propertyDbRead,
  propertyDbWrite,
} from "@/lib/integrations/property-data-cache";

/**
 * GET /api/integrations/reapi
 *
 * Unified REAPI endpoint. Routes to different REAPI endpoints based on
 * the `endpoint` query parameter. All responses are cached (7-day TTL)
 * to minimize API calls.
 *
 * Endpoints:
 *   property-detail  -- Full property intel by address or ID
 *   property-search  -- Search properties by criteria
 *   mls-search       -- Search MLS listings
 *   mls-detail       -- Single MLS listing detail
 *   avm              -- Property valuation
 *   comps            -- Comparable sales
 *   skip-trace       -- Skip trace by address
 *   autocomplete     -- Address autocomplete
 *   key-info         -- API key usage info (no cache)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = getReapiClient();
    if (!client) {
      return NextResponse.json({ error: "REAPI not configured. Set REAPI_API_KEY in environment." }, { status: 503 });
    }

    const params = request.nextUrl.searchParams;
    const endpoint = params.get("endpoint") || "property-detail";

    // Build cache key from all params
    const paramObj: Record<string, string> = {};
    params.forEach((v, k) => {
      if (k !== "endpoint") paramObj[k] = v;
    });

    // Key info is never cached
    if (endpoint === "key-info") {
      const result = await client.getKeyInfo();
      return NextResponse.json(result);
    }

    // Check cache
    const cacheKey = buildPropertyCacheKey("unified", `reapi-${endpoint}`, paramObj);
    const memCached = propertyCacheGet(cacheKey);
    if (memCached?.data) {
      return NextResponse.json({ ...memCached.data, cacheHit: "memory" });
    }
    const dbCached = await propertyDbRead(cacheKey, "unified");
    if (dbCached?.data) {
      propertyCacheSet(cacheKey, dbCached.data, "unified");
      return NextResponse.json({ ...dbCached.data, cacheHit: "db" });
    }

    let result: any;

    switch (endpoint) {
      case "property-detail": {
        const id = params.get("id") ? Number(params.get("id")) : undefined;
        const address = params.get("address");
        if (id) {
          const raw = await client.getPropertyDetail(id);
          result = { property: mapReapiToAttomShape(raw.data), raw: raw.data, source: "reapi" };
        } else if (address) {
          // Search by address first to get ID, then get detail
          const search = await client.searchProperties({ address, size: 1 });
          if (search.data.length > 0) {
            const prop = search.data[0];
            if (prop.id) {
              const detail = await client.getPropertyDetail(prop.id);
              result = { property: mapReapiToAttomShape(detail.data), raw: detail.data, source: "reapi" };
            } else {
              result = { property: mapReapiToAttomShape(prop), raw: prop, source: "reapi" };
            }
          } else {
            result = { property: null, error: "Property not found", source: "reapi" };
          }
        } else {
          return NextResponse.json({ error: "id or address required" }, { status: 400 });
        }
        break;
      }

      case "property-search": {
        const searchParams: any = {};
        for (const [k, v] of params.entries()) {
          if (k === "endpoint") continue;
          if (["beds_min", "beds_max", "baths_min", "baths_max", "value_min", "value_max", "year_min", "year_max", "size", "resultIndex", "latitude", "longitude", "radius"].includes(k)) {
            searchParams[k] = Number(v);
          } else if (["foreclosure", "pre_foreclosure", "auction", "absentee_owner", "high_equity", "vacant", "investor"].includes(k)) {
            searchParams[k] = v === "true";
          } else {
            searchParams[k] = v;
          }
        }
        const raw = await client.searchProperties(searchParams);
        result = {
          properties: raw.data.map(mapReapiToAttomShape),
          total: raw.resultCount || raw.recordCount,
          source: "reapi",
        };
        break;
      }

      case "mls-search": {
        const mlsParams: any = {};
        for (const [k, v] of params.entries()) {
          if (k === "endpoint") continue;
          if (["bedrooms_min", "bedrooms_max", "listing_price_min", "listing_price_max", "size", "resultIndex", "latitude", "longitude", "radius"].includes(k)) {
            mlsParams[k] = Number(v);
          } else if (["active", "pending", "sold", "cancelled", "failed", "include_photos"].includes(k)) {
            mlsParams[k] = v === "true";
          } else {
            mlsParams[k] = v;
          }
        }
        const raw = await client.searchMLS(mlsParams);
        result = {
          listings: raw.data.map(mapReapiMLSToTrestleShape),
          raw: raw.data,
          total: raw.resultCount || raw.recordCount,
          source: "reapi",
        };
        break;
      }

      case "mls-detail": {
        const mlsDetailParams: any = {};
        if (params.get("listing_id")) mlsDetailParams.listing_id = Number(params.get("listing_id"));
        if (params.get("id")) mlsDetailParams.id = Number(params.get("id"));
        if (params.get("address")) mlsDetailParams.address = params.get("address");
        if (params.get("mls_number")) mlsDetailParams.mls_number = params.get("mls_number");
        if (params.get("mls_board_code")) mlsDetailParams.mls_board_code = params.get("mls_board_code");
        const raw = await client.getMLSDetail(mlsDetailParams);
        result = { listing: mapReapiMLSToTrestleShape(raw.data), raw: raw.data, source: "reapi" };
        break;
      }

      case "avm": {
        const avmParams: any = {};
        if (params.get("id")) avmParams.id = Number(params.get("id"));
        if (params.get("address")) avmParams.address = params.get("address");
        const raw = await client.getPropertyAvm(avmParams);
        result = { avm: raw.data, source: "reapi" };
        break;
      }

      case "comps": {
        const compsParams: any = {};
        if (params.get("id")) compsParams.id = Number(params.get("id"));
        if (params.get("address")) compsParams.address = params.get("address");
        const version = params.get("version") === "v3" ? "v3" : "v2";
        const raw = version === "v3"
          ? await client.getPropertyCompsV3(compsParams)
          : await client.getPropertyComps(compsParams);
        result = { comps: raw.data, source: "reapi", version };
        break;
      }

      case "skip-trace": {
        const skipParams: any = {};
        if (params.get("address")) skipParams.address = params.get("address");
        if (params.get("id")) skipParams.id = Number(params.get("id"));
        if (params.get("first_name")) skipParams.first_name = params.get("first_name");
        if (params.get("last_name")) skipParams.last_name = params.get("last_name");
        const raw = await client.skipTrace(skipParams);
        result = {
          people: raw.data.map(mapReapiSkipTrace),
          raw: raw.data,
          count: raw.recordCount,
          source: "reapi",
        };
        break;
      }

      case "autocomplete": {
        const search = params.get("search") || params.get("q") || "";
        if (!search || search.length < 2) {
          return NextResponse.json({ error: "search must be at least 2 characters" }, { status: 400 });
        }
        const raw = await client.autoComplete({
          search,
          search_types: params.get("search_types") || undefined,
        });
        result = { suggestions: raw.data, total: raw.totalResults, source: "reapi" };
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown endpoint: ${endpoint}` }, { status: 400 });
    }

    // Cache the result (skip-trace has shorter TTL consideration but cache anyway)
    propertyCacheSet(cacheKey, result, "unified");
    propertyDbWrite(cacheKey, `reapi-${endpoint}`, result, "unified").catch(() => {});

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[REAPI] Error:", error);
    return NextResponse.json({ error: error.message || "REAPI request failed" }, { status: 500 });
  }
}
