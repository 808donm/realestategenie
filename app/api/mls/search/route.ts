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
        { status: 404 }
      );
    }

    // Ensure config is parsed as an object (direct SQL may store it as a JSON string)
    const config =
      typeof integration.config === "string"
        ? JSON.parse(integration.config)
        : integration.config;

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
    const statusParam = searchParams.get("status");
    const status: ("Active" | "Pending" | "Closed")[] = statusParam
      ? (statusParam.split(",") as ("Active" | "Pending" | "Closed")[])
      : ["Active"];
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 25;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    // If there's a general query, try to use it as city or postal code
    let searchCity = city;
    let searchPostalCode = postalCode;
    if (query && !city && !postalCode) {
      if (/^\d{5}(-\d{4})?$/.test(query.trim())) {
        searchPostalCode = query.trim();
      } else {
        searchCity = query.trim();
      }
    }

    console.log("[MLS Search] auth_method:", config.auth_method);
    console.log("[MLS Search] api_url:", config.api_url);
    console.log("[MLS Search] has credentials:", !!(config.client_id || config.username));

    const client = createTrestleClient(config);

    const result = await client.searchProperties({
      status,
      city: searchCity,
      postalCode: searchPostalCode,
      minPrice,
      maxPrice,
      minBeds,
      minBaths,
      propertyType,
      limit,
      offset,
      includeMedia: true,
    });

    return NextResponse.json({
      properties: result.value,
      totalCount: result["@odata.count"] || result.value.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("MLS search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search MLS" },
      { status: 500 }
    );
  }
}
