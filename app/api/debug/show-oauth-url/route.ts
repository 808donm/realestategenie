import { NextResponse } from "next/server";

/**
 * Shows the exact OAuth URL that will be used for GHL authorization
 * This helps debug what scopes are being requested
 * GET /api/debug/show-oauth-url
 */
export async function GET(req: Request) {
  try {
    const clientId = process.env.GHL_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/crm-callback`;

    if (!clientId) {
      return NextResponse.json({
        error: "GHL_CLIENT_ID not configured in environment variables"
      }, { status: 500 });
    }

    // Build the exact OAuth URL that's used in /api/integrations/ghl/connect
    const ghlAuthUrl = new URL("https://marketplace.gohighlevel.com/oauth/chooselocation");
    ghlAuthUrl.searchParams.append("response_type", "code");
    ghlAuthUrl.searchParams.append("client_id", clientId);
    ghlAuthUrl.searchParams.append("redirect_uri", redirectUri);

    // These are the EXACT scopes from the code
    const scopeString = "contacts.write contacts.readonly opportunities.write opportunities.readonly locations.readonly locations/customFields.readonly locations/customFields.write conversations.write conversations.readonly conversations/message.readonly conversations/message.write objects/record.readonly objects/record.write objects/schema.readonly objects/schema.write associations.write associations.readonly invoices.write invoices.readonly";

    ghlAuthUrl.searchParams.append("scope", scopeString);
    ghlAuthUrl.searchParams.append("state", "test-state-123");

    const scopesArray = scopeString.split(" ");

    return NextResponse.json({
      success: true,
      clientId: `${clientId.substring(0, 10)}...`, // Masked for security
      redirectUri,
      fullOAuthUrl: ghlAuthUrl.toString(),
      requestedScopes: {
        count: scopesArray.length,
        scopes: scopesArray,
      },
      scopeCategories: {
        contacts: scopesArray.filter(s => s.startsWith('contacts')),
        opportunities: scopesArray.filter(s => s.startsWith('opportunities')),
        locations: scopesArray.filter(s => s.startsWith('locations')),
        conversations: scopesArray.filter(s => s.startsWith('conversations')),
        objects: scopesArray.filter(s => s.startsWith('objects')),
        associations: scopesArray.filter(s => s.startsWith('associations')),
        invoices: scopesArray.filter(s => s.startsWith('invoices')),
      },
      instructions: [
        "1. Copy the 'fullOAuthUrl' value",
        "2. Visit that URL in an incognito/private browser window",
        "3. Make sure you're logged into GHL as the SUB-ACCOUNT (not agency admin)",
        "4. Complete the OAuth flow",
        "5. After authorization, decode the JWT token to see what scopes were actually granted",
        "6. Compare 'requestedScopes' vs what's in the token",
      ],
      troubleshooting: {
        if_scopes_missing: [
          "Check GHL Marketplace → Your App → Settings → Scopes",
          "Verify ALL scopes above are enabled/checked",
          "Check if any scopes show 'Pending Approval' - these need GHL approval",
          "After enabling scopes, you may need to 'Save' or 'Publish' the app",
          "Some scopes might require your app to be approved by GHL first",
        ],
        if_location_wrong: [
          "Make sure you're logged into the SPECIFIC sub-account in GHL",
          "NOT logged in as agency admin",
          "The OAuth chooselocation screen should show the correct location",
          "If using agency view, it will return the agency's location ID",
        ],
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
