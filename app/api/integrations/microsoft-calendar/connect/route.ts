import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import crypto from "crypto";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_APP_URL!)
    );
  }

  const state = crypto.randomUUID();

  await supabase.from("integrations").upsert(
    {
      agent_id: user.id,
      provider: "microsoft_calendar",
      status: "disconnected",
      config: { oauth_state: state },
    },
    { onConflict: "agent_id,provider" }
  );

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CALENDAR_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/microsoft-calendar/callback`,
    response_type: "code",
    scope: "Calendars.ReadWrite offline_access",
    state,
    response_mode: "query",
  });

  return NextResponse.redirect(
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
  );
}
