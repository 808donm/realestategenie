import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getPropertyAvm } from "@/lib/integrations/avm-service";
import {
  buildPropertyCacheKey,
  propertyCacheGet,
  propertyCacheSet,
  propertyDbRead,
  propertyDbWrite,
} from "@/lib/integrations/property-data-cache";

/**
 * GET /api/rentcast/comps
 *
 * Fetch comparable properties from RentCast's AVM /avm/value endpoint.
 *
 * Query params:
 *   address   — full property address (required)
 *   compCount — number of comps to return (optional, default 5)
 *   bedrooms, bathrooms, squareFootage, propertyType — optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl;
    const address = url.searchParams.get("address");
    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    const compCount = Number(url.searchParams.get("compCount")) || 5;
    const bedrooms = url.searchParams.get("bedrooms");
    const bathrooms = url.searchParams.get("bathrooms");
    const squareFootage = url.searchParams.get("squareFootage");
    const propertyType = url.searchParams.get("propertyType");

    // Check property data cache first (7-day TTL)
    const cacheKey = buildPropertyCacheKey("rentcast", "comps", {
      address,
      compCount: String(compCount),
      ...(bedrooms ? { bedrooms } : {}),
      ...(bathrooms ? { bathrooms } : {}),
      ...(squareFootage ? { squareFootage } : {}),
      ...(propertyType ? { propertyType } : {}),
    });

    const memoryCached = propertyCacheGet(cacheKey);
    if (memoryCached?.data) {
      console.log("[RentCast Comps] Memory cache HIT for", address);
      return NextResponse.json(memoryCached.data);
    }

    const dbCached = await propertyDbRead(cacheKey, "rentcast");
    if (dbCached?.data) {
      console.log("[RentCast Comps] DB cache HIT for", address);
      propertyCacheSet(cacheKey, dbCached.data, "rentcast");
      return NextResponse.json(dbCached.data);
    }

    // Cache miss — fetch via centralized AVM service
    const avmData = await getPropertyAvm({
      address,
      compCount: Math.min(Math.max(compCount, 5), 25),
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      squareFootage: squareFootage ? Number(squareFootage) : undefined,
      propertyType: propertyType || undefined,
    });

    if (!avmData) {
      return NextResponse.json({ error: "AVM service unavailable" }, { status: 503 });
    }

    const result = {
      price: avmData.value,
      priceRangeLow: avmData.low,
      priceRangeHigh: avmData.high,
      comparables: avmData.comparables || [],
    };

    // Write to both cache layers
    propertyCacheSet(cacheKey, result, "rentcast");
    propertyDbWrite(cacheKey, "rentcast", result, "rentcast").catch(() => {});

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[RentCast Comps] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch comparables" }, { status: 500 });
  }
}
