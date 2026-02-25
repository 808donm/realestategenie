import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";

/**
 * GET /api/mls/calculator-lookup?mlsNumber=xxx
 *
 * Looks up an MLS listing and returns property data pre-mapped
 * for all calculator types. Each calculator picks the fields it needs.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const mlsNumber = request.nextUrl.searchParams.get("mlsNumber");
    if (!mlsNumber?.trim()) {
      return NextResponse.json({ error: "mlsNumber is required" }, { status: 400 });
    }

    const client = await getTrestleClient(supabase, user.id);
    if (!client) {
      return NextResponse.json({ error: "Trestle MLS not connected" }, { status: 400 });
    }

    // Try by ListingId first, fall back to ListingKey
    let property = await client.searchByListingId(mlsNumber.trim());
    if (!property) {
      try {
        property = await client.getProperty(mlsNumber.trim());
      } catch {
        // Not found
      }
    }

    if (!property) {
      return NextResponse.json({ error: "Listing not found in MLS" }, { status: 404 });
    }

    // Build address
    const addressParts = [
      property.StreetNumber,
      property.StreetName,
      property.StreetSuffix,
    ].filter(Boolean);
    const address = property.UnparsedAddress ||
      `${addressParts.join(" ")}, ${property.City}, ${property.StateOrProvince} ${property.PostalCode}`;

    // Estimate annual property tax from TaxAnnualAmount or ListPrice
    const estimatedTaxAnnual = property.TaxAnnualAmount || Math.round((property.ListPrice || 0) * 0.012);
    // Estimate annual insurance (~0.5% of value)
    const estimatedInsuranceAnnual = Math.round((property.ListPrice || 0) * 0.005);

    // Return a universal property data object
    return NextResponse.json({
      success: true,
      property: {
        listingKey: property.ListingKey,
        listingId: property.ListingId,
        address,
        listPrice: property.ListPrice || 0,
        livingArea: property.LivingArea || 0,
        bedrooms: property.BedroomsTotal || 0,
        bathrooms: property.BathroomsTotalInteger || 0,
        yearBuilt: property.YearBuilt || 0,
        propertyType: property.PropertyType || "",
        propertySubType: property.PropertySubType || "",
        numberOfUnits: property.NumberOfUnitsTotal || 1,
        taxAnnual: estimatedTaxAnnual,
        insuranceAnnual: estimatedInsuranceAnnual,
        associationFee: property.AssociationFee || 0,
        status: property.StandardStatus || "",
      },
    });
  } catch (error) {
    console.error("Error in calculator MLS lookup:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to look up listing" },
      { status: 500 }
    );
  }
}
