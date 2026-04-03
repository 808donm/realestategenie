import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createTrestleClient } from "@/lib/integrations/trestle-client";

/**
 * MLS Property Search API
 *
 * Proxies search requests to Trestle MLS via the user's connected integration.
 * Supports filtering by city, zip, price range, beds, baths, property type, and status.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the Trestle integration
    const { data: integration } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", userData.user.id)
      .eq("provider", "trestle")
      .maybeSingle();

    if (!integration || integration.status !== "connected") {
      return NextResponse.json(
        { error: "Trestle MLS is not connected. Go to Integrations to set it up." },
        { status: 404 },
      );
    }

    // Ensure config is parsed as an object (direct SQL may store it as a JSON string)
    const config = typeof integration.config === "string" ? JSON.parse(integration.config) : integration.config;

    // Parse search parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const city = searchParams.get("city") || undefined;
    const postalCode = searchParams.get("postalCode") || undefined;
    const minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined;
    const minBeds = searchParams.get("minBeds") ? parseInt(searchParams.get("minBeds")!) : undefined;
    const minBaths = searchParams.get("minBaths") ? parseInt(searchParams.get("minBaths")!) : undefined;
    const propertyType = searchParams.get("propertyType") || undefined;
    const minDaysOnMarket = searchParams.get("minDaysOnMarket")
      ? parseInt(searchParams.get("minDaysOnMarket")!)
      : undefined;
    const statusParam = searchParams.get("status");
    const validStatuses = ["Active", "Pending", "Closed", "Expired", "Withdrawn", "Canceled", "Delete", "Incomplete", "ComingSoon"];
    const status: string[] = statusParam
      ? statusParam.split(",").filter((s) => validStatuses.includes(s.trim()))
      : ["Active"];
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 25;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;
    const includeRentals = searchParams.get("includeRentals") === "true";

    // If there's a general query, detect if it's a zip, address, or city
    let searchCity = city;
    let searchPostalCode = postalCode;
    let addressFilter: string | undefined;
    let buildingFilter: string | undefined;
    if (query && !city && !postalCode) {
      const q = query.trim();
      if (/^\d{5}(-\d{4})?$/.test(q)) {
        // Pure zip code
        searchPostalCode = q;
      } else if (/^\d+[\s-]/.test(q) || /\b(st|street|rd|road|ave|avenue|dr|drive|ln|lane|pl|place|blvd|boulevard|ct|court|way|loop|pkwy|parkway|hwy|highway|cir|circle)\b/i.test(q)) {
        // Looks like a street address -- search both expanded AND abbreviated forms
        // MLS may store "3849 Manoa Rd" or "3849 Manoa Road" -- we search for both
        const { expandStreetSuffix, abbreviateStreetSuffix } = await import("@/lib/address-utils");
        const expanded = expandStreetSuffix(q);
        const abbreviated = abbreviateStreetSuffix(q);
        // Collect unique search variants
        const variants = new Set([
          q.replace(/'/g, "''").toLowerCase(),
          expanded.replace(/'/g, "''").toLowerCase(),
          abbreviated.replace(/'/g, "''").toLowerCase(),
        ]);
        // Also try stripping the suffix entirely for StreetName matching
        // e.g., "Manoa" from "3849 Manoa Road" to match StreetName field
        const streetNameMatch = q.match(/^\d+[\s-]+(.+?)(?:\s+(?:st|street|rd|road|ave|avenue|dr|drive|ln|lane|pl|place|blvd|boulevard|ct|court|way|loop|pkwy|parkway|hwy|highway|cir|circle)\.?\s*(?:,.*)?$)/i);
        const streetNameOnly = streetNameMatch ? streetNameMatch[1].replace(/'/g, "''").toLowerCase() : null;

        const conditions: string[] = [];
        for (const v of variants) {
          conditions.push(`contains(tolower(UnparsedAddress), '${v}')`);
        }
        if (streetNameOnly) {
          conditions.push(`contains(tolower(StreetName), '${streetNameOnly}')`);
        }
        addressFilter = conditions.length === 1 ? conditions[0] : `(${conditions.join(" or ")})`;
      } else {
        // Could be a city name OR a building/condo name (e.g., "Park Lane", "The Century")
        // Search both City and SubdivisionName
        const escaped = q.replace(/'/g, "''").toLowerCase();
        buildingFilter = `contains(tolower(SubdivisionName), '${escaped}')`;
        searchCity = q;
      }
    }

    console.log("[MLS Search] auth_method:", config.auth_method);
    console.log("[MLS Search] api_url:", config.api_url);
    console.log("[MLS Search] has credentials:", !!(config.client_id || config.username));

    const client = createTrestleClient(config);

    // Trestle returns 0 results when a query's filter matches >5,000 records,
    // regardless of $top. When no location filter is provided (e.g. "latest listings"
    // on page load), we must narrow with additional filters and skip $count.
    const hasLocationFilter = !!(searchCity || searchPostalCode || addressFilter);

    // For the "latest listings" case (no location/price/beds filters), narrow the query
    // so it stays under Trestle's 5,000-record threshold for ad-hoc queries.
    const isLatestQuery =
      !hasLocationFilter && !minPrice && !maxPrice && !minBeds && !minBaths && !propertyType && !minDaysOnMarket;

    let result;

    if (addressFilter) {
      // Address search — use raw OData filter on UnparsedAddress/StreetName
      const filters: string[] = [];

      // Status filter
      const statusFilter = status.map((s) => `StandardStatus eq '${s}'`).join(" or ");
      filters.push(status.length === 1 ? `StandardStatus eq '${status[0]}'` : `(${statusFilter})`);

      // Address filter
      filters.push(`(${addressFilter})`);

      // Optional filters
      if (minPrice) filters.push(`ListPrice ge ${minPrice}`);
      if (maxPrice) filters.push(`ListPrice le ${maxPrice}`);
      if (minBeds) filters.push(`BedroomsTotal ge ${minBeds}`);
      if (minBaths) filters.push(`BathroomsTotalInteger ge ${minBaths}`);
      if (propertyType) filters.push(`PropertyType eq '${propertyType}'`);

      console.log("[MLS Search] Address search filter:", filters.join(" and "));

      result = await client.getProperties({
        $filter: filters.join(" and "),
        $orderby: "ModificationTimestamp desc",
        $top: limit,
        $skip: offset,
        $count: true,
        $expand: "Media",
      });
    } else {
      result = await client.searchProperties({
        status,
        city: searchCity,
        postalCode: searchPostalCode,
        minPrice,
        maxPrice,
        minBeds,
        minBaths,
        propertyType,
        minDaysOnMarket,
        limit,
        offset,
        includeMedia: true,
        skipCount: !hasLocationFilter,
        includeRentals,
      });

      // If city search returned 0 results and we have a building name candidate, try SubdivisionName
      if (buildingFilter && (!result.value || result.value.length === 0)) {
        console.log("[MLS Search] City search returned 0 results, trying SubdivisionName:", buildingFilter);
        result = await client.searchProperties({
          status,
          subdivisionName: query?.trim(),
          minPrice,
          maxPrice,
          minBeds,
          minBaths,
          propertyType,
          limit,
          offset,
          includeMedia: true,
        });
        if (result.value?.length > 0) {
          console.log(`[MLS Search] Found ${result.value.length} results by building/subdivision name`);
        }
      }
    }

    // Filter out rental/lease listings unless includeRentals is set
    const allResults = result.value || [];
    const filteredResults = includeRentals
      ? allResults
      : allResults.filter((p) => {
          const subType = (p.PropertySubType || "").toLowerCase();
          const propType = (p.PropertyType || "").toLowerCase();
          if (subType.includes("lease") || propType.includes("lease")) return false;
          if (p.ListPrice && p.ListPrice > 0 && p.ListPrice < 25000) return false;
          return true;
        });

    const filteredCount = allResults.length - filteredResults.length;
    if (filteredCount > 0) {
      console.log(`[MLS Search] Filtered out ${filteredCount} rental/lease listings`);
    }

    console.log("[MLS Search] Results returned:", filteredResults.length, "count:", result["@odata.count"]);

    // Enrich properties that have no Media with separate Media endpoint fetch
    const properties = filteredResults;
    const noMediaProps = properties.filter((p) => !p.Media || p.Media.length === 0);

    if (noMediaProps.length > 0 && noMediaProps.length <= 25) {
      console.log(`[MLS Search] ${noMediaProps.length} properties have no Media, fetching separately...`);

      await Promise.all(
        noMediaProps.map(async (p) => {
          try {
            const mediaResult = await client.getPropertyMedia(p.ListingKey);
            if (mediaResult.value?.length > 0) {
              (p as any).Media = mediaResult.value.map((m: any) => ({
                MediaKey: m.MediaKey || m.ResourceRecordKey,
                MediaURL: m.MediaURL,
                MediaType: m.MediaType || "image/jpeg",
                Order: m.Order,
                ShortDescription: m.ShortDescription,
              }));
            }
          } catch {
            // Silent — no media available
          }
        }),
      );
    }

    return NextResponse.json({
      properties,
      totalCount: result["@odata.count"] || properties.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("MLS search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search MLS" },
      { status: 500 },
    );
  }
}
