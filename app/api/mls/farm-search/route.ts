import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createTrestleClient } from "@/lib/integrations/trestle-client";

/**
 * Farm Area MLS Search
 *
 * GET — Search active MLS listings in a farm area.
 * Supports zip code, radius (lat/lng), and TMK prefix searches.
 *
 * Query params:
 *   searchType:    'zip' | 'radius' | 'tmk'
 *   postalCodes:   comma-separated zip codes (zip mode)
 *   lat, lng:      center coordinates (radius mode)
 *   radius:        miles (radius mode, default 2)
 *   tmkPrefix:     TMK prefix e.g. '1-5-3' (tmk mode — resolves to zip codes)
 *   propertyType:  optional filter
 *   minPrice, maxPrice, minBeds, minBaths: optional filters
 *   status:        comma-separated statuses (default: Active)
 *   minDOM:        minimum days on market
 *   limit:         max results (default 100, max 500)
 *   offset:        pagination offset
 *   farmAreaId:    optional — load search params from a saved farm area
 */
export async function GET(request: NextRequest) {
  try {
    // Allow service-role key for internal server-to-server calls (e.g., Hoku copilot)
    const serviceKey = request.headers.get("x-service-role-key");
    const isServiceCall = serviceKey && serviceKey === process.env.SUPABASE_SERVICE_ROLE_KEY;

    let supabase: any;
    if (!isServiceCall) {
      supabase = await supabaseServer();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      supabase = (await import("@/lib/supabase/admin")).supabaseAdmin;
    }

    // Get Trestle integration
    const { data: integration } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", userData.user.id)
      .eq("provider", "trestle")
      .maybeSingle();

    if (!integration || integration.status !== "connected") {
      return NextResponse.json(
        { error: "Trestle MLS is not connected. Go to Integrations to set it up." },
        { status: 404 }
      );
    }

    const config =
      typeof integration.config === "string"
        ? JSON.parse(integration.config)
        : integration.config;

    const searchParams = request.nextUrl.searchParams;

    // Check if loading from a saved farm area
    const farmAreaId = searchParams.get("farmAreaId");
    let searchType = searchParams.get("searchType") || "zip";
    let postalCodes = searchParams.get("postalCodes")?.split(",").filter(Boolean) || [];
    let lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : undefined;
    let lng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : undefined;
    let radius = searchParams.get("radius") ? parseFloat(searchParams.get("radius")!) : 2;
    let tmkPrefix = searchParams.get("tmkPrefix") || undefined;
    let propertyType = searchParams.get("propertyType") || undefined;
    let minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined;
    let maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined;
    let minBeds = searchParams.get("minBeds") ? parseInt(searchParams.get("minBeds")!) : undefined;
    let minBaths = searchParams.get("minBaths") ? parseInt(searchParams.get("minBaths")!) : undefined;
    let minDOM = searchParams.get("minDOM") ? parseInt(searchParams.get("minDOM")!) : undefined;
    const statusParam = searchParams.get("status");
    let statuses: string[] = statusParam ? statusParam.split(",") : ["Active"];
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    // If farmAreaId provided, load saved search params
    if (farmAreaId) {
      const { data: farmArea } = await supabase
        .from("mls_farm_areas")
        .select("*")
        .eq("id", farmAreaId)
        .single();

      if (farmArea) {
        searchType = farmArea.search_type;
        postalCodes = farmArea.postal_codes || [];
        lat = farmArea.center_lat || undefined;
        lng = farmArea.center_lng || undefined;
        radius = farmArea.radius_miles || 2;
        tmkPrefix = farmArea.tmk_prefix || undefined;
        if (farmArea.property_types?.length > 0) propertyType = farmArea.property_types[0];
        minPrice = farmArea.min_price || undefined;
        maxPrice = farmArea.max_price || undefined;
        minBeds = farmArea.min_beds || undefined;
        minBaths = farmArea.min_baths || undefined;
        statuses = farmArea.statuses || ["Active"];
      }
    }

    // Build OData filter
    const filters: string[] = [];

    // Status filter
    if (statuses.length === 1) {
      filters.push(`StandardStatus eq '${statuses[0]}'`);
    } else {
      const statusFilter = statuses.map((s) => `StandardStatus eq '${s}'`).join(" or ");
      filters.push(`(${statusFilter})`);
    }

    // Geographic filter
    if (searchType === "zip" && postalCodes.length > 0) {
      if (postalCodes.length === 1) {
        filters.push(`PostalCode eq '${postalCodes[0]}'`);
      } else {
        const zipFilter = postalCodes.map((z) => `PostalCode eq '${z}'`).join(" or ");
        filters.push(`(${zipFilter})`);
      }
    } else if (searchType === "tmk" && tmkPrefix) {
      // TMK search: resolve TMK prefix to zip codes via Hawaii parcels
      // TMK prefixes map to neighborhoods — use known mappings for Oahu
      // For now, use PostalCode startsWith as a fallback if we can map TMK → zip
      // The TMK overlay API gives us parcel boundaries, but Trestle filters by zip/city
      // We'll search by the zip codes that overlap with the TMK area
      const tmkZips = await resolveTMKToZipCodes(tmkPrefix);
      if (tmkZips.length > 0) {
        const zipFilter = tmkZips.map((z) => `PostalCode eq '${z}'`).join(" or ");
        filters.push(`(${zipFilter})`);
      }
    }
    // Radius mode: Trestle doesn't support geo-radius natively in OData
    // We fetch by nearby zip codes or city and filter by distance client-side

    // Property filters
    if (propertyType) filters.push(`PropertyType eq '${propertyType}'`);
    if (minPrice) filters.push(`ListPrice ge ${minPrice}`);
    if (maxPrice) filters.push(`ListPrice le ${maxPrice}`);
    if (minBeds) filters.push(`BedroomsTotal ge ${minBeds}`);
    if (minBaths) filters.push(`BathroomsTotalInteger ge ${minBaths}`);
    if (minDOM) filters.push(`DaysOnMarket ge ${minDOM}`);

    const client = createTrestleClient(config);

    const result = await client.getProperties({
      $filter: filters.join(" and "),
      $orderby: "ModificationTimestamp desc",
      $top: limit,
      $skip: offset,
      $count: true,
      $expand: "Media",
    });

    // For radius mode, filter by haversine distance
    let properties = result.value || [];
    if (searchType === "radius" && lat && lng) {
      properties = properties.filter((p) => {
        if (!p.Latitude || !p.Longitude) return true; // Include if no coords
        const dist = haversineDistance(lat!, lng!, p.Latitude, p.Longitude);
        return dist <= radius;
      });
    }

    // Compute price drop metrics for each listing
    const enriched = properties.map((p) => {
      const originalPrice = p.OriginalListPrice || p.ListPrice;
      const priceDrop = originalPrice - p.ListPrice;
      const priceDropPct = originalPrice > 0 ? (priceDrop / originalPrice) * 100 : 0;

      return {
        ...p,
        _priceDrop: priceDrop > 0 ? priceDrop : 0,
        _priceDropPct: priceDrop > 0 ? Math.round(priceDropPct * 10) / 10 : 0,
        _originalListPrice: originalPrice,
      };
    });

    return NextResponse.json({
      properties: enriched,
      totalCount: result["@odata.count"] || enriched.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Farm search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search farm area" },
      { status: 500 }
    );
  }
}

/**
 * Haversine distance in miles between two lat/lng points.
 */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Resolve a TMK prefix to overlapping zip codes.
 * Uses known Oahu TMK zone → zip code mappings.
 */
async function resolveTMKToZipCodes(tmkPrefix: string): Promise<string[]> {
  // Oahu TMK zones mapped to approximate zip codes
  // TMK format: district-zone-section-plat-parcel
  // We match on zone level for broad area coverage
  const parts = tmkPrefix.split("-");
  const zone = parts.length >= 2 ? parts[1] : "";

  // Oahu (district 1) zone-to-zip mappings
  const oahuZoneZips: Record<string, string[]> = {
    "1": ["96813", "96817", "96819"], // Downtown/Palama
    "2": ["96813", "96814", "96826"], // Makiki/Manoa
    "3": ["96815", "96816", "96822"], // Waikiki/Kapahulu
    "4": ["96816", "96821", "96825"], // Kahala/Hawaii Kai
    "5": ["96734", "96730"],          // Kailua
    "6": ["96744"],                    // Kaneohe
    "7": ["96762", "96717", "96730"], // Laie/Hauula
    "8": ["96791", "96792"],          // Waianae
    "9": ["96797", "96789"],          // Mililani/Waipahu
  };

  return oahuZoneZips[zone] || [];
}
