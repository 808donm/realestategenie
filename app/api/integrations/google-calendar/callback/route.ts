import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const redirectBase = `${process.env.NEXT_PUBLIC_APP_URL}/app/integrations`;

  if (error) {
    console.error("[Google Calendar] OAuth error:", error);
    return NextResponse.redirect(`${redirectBase}?error=google_oauth_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?error=google_no_code`);
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
    .eq("provider", "google_calendar")
    .single();

  if (integration?.config?.oauth_state !== state) {
    return NextResponse.redirect(`${redirectBase}?error=google_invalid_state`);
  }

  // Exchange code for tokens
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-calendar/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Google Calendar] Token exchange failed:", err);
      return NextResponse.redirect(`${redirectBase}?error=google_token_failed`);
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
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", user.id)
      .eq("provider", "google_calendar");

    console.log("[Google Calendar] Connected for agent:", user.id);
    return NextResponse.redirect(`${redirectBase}?success=google_calendar_connected`);
  } catch (err: any) {
    console.error("[Google Calendar] Callback error:", err);
    return NextResponse.redirect(`${redirectBase}?error=google_oauth_failed`);
  }
}
