import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";

/**
 * GET /api/mls/calculator-lookup?mlsNumber=xxx
 * GET /api/mls/calculator-lookup?address=xxx
 *
 * Looks up an MLS listing by MLS number OR street address and returns
 * property data pre-mapped for all calculator types.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const mlsNumber = request.nextUrl.searchParams.get("mlsNumber");
    const address = request.nextUrl.searchParams.get("address");

    if (!mlsNumber?.trim() && !address?.trim()) {
      return NextResponse.json({ error: "mlsNumber or address is required" }, { status: 400 });
    }

    const client = await getTrestleClient(supabase, user.id);
    if (!client) {
      return NextResponse.json({ error: "Trestle MLS not connected" }, { status: 400 });
    }

    let property = null;
    let addressResults: typeof property[] = [];

    if (mlsNumber?.trim()) {
      // MLS Number lookup: try ListingId first, fall back to ListingKey
      property = await client.searchByListingId(mlsNumber.trim());
      if (!property) {
        try {
          property = await client.getProperty(mlsNumber.trim());
        } catch {
          // Not found
        }
      }
    } else if (address?.trim()) {
      // Address-based search using UnparsedAddress and street fields
      const q = address.trim().replace(/'/g, "''"); // escape single quotes for OData
      // Search UnparsedAddress (most complete), plus StreetName as fallback
      const filter = `contains(tolower(UnparsedAddress), '${q.toLowerCase()}')`;
      const result = await client.getProperties({
        $filter: filter,
        $top: 5,
        $orderby: "ModificationTimestamp desc",
      });

      if (result.value.length === 1) {
        property = result.value[0];
      } else if (result.value.length > 1) {
        // Return multiple matches so the user can pick
        addressResults = result.value;
      } else {
        // Fallback: try searching by street number + street name
        const parts = q.split(/[\s,]+/).filter(Boolean);
        if (parts.length >= 2) {
          const streetNum = parts[0];
          const streetName = parts.slice(1).join(" ").toLowerCase();
          const fallbackFilter = `startswith(StreetNumber, '${streetNum}') and contains(tolower(StreetName), '${streetName}')`;
          const fallbackResult = await client.getProperties({
            $filter: fallbackFilter,
            $top: 5,
            $orderby: "ModificationTimestamp desc",
          });
          if (fallbackResult.value.length === 1) {
            property = fallbackResult.value[0];
          } else if (fallbackResult.value.length > 1) {
            addressResults = fallbackResult.value;
          }
        }
      }
    }

    // If multiple results, return them for the user to pick
    if (!property && addressResults.length > 0) {
      return NextResponse.json({
        success: true,
        multiple: true,
        results: addressResults.map((p: any) => {
          const addrParts = [p.StreetNumber, p.StreetName, p.StreetSuffix].filter(Boolean);
          return {
            listingKey: p.ListingKey,
            listingId: p.ListingId,
            address: p.UnparsedAddress || `${addrParts.join(" ")}, ${p.City}, ${p.StateOrProvince} ${p.PostalCode}`,
            listPrice: p.ListPrice || 0,
            status: p.StandardStatus || "",
          };
        }),
      });
    }

    if (!property) {
      return NextResponse.json({ error: "No listings found matching that address" }, { status: 404 });
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
