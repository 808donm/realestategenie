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
      console.error("GHL token exchange failed:", errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=ghl_token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, locationId, userId, companyId } = tokenData;

    // Store tokens in integrations table
    const { error: upsertError } = await supabase
      .from("integrations")
      .upsert({
        agent_id: user.id,
        provider: "ghl",
        status: "connected",
        config: {
          access_token,
          refresh_token,
          expires_in,
          expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
          location_id: locationId,
          user_id: userId,
          company_id: companyId,
        },
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "agent_id,provider",
      });

    if (upsertError) {
      console.error("Failed to store GHL tokens:", upsertError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=ghl_save_failed`
      );
    }

    // Log to audit log
    await supabase.from("audit_log").insert({
      agent_id: user.id,
      action: "integration.connected",
      details: { provider: "ghl", location_id: locationId },
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
