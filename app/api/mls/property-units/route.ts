import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";

/**
 * GET /api/mls/property-units?listingKey=xxx
 *
 * Feature 5: Multi-Family Investment Analyzer with Real Rent Data
 *
 * Fetches PropertyUnitTypes from the Trestle API for a given listing.
 * Returns unit-level data (actual rent, pro forma rent, beds, baths)
 * that can be fed directly into the BRRR and Flip analyzers.
 *
 * Also fetches core property details for auto-populating the analyzer.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const listingKey = request.nextUrl.searchParams.get("listingKey");
    const listingId = request.nextUrl.searchParams.get("listingId");

    if (!listingKey && !listingId) {
      return NextResponse.json(
        { error: "listingKey or listingId is required" },
        { status: 400 }
      );
    }

    const client = await getTrestleClient(supabase, user.id);
    if (!client) {
      return NextResponse.json({ error: "Trestle MLS not connected" }, { status: 400 });
    }

    // Resolve listing key from listing ID if needed
    let resolvedKey = listingKey;
    let property: import("@/lib/integrations/trestle-client").TrestleProperty | null = null;

    if (listingId && !listingKey) {
      property = await client.searchByListingId(listingId);
      if (!property) {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }
      resolvedKey = property.ListingKey;
    } else if (resolvedKey) {
      try {
        property = await client.getProperty(resolvedKey);
      } catch {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }
    }

    if (!resolvedKey) {
      return NextResponse.json({ error: "Could not resolve listing" }, { status: 404 });
    }

    // Fetch unit types
    let units: import("@/lib/integrations/trestle-client").TrestlePropertyUnitType[] = [];
    try {
      const unitResult = await client.getPropertyUnits(resolvedKey);
      units = unitResult.value;
    } catch {
      // PropertyUnitTypes may not be available for this listing
    }

    // Build address
    const address = property
      ? (property.UnparsedAddress ||
         [property.StreetNumber, property.StreetName, property.StreetSuffix]
           .filter(Boolean).join(" ") +
         `, ${property.City}, ${property.StateOrProvince} ${property.PostalCode}`)
      : "";

    // Calculate totals from units
    const totalActualRent = units.reduce((sum, u) => sum + (u.UnitTypeActualRent || 0), 0);
    const totalProFormaRent = units.reduce((sum, u) => sum + (u.UnitTypeProFormaRent || 0), 0);
    const totalUnits = units.length || 1;

    // Map to BRRR analyzer fields
    const brrrAutoFill = {
      name: address ? `BRRR - ${address}` : undefined,
      address,
      numberOfUnits: totalUnits,
      purchasePrice: property?.ListPrice || 0,
      monthlyRent: totalActualRent || totalProFormaRent || 0,
      afterRepairValue: property?.ListPrice ? Math.round(property.ListPrice * 1.2) : 0, // 20% ARV uplift estimate
    };

    // Map to Flip analyzer fields
    const flipAutoFill = {
      name: address ? `Flip - ${address}` : undefined,
      address,
      purchasePrice: property?.ListPrice || 0,
      afterRepairValue: property?.ListPrice ? Math.round(property.ListPrice * 1.3) : 0, // 30% flip ARV estimate
    };

    return NextResponse.json({
      success: true,
      property: property
        ? {
            listingKey: property.ListingKey,
            listingId: property.ListingId,
            address,
            listPrice: property.ListPrice,
            propertyType: property.PropertyType,
            propertySubType: property.PropertySubType,
            bedrooms: property.BedroomsTotal,
            bathrooms: property.BathroomsTotalInteger,
            livingArea: property.LivingArea,
            yearBuilt: property.YearBuilt,
          }
        : null,
      units: units.map((u) => ({
        type: u.UnitTypeType,
        beds: u.UnitTypeBedsTotal,
        baths: u.UnitTypeBathsTotal,
        actualRent: u.UnitTypeActualRent,
        proFormaRent: u.UnitTypeProFormaRent,
        totalRent: u.UnitTypeTotalRent,
        garageSpaces: u.UnitTypeGarageSpaces,
        description: u.UnitTypeDescription,
      })),
      totals: {
        unitCount: totalUnits,
        totalActualRent,
        totalProFormaRent,
        avgRentPerUnit: totalUnits > 0 ? Math.round((totalActualRent || totalProFormaRent) / totalUnits) : 0,
      },
      brrrAutoFill,
      flipAutoFill,
    });
  } catch (error) {
    console.error("Error fetching property units:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch property units" },
      { status: 500 }
    );
  }
}
