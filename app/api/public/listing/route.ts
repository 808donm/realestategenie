import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createTrestleClient } from "@/lib/integrations/trestle-client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Public endpoint to fetch a single MLS listing by key + agentId
 * GET /api/public/listing?key=xxx&agentId=xxx
 *
 * No authentication required — used for shared listing links.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listingKey = searchParams.get("key");
    const agentId = searchParams.get("agentId");

    if (!listingKey || !agentId) {
      return NextResponse.json(
        { error: "key and agentId are required" },
        { status: 400 }
      );
    }

    // Look up the agent's Trestle integration using admin client
    const { data: integration, error } = await supabaseAdmin
      .from("integrations")
      .select("config, status")
      .eq("agent_id", agentId)
      .eq("provider", "trestle")
      .maybeSingle();

    if (error || !integration) {
      return NextResponse.json(
        { error: "Listing not available" },
        { status: 404 }
      );
    }

    const config =
      typeof integration.config === "string"
        ? JSON.parse(integration.config)
        : integration.config;

    if (integration.status !== "connected" || !(config.client_id || config.username)) {
      return NextResponse.json(
        { error: "Listing not available" },
        { status: 404 }
      );
    }

    const client = createTrestleClient(config);
    const property = await client.getProperty(listingKey);

    // Fetch media
    let media = null;
    try {
      const mediaResult = await client.getPropertyMedia(listingKey);
      media = mediaResult.value;
    } catch {
      // Media fetch is optional
    }

    // Return only public-safe fields (no private remarks, agent keys, etc.)
    return NextResponse.json({
      success: true,
      property: {
        ListingKey: property.ListingKey,
        ListingId: property.ListingId,
        StandardStatus: property.StandardStatus,
        PropertyType: property.PropertyType,
        PropertySubType: property.PropertySubType,
        ListPrice: property.ListPrice,
        StreetNumber: property.StreetNumber,
        StreetName: property.StreetName,
        StreetSuffix: property.StreetSuffix,
        City: property.City,
        StateOrProvince: property.StateOrProvince,
        PostalCode: property.PostalCode,
        BedroomsTotal: property.BedroomsTotal,
        BathroomsTotalInteger: property.BathroomsTotalInteger,
        LivingArea: property.LivingArea,
        LotSizeArea: property.LotSizeArea,
        YearBuilt: property.YearBuilt,
        PublicRemarks: property.PublicRemarks,
        ListAgentFullName: property.ListAgentFullName,
        ListOfficeName: property.ListOfficeName,
        OnMarketDate: property.OnMarketDate,
        ListingURL: property.ListingURL,
        VirtualTourURLUnbranded: property.VirtualTourURLUnbranded,
      },
      media: media?.map((m: any) => ({
        MediaURL: m.MediaURL,
        MediaType: m.MediaType,
        Order: m.Order,
        ShortDescription: m.ShortDescription,
      })),
    });
  } catch (error) {
    console.error("[Public Listing] Error:", error);
    return NextResponse.json(
      { error: "Listing not available" },
      { status: 404 }
    );
  }
}
