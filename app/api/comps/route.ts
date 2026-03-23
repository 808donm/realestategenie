import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createTrestleClient } from "@/lib/integrations/trestle-client";
import { RentcastClient, createRentcastClient } from "@/lib/integrations/rentcast-client";
import {
  buildPropertyCacheKey, propertyCacheGet, propertyCacheSet,
  propertyDbRead, propertyDbWrite,
} from "@/lib/integrations/property-data-cache";

/**
 * GET /api/comps
 *
 * MLS-first comparable sales. Queries Trestle for closed sales near the
 * subject property, falls back to RentCast AVM comps when MLS unavailable.
 *
 * Query params:
 *   address    — full property address (required)
 *   zipCode    — zip code of subject property
 *   lat, lng   — coordinates for proximity search
 *   beds       — subject bedrooms (for matching)
 *   baths      — subject bathrooms
 *   sqft       — subject square footage
 *   propertyType — SFR, Condo, etc.
 *   compCount  — number of comps (default 10)
 *   months     — lookback period for closed sales (default 12)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl;
    const address = url.searchParams.get("address") || "";
    const zipCode = url.searchParams.get("zipCode") || "";
    const beds = url.searchParams.get("beds") ? Number(url.searchParams.get("beds")) : undefined;
    const baths = url.searchParams.get("baths") ? Number(url.searchParams.get("baths")) : undefined;
    const sqft = url.searchParams.get("sqft") ? Number(url.searchParams.get("sqft")) : undefined;
    const propertyType = url.searchParams.get("propertyType") || "";
    const compCount = Number(url.searchParams.get("compCount")) || 10;
    const months = Number(url.searchParams.get("months")) || 12;

    if (!address && !zipCode) {
      return NextResponse.json({ error: "address or zipCode is required" }, { status: 400 });
    }

    // Check cache first
    const cacheKey = buildPropertyCacheKey("unified", "comps", {
      address, zipCode, beds: String(beds || ""), baths: String(baths || ""),
      propertyType, compCount: String(compCount),
    });

    const memoryCached = propertyCacheGet(cacheKey);
    if (memoryCached?.data) {
      return NextResponse.json({ ...memoryCached.data, cacheHit: "memory" });
    }

    const dbCached = await propertyDbRead(cacheKey, "unified");
    if (dbCached?.data) {
      propertyCacheSet(cacheKey, dbCached.data, "unified");
      return NextResponse.json({ ...dbCached.data, cacheHit: "db" });
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Try MLS (Trestle) — closed sales
    // ═══════════════════════════════════════════════════════════════════
    let mlsComps: any[] = [];
    let mlsSuccess = false;

    const { data: trestleInteg } = await supabase
      .from("integrations")
      .select("config, status")
      .eq("agent_id", user.id)
      .eq("provider", "trestle")
      .eq("status", "connected")
      .maybeSingle();

    if (trestleInteg?.config) {
      try {
        const config = typeof trestleInteg.config === "string"
          ? JSON.parse(trestleInteg.config) : trestleInteg.config;
        const client = createTrestleClient(config);

        // Build filter for closed sales in the area
        const filters: string[] = ["StandardStatus eq 'Closed'"];

        // Location: prefer zip code
        const searchZip = zipCode || address.match(/\b(\d{5})\b/)?.[1];
        if (searchZip) {
          filters.push(`PostalCode eq '${searchZip}'`);
        }

        // Property type matching
        if (propertyType) {
          const mlsType = propertyType.includes("SFR") || propertyType.includes("Single")
            ? "Residential" : propertyType.includes("Condo")
            ? "Condominium" : propertyType;
          filters.push(`PropertyType eq '${mlsType}'`);
        }

        // Bedroom range (±1)
        if (beds) {
          filters.push(`BedroomsTotal ge ${Math.max(1, beds - 1)}`);
          filters.push(`BedroomsTotal le ${beds + 1}`);
        }

        // Date range (last N months)
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        filters.push(`CloseDate ge ${cutoffDate.toISOString().split("T")[0]}`);

        console.log("[Comps] MLS filter:", filters.join(" and "));

        const result = await client.getProperties({
          $filter: filters.join(" and "),
          $select: [
            "ListingKey", "ListingId", "StandardStatus", "PropertyType",
            "ListPrice", "OriginalListPrice", "ClosePrice", "CloseDate",
            "UnparsedAddress", "StreetNumber", "StreetName", "StreetSuffix",
            "City", "StateOrProvince", "PostalCode",
            "Latitude", "Longitude",
            "BedroomsTotal", "BathroomsTotalInteger", "LivingArea",
            "YearBuilt", "LotSizeArea",
            "DaysOnMarket", "CumulativeDaysOnMarket",
            "ListAgentFullName", "ListOfficeName",
            "BuyerAgentFullName", "BuyerOfficeName",
          ].join(","),
          $orderby: "CloseDate desc",
          $top: compCount,
          $count: true,
        });

        if (result.value.length > 0) {
          mlsComps = result.value.map((p) => {
            const addr = p.UnparsedAddress ||
              [p.StreetNumber, p.StreetName, p.StreetSuffix].filter(Boolean).join(" ");
            const pricePerSqft = p.ClosePrice && p.LivingArea
              ? Math.round(p.ClosePrice / p.LivingArea) : undefined;

            return {
              source: "mls",
              listingKey: p.ListingKey,
              listingId: p.ListingId,
              address: `${addr}, ${p.City}, ${p.StateOrProvince} ${p.PostalCode}`,
              city: p.City,
              state: p.StateOrProvince,
              zipCode: p.PostalCode,
              latitude: p.Latitude,
              longitude: p.Longitude,
              closePrice: p.ClosePrice,
              listPrice: p.ListPrice,
              originalListPrice: p.OriginalListPrice,
              closeDate: p.CloseDate,
              daysOnMarket: p.DaysOnMarket || p.CumulativeDaysOnMarket,
              propertyType: p.PropertyType,
              bedrooms: p.BedroomsTotal,
              bathrooms: p.BathroomsTotalInteger,
              squareFootage: p.LivingArea,
              yearBuilt: p.YearBuilt,
              lotSize: p.LotSizeArea,
              pricePerSqft,
              listAgentName: p.ListAgentFullName,
              listOfficeName: p.ListOfficeName,
              buyerAgentName: p.BuyerAgentFullName,
              buyerOfficeName: p.BuyerOfficeName,
            };
          });
          mlsSuccess = true;
          console.log(`[Comps] MLS returned ${mlsComps.length} closed sales`);
        } else {
          console.log("[Comps] MLS returned 0 closed sales, falling back to RentCast");
        }
      } catch (err: any) {
        console.warn("[Comps] MLS search failed:", err.message);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Fallback to RentCast if MLS returned nothing
    // ═══════════════════════════════════════════════════════════════════
    let rentcastComps: any[] = [];
    let rentcastAvm: any = null;

    if (!mlsSuccess) {
      try {
        let rentcast: RentcastClient | null = null;
        const { data: rcInteg } = await supabaseAdmin
          .from("integrations")
          .select("config")
          .eq("provider", "rentcast")
          .eq("status", "connected")
          .limit(1)
          .maybeSingle();

        if (rcInteg?.config) {
          const config = typeof rcInteg.config === "string" ? JSON.parse(rcInteg.config) : rcInteg.config;
          if (config.api_key) rentcast = new RentcastClient({ apiKey: config.api_key });
        }
        if (!rentcast) rentcast = createRentcastClient();

        if (rentcast && address) {
          const avmParams: Record<string, any> = {
            address,
            compCount: Math.min(Math.max(compCount, 5), 25),
          };
          if (beds) avmParams.bedrooms = beds;
          if (baths) avmParams.bathrooms = baths;
          if (sqft) avmParams.squareFootage = sqft;
          if (propertyType === "SFR") avmParams.propertyType = "Single Family";
          else if (propertyType === "CONDO") avmParams.propertyType = "Condo";

          const estimate = await rentcast.getValueEstimate(avmParams);
          rentcastAvm = {
            price: estimate.price,
            priceRangeLow: estimate.priceRangeLow,
            priceRangeHigh: estimate.priceRangeHigh,
          };

          rentcastComps = (estimate.comparables || []).map((c: any) => ({
            source: "rentcast",
            address: c.formattedAddress || c.addressLine1,
            city: c.city,
            state: c.state,
            zipCode: c.zipCode,
            latitude: c.latitude,
            longitude: c.longitude,
            closePrice: c.price || c.lastSalePrice,
            closeDate: c.lastSaleDate,
            daysOnMarket: c.daysOnMarket,
            propertyType: c.propertyType,
            bedrooms: c.bedrooms,
            bathrooms: c.bathrooms,
            squareFootage: c.squareFootage,
            yearBuilt: c.yearBuilt,
            lotSize: c.lotSize,
            pricePerSqft: c.price && c.squareFootage
              ? Math.round(c.price / c.squareFootage) : undefined,
            distance: c.distance,
            correlation: c.correlation,
          }));

          console.log(`[Comps] RentCast returned ${rentcastComps.length} comps`);
        }
      } catch (err: any) {
        console.warn("[Comps] RentCast fallback failed:", err.message);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Build response
    // ═══════════════════════════════════════════════════════════════════
    const comparables = mlsSuccess ? mlsComps : rentcastComps;
    const dataSource = mlsSuccess ? "mls" : "rentcast";

    const response = {
      comparables,
      total: comparables.length,
      dataSource,
      avm: rentcastAvm, // RentCast AVM (only when using RentCast comps)
      subject: { address, zipCode, beds, baths, sqft, propertyType },
    };

    // Cache the result
    propertyCacheSet(cacheKey, response, "unified");
    propertyDbWrite(cacheKey, "unified", response, "unified").catch(() => {});

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Comps] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
