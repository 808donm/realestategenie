import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";

/**
 * POST /api/mls/lookup-listing
 *
 * Feature 1: Auto-Fill Open House Events from MLS Listings
 *
 * Takes an MLS number (ListingId) and returns property details
 * pre-mapped to open_house_events fields so agents can create
 * open houses with zero manual data entry.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { mlsNumber } = await request.json();
    if (!mlsNumber?.trim()) {
      return NextResponse.json({ error: "MLS number is required" }, { status: 400 });
    }

    const client = await getTrestleClient(supabase, user.id);
    if (!client) {
      return NextResponse.json({ error: "Trestle MLS not connected" }, { status: 400 });
    }

    // Try by ListingId first (most common), fall back to ListingKey
    let property = await client.searchByListingId(mlsNumber.trim());

    if (!property) {
      // Try as ListingKey
      try {
        property = await client.getProperty(mlsNumber.trim());
      } catch {
        // Not found
      }
    }

    if (!property) {
      return NextResponse.json({ error: "Listing not found in MLS" }, { status: 404 });
    }

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

    // Map to open_house_events fields
    const mappedFields = {
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
      // MLS tracking fields
      mls_listing_key: property.ListingKey,
      mls_listing_id: property.ListingId,
      mls_source: "mls",
    };

    // Also return full property for display
    return NextResponse.json({
      success: true,
      mappedFields,
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
    });
  } catch (error) {
    console.error("Error looking up MLS listing:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to look up listing" },
      { status: 500 }
    );
  }
}
