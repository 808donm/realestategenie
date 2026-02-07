import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createTrestleClient } from "@/lib/integrations/trestle-client";

/**
 * Get Properties from Trestle MLS
 *
 * Fetches property listings based on search criteria
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the integration
    const { data: integration, error: fetchError } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", userData.user.id)
      .eq("provider", "trestle")
      .maybeSingle();

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: "Trestle integration not found" },
        { status: 404 }
      );
    }

    if (integration.status !== "connected" || !integration.config?.client_id) {
      return NextResponse.json(
        { error: "Trestle is not connected" },
        { status: 400 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status")?.split(",") as ("Active" | "Pending" | "Closed")[] | undefined;
    const city = searchParams.get("city") || undefined;
    const postalCode = searchParams.get("postalCode") || undefined;
    const minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined;
    const minBeds = searchParams.get("minBeds") ? parseInt(searchParams.get("minBeds")!) : undefined;
    const minBaths = searchParams.get("minBaths") ? parseInt(searchParams.get("minBaths")!) : undefined;
    const propertyType = searchParams.get("propertyType") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 25;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;
    const includeMedia = searchParams.get("includeMedia") === "true";

    // Create client and fetch properties
    const client = createTrestleClient(integration.config);

    const result = await client.searchProperties({
      status,
      city,
      postalCode,
      minPrice,
      maxPrice,
      minBeds,
      minBaths,
      propertyType,
      limit,
      offset,
      includeMedia,
    });

    // Update last sync time
    await supabase
      .from("integrations")
      .update({
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    return NextResponse.json({
      success: true,
      properties: result.value,
      totalCount: result["@odata.count"] || result.value.length,
      nextLink: result["@odata.nextLink"],
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching Trestle properties:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch properties" },
      { status: 500 }
    );
  }
}

/**
 * Get a single property by listing key
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { listingKey, includeMedia } = body;

    if (!listingKey) {
      return NextResponse.json(
        { error: "listingKey is required" },
        { status: 400 }
      );
    }

    // Get the integration
    const { data: integration, error: fetchError } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", userData.user.id)
      .eq("provider", "trestle")
      .maybeSingle();

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: "Trestle integration not found" },
        { status: 404 }
      );
    }

    if (integration.status !== "connected" || !integration.config?.client_id) {
      return NextResponse.json(
        { error: "Trestle is not connected" },
        { status: 400 }
      );
    }

    // Create client and fetch property
    const client = createTrestleClient(integration.config);
    const property = await client.getProperty(listingKey);

    // Optionally fetch media
    let media = null;
    if (includeMedia) {
      const mediaResult = await client.getPropertyMedia(listingKey);
      media = mediaResult.value;
    }

    return NextResponse.json({
      success: true,
      property,
      media,
    });
  } catch (error) {
    console.error("Error fetching Trestle property:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch property" },
      { status: 500 }
    );
  }
}
