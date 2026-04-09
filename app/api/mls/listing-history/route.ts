import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";
import {
  buildPropertyCacheKey,
  propertyCacheGet,
  propertyCacheSet,
  propertyDbRead,
  propertyDbWrite,
} from "@/lib/integrations/property-data-cache";

/**
 * GET /api/mls/listing-history
 *
 * Returns full MLS listing history for a property address -- all statuses
 * (Active, Pending, Closed, Expired, Withdrawn, Canceled). Shows every
 * time the property was listed, price changes, and status changes.
 *
 * Query params:
 *   address  -- property address (required)
 *   limit    -- max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const address = request.nextUrl.searchParams.get("address");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");

    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    // Check cache
    const cacheKey = buildPropertyCacheKey("unified", "mls-listing-history", { address, limit });
    const memCached = propertyCacheGet(cacheKey);
    if (memCached && (memCached as any).total > 0) return NextResponse.json(memCached);

    const dbCached = await propertyDbRead(cacheKey, "mls-listing-history");
    if (dbCached && (dbCached as any).total > 0) {
      propertyCacheSet(cacheKey, dbCached, "unified");
      return NextResponse.json(dbCached);
    }

    const client = await getTrestleClient(supabase, userData.user.id);
    if (!client) {
      return NextResponse.json({ error: "Trestle MLS not connected" }, { status: 400 });
    }

    // Parse the address: extract street portion
    const parts = address.split(",");
    let streetPart = (parts[0] || address).trim();

    // Extract unit number
    let unitNumber: string | undefined;
    const unitMatch = streetPart.match(/\s*(?:#|apt|unit|ste|suite)\s*(\S+)/i);
    if (unitMatch) unitNumber = unitMatch[1];

    // Remove unit prefixes
    streetPart = streetPart.replace(/\s*(#|apt|unit|ste|suite)\s*\S+/gi, "").trim();

    // Extract street number and name
    const rawMatch = streetPart.match(/^(\d[\d-]*)\s+(.+)/i);
    let streetNum = "";
    let streetName = "";

    if (rawMatch) {
      streetNum = rawMatch[1];
      streetName = rawMatch[2];

      // Check for bare trailing unit number
      const suffixUnitMatch = streetName.match(
        /\s+(road|rd|street|st|avenue|ave|drive|dr|lane|ln|place|pl|boulevard|blvd|court|ct|way|loop|circle|cir|terrace|ter|trail|trl|parkway|pkwy|highway|hwy)\s+(\S+)$/i,
      );
      if (suffixUnitMatch && !unitNumber) unitNumber = suffixUnitMatch[2];

      const bareUnitMatch = streetName.match(/\s+(\d+)$/);
      if (bareUnitMatch && !unitNumber) unitNumber = bareUnitMatch[1];

      // Strip trailing unit/suffix
      streetName = streetName
        .replace(
          /\s+(road|rd|street|st|avenue|ave|drive|dr|lane|ln|place|pl|boulevard|blvd|court|ct|way|loop|circle|cir|terrace|ter|trail|trl|parkway|pkwy|highway|hwy)\s+\S+$/i,
          (m, suffix) => ` ${suffix}`,
        )
        .trim();
      streetName = streetName.replace(/\s+\d+$/, "").trim();
      streetName = streetName
        .replace(
          /\s+(road|rd|street|st|avenue|ave|drive|dr|lane|ln|place|pl|boulevard|blvd|court|ct|way|loop|circle|cir|terrace|ter|trail|trl|parkway|pkwy|highway|hwy)$/i,
          "",
        )
        .trim();
    }

    const escapedName = streetName.replace(/'/g, "''").toLowerCase();

    if (!escapedName || escapedName.length < 2) {
      return NextResponse.json({ error: "Could not parse address" }, { status: 400 });
    }

    // Use the same fields as sales-history (known to work with HiCentral)
    // plus ModificationTimestamp for sorting. Avoid fields that may not exist
    // in HiCentral's Trestle implementation (OffMarketDate, PendingTimestamp, etc.)
    const selectFields =
      "ListingKey,ListingId,StandardStatus,ListPrice,OriginalListPrice,ClosePrice,CloseDate,OnMarketDate,DaysOnMarket,CumulativeDaysOnMarket,ModificationTimestamp,UnparsedAddress,StreetNumber,StreetName,StreetSuffix,UnitNumber,City,PostalCode,BedroomsTotal,BathroomsTotalInteger,LivingArea,PropertyType,PropertySubType,ListAgentFullName,BuyerAgentFullName,ListOfficeName,BuyerOfficeName,OwnershipType";

    // Query ALL statuses for this address (no StandardStatus filter)
    const baseFilter = streetNum
      ? `tolower(StreetNumber) eq '${streetNum.toLowerCase()}' and contains(tolower(StreetName), '${escapedName}')`
      : `contains(tolower(UnparsedAddress), '${escapedName}')`;

    let unitListings: any[] = [];
    let buildingListings: any[] = [];

    try {
    if (unitNumber) {
      const escapedUnit = unitNumber.replace(/'/g, "''");
      const unitFilter = streetNum
        ? `${baseFilter} and tolower(UnitNumber) eq '${escapedUnit.toLowerCase()}'`
        : `${baseFilter} and tolower(UnitNumber) eq '${escapedUnit.toLowerCase()}'`;

      // Also try matching unit in UnparsedAddress for MLS entries without UnitNumber
      const altUnitFilter = `${baseFilter} and contains(tolower(UnparsedAddress), '${escapedUnit.toLowerCase()}')`;

      const [unitResult, altResult, buildingResult] = await Promise.all([
        client.getProperties({
          $filter: unitFilter,
          $orderby: "ModificationTimestamp desc",
          $top: limit,
          $select: selectFields,
        }),
        client.getProperties({
          $filter: altUnitFilter,
          $orderby: "ModificationTimestamp desc",
          $top: limit,
          $select: selectFields,
        }),
        client.getProperties({
          $filter: baseFilter,
          $orderby: "ModificationTimestamp desc",
          $top: limit,
          $select: selectFields,
        }),
      ]);

      // Merge unit results (dedupe by ListingKey)
      const seen = new Set<string>();
      for (const l of [...(unitResult.value || []), ...(altResult.value || [])]) {
        if (!seen.has(l.ListingKey)) {
          seen.add(l.ListingKey);
          unitListings.push(l);
        }
      }
      // Building listings exclude unit matches
      buildingListings = (buildingResult.value || []).filter(
        (l: any) => !seen.has(l.ListingKey),
      );
    } else {
      const result = await client.getProperties({
        $filter: baseFilter,
        $orderby: "ModificationTimestamp desc",
        $top: limit,
        $select: selectFields,
      });
      unitListings = result.value || [];
    }
    } catch (queryErr: any) {
      console.warn("[MLS Listing History] Trestle query failed:", queryErr.message);
      // Return empty instead of 500
      return NextResponse.json({ address, listings: [], buildingListings: [], total: 0, source: "mls", error: queryErr.message });
    }

    const mapListing = (p: any, isUnitMatch: boolean) => ({
      listingKey: p.ListingKey,
      listingId: p.ListingId,
      status: p.StandardStatus,
      address: p.UnparsedAddress || [p.StreetNumber, p.StreetName, p.StreetSuffix].filter(Boolean).join(" "),
      unitNumber: p.UnitNumber,
      city: p.City,
      postalCode: p.PostalCode,
      propertyType: p.PropertyType,
      propertySubType: p.PropertySubType,
      listPrice: p.ListPrice,
      originalListPrice: p.OriginalListPrice,
      closePrice: p.ClosePrice,
      closeDate: p.CloseDate,
      onMarketDate: p.OnMarketDate,
      modificationTimestamp: p.ModificationTimestamp,
      daysOnMarket: p.DaysOnMarket,
      cumulativeDaysOnMarket: p.CumulativeDaysOnMarket,
      beds: p.BedroomsTotal,
      baths: p.BathroomsTotalInteger,
      sqft: p.LivingArea,
      ownershipType: p.OwnershipType,
      listAgentName: p.ListAgentFullName,
      buyerAgentName: p.BuyerAgentFullName,
      listOfficeName: p.ListOfficeName,
      buyerOfficeName: p.BuyerOfficeName,
      isUnitMatch,
      priceChange: p.ListPrice && p.OriginalListPrice && p.ListPrice !== p.OriginalListPrice
        ? p.ListPrice - p.OriginalListPrice
        : 0,
    });

    const unitHistory = unitListings.map((l) => mapListing(l, true));
    const buildingHistory = buildingListings.map((l) => mapListing(l, false));

    console.log(
      `[MLS Listing History] Unit: ${unitHistory.length}, Building: ${buildingHistory.length} for "${address}" (unit: ${unitNumber || "n/a"})`,
    );

    const response = {
      address,
      unitNumber,
      unitHistory,
      buildingHistory,
      total: unitHistory.length + buildingHistory.length,
      source: "mls",
    };

    // Only cache if we got results (don't cache empty results that might be from errors)
    if (response.total > 0) {
      propertyCacheSet(cacheKey, response, "unified");
      propertyDbWrite(cacheKey, "mls-listing-history", response, "unified").catch(() => {});
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[MLS Listing History] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch listing history" }, { status: 500 });
  }
}
