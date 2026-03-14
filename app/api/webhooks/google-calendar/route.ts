/**
 * Google Calendar Push Notification Webhook
 *
 * Receives push notifications when events change in a user's Google Calendar.
 * Triggers an incremental inbound sync — source (Google) always wins.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleCalendarProvider } from "@/lib/integrations/google-calendar-client";
import { fullSync } from "@/lib/calendar/sync-engine";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  // Google sends channel ID and resource state in headers
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceState = request.headers.get("x-goog-resource-state");

  if (!channelId) {
    return NextResponse.json({ error: "Missing channel ID" }, { status: 400 });
  }

  // "sync" is the initial verification message — just acknowledge
  if (resourceState === "sync") {
    console.log("[Google Calendar Webhook] Sync verification for channel:", channelId);
    return NextResponse.json({ ok: true });
  }

  console.log("[Google Calendar Webhook] Notification received:", {
    channelId,
    resourceState,
  });

  // Find which agent owns this channel
  const { data: syncState } = await supabaseAdmin
    .from("calendar_sync_state")
    .select("agent_id")
    .eq("provider", "google")
    .eq("channel_id", channelId)
    .single();

  if (!syncState) {
    console.error("[Google Calendar Webhook] Unknown channel:", channelId);
    return NextResponse.json({ error: "Unknown channel" }, { status: 404 });
  }

  // Trigger incremental sync — Google is source of truth
  try {
    const provider = new GoogleCalendarProvider();
    const result = await fullSync(syncState.agent_id, "google", provider);
    console.log("[Google Calendar Webhook] Sync complete:", result);
  } catch (err: any) {
    console.error("[Google Calendar Webhook] Sync failed:", err.message);
  }

  return NextResponse.json({ ok: true });
}
