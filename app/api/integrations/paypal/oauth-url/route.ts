import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate state token for security
    const state = crypto.randomUUID();

    // Build PayPal OAuth URL
    const clientId = process.env.PAYPAL_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: "PayPal is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/paypal/callback`;

    // Use sandbox or production based on environment
    const paypalBaseUrl = process.env.PAYPAL_MODE === "live"
      ? "https://www.paypal.com"
      : "https://www.sandbox.paypal.com";

    // Encode user ID and state in the state parameter
    const stateData = Buffer.from(
      JSON.stringify({ userId: userData.user.id, nonce: state })
    ).toString("base64url");

    // PayPal OAuth URL with required scopes
    const oauthUrl = new URL(`${paypalBaseUrl}/connect`);
    oauthUrl.searchParams.set("client_id", clientId);
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set("scope", "openid email https://uri.paypal.com/services/payments/realtimepayment https://uri.paypal.com/services/payments/payment/authcapture");
    oauthUrl.searchParams.set("redirect_uri", redirectUri);
    oauthUrl.searchParams.set("state", stateData);

    return NextResponse.json({ oauth_url: oauthUrl.toString() });
  } catch (error) {
    console.error("Error generating PayPal OAuth URL:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
