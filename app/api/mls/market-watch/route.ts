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
      case "24hours":
        cutoffDate.setHours(now.getHours() - 24);
        break;
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

    // Property type -- map user-friendly names to Trestle OData enum values
    if (propertyType) {
      const trestleTypeMap: Record<string, string> = {
        "single family": "Residential",
        "condominium": "Residential",
        "condo": "Residential",
        "townhouse": "Residential",
        "multi-family": "Residential Income",
        "residential income": "Residential Income",
        "commercial": "Commercial",
        "land": "Land",
        "farm": "Farm",
        "residential": "Residential",
      };
      const mappedType = trestleTypeMap[propertyType.toLowerCase()] || propertyType;
      filters.push(`PropertyType eq '${mappedType}'`);
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

    // Use Hawaii GIS parcel centroids to get coordinates for listings with ParcelNumber but no lat/lng.
    // This is free and works for every listing since HiCentral always provides ParcelNumber (TMK).
    const needsCoords = (result.value || []).filter((p: any) => (!p.Latitude || !p.Longitude) && (p as any).ParcelNumber);
    if (needsCoords.length > 0) {
      console.log(`[Market Watch] Resolving coordinates from parcel centroids for ${needsCoords.length} listings`);

      // Strip condo unit suffix (last 4 digits) from TMK for land-level parcel lookup.
      // TMK "1-2-8-013-029-0011" -> query tmk = 128013029 (9 digits, no unit)
      const tmkToNumeric = (tmk: string): string => {
        const parts = tmk.replace(/[^0-9-]/g, "").split("-").filter(Boolean);
        // Take island + zone + section + plat + parcel (skip unit)
        if (parts.length >= 5) return parts.slice(0, 5).join("");
        return parts.join("");
      };

      // Group listings by land-level TMK to avoid duplicate GIS calls for same-building condos
      const tmkGroups = new Map<string, typeof needsCoords>();
      for (const p of needsCoords) {
        const numTmk = tmkToNumeric(String((p as any).ParcelNumber));
        if (!tmkGroups.has(numTmk)) tmkGroups.set(numTmk, []);
        tmkGroups.get(numTmk)!.push(p);
      }

      const uniqueTmks = Array.from(tmkGroups.keys());
      const batchSize = 10;
      let resolved = 0;
      for (let i = 0; i < uniqueTmks.length; i += batchSize) {
        const batch = uniqueTmks.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(async (numTmk) => {
            try {
              const gisUrl = `https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer/25/query?where=${encodeURIComponent(`tmk=${numTmk}`)}&outFields=tmk&returnGeometry=true&returnCentroid=true&outSR=4326&f=json`;
              const gisRes = await fetch(gisUrl, { signal: AbortSignal.timeout(5000) });
              const gisData = await gisRes.json();
              const feature = gisData.features?.[0];
              if (feature) {
                // Use centroid if available, otherwise compute from geometry rings
                let lat: number | null = null;
                let lng: number | null = null;
                if (feature.centroid) {
                  lat = feature.centroid.y;
                  lng = feature.centroid.x;
                } else if (feature.geometry?.rings?.[0]) {
                  const ring = feature.geometry.rings[0];
                  const sumX = ring.reduce((s: number, c: number[]) => s + c[0], 0);
                  const sumY = ring.reduce((s: number, c: number[]) => s + c[1], 0);
                  lng = sumX / ring.length;
                  lat = sumY / ring.length;
                }
                if (lat && lng) {
                  for (const p of tmkGroups.get(numTmk)!) {
                    (p as any).Latitude = lat;
                    (p as any).Longitude = lng;
                  }
                  resolved += tmkGroups.get(numTmk)!.length;
                }
              }
            } catch {}
          }),
        );
      }
      console.log(`[Market Watch] Parcel centroid lookup: ${resolved} of ${needsCoords.length} listings resolved (${uniqueTmks.length} unique parcels)`);
    }

    const finalWithCoords = (result.value || []).filter((p: any) => p.Latitude && p.Longitude).length;
    console.log(`[Market Watch] Returned ${result.value?.length || 0} listings, ${finalWithCoords} with coords, ${photoMap.size} with photos`);

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

    // Compute status counts -- add "New" and "Back On Market" as virtual statuses
    const statusCounts: Record<string, number> = {};
    let newCount = 0;
    let bomCount = 0;
    for (const listing of listings) {
      const status = listing.StandardStatus || (listing as any).MlsStatus || "Unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      // Check if new listing
      if (status === "Active" && listing.OnMarketDate) {
        const onMarket = new Date(listing.OnMarketDate);
        if (onMarket >= sevenDaysAgo) newCount++;
      }
      // Check if back on market (has BackOnMarketDate)
      if (status === "Active" && (listing as any).BackOnMarketDate) {
        bomCount++;
      }
    }
    if (newCount > 0) statusCounts["New"] = newCount;
    if (bomCount > 0) statusCounts["Back On Market"] = bomCount;

    // Count price changes as virtual statuses
    let priceUpCount = 0;
    let priceDownCount = 0;
    for (const listing of listings) {
      if (listing.OriginalListPrice && listing.ListPrice) {
        if (listing.ListPrice > listing.OriginalListPrice) priceUpCount++;
        else if (listing.ListPrice < listing.OriginalListPrice) priceDownCount++;
      }
    }
    if (priceUpCount > 0) statusCounts["Price Increase"] = priceUpCount;
    if (priceDownCount > 0) statusCounts["Price Decrease"] = priceDownCount;

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
      const isBackOnMarket = p.StandardStatus === "Active" && !!(p as any).BackOnMarketDate;
      const isPriceIncrease = p.OriginalListPrice && p.ListPrice && p.ListPrice > p.OriginalListPrice;
      const isPriceDecrease = p.OriginalListPrice && p.ListPrice && p.ListPrice < p.OriginalListPrice;

      return {
        listingKey: p.ListingKey,
        listingId: p.ListingId,
        status: p.StandardStatus,
        isNew,
        isBackOnMarket,
        isPriceIncrease: !!isPriceIncrease,
        isPriceDecrease: !!isPriceDecrease,
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
        city: p.City,
        state: p.StateOrProvince || "HI",
        postalCode: p.PostalCode,
        parcelNumber: p.ParcelNumber || null,
        beds: p.BedroomsTotal,
        baths: p.BathroomsTotalInteger,
        sqft: p.LivingArea,
        lotSize: p.LotSizeArea,
        yearBuilt: p.YearBuilt,
        ownershipType: p.OwnershipType,
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
