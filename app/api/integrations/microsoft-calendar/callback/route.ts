import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const redirectBase = `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations`;

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
    return NextResponse.redirect(`${redirectBase}?error=not_authenticated`);
  }

  // Verify CSRF state
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("agent_id", user.id)
    .eq("provider", "microsoft_calendar")
    .single();

  if (integration?.config?.oauth_state !== state) {
    return NextResponse.redirect(`${redirectBase}?error=microsoft_invalid_state`);
  }

  try {
    const tenant = process.env.MICROSOFT_CALENDAR_TENANT_ID || "organizations";
    const response = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.MICROSOFT_CALENDAR_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET!,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/microsoft-calendar/callback`,
          grant_type: "authorization_code",
          scope: "Calendars.ReadWrite offline_access",
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[Microsoft Calendar] Token exchange failed:", err);
      return NextResponse.redirect(`${redirectBase}?error=microsoft_token_failed`);
    }

    const tokens = await response.json();
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    await supabase
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

    console.log("[Microsoft Calendar] Connected for agent:", user.id);
    return NextResponse.redirect(`${redirectBase}?success=microsoft_calendar_connected`);
  } catch (err: any) {
    console.error("[Microsoft Calendar] Callback error:", err);
    return NextResponse.redirect(`${redirectBase}?error=microsoft_oauth_failed`);
  }
}
