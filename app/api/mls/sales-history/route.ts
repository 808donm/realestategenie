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

    // Diagnostic: first check if ANY closed listings exist in the feed at all
    const debug = request.nextUrl.searchParams.get("debug") === "true";
    if (debug) {
      // Test 1: Any closed listings in the zip?
      const zipMatch = address.match(/\d{5}/);
      const zip = request.nextUrl.searchParams.get("zip") || (zipMatch ? zipMatch[0] : "");
      const diagnostics: Record<string, any> = { address, zip };

      if (zip) {
        try {
          const zipClosed = await client.getProperties({
            $filter: `StandardStatus eq 'Closed' and startswith(PostalCode, '${zip}')`,
            $top: 3,
            $count: true,
            $orderby: "CloseDate desc",
            $select: "ListingKey,UnparsedAddress,StreetNumber,StreetName,StreetSuffix,ClosePrice,CloseDate,StandardStatus",
          });
          diagnostics.closedInZip = {
            count: zipClosed["@odata.count"],
            sample: zipClosed.value.map((p: any) => ({
              address: p.UnparsedAddress,
              streetNum: p.StreetNumber,
              streetName: p.StreetName,
              streetSuffix: p.StreetSuffix,
              closePrice: p.ClosePrice,
              closeDate: p.CloseDate,
            })),
          };
        } catch (e: any) { diagnostics.closedInZipError = e.message; }
      }

      // Test 2: Any closed listings at all?
      try {
        const anyClosed = await client.getProperties({
          $filter: "StandardStatus eq 'Closed'",
          $top: 3,
          $count: true,
          $orderby: "CloseDate desc",
          $select: "ListingKey,UnparsedAddress,City,PostalCode,ClosePrice,CloseDate",
        });
        diagnostics.anyClosedInFeed = {
          count: anyClosed["@odata.count"],
          sample: anyClosed.value.map((p: any) => ({
            address: p.UnparsedAddress,
            city: p.City,
            zip: p.PostalCode,
            closePrice: p.ClosePrice,
            closeDate: p.CloseDate,
          })),
        };
      } catch (e: any) { diagnostics.anyClosedError = e.message; }

      // Test 3: What statuses exist?
      try {
        for (const status of ["Closed", "Sold", "Expired", "Withdrawn", "Canceled"]) {
          const res = await client.getProperties({
            $filter: `StandardStatus eq '${status}'`,
            $top: 1,
            $count: true,
          });
          diagnostics[`status_${status}`] = res["@odata.count"] ?? res.value?.length ?? 0;
        }
      } catch (e: any) { diagnostics.statusCheckError = e.message; }

      return NextResponse.json({ diagnostics });
    }

    const { unit, building, unitNumber } = await client.getSalesHistory(address, { limit });

    const mapListing = (p: any) => ({
      listingKey: p.ListingKey,
      listingId: p.ListingId,
      address: p.UnparsedAddress || [p.StreetNumber, p.StreetName, p.StreetSuffix].filter(Boolean).join(" "),
      unitNumber: p.UnitNumber,
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
    });

    const unitHistory = unit.map(mapListing);
    const buildingHistory = building.map(mapListing);

    console.log(`[MLS Sales History] Unit: ${unitHistory.length}, Building: ${buildingHistory.length} for "${address}" (unit: ${unitNumber || "n/a"})`);

    return NextResponse.json({
      address,
      unitNumber,
      transactions: unitHistory,
      buildingTransactions: buildingHistory,
      total: unitHistory.length + buildingHistory.length,
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
