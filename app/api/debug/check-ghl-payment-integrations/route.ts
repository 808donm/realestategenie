import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Debug: Check GHL payment integrations
 * GET /api/debug/check-ghl-payment-integrations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

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

    // Get location details including payment settings
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

    if (!locationResponse.ok) {
      return NextResponse.json({
        error: "Cannot fetch location",
        status: locationResponse.status,
        response: await locationResponse.text()
      });
    }

    const locationData = await locationResponse.json();

    return NextResponse.json({
      location: {
        id: locationData.location?.id,
        name: locationData.location?.name,
        settings: locationData.location?.settings,
        integrations: locationData.location?.integrations,
        business: locationData.location?.business,
      },
      diagnosis: {
        message: "Check if payment integrations (Stripe, PayPal, etc.) are configured",
        nextSteps: [
          "1. Log into GHL dashboard",
          "2. Go to Settings → Payments",
          "3. Connect Stripe, PayPal, or another payment provider",
          "4. Ensure 'Invoices' feature is enabled in payment settings",
          "5. Try creating an invoice via API again",
        ],
        note: "GHL may require a payment provider to be connected before allowing API invoice creation, even if UI invoice creation works."
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
