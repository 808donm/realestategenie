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

    // DETAILED LOGGING to debug location ID issue
    console.log("========================================");
    console.log("GHL TOKEN RESPONSE - FULL DETAILS");
    console.log("========================================");
    console.log("Location ID from GHL:", tokenData.locationId);
    console.log("User ID from GHL:", tokenData.userId);
    console.log("Company ID from GHL:", tokenData.companyId);
    console.log("Token type:", tokenData.token_type);
    console.log("Expires in:", tokenData.expires_in);
    console.log("Has access token:", !!tokenData.access_token);
    console.log("Has refresh token:", !!tokenData.refresh_token);

    // Decode JWT to see scopes and auth details
    if (tokenData.access_token) {
      try {
        const tokenParts = tokenData.access_token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log("JWT Payload authClass:", payload.authClass);
          console.log("JWT Payload authClassId:", payload.authClassId);
          console.log("JWT Payload primaryAuthClassId:", payload.primaryAuthClassId);
          console.log("JWT Payload scopes:", payload.oauthMeta?.scopes || []);
          console.log("JWT Payload scope count:", payload.oauthMeta?.scopes?.length || 0);
          console.log("JWT Payload client:", payload.oauthMeta?.client);

          // Check if authClassId matches the expected sub-account location
          if (payload.authClassId !== tokenData.locationId) {
            console.warn("⚠️ WARNING: JWT authClassId differs from tokenData.locationId!");
            console.warn("JWT authClassId:", payload.authClassId);
            console.warn("tokenData.locationId:", tokenData.locationId);
          }
        }
      } catch (decodeError) {
        console.log("Could not decode JWT:", decodeError);
      }
    }
    console.log("========================================");

    const { access_token, refresh_token, expires_in, locationId, userId, companyId } = tokenData;

    // Fetch existing integration to preserve pipeline settings ONLY
    const { data: existingIntegration } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    const existingConfig = (existingIntegration?.config as any) || {};

    // Store tokens in integrations table with NEW field names (ghl_ prefix)
    // IMPORTANT: Preserve ALL existing config values, only update OAuth tokens
    console.log("Storing GHL integration for user:", user.id);
    const newConfig = {
      // Preserve ALL existing config values (pipeline settings, template IDs, etc.)
      ...existingConfig,
      // Update OAuth tokens with new values (these will overwrite old tokens)
      ghl_access_token: access_token,
      ghl_refresh_token: refresh_token,
      ghl_expires_in: expires_in,
      ghl_expires_at: new Date(Date.now() + (expires_in || 86400) * 1000).toISOString(),
      ghl_location_id: locationId,
      ghl_user_id: userId,
      ghl_company_id: companyId,
    };

    // Remove undefined values to keep config clean
    Object.keys(newConfig).forEach(key => {
      if (newConfig[key as keyof typeof newConfig] === undefined) {
        delete newConfig[key as keyof typeof newConfig];
      }
    });

    console.log("New GHL config keys:", Object.keys(newConfig));

    const { data: upsertData, error: upsertError } = await supabase
      .from("integrations")
      .upsert({
        agent_id: user.id,
        provider: "ghl",
        status: "connected",
        config: newConfig, // Use the clean config with only new field names
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
