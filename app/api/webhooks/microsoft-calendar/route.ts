/**
 * Microsoft Calendar Subscription Webhook
 *
 * Receives change notifications from Microsoft Graph subscriptions.
 * Handles validation handshake and triggers incremental sync.
 * Microsoft calendar is the source of truth — it wins on conflict.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MicrosoftCalendarProvider } from "@/lib/integrations/microsoft-calendar-client";
import { fullSync } from "@/lib/calendar/sync-engine";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export async function POST(request: NextRequest) {
  const url = new URL(request.url);

  // Microsoft sends a validation token during subscription creation
  const validationToken = url.searchParams.get("validationToken");
  if (validationToken) {
    console.log("[Microsoft Calendar Webhook] Validation handshake");
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const body = await request.json();
  const notifications = body.value || [];

  console.log("[Microsoft Calendar Webhook] Received", notifications.length, "notifications");

  for (const notification of notifications) {
    // Verify client state
    if (notification.clientState !== (process.env.CRON_SECRET || "calendar-sync")) {
      console.error("[Microsoft Calendar Webhook] Invalid client state");
      continue;
    }

    const subscriptionId = notification.subscriptionId;

    // Find which agent owns this subscription
    const { data: syncState } = await supabaseAdmin
      .from("calendar_sync_state")
      .select("agent_id")
      .eq("provider", "microsoft")
      .eq("subscription_id", subscriptionId)
      .single();

    if (!syncState) {
      console.error("[Microsoft Calendar Webhook] Unknown subscription:", subscriptionId);
      continue;
    }

    // Trigger sync — Microsoft is source of truth
    try {
      const provider = new MicrosoftCalendarProvider();
      const result = await fullSync(syncState.agent_id, "microsoft", provider);
      console.log("[Microsoft Calendar Webhook] Sync complete for agent:", syncState.agent_id, result);
    } catch (err: any) {
      console.error("[Microsoft Calendar Webhook] Sync failed:", err.message);
    }
  }

  return NextResponse.json({ ok: true });
}
