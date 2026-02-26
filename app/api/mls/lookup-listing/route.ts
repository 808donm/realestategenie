import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";
import type { TrestleProperty } from "@/lib/integrations/trestle-client";

/**
 * Helper: build the standard response payload from a TrestleProperty
 */
async function buildPropertyResponse(
  client: { getPropertyMedia: (key: string) => Promise<{ value: { MediaURL: string; ShortDescription?: string; Order?: number }[] }> },
  property: TrestleProperty
) {
  // Get media separately if not already expanded
  let photos: { url: string; description: string }[] = [];
  if (property.Media && property.Media.length > 0) {
    photos = property.Media
      .sort((a, b) => (a.Order || 0) - (b.Order || 0))
      .map((m) => ({ url: m.MediaURL, description: m.ShortDescription || "" }));
  } else {
    try {
      const mediaResult = await client.getPropertyMedia(property.ListingKey);
      photos = mediaResult.value
        .sort((a, b) => (a.Order || 0) - (b.Order || 0))
        .map((m) => ({ url: m.MediaURL, description: m.ShortDescription || "" }));
    } catch {
      // No media available
    }
  }

  // Build address string
  const addressParts = [
    property.StreetNumber,
    property.StreetName,
    property.StreetSuffix,
  ].filter(Boolean);
  const fullAddress = property.UnparsedAddress ||
    `${addressParts.join(" ")}, ${property.City}, ${property.StateOrProvince} ${property.PostalCode}`;

  // Build key features from available data
  const keyFeatures: string[] = [];
  if (property.YearBuilt) keyFeatures.push(`Built in ${property.YearBuilt}`);
  if (property.LotSizeArea) keyFeatures.push(`${property.LotSizeArea.toLocaleString()} sqft lot`);
  if (property.PropertySubType) keyFeatures.push(property.PropertySubType);

  return {
    mappedFields: {
      address: fullAddress,
      beds: property.BedroomsTotal || null,
      baths: property.BathroomsTotalInteger || null,
      sqft: property.LivingArea || null,
      price: property.ListPrice || null,
      listing_description: property.PublicRemarks || null,
      key_features: keyFeatures,
      property_photo_url: photos.length > 0 ? photos[0].url : null,
      latitude: property.Latitude || null,
      longitude: property.Longitude || null,
      mls_listing_key: property.ListingKey,
      mls_listing_id: property.ListingId,
      mls_source: "mls",
    },
    property: {
      listingKey: property.ListingKey,
      listingId: property.ListingId,
      status: property.StandardStatus,
      propertyType: property.PropertyType,
      propertySubType: property.PropertySubType,
      listAgentName: property.ListAgentFullName,
      listOfficeName: property.ListOfficeName,
      onMarketDate: property.OnMarketDate,
      photos,
      virtualTourUrl: property.VirtualTourURLUnbranded,
    },
  };
}

/**
 * Helper: build a compact summary for address search results list
 */
function buildAddressCandidate(property: TrestleProperty) {
  const addressParts = [
    property.StreetNumber,
    property.StreetName,
    property.StreetSuffix,
  ].filter(Boolean);
  const fullAddress = property.UnparsedAddress ||
    `${addressParts.join(" ")}, ${property.City}, ${property.StateOrProvince} ${property.PostalCode}`;

  return {
    listingKey: property.ListingKey,
    listingId: property.ListingId,
    address: fullAddress,
    status: property.StandardStatus,
    price: property.ListPrice || null,
    beds: property.BedroomsTotal || null,
    baths: property.BathroomsTotalInteger || null,
    sqft: property.LivingArea || null,
    photoUrl: property.Media?.[0]?.MediaURL || null,
  };
}

/**
 * POST /api/mls/lookup-listing
 *
 * Auto-Fill Open House Events from MLS Listings.
 *
 * Accepts either:
 *  - { mlsNumber: "H12345" }   → lookup by MLS ID / ListingKey
 *  - { address: "123 Main St" } → search by address (may return multiple)
 *  - { listingKey: "abc" }      → select a specific result from address search
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { mlsNumber, address, listingKey } = body;

    if (!mlsNumber?.trim() && !address?.trim() && !listingKey?.trim()) {
      return NextResponse.json({ error: "MLS number or address is required" }, { status: 400 });
    }

    const client = await getTrestleClient(supabase, user.id);
    if (!client) {
      return NextResponse.json({ error: "Trestle MLS not connected" }, { status: 400 });
    }

    // ── Mode 1: Select a specific listing by key (from address search results) ─
    if (listingKey?.trim()) {
      let property;
      try {
        property = await client.getProperty(listingKey.trim());
      } catch {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }

      const result = await buildPropertyResponse(client, property);
      return NextResponse.json({ success: true, ...result });
    }

    // ── Mode 2: MLS number lookup ──────────────────────────────────────────────
    if (mlsNumber?.trim()) {
      // Try by ListingId first (most common), fall back to ListingKey
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

      const result = await buildPropertyResponse(client, property);
      return NextResponse.json({ success: true, ...result });
    }

    // ── Mode 3: Address search ─────────────────────────────────────────────────
    const q = address.trim().replace(/'/g, "''"); // escape single quotes for OData

    // Primary: search UnparsedAddress
    const filter = `contains(tolower(UnparsedAddress), '${q.toLowerCase()}')`;
    let searchResult = await client.getProperties({
      $filter: filter,
      $top: 10,
      $orderby: "ModificationTimestamp desc",
      $expand: "Media",
    });

    // Fallback: search by StreetNumber + StreetName
    if (!searchResult.value.length) {
      const parts = q.split(/[\s,]+/).filter(Boolean);
      if (parts.length >= 2) {
        const streetNum = parts[0];
        const streetName = parts.slice(1).join(" ").replace(/,.*/, "").trim().toLowerCase();
        const fallbackFilter = `startswith(StreetNumber, '${streetNum}') and contains(tolower(StreetName), '${streetName}')`;
        searchResult = await client.getProperties({
          $filter: fallbackFilter,
          $top: 10,
          $orderby: "ModificationTimestamp desc",
          $expand: "Media",
        });
      }
    }

    if (!searchResult.value.length) {
      return NextResponse.json({ error: "No listings found at that address" }, { status: 404 });
    }

    // If exactly one result, return full details directly
    if (searchResult.value.length === 1) {
      const result = await buildPropertyResponse(client, searchResult.value[0]);
      return NextResponse.json({ success: true, ...result });
    }

    // Multiple matches — return candidates for user to pick
    const candidates = searchResult.value.map(buildAddressCandidate);
    return NextResponse.json({
      success: true,
      multiple: true,
      candidates,
    });
  } catch (error) {
    console.error("Error looking up MLS listing:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to look up listing" },
      { status: 500 }
    );
  }
}
