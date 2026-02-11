import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * QuickBooks OAuth2 Callback Endpoint
 * Handles the OAuth redirect and exchanges code for tokens
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const realmId = searchParams.get("realmId");
  const error = searchParams.get("error");

  console.log("[QBO Callback] Received callback");
  console.log("[QBO Callback] Code:", code ? "present" : "missing");
  console.log("[QBO Callback] RealmId:", realmId);
  console.log("[QBO Callback] State:", state);

  // Handle error from QuickBooks
  if (error) {
    console.error("[QBO Callback] OAuth error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=qbo_auth_failed`
    );
  }

  if (!code || !state || !realmId) {
    console.error("[QBO Callback] Missing required parameters");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=qbo_invalid_callback`
    );
  }

  try {
    // Decode state to get agent ID
    const stateData = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
    const agentId = stateData.agentId;

    if (!agentId) {
      throw new Error("Invalid state parameter - missing agent ID");
    }

    console.log("[QBO Callback] Agent ID from state:", agentId);

    // Exchange authorization code for tokens
    const clientId = process.env.QBO_CLIENT_ID!;
    const clientSecret = process.env.QBO_CLIENT_SECRET!;
    const redirectUri = process.env.QBO_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/qbo/callback`;

    const tokenResponse = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[QBO Callback] Token exchange failed:", errorData);
      throw new Error(`Token exchange failed: ${errorData}`);
    }

    const tokens = await tokenResponse.json();
    console.log("[QBO Callback] Tokens received successfully");

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000).toISOString();

    // Get company info
    let companyName = null;
    try {
      const companyInfoResponse = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`,
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${tokens.access_token}`,
          },
        }
      );

      if (companyInfoResponse.ok) {
        const companyData = await companyInfoResponse.json();
        companyName = companyData.CompanyInfo?.CompanyName;
        console.log("[QBO Callback] Company name:", companyName);
      }
    } catch (error) {
      console.warn("[QBO Callback] Failed to fetch company info:", error);
    }

    // Store tokens in database
    const config = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      refresh_expires_at: refreshExpiresAt,
      expires_in: tokens.expires_in,
      x_refresh_token_expires_in: tokens.x_refresh_token_expires_in,
      realmId: realmId,
      companyName: companyName,
    };

    // Check if integration already exists
    const { data: existing } = await supabaseAdmin
      .from("integrations")
      .select("id")
      .eq("agent_id", agentId)
      .eq("provider", "qbo")
      .single();

    if (existing) {
      // Update existing integration
      const { error: updateError } = await supabaseAdmin
        .from("integrations")
        .update({
          config,
          status: "connected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("[QBO Callback] Failed to update integration:", updateError);
        throw updateError;
      }

      console.log("[QBO Callback] Updated existing integration");
    } else {
      // Create new integration
      const { error: insertError } = await supabaseAdmin
        .from("integrations")
        .insert({
          agent_id: agentId,
          provider: "qbo",
          config,
          status: "connected",
        });

      if (insertError) {
        console.error("[QBO Callback] Failed to create integration:", insertError);
        throw insertError;
      }

      console.log("[QBO Callback] Created new integration");
    }

    // Redirect back to integrations page with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?success=qbo_connected`
    );
  } catch (error: any) {
    console.error("[QBO Callback] Error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations?error=qbo_setup_failed`
    );
  }
}
