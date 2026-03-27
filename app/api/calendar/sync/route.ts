/**
 * Manual Calendar Sync Trigger
 *
 * Triggered by the user clicking "Sync" in the calendar UI.
 * Runs a full two-way sync for all connected providers.
 * Individual calendars take precedence — source always wins.
 */

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { fullSync } from "@/lib/calendar/sync-engine";
import { GoogleCalendarProvider } from "@/lib/integrations/google-calendar-client";
import { MicrosoftCalendarProvider } from "@/lib/integrations/microsoft-calendar-client";
import { GHLCalendarProvider } from "@/lib/integrations/ghl-calendar-sync";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export async function POST() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: integrations } = await supabaseAdmin
    .from("integrations")
    .select("provider")
    .eq("agent_id", user.id)
    .in("provider", ["google_calendar", "microsoft_calendar", "ghl"])
    .eq("status", "connected");

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No calendar integrations connected",
      totalCreated: 0,
      totalUpdated: 0,
    });
  }

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalDeleted = 0;
  const errors: string[] = [];

  const providers: Record<string, { source: "google" | "microsoft" | "ghl"; provider: any }> = {
    google_calendar: { source: "google", provider: new GoogleCalendarProvider() },
    microsoft_calendar: { source: "microsoft", provider: new MicrosoftCalendarProvider() },
    ghl: { source: "ghl", provider: new GHLCalendarProvider() },
  };

  for (const integration of integrations) {
    const config = providers[integration.provider];
    if (!config) continue;

    try {
      const result = await fullSync(user.id, config.source, config.provider);
      totalCreated += result.inbound.created + result.outbound.created;
      totalUpdated += result.inbound.updated + result.outbound.updated;
      totalDeleted += result.inbound.deleted + result.outbound.deleted;
      errors.push(...result.inbound.errors, ...result.outbound.errors);
    } catch (err: any) {
      errors.push(`${integration.provider}: ${err.message}`);
    }
  }

  // Update last_sync_at and last_error on integrations
  for (const integration of integrations) {
    const providerErrors = errors.filter((e) => e.startsWith(integration.provider));
    await supabaseAdmin
      .from("integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: providerErrors.length > 0 ? providerErrors[0] : null,
      })
      .eq("agent_id", user.id)
      .eq("provider", integration.provider);
  }

  return NextResponse.json({
    success: true,
    totalCreated,
    totalUpdated,
    totalDeleted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
