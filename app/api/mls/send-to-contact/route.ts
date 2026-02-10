import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";

/**
 * Send MLS Property Listing to a GHL Contact
 *
 * Adds the listing details as a note on the contact in GHL
 * and optionally tags the contact.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contactId, property } = body;

    if (!contactId || !property) {
      return NextResponse.json(
        { error: "contactId and property are required" },
        { status: 400 }
      );
    }

    // Get valid GHL config
    const ghlConfig = await getValidGHLConfig(userData.user.id);

    if (!ghlConfig) {
      return NextResponse.json(
        { error: "GoHighLevel is not connected. Go to Integrations to set it up." },
        { status: 404 }
      );
    }

    const client = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

    // Build a formatted note with property details
    const address = [property.StreetNumber, property.StreetName, property.StreetSuffix]
      .filter(Boolean)
      .join(" ");
    const fullAddress = [address, property.City, property.StateOrProvince, property.PostalCode]
      .filter(Boolean)
      .join(", ");

    // Build link to the property in the app
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.realestategenie.app";
    const listingKey = property.ListingKey || property.ListingId;
    const propertyLink = `${appUrl}/app/mls?listing=${encodeURIComponent(listingKey)}`;

    const noteBody = [
      `--- MLS Listing Shared ---`,
      ``,
      `MLS #: ${property.ListingId || property.ListingKey}`,
      `Address: ${fullAddress || "N/A"}`,
      `Price: $${property.ListPrice?.toLocaleString() || "N/A"}`,
      `Status: ${property.StandardStatus || "N/A"}`,
      `Type: ${property.PropertyType || "N/A"}`,
      property.BedroomsTotal ? `Beds: ${property.BedroomsTotal}` : null,
      property.BathroomsTotalInteger ? `Baths: ${property.BathroomsTotalInteger}` : null,
      property.LivingArea ? `Sq Ft: ${property.LivingArea.toLocaleString()}` : null,
      property.YearBuilt ? `Year Built: ${property.YearBuilt}` : null,
      ``,
      `View Listing: ${propertyLink}`,
      ``,
      property.PublicRemarks ? `Remarks: ${property.PublicRemarks.substring(0, 500)}` : null,
      ``,
      `Shared via Real Estate Genie on ${new Date().toLocaleDateString()}`,
    ]
      .filter((line) => line !== null)
      .join("\n");

    // Add note to the contact
    await client.addNote({
      contactId,
      body: noteBody,
    });

    // Tag the contact
    await client.addTags(contactId, ["mls-listing-shared"]);

    return NextResponse.json({
      success: true,
      message: "Property listing sent to contact",
    });
  } catch (error) {
    console.error("Error sending listing to contact:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send listing" },
      { status: 500 }
    );
  }
}
