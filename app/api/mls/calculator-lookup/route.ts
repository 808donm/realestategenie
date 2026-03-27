import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";
import type { TrestleProperty } from "@/lib/integrations/trestle-client";
import { getConfiguredRentcastClient } from "@/lib/integrations/property-data-service";
import { buildPropertyCacheKey, propertyCacheGet, propertyDbRead } from "@/lib/integrations/property-data-cache";

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const mlsNumber = request.nextUrl.searchParams.get("mlsNumber");
    const address = request.nextUrl.searchParams.get("address");

    if (!mlsNumber?.trim() && !address?.trim()) {
      return NextResponse.json({ error: "mlsNumber or address is required" }, { status: 400 });
    }

    // Check DB cache first for address lookups (property data from prior views)
    if (address?.trim()) {
      const cacheKey = buildPropertyCacheKey("unified", "expanded", { address: address.trim(), pagesize: 1 });
      const memoryCached = propertyCacheGet(cacheKey);
      const cached = memoryCached || (await propertyDbRead(cacheKey, "calculator-lookup"));
      if (cached?.data?.property?.[0]) {
        const p = cached.data.property[0];
        const cachedPrice = p.avm?.amount?.value || p.assessment?.market?.mktTtlValue || p.sale?.amount?.saleAmt || 0;
        console.log(`[Calculator Lookup] Cache hit for ${address.trim()}`);
        return NextResponse.json({
          success: true,
          property: {
            listingKey: p.identifier?.obPropId || "",
            listingId: "",
            address: p.address?.oneLine || address.trim(),
            listPrice: cachedPrice,
            livingArea: p.building?.size?.universalSize || p.building?.size?.livingSize || 0,
            bedrooms: p.building?.rooms?.beds || 0,
            bathrooms: p.building?.rooms?.bathsTotal || 0,
            yearBuilt: p.summary?.yearBuilt || 0,
            propertyType: p.summary?.propType || p.summary?.propertyType || "",
            propertySubType: p.summary?.propSubType || "",
            numberOfUnits: 1,
            taxAnnual: p.assessment?.tax?.taxAmt || Math.round(cachedPrice * 0.012),
            insuranceAnnual: Math.round(cachedPrice * 0.005),
            associationFee: p.hoa?.fee || 0,
            status: "Cached",
          },
          source: "cache",
        });
      }
    }

    const client = await getTrestleClient(supabase, user.id);
    if (!client) {
      return NextResponse.json({ error: "Trestle MLS not connected" }, { status: 400 });
    }

    let property: TrestleProperty | null = null;
    let addressResults: TrestleProperty[] = [];

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
        results: addressResults.map((p) => {
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

    // Fallback to RentCast when MLS has no results (address search only)
    if (!property && address?.trim()) {
      try {
        const rcClient = await getConfiguredRentcastClient();
        if (rcClient) {
          const results = await rcClient.searchProperties({ address: address.trim() });
          if (results.length > 0) {
            const rc = results[0];
            const rcPrice = rc.lastSalePrice || 0;
            const estimatedValue = rcPrice || Math.round((rc.taxAssessments ? Object.values(rc.taxAssessments).pop()?.value || 0 : 0));
            return NextResponse.json({
              success: true,
              property: {
                listingKey: rc.id || "",
                listingId: "",
                address: rc.formattedAddress || address.trim(),
                listPrice: estimatedValue,
                livingArea: rc.squareFootage || 0,
                bedrooms: rc.bedrooms || 0,
                bathrooms: rc.bathrooms || 0,
                yearBuilt: rc.yearBuilt || 0,
                propertyType: rc.propertyType || "",
                propertySubType: "",
                numberOfUnits: 1,
                taxAnnual: rc.propertyTaxes ? Math.round(Object.values(rc.propertyTaxes).pop()?.total || 0) : Math.round(estimatedValue * 0.012),
                insuranceAnnual: Math.round(estimatedValue * 0.005),
                associationFee: rc.hoa?.fee || 0,
                status: "Public Records",
              },
              source: "rentcast",
            });
          }
        }
      } catch (err: any) {
        console.warn("[Calculator Lookup] RentCast fallback error:", err.message);
      }
    }

    if (!property) {
      return NextResponse.json({ error: "No listings found matching that address" }, { status: 404 });
    }

    // Build display address
    const addressParts = [property.StreetNumber, property.StreetName, property.StreetSuffix].filter(Boolean);
    const displayAddress =
      property.UnparsedAddress ||
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
        address: displayAddress,
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
      { status: 500 },
    );
  }
}
