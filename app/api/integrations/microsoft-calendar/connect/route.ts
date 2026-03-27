import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  if (!process.env.MICROSOFT_CALENDAR_CLIENT_ID || !process.env.MICROSOFT_CALENDAR_CLIENT_SECRET) {
    return NextResponse.json(
      {
        error:
          "Microsoft Calendar integration is not configured. Please set MICROSOFT_CALENDAR_CLIENT_ID and MICROSOFT_CALENDAR_CLIENT_SECRET environment variables.",
      },
      { status: 503 },
    );
  }

  const requestUrl = new URL(request.url);
  const appOrigin = `${requestUrl.protocol}//${requestUrl.host}`;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", appOrigin));
  }

  const state = crypto.randomUUID();

  // Use admin client to bypass RLS for the upsert
  const { error: upsertError } = await supabaseAdmin.from("integrations").upsert(
    {
      agent_id: user.id,
      provider: "microsoft_calendar",
      status: "disconnected",
      config: { oauth_state: state },
    },
    { onConflict: "agent_id,provider" },
  );

  if (upsertError) {
    console.error("[Microsoft Calendar] Failed to create integration row:", upsertError);
    return NextResponse.redirect(
      `${appOrigin}/app/integrations?error=microsoft_oauth_failed&message=${encodeURIComponent("Failed to initialize: " + upsertError.message)}`,
    );
  }

  const tenant = process.env.MICROSOFT_CALENDAR_TENANT_ID || "common";
  const callbackUri = `${appOrigin}/api/integrations/microsoft-calendar/callback`;

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CALENDAR_CLIENT_ID!,
    redirect_uri: callbackUri,
    response_type: "code",
    scope: "Calendars.ReadWrite offline_access",
    state,
    response_mode: "query",
  });

  return NextResponse.redirect(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`);
}
