import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";

/**
 * Send or attach MLS Property Listing to a GHL Contact
 *
 * mode="email" — sends an email to the contact with listing details
 * mode="attach" — adds the listing as a note on the contact in GHL
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contactId, property, mode = "attach" } = body;

    if (!contactId || !property) {
      return NextResponse.json(
        { error: "contactId and property are required" },
        { status: 400 }
      );
    }

    const ghlConfig = await getValidGHLConfig(userData.user.id);

    if (!ghlConfig) {
      return NextResponse.json(
        { error: "GoHighLevel is not connected. Go to Integrations to set it up." },
        { status: 404 }
      );
    }

    const client = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

    // Build property details
    const address = [property.StreetNumber, property.StreetName, property.StreetSuffix]
      .filter(Boolean)
      .join(" ");
    const fullAddress = [address, property.City, property.StateOrProvince, property.PostalCode]
      .filter(Boolean)
      .join(", ");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.realestategenie.app";
    const listingKey = property.ListingKey || property.ListingId;
    const propertyLink = `${appUrl}/app/mls?listing=${encodeURIComponent(listingKey)}`;
    const propertyName = fullAddress || `MLS# ${listingKey}`;

    if (mode === "email") {
      // Send email to the contact via GHL
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #1f2937;">Property Listing for You</h2>
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 16px 0;">
            <div style="padding: 20px;">
              <h3 style="margin: 0 0 8px; color: #111827;">${fullAddress || "Property Listing"}</h3>
              <div style="font-size: 24px; font-weight: bold; color: #059669; margin-bottom: 12px;">
                $${property.ListPrice?.toLocaleString() || "N/A"}
              </div>
              <table style="width: 100%; font-size: 14px; color: #6b7280;">
                ${property.BedroomsTotal ? `<tr><td style="padding: 4px 0;"><strong>Bedrooms:</strong></td><td>${property.BedroomsTotal}</td></tr>` : ""}
                ${property.BathroomsTotalInteger ? `<tr><td style="padding: 4px 0;"><strong>Bathrooms:</strong></td><td>${property.BathroomsTotalInteger}</td></tr>` : ""}
                ${property.LivingArea ? `<tr><td style="padding: 4px 0;"><strong>Sq Ft:</strong></td><td>${property.LivingArea.toLocaleString()}</td></tr>` : ""}
                ${property.YearBuilt ? `<tr><td style="padding: 4px 0;"><strong>Year Built:</strong></td><td>${property.YearBuilt}</td></tr>` : ""}
                <tr><td style="padding: 4px 0;"><strong>Status:</strong></td><td>${property.StandardStatus || "N/A"}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>MLS #:</strong></td><td>${property.ListingId || property.ListingKey}</td></tr>
              </table>
              ${property.PublicRemarks ? `<p style="margin-top: 12px; font-size: 14px; color: #6b7280;">${property.PublicRemarks.substring(0, 300)}${property.PublicRemarks.length > 300 ? "..." : ""}</p>` : ""}
              <a href="${propertyLink}" style="display: inline-block; margin-top: 16px; padding: 10px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                View Full Listing
              </a>
            </div>
          </div>
          <p style="font-size: 12px; color: #9ca3af;">Sent via Real Estate Genie</p>
        </div>
      `;

      await client.sendEmail({
        contactId,
        subject: `Property Listing: ${propertyName}`,
        html: emailHtml,
      });

      // Tag the contact
      await client.addTags(contactId, ["mls-listing-emailed"]);

      return NextResponse.json({
        success: true,
        message: "Listing emailed to contact successfully!",
      });
    } else {
      // Attach mode: add note with property link to the contact
      const noteBody = [
        `--- MLS Listing Attached ---`,
        ``,
        `Property: ${propertyName}`,
        `MLS #: ${property.ListingId || property.ListingKey}`,
        `Price: $${property.ListPrice?.toLocaleString() || "N/A"}`,
        `Status: ${property.StandardStatus || "N/A"}`,
        `Type: ${property.PropertyType || "N/A"}`,
        property.BedroomsTotal ? `Beds: ${property.BedroomsTotal}` : null,
        property.BathroomsTotalInteger ? `Baths: ${property.BathroomsTotalInteger}` : null,
        property.LivingArea ? `Sq Ft: ${property.LivingArea.toLocaleString()}` : null,
        ``,
        `View Listing: ${propertyLink}`,
        ``,
        `Attached via Real Estate Genie on ${new Date().toLocaleDateString()}`,
      ]
        .filter((line) => line !== null)
        .join("\n");

      await client.addNote({
        contactId,
        body: noteBody,
      });

      await client.addTags(contactId, ["mls-listing-attached"]);

      return NextResponse.json({
        success: true,
        message: "Listing attached to contact successfully!",
      });
    }
  } catch (error) {
    console.error("Error sending/attaching listing:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process listing" },
      { status: 500 }
    );
  }
}
