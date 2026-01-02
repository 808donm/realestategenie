import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Handle CRM OAuth callback
 * GET /api/integrations/crm-callback?code=xxx&state=xxx
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=ghl_oauth_failed&message=${error}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=ghl_no_code`
    );
  }

  const supabase = await supabaseServer();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/signin?error=unauthorized`
    );
  }

  try {
    // Exchange authorization code for access token
    console.log("Exchanging GHL authorization code for token...");
    const tokenResponse = await fetch("https://services.leadconnectorhq.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GHL_CLIENT_ID!,
        client_secret: process.env.GHL_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/crm-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("GHL token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData,
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=ghl_token_exchange_failed&message=${encodeURIComponent(errorData)}`
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("GHL token exchange successful:", {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      locationId: tokenData.locationId,
    });
    const { access_token, refresh_token, expires_in, locationId, userId, companyId } = tokenData;

    // Store tokens in integrations table
    console.log("Storing GHL integration for user:", user.id);
    const { data: upsertData, error: upsertError } = await supabase
      .from("integrations")
      .upsert({
        agent_id: user.id,
        provider: "ghl",
        status: "connected",
        config: {
          ghl_access_token: access_token,
          ghl_refresh_token: refresh_token,
          ghl_expires_in: expires_in,
          ghl_expires_at: new Date(Date.now() + (expires_in || 86400) * 1000).toISOString(),
          ghl_location_id: locationId,
          ghl_user_id: userId,
          ghl_company_id: companyId,
        },
      }, {
        onConflict: "agent_id,provider",
      })
      .select();

    if (upsertError) {
      console.error("Failed to store GHL tokens:", upsertError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=ghl_save_failed&message=${encodeURIComponent(upsertError.message)}`
      );
    }

    console.log("GHL integration stored successfully:", upsertData);

    // Log to audit log
    await supabase.from("audit_log").insert({
      agent_id: user.id,
      action: "integration.connected",
      details: { provider: "ghl", ghl_location_id: locationId },
    });

    // Success - redirect to integrations page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?success=ghl_connected`
    );
  } catch (error: any) {
    console.error("GHL OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=ghl_unexpected_error`
    );
  }
}
