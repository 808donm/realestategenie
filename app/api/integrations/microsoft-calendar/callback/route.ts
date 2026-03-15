import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Derive the app origin from the actual request URL so it works
  // even if NEXT_PUBLIC_APP_URL was baked with a different value.
  const appOrigin = `${requestUrl.protocol}//${requestUrl.host}`;
  const redirectBase = `${appOrigin}/app/integrations`;
  const callbackUri = `${appOrigin}/api/integrations/microsoft-calendar/callback`;

  if (error) {
    console.error("[Microsoft Calendar] OAuth error:", error);
    return NextResponse.redirect(`${redirectBase}?error=microsoft_oauth_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?error=microsoft_no_code`);
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("[Microsoft Calendar] No authenticated user in callback");
    return NextResponse.redirect(`${redirectBase}?error=not_authenticated`);
  }

  // Verify CSRF state
  const { data: integration, error: fetchError } = await supabase
    .from("integrations")
    .select("*")
    .eq("agent_id", user.id)
    .eq("provider", "microsoft_calendar")
    .single();

  if (fetchError) {
    console.error("[Microsoft Calendar] Failed to fetch integration row:", fetchError);
    return NextResponse.redirect(`${redirectBase}?error=microsoft_invalid_state`);
  }

  if (integration?.config?.oauth_state !== state) {
    console.error("[Microsoft Calendar] State mismatch. Expected:", integration?.config?.oauth_state, "Got:", state);
    return NextResponse.redirect(`${redirectBase}?error=microsoft_invalid_state`);
  }

  try {
    const tenant = process.env.MICROSOFT_CALENDAR_TENANT_ID || "common";
    console.log("[Microsoft Calendar] Exchanging code with redirect_uri:", callbackUri);

    const response = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.MICROSOFT_CALENDAR_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET!,
          redirect_uri: callbackUri,
          grant_type: "authorization_code",
          scope: "Calendars.ReadWrite offline_access",
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[Microsoft Calendar] Token exchange failed:", response.status, err);
      console.error("[Microsoft Calendar] redirect_uri used:", callbackUri);
      return NextResponse.redirect(`${redirectBase}?error=microsoft_token_failed`);
    }

    const tokens = await response.json();
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    const { error: updateError } = await supabase
      .from("integrations")
      .update({
        status: "connected",
        config: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          token_type: tokens.token_type,
          scope: tokens.scope,
        },
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", user.id)
      .eq("provider", "microsoft_calendar");

    if (updateError) {
      console.error("[Microsoft Calendar] Failed to save tokens:", updateError);
      return NextResponse.redirect(`${redirectBase}?error=microsoft_oauth_failed&message=${encodeURIComponent("Failed to save connection: " + updateError.message)}`);
    }

    console.log("[Microsoft Calendar] Connected for agent:", user.id);
    return NextResponse.redirect(`${redirectBase}?success=microsoft_calendar_connected`);
  } catch (err: any) {
    console.error("[Microsoft Calendar] Callback error:", err);
    return NextResponse.redirect(`${redirectBase}?error=microsoft_oauth_failed`);
  }
}
