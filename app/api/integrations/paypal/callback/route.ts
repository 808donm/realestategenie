import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      console.error("PayPal OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=${encodeURIComponent(
          errorDescription || error
        )}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=missing_parameters`
      );
    }

    // Decode and validate state
    let stateData: { userId: string; nonce: string };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch (e) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=invalid_state`
      );
    }

    const { userId } = stateData;

    // Exchange authorization code for access token
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=paypal_not_configured`
      );
    }

    const paypalApiBase = process.env.PAYPAL_MODE === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/paypal/callback`;

    // Base64 encode client credentials
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenResponse = await fetch(`${paypalApiBase}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("PayPal token exchange error:", errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();

    // Get merchant/user info from PayPal
    const userInfoResponse = await fetch(`${paypalApiBase}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
    });

    let merchantId = null;
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      merchantId = userInfo.payer_id || userInfo.user_id;
    }

    // Get user's account ID
    const { data: accountMember } = await supabaseAdmin
      .from("account_members")
      .select("account_id")
      .eq("agent_id", userId)
      .eq("is_active", true)
      .single();

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // Store the connection in database
    const { error: dbError } = await supabaseAdmin
      .from("integration_connections")
      .upsert({
        agent_id: userId,
        account_id: accountMember?.account_id || null,
        integration_type: "paypal",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: expiresAt.toISOString(),
        external_account_id: merchantId,
        external_user_id: merchantId,
        connection_status: "connected",
        scopes: tokenData.scope ? tokenData.scope.split(" ") : [],
        metadata: {
          token_type: tokenData.token_type,
          app_id: tokenData.app_id,
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error("Error storing PayPal connection:", dbError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=storage_failed`
      );
    }

    // Success - redirect back to integrations page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?success=paypal_connected`
    );
  } catch (error) {
    console.error("PayPal OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=callback_failed`
    );
  }
}
