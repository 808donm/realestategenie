import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createTrestleClient } from "@/lib/integrations/trestle-client";

/**
 * GET /api/mls/sales-history
 *
 * Returns closed MLS listings for a given address — the full transaction
 * history chain with close prices, dates, agents, and offices.
 *
 * Query params:
 *   address  — property address (required)
 *   limit    — max results (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const address = request.nextUrl.searchParams.get("address");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");

    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
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
        { error: "Trestle MLS is not connected" },
        { status: 404 }
      );
    }

    const config =
      typeof integration.config === "string"
        ? JSON.parse(integration.config)
        : integration.config;

    const client = createTrestleClient(config);
    const closedListings = await client.getSalesHistory(address, { limit });

    // Map to clean response
    const history = closedListings.map((p) => ({
      listingKey: p.ListingKey,
      listingId: p.ListingId,
      address: p.UnparsedAddress || [p.StreetNumber, p.StreetName, p.StreetSuffix].filter(Boolean).join(" "),
      city: p.City,
      postalCode: p.PostalCode,
      propertyType: p.PropertyType,
      propertySubType: p.PropertySubType,
      closePrice: p.ClosePrice,
      closeDate: p.CloseDate,
      listPrice: p.ListPrice,
      originalListPrice: p.OriginalListPrice,
      onMarketDate: p.OnMarketDate,
      daysOnMarket: p.DaysOnMarket,
      cumulativeDaysOnMarket: p.CumulativeDaysOnMarket,
      beds: p.BedroomsTotal,
      baths: p.BathroomsTotalInteger,
      sqft: p.LivingArea,
      listAgentName: p.ListAgentFullName,
      buyerAgentName: p.BuyerAgentFullName,
      listOfficeName: p.ListOfficeName,
      buyerOfficeName: p.BuyerOfficeName,
      ownershipType: p.OwnershipType,
    }));

    console.log(`[MLS Sales History] ${history.length} closed transactions found for "${address}"`);

    return NextResponse.json({
      address,
      transactions: history,
      total: history.length,
      source: "mls",
    });
  } catch (error: any) {
    console.error("[MLS Sales History] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch sales history" },
      { status: 500 }
    );
  }
}
