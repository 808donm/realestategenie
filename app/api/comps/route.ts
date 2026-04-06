import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

import { createTrestleClient } from "@/lib/integrations/trestle-client";
import { getPropertyAvm } from "@/lib/integrations/avm-service";
import { classifyProperty } from "@/lib/avm/genie-avm-engine";
import {
  buildPropertyCacheKey,
  propertyCacheGet,
  propertyCacheSet,
  propertyDbRead,
  propertyDbWrite,
} from "@/lib/integrations/property-data-cache";

/**
 * Calculate similarity/correlation score between a comp and the subject property.
 * Returns 0-1 (1 = perfect match). Weights vary by property type per lender-grade
 * AVM methodology - condos weight building match heavily, land weights lot size.
 */
function calculateCorrelation(
  comp: {
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    yearBuilt?: number;
    propertyType?: string;
    lotSize?: number;
    subdivisionName?: string;
  },
  subject: {
    beds?: number;
    baths?: number;
    sqft?: number;
    yearBuilt?: number;
    propertyType?: string;
    subdivision?: string;
  },
): number {
  const category = classifyProperty(subject.propertyType, subject.propertyType);
  let totalWeight = 0;
  let totalScore = 0;

  // Dynamic weight table by property type
  const w = category === "condo"
    ? { sqft: 25, beds: 15, baths: 10, year: 5, type: 10, building: 25, lot: 0 }
    : category === "land"
      ? { sqft: 0, beds: 0, baths: 0, year: 0, type: 25, building: 5, lot: 50 }
      : category === "townhome"
        ? { sqft: 25, beds: 15, baths: 10, year: 10, type: 15, building: 15, lot: 10 }
        : { sqft: 25, beds: 15, baths: 10, year: 10, type: 15, building: 10, lot: 15 }; // sfr

  // Square footage
  if (comp.squareFootage && subject.sqft && w.sqft > 0) {
    const pctDiff = Math.abs(comp.squareFootage - subject.sqft) / subject.sqft;
    const score = pctDiff <= 0.1 ? 1.0 : pctDiff <= 0.2 ? 0.7 : pctDiff <= 0.3 ? 0.4 : pctDiff <= 0.5 ? 0.15 : 0;
    totalWeight += w.sqft;
    totalScore += score * w.sqft;
  }

  // Bedrooms
  if (comp.bedrooms != null && subject.beds != null && w.beds > 0) {
    const diff = Math.abs(comp.bedrooms - subject.beds);
    const score = diff === 0 ? 1.0 : diff === 1 ? 0.7 : diff === 2 ? 0.3 : 0;
    totalWeight += w.beds;
    totalScore += score * w.beds;
  }

  // Bathrooms
  if (comp.bathrooms != null && subject.baths != null && w.baths > 0) {
    const diff = Math.abs(comp.bathrooms - subject.baths);
    const score = diff === 0 ? 1.0 : diff <= 1 ? 0.7 : diff <= 2 ? 0.3 : 0;
    totalWeight += w.baths;
    totalScore += score * w.baths;
  }

  // Year built
  if (comp.yearBuilt && subject.yearBuilt && w.year > 0) {
    const diff = Math.abs(comp.yearBuilt - subject.yearBuilt);
    const score = diff <= 5 ? 1.0 : diff <= 10 ? 0.7 : diff <= 20 ? 0.4 : diff <= 30 ? 0.2 : 0;
    totalWeight += w.year;
    totalScore += score * w.year;
  }

  // Property type match
  if (comp.propertyType && subject.propertyType && w.type > 0) {
    const compType = (comp.propertyType || "").toLowerCase();
    const subType = (subject.propertyType || "").toLowerCase();
    const match =
      compType === subType ||
      (compType.includes("resid") && subType.includes("sfr")) ||
      (compType.includes("sfr") && subType.includes("resid")) ||
      (compType.includes("condo") && subType.includes("condo"));
    totalWeight += w.type;
    totalScore += (match ? 1.0 : 0) * w.type;
  }

  // Building/subdivision match (critical for condos)
  if (w.building > 0) {
    const compSub = (comp.subdivisionName || "").toLowerCase().trim();
    const subSub = (subject.subdivision || "").toLowerCase().trim();
    if (compSub && subSub) {
      const match = compSub === subSub || compSub.includes(subSub) || subSub.includes(compSub);
      totalWeight += w.building;
      totalScore += (match ? 1.0 : 0) * w.building;
    }
  }

  // Lot size match
  if (comp.lotSize && subject.sqft && w.lot > 0 && category === "land") {
    // For land, lot size is the primary comparison
    const pctDiff = Math.abs(comp.lotSize - (subject.sqft || 0)) / (subject.sqft || 1);
    const score = pctDiff <= 0.15 ? 1.0 : pctDiff <= 0.30 ? 0.7 : pctDiff <= 0.50 ? 0.4 : 0.1;
    totalWeight += w.lot;
    totalScore += score * w.lot;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    const yearBuilt = url.searchParams.get("yearBuilt") ? Number(url.searchParams.get("yearBuilt")) : undefined;
    const subdivision = url.searchParams.get("subdivision") || "";

    if (!address && !zipCode) {
      return NextResponse.json({ error: "address or zipCode is required" }, { status: 400 });
    }

    // Check cache first
    const cacheKey = buildPropertyCacheKey("unified", "comps", {
      address,
      zipCode,
      beds: String(beds || ""),
      baths: String(baths || ""),
      propertyType,
      compCount: String(compCount),
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
        const config = typeof trestleInteg.config === "string" ? JSON.parse(trestleInteg.config) : trestleInteg.config;
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
          const mlsType =
            propertyType.includes("SFR") || propertyType.includes("Single")
              ? "Residential"
              : propertyType.includes("Condo")
                ? "Condominium"
                : propertyType;
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
            "ListingKey",
            "ListingId",
            "StandardStatus",
            "PropertyType",
            "ListPrice",
            "OriginalListPrice",
            "ClosePrice",
            "CloseDate",
            "UnparsedAddress",
            "StreetNumber",
            "StreetName",
            "StreetSuffix",
            "City",
            "StateOrProvince",
            "PostalCode",
            "Latitude",
            "Longitude",
            "BedroomsTotal",
            "BathroomsTotalInteger",
            "LivingArea",
            "YearBuilt",
            "LotSizeArea",
            "DaysOnMarket",
            "CumulativeDaysOnMarket",
            "ListAgentFullName",
            "ListOfficeName",
            "BuyerAgentFullName",
            "BuyerOfficeName",
            "SubdivisionName",
          ].join(","),
          $orderby: "CloseDate desc",
          $top: compCount,
          $count: true,
        });

        if (result.value.length > 0) {
          mlsComps = result.value.map((p) => {
            const addr = p.UnparsedAddress || [p.StreetNumber, p.StreetName, p.StreetSuffix].filter(Boolean).join(" ");
            const pricePerSqft = p.ClosePrice && p.LivingArea ? Math.round(p.ClosePrice / p.LivingArea) : undefined;

            const correlation = calculateCorrelation(
              {
                bedrooms: p.BedroomsTotal,
                bathrooms: p.BathroomsTotalInteger,
                squareFootage: p.LivingArea,
                yearBuilt: p.YearBuilt,
                propertyType: p.PropertyType,
                lotSize: p.LotSizeArea,
                subdivisionName: p.SubdivisionName,
              },
              { beds, baths, sqft, yearBuilt, propertyType, subdivision },
            );

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
              correlation,
              listAgentName: p.ListAgentFullName,
              listOfficeName: p.ListOfficeName,
              buyerAgentName: p.BuyerAgentFullName,
              buyerOfficeName: p.BuyerOfficeName,
              subdivision: p.SubdivisionName,
              subdivisionName: p.SubdivisionName,
            };
          });
          // Sort by correlation (best match first)
          mlsComps.sort((a, b) => (b.correlation || 0) - (a.correlation || 0));
          mlsSuccess = true;
          console.log(`[Comps] MLS returned ${mlsComps.length} closed sales, sorted by match %`);
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
        if (address) {
          const avmData = await getPropertyAvm({
            address,
            compCount: Math.min(Math.max(compCount, 5), 25),
            bedrooms: beds,
            bathrooms: baths,
            squareFootage: sqft,
            propertyType:
              propertyType === "SFR" ? "Single Family" : propertyType === "CONDO" ? "Condo" : propertyType || undefined,
          });

          if (avmData) {
            rentcastAvm = {
              price: avmData.value,
              priceRangeLow: avmData.low,
              priceRangeHigh: avmData.high,
            };

            rentcastComps = (avmData.comparables || []).map((c: any) => ({
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
              pricePerSqft: c.price && c.squareFootage ? Math.round(c.price / c.squareFootage) : undefined,
              distance: c.distance,
              correlation: c.correlation,
            }));

            console.log(`[Comps] AVM service returned ${rentcastComps.length} comps`);
          }
        }
      } catch (err: any) {
        console.warn("[Comps] AVM fallback failed:", err.message);
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
