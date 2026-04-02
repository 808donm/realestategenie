import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";

/**
 * GET /api/mls/market-watch
 *
 * Returns MLS listings for a Market Watch map and dashboard.
 * Queries by zip code or bounding box with status filtering.
 *
 * Query params:
 *   postalCode    -- Zip code to search (required unless bbox provided)
 *   bbox          -- Bounding box: minLng,minLat,maxLng,maxLat
 *   timeframe     -- "today" | "7days" | "30days" | "90days" (default: 30days)
 *   propertyType  -- "Residential" | "Condominium" | etc.
 *   status        -- Comma-separated: Active,Pending,Closed,Expired,Withdrawn,Canceled
 *                    Default: all statuses
 *   limit         -- Max results (default 200, max 500)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = request.nextUrl.searchParams;
    const postalCode = params.get("postalCode");
    const bbox = params.get("bbox");
    const timeframe = params.get("timeframe") || "30days";
    const propertyType = params.get("propertyType");
    const statusParam = params.get("status") || "Active,Pending,Closed,Expired,Withdrawn,Canceled";
    const limit = Math.min(Number(params.get("limit") || 200), 500);

    const client = await getTrestleClient(supabase, user.id);
    if (!client) {
      return NextResponse.json({ error: "Trestle MLS not connected" }, { status: 400 });
    }

    // Calculate date cutoff based on timeframe
    const now = new Date();
    const cutoffDate = new Date();
    switch (timeframe) {
      case "today":
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case "7days":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case "90days":
        cutoffDate.setDate(now.getDate() - 90);
        break;
      default:
        cutoffDate.setDate(now.getDate() - 30);
    }
    const cutoff = cutoffDate.toISOString();

    // Build OData filter
    const filters: string[] = [];

    // Status filter
    const statuses = statusParam.split(",").map((s) => s.trim());
    if (statuses.length === 1) {
      filters.push(`StandardStatus eq '${statuses[0]}'`);
    } else {
      filters.push(`(${statuses.map((s) => `StandardStatus eq '${s}'`).join(" or ")})`);
    }

    // Location filter -- zip code or bounding box
    if (postalCode) {
      filters.push(`startswith(PostalCode, '${postalCode}')`);
    } else if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
      if (!isNaN(minLng) && !isNaN(minLat) && !isNaN(maxLng) && !isNaN(maxLat)) {
        filters.push(`Latitude ge ${minLat} and Latitude le ${maxLat} and Longitude ge ${minLng} and Longitude le ${maxLng}`);
      }
    }

    // Time filter -- use ModificationTimestamp for recent changes
    filters.push(`ModificationTimestamp gt ${cutoff}`);

    // Property type
    if (propertyType) {
      filters.push(`PropertyType eq '${propertyType}'`);
    }

    // Exclude rentals
    // Note: can't filter PropertySubType as OData enum, so filter server-side

    const result = await client.getProperties({
      $filter: filters.join(" and "),
      $orderby: "ModificationTimestamp desc",
      $top: limit,
      $select:
        "ListingKey,ListingId,StandardStatus,MlsStatus,PropertyType,PropertySubType,ListPrice,OriginalListPrice,ClosePrice,CloseDate,OnMarketDate,DaysOnMarket,CumulativeDaysOnMarket,Latitude,Longitude,UnparsedAddress,StreetNumber,StreetName,StreetSuffix,UnitNumber,City,PostalCode,BedroomsTotal,BathroomsTotalInteger,LivingArea,YearBuilt,ModificationTimestamp",
      $count: true,
    });

    // Filter out rentals server-side
    const listings = (result.value || []).filter((p: any) => {
      const subType = (p.PropertySubType || "").toLowerCase();
      if (subType.includes("lease")) return false;
      if (p.ListPrice && p.ListPrice > 0 && p.ListPrice < 25000) return false;
      return true;
    });

    // Compute status counts
    const statusCounts: Record<string, number> = {};
    for (const listing of listings) {
      const status = listing.StandardStatus || (listing as any).MlsStatus || "Unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    // Detect price changes
    let priceIncreases = 0;
    let priceDecreases = 0;
    for (const listing of listings) {
      if (listing.OriginalListPrice && listing.ListPrice) {
        if (listing.ListPrice > listing.OriginalListPrice) priceIncreases++;
        else if (listing.ListPrice < listing.OriginalListPrice) priceDecreases++;
      }
    }

    // Build address for each listing
    const enriched = listings.map((p: any) => {
      const address =
        p.UnparsedAddress ||
        [p.StreetNumber, p.StreetName, p.StreetSuffix].filter(Boolean).join(" ") +
          (p.UnitNumber ? ` #${p.UnitNumber}` : "") +
          `, ${p.City || ""}, HI ${p.PostalCode || ""}`;

      return {
        listingKey: p.ListingKey,
        listingId: p.ListingId,
        status: p.StandardStatus,
        mlsStatus: p.MlsStatus,
        propertyType: p.PropertyType,
        propertySubType: p.PropertySubType,
        listPrice: p.ListPrice,
        originalListPrice: p.OriginalListPrice,
        closePrice: p.ClosePrice,
        closeDate: p.CloseDate,
        onMarketDate: p.OnMarketDate,
        daysOnMarket: p.DaysOnMarket || p.CumulativeDaysOnMarket,
        lat: p.Latitude,
        lng: p.Longitude,
        address,
        beds: p.BedroomsTotal,
        baths: p.BathroomsTotalInteger,
        sqft: p.LivingArea,
        yearBuilt: p.YearBuilt,
        modifiedAt: p.ModificationTimestamp,
        priceChange:
          p.OriginalListPrice && p.ListPrice !== p.OriginalListPrice ? p.ListPrice - p.OriginalListPrice : 0,
      };
    });

    return NextResponse.json({
      listings: enriched,
      totalCount: result["@odata.count"] || enriched.length,
      statusCounts,
      priceChanges: { increases: priceIncreases, decreases: priceDecreases },
      timeframe,
      postalCode,
    });
  } catch (error: any) {
    console.error("[Market Watch] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch market watch data" }, { status: 500 });
  }
}
