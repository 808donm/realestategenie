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
      console.error("Stripe OAuth error:", error, errorDescription);
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
    const clientSecret = process.env.STRIPE_SECRET_KEY;

    if (!clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=stripe_not_configured`
      );
    }

    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Stripe token exchange error:", errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();

    // Get user's account ID
    const { data: accountMember } = await supabaseAdmin
      .from("account_members")
      .select("account_id")
      .eq("agent_id", userId)
      .eq("is_active", true)
      .single();

    // Store the connection in database
    const { error: dbError } = await supabaseAdmin
      .from("integration_connections")
      .upsert({
        agent_id: userId,
        account_id: accountMember?.account_id || null,
        integration_type: "stripe",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        external_account_id: tokenData.stripe_user_id,
        external_user_id: tokenData.stripe_user_id,
        connection_status: "connected",
        scopes: tokenData.scope ? [tokenData.scope] : [],
        metadata: {
          livemode: tokenData.livemode,
          stripe_publishable_key: tokenData.stripe_publishable_key,
          token_type: tokenData.token_type,
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error("Error storing Stripe connection:", dbError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=storage_failed`
      );
    }

    // Success - redirect back to integrations page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?success=stripe_connected`
    );
  } catch (error) {
    console.error("Stripe OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=callback_failed`
    );
  }
}
