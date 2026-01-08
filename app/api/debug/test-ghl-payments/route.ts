import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Debug: Test GHL Payments Features
 * GET /api/debug/test-ghl-payments
 *
 * Tests what payment features are available in your GHL account
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get GHL integration
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    if (!integration?.config?.ghl_access_token) {
      return NextResponse.json({ error: "No GHL integration found" }, { status: 404 });
    }

    const accessToken = integration.config.ghl_access_token;
    const locationId = integration.config.ghl_location_id;

    console.log("\n========================================");
    console.log("🧪 TESTING GHL PAYMENT FEATURES");
    console.log("========================================");
    console.log("Location ID:", locationId);
    console.log("========================================\n");

    const results: any = {
      locationId,
      features: {},
    };

    // Test 1: Invoices (already know this fails)
    try {
      const invoicesResponse = await fetch(
        `https://services.leadconnectorhq.com/invoices/?locationId=${locationId}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Version": "2021-07-28",
          },
        }
      );

      results.features.invoices = {
        available: invoicesResponse.ok,
        status: invoicesResponse.status,
        message: invoicesResponse.ok ? "✅ Invoices API is available" : "❌ Invoices API not available (403 Forbidden)"
      };
    } catch (error) {
      results.features.invoices = {
        available: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }

    // Test 2: Try to get location payment settings
    try {
      const locationResponse = await fetch(
        `https://services.leadconnectorhq.com/locations/${locationId}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Version": "2021-07-28",
          },
        }
      );

      if (locationResponse.ok) {
        const locationData = await locationResponse.json();
        results.location = {
          name: locationData.location?.name,
          settings: locationData.location?.settings,
        };

        // Check for payment/invoice settings
        results.features.paymentSettings = {
          available: !!locationData.location?.settings,
          message: locationData.location?.settings ? "✅ Can read location settings" : "⚠️ No settings found"
        };
      }
    } catch (error) {
      results.features.paymentSettings = {
        available: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }

    // Test 3: Check available scopes in token
    try {
      const token = accessToken;
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        results.tokenScopes = {
          allScopes: payload.oauthMeta?.scopes || [],
          hasInvoicesRead: payload.oauthMeta?.scopes?.includes('invoices.readonly') || false,
          hasInvoicesWrite: payload.oauthMeta?.scopes?.includes('invoices.write') || false,
        };
      }
    } catch (error) {
      results.tokenScopes = { error: "Could not decode token" };
    }

    return NextResponse.json({
      summary: {
        invoicesAvailable: results.features.invoices?.available || false,
        hasCorrectScopes: results.tokenScopes?.hasInvoicesWrite || false,
        diagnosis: !results.features.invoices?.available && results.tokenScopes?.hasInvoicesWrite
          ? "❌ You have the correct OAuth scopes, but the Invoices feature is not enabled on your GHL location. Please contact GHL support or upgrade your plan."
          : results.features.invoices?.available
          ? "✅ Invoices feature is working!"
          : "⚠️ Issue unclear - check details below"
      },
      details: results,
      nextSteps: [
        "1. Log into your GHL dashboard at https://app.gohighlevel.com",
        "2. Go to Settings → Payments",
        "3. Check if 'Invoices' feature is available and enabled",
        "4. If not available, you may need to:",
        "   - Upgrade your GHL plan",
        "   - Contact GHL support to enable the feature",
        "   - Use an alternative billing method (external invoicing)"
      ]
    });

  } catch (error) {
    console.error("Error testing GHL payments:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
