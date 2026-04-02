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
    const statusParam = params.get("status") || "Active,Pending,Closed";
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

    // Location filter -- zip code only (Trestle doesn't support Latitude/Longitude filtering)
    if (postalCode) {
      filters.push(`startswith(PostalCode, '${postalCode}')`);
    }

    // Time filter -- use ModificationTimestamp for recent changes
    filters.push(`ModificationTimestamp gt ${cutoff}`);

    // Property type
    if (propertyType) {
      filters.push(`PropertyType eq '${propertyType}'`);
    }

    // Exclude rentals
    // Note: can't filter PropertySubType as OData enum, so filter server-side

    const filterStr = filters.join(" and ");
    console.log(`[Market Watch] Filter: ${filterStr}`);

    // Trestle suppresses Latitude/Longitude when $expand=Media is used.
    // Fetch both in parallel and merge: coords from one call, photos from another.
    const [coordResult, mediaResult] = await Promise.all([
      client.getProperties({
        $filter: filterStr,
        $orderby: "ModificationTimestamp desc",
        $top: limit,
        $count: true,
      }),
      client.getProperties({
        $filter: filterStr,
        $orderby: "ModificationTimestamp desc",
        $top: limit,
        $expand: "Media",
        $select: "ListingKey,Media",
      }).catch(() => ({ value: [] as any[] })),
    ]);

    // Build photo lookup by ListingKey
    const photoMap = new Map<string, string>();
    for (const p of (mediaResult.value || [])) {
      if (p.ListingKey && p.Media?.length > 0) {
        const sorted = [...p.Media].sort((a: any, b: any) => (a.Order || 0) - (b.Order || 0));
        const photo = sorted.find((m: any) => m.MediaURL);
        if (photo) photoMap.set(p.ListingKey, photo.MediaURL);
      }
    }

    // Use coordResult as base, attach photos
    const result = coordResult;
    for (const p of (result.value || [])) {
      if (p.ListingKey && photoMap.has(p.ListingKey)) {
        (p as any)._photoUrl = photoMap.get(p.ListingKey);
      }
    }

    console.log(`[Market Watch] Returned ${result.value?.length || 0} listings, ${result.value?.filter((p: any) => p.Latitude && p.Longitude).length || 0} with coords, ${photoMap.size} with photos`);

    // Filter out rentals server-side
    const listings = (result.value || []).filter((p: any) => {
      const subType = (p.PropertySubType || "").toLowerCase();
      if (subType.includes("lease")) return false;
      if (p.ListPrice && p.ListPrice > 0 && p.ListPrice < 25000) return false;
      return true;
    });

    // Determine "New" listings (Active with OnMarketDate within 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Compute status counts -- add "New" as a virtual status
    const statusCounts: Record<string, number> = {};
    let newCount = 0;
    for (const listing of listings) {
      const status = listing.StandardStatus || (listing as any).MlsStatus || "Unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      // Check if this is a new listing
      if (status === "Active" && listing.OnMarketDate) {
        const onMarket = new Date(listing.OnMarketDate);
        if (onMarket >= sevenDaysAgo) newCount++;
      }
    }
    if (newCount > 0) statusCounts["New"] = newCount;

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

      const isNew = p.StandardStatus === "Active" && p.OnMarketDate && new Date(p.OnMarketDate) >= sevenDaysAgo;

      return {
        listingKey: p.ListingKey,
        listingId: p.ListingId,
        status: p.StandardStatus,
        isNew,
        photoUrl: (p as any)._photoUrl || null,
        mlsStatus: p.MlsStatus,
        propertyType: p.PropertyType,
        propertySubType: p.PropertySubType,
        listPrice: p.ListPrice,
        originalListPrice: p.OriginalListPrice,
        closePrice: p.ClosePrice,
        closeDate: p.CloseDate,
        onMarketDate: p.OnMarketDate,
        daysOnMarket: p.DaysOnMarket || p.CumulativeDaysOnMarket,
        lat: p.Latitude || p.MapCoordinate?.Latitude || p.MapCoordinate?.lat || (typeof p.MapCoordinate === "string" ? parseFloat(p.MapCoordinate.split(",")[0]) : null),
        lng: p.Longitude || p.MapCoordinate?.Longitude || p.MapCoordinate?.lng || (typeof p.MapCoordinate === "string" ? parseFloat(p.MapCoordinate.split(",")[1]) : null),
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
