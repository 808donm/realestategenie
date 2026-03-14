/**
 * Calendar Sync Cron Job
 *
 * Periodic full two-way sync for all connected calendar providers.
 * Acts as a safety net for missed webhooks. Runs every 15 minutes.
 * Individual calendars take precedence — source always wins on conflict.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fullSync } from "@/lib/calendar/sync-engine";
import { GoogleCalendarProvider } from "@/lib/integrations/google-calendar-client";
import { MicrosoftCalendarProvider } from "@/lib/integrations/microsoft-calendar-client";
import { GHLCalendarProvider } from "@/lib/integrations/ghl-calendar-sync";
import { renewMicrosoftSubscription } from "@/lib/integrations/microsoft-calendar-client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: {
    processed: number;
    synced: { agentId: string; provider: string; result: any }[];
    errors: string[];
  } = { processed: 0, synced: [], errors: [] };

  try {
    // Find all connected calendar integrations
    const { data: integrations } = await supabaseAdmin
      .from("integrations")
      .select("agent_id, provider")
      .in("provider", ["google_calendar", "microsoft_calendar", "ghl"])
      .eq("status", "connected");

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({ success: true, message: "No calendar integrations to sync" });
    }

    const providers: Record<string, any> = {
      google_calendar: new GoogleCalendarProvider(),
      microsoft_calendar: new MicrosoftCalendarProvider(),
      ghl: new GHLCalendarProvider(),
    };

    const sourceMap: Record<string, "google" | "microsoft" | "ghl"> = {
      google_calendar: "google",
      microsoft_calendar: "microsoft",
      ghl: "ghl",
    };

    for (const integration of integrations) {
      const provider = providers[integration.provider];
      const source = sourceMap[integration.provider];

      if (!provider || !source) continue;

      try {
        const result = await fullSync(integration.agent_id, source, provider);
        results.synced.push({
          agentId: integration.agent_id,
          provider: integration.provider,
          result,
        });
        results.processed++;
      } catch (err: any) {
        console.error(
          `[Calendar Sync Cron] Failed for ${integration.agent_id}/${integration.provider}:`,
          err.message
        );
        results.errors.push(`${integration.agent_id}/${integration.provider}: ${err.message}`);
      }
    }

    // Renew Microsoft subscriptions that expire within 24 hours
    const { data: expiringSubscriptions } = await supabaseAdmin
      .from("calendar_sync_state")
      .select("agent_id")
      .eq("provider", "microsoft")
      .not("subscription_id", "is", null)
      .lt("subscription_expiration", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

    if (expiringSubscriptions) {
      for (const sub of expiringSubscriptions) {
        try {
          await renewMicrosoftSubscription(sub.agent_id);
          console.log("[Calendar Sync Cron] Renewed Microsoft subscription for:", sub.agent_id);
        } catch (err: any) {
          results.errors.push(`MS renewal ${sub.agent_id}: ${err.message}`);
        }
      }
    }

    console.log("[Calendar Sync Cron] Complete:", results);
    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    console.error("[Calendar Sync Cron] Fatal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Also support GET for Vercel cron
export async function GET(request: NextRequest) {
  return POST(request);
}
