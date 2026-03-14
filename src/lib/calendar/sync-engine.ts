/**
 * Calendar Sync Engine
 *
 * Core two-way sync logic. The app calendar takes precedence for most edits.
 * The only exception: GHL booked meetings (from the online booking page)
 * always win — these are customer-facing appointments and the source of truth.
 *
 * Conflict resolution:
 *  - App edits win by default (local changes override source on conflict)
 *  - GHL booked meetings (identified by metadata.isBookedOnline) always win
 *  - Google/Microsoft source changes only update if local hasn't been modified
 *
 * Inbound: source calendar → local DB
 * Outbound: local edit → push to source → confirm → update local
 */

import { createClient } from "@supabase/supabase-js";
import type {
  CalendarEvent,
  CalendarSource,
  ExternalCalendarEvent,
  CalendarProvider,
  SyncResult,
} from "./types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Inbound sync: pull events from a source calendar and upsert into local DB.
 * Source calendar takes precedence — if the etag changed, source version wins.
 */
export async function inboundSync(
  agentId: string,
  source: CalendarSource,
  provider: CalendarProvider,
  timeMin: string,
  timeMax: string
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, deleted: 0, errors: [] };

  try {
    // Get current sync token
    const { data: syncState } = await supabaseAdmin
      .from("calendar_sync_state")
      .select("*")
      .eq("agent_id", agentId)
      .eq("provider", source)
      .single();

    const syncToken = syncState?.sync_token || undefined;

    // Fetch events from external calendar
    const { events, nextSyncToken, deletedIds } = await provider.fetchEvents(
      agentId,
      timeMin,
      timeMax,
      syncToken
    );

    console.log(`[Calendar Sync] ${source}: fetched ${events.length} events, ${deletedIds?.length || 0} deletions`);

    // Process deletions (mark as cancelled locally)
    if (deletedIds && deletedIds.length > 0) {
      for (const externalId of deletedIds) {
        const { error } = await supabaseAdmin
          .from("calendar_events")
          .update({
            status: "cancelled",
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("agent_id", agentId)
          .eq("source", source)
          .eq("external_id", externalId);

        if (error) {
          result.errors.push(`Delete ${externalId}: ${error.message}`);
        } else {
          result.deleted++;
        }
      }
    }

    // Upsert events — app takes precedence except for GHL booked meetings
    for (const ext of events) {
      try {
        const eventData: Partial<CalendarEvent> = {
          agent_id: agentId,
          source,
          external_id: ext.externalId,
          calendar_id: ext.calendarId || null,
          title: ext.title,
          description: ext.description || null,
          location: ext.location || null,
          start_at: ext.startAt,
          end_at: ext.endAt,
          all_day: ext.allDay || false,
          status: ext.status || "confirmed",
          attendees: ext.attendees || [],
          recurrence: ext.recurrence || null,
          reminder_minutes: ext.reminderMinutes ?? null,
          etag: ext.etag || null,
          metadata: ext.metadata || {},
          synced_at: new Date().toISOString(),
          pending_sync: false,
          updated_at: new Date().toISOString(),
        };

        // GHL booked meetings (from online booking page) always take precedence
        const isGHLBookedMeeting = source === "ghl" && (
          ext.metadata?.isBookedOnline === true ||
          ext.metadata?.appointmentStatus === "new" ||
          ext.metadata?.source === "booking_widget"
        );

        // Check if event exists locally
        const { data: existing } = await supabaseAdmin
          .from("calendar_events")
          .select("id, etag, pending_sync, updated_at")
          .eq("agent_id", agentId)
          .eq("source", source)
          .eq("external_id", ext.externalId)
          .single();

        if (existing) {
          // Conflict resolution:
          // 1. GHL booked meetings always win (source of truth for customer bookings)
          // 2. If local has pending changes (user edited in app), app wins — skip source update
          // 3. Otherwise, accept source update
          if (existing.pending_sync && !isGHLBookedMeeting) {
            // App has local edits — app takes precedence, skip this inbound update
            console.log(`[Calendar Sync] Skipping inbound update for ${ext.externalId} — app edit takes precedence`);
            continue;
          }

          // Source update accepted (either no local edits, or GHL booked meeting wins)
          const { error } = await supabaseAdmin
            .from("calendar_events")
            .update(eventData)
            .eq("id", existing.id);

          if (error) {
            result.errors.push(`Update ${ext.externalId}: ${error.message}`);
          } else {
            result.updated++;
          }
        } else {
          // New event from source
          const { error } = await supabaseAdmin
            .from("calendar_events")
            .insert(eventData);

          if (error) {
            result.errors.push(`Insert ${ext.externalId}: ${error.message}`);
          } else {
            result.created++;
          }
        }
      } catch (err: any) {
        result.errors.push(`Event ${ext.externalId}: ${err.message}`);
      }
    }

    // Update sync token
    if (nextSyncToken) {
      await supabaseAdmin
        .from("calendar_sync_state")
        .upsert(
          {
            agent_id: agentId,
            provider: source,
            sync_token: nextSyncToken,
            last_incremental_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "agent_id,provider" }
        );
    }

    console.log(`[Calendar Sync] ${source} inbound complete:`, result);
  } catch (err: any) {
    console.error(`[Calendar Sync] ${source} inbound error:`, err);
    result.errors.push(err.message);
  }

  return result;
}

/**
 * Outbound sync: push locally modified events back to their source calendar.
 * Only processes events with pending_sync = true.
 * If push fails with conflict, re-fetch source version (source wins).
 */
export async function outboundSync(
  agentId: string,
  source: CalendarSource,
  provider: CalendarProvider
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, deleted: 0, errors: [] };

  try {
    // Find all pending local changes for this source
    const { data: pendingEvents, error } = await supabaseAdmin
      .from("calendar_events")
      .select("*")
      .eq("agent_id", agentId)
      .eq("source", source)
      .eq("pending_sync", true);

    if (error || !pendingEvents || pendingEvents.length === 0) {
      return result;
    }

    console.log(`[Calendar Sync] ${source}: pushing ${pendingEvents.length} pending events`);

    for (const event of pendingEvents) {
      try {
        if (event.status === "cancelled" && event.external_id) {
          // Delete from source
          await provider.deleteEvent(agentId, event.external_id);
          // Remove local record
          await supabaseAdmin
            .from("calendar_events")
            .delete()
            .eq("id", event.id);
          result.deleted++;
        } else {
          // Create or update in source
          const { externalId, etag } = await provider.pushEvent(agentId, event);

          // Update local with confirmed external ID and clear pending flag
          await supabaseAdmin
            .from("calendar_events")
            .update({
              external_id: externalId,
              etag: etag || null,
              pending_sync: false,
              synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", event.id);

          if (event.external_id) {
            result.updated++;
          } else {
            result.created++;
          }
        }
      } catch (err: any) {
        console.error(`[Calendar Sync] ${source} outbound push failed for ${event.id}:`, err);
        result.errors.push(`Push ${event.id}: ${err.message}`);

        // On conflict (409): GHL booked meetings → source wins; everything else → retry later
        if (err.message?.includes("409") || err.message?.includes("conflict")) {
          const isGHLBookedMeeting = event.source === "ghl" && (
            (event.metadata as any)?.isBookedOnline === true ||
            (event.metadata as any)?.source === "booking_widget"
          );

          if (isGHLBookedMeeting) {
            // GHL booked meeting — source wins, discard local edits
            console.log(`[Calendar Sync] Conflict for GHL booked meeting ${event.id} — source wins`);
            await supabaseAdmin
              .from("calendar_events")
              .update({ pending_sync: false })
              .eq("id", event.id);
          } else {
            // App edit — keep pending so we retry on next sync
            console.log(`[Calendar Sync] Conflict for ${event.id} — app edit preserved, will retry`);
          }
        }
      }
    }

    console.log(`[Calendar Sync] ${source} outbound complete:`, result);
  } catch (err: any) {
    console.error(`[Calendar Sync] ${source} outbound error:`, err);
    result.errors.push(err.message);
  }

  return result;
}

/**
 * Full two-way sync for a provider:
 * 1. Outbound first (push local changes to source)
 * 2. Then inbound (pull source changes, source wins on conflict)
 */
export async function fullSync(
  agentId: string,
  source: CalendarSource,
  provider: CalendarProvider,
  timeMin?: string,
  timeMax?: string
): Promise<{ inbound: SyncResult; outbound: SyncResult }> {
  const now = new Date();
  const defaultMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
  const defaultMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ahead

  // Step 1: Push local changes first
  const outbound = await outboundSync(agentId, source, provider);

  // Step 2: Pull source changes (source wins)
  const inbound = await inboundSync(
    agentId,
    source,
    provider,
    timeMin || defaultMin,
    timeMax || defaultMax
  );

  // Update last full sync timestamp
  await supabaseAdmin
    .from("calendar_sync_state")
    .upsert(
      {
        agent_id: agentId,
        provider: source,
        last_full_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,provider" }
    );

  return { inbound, outbound };
}

/**
 * Create a local-only event or an event destined for a specific source calendar.
 * If source is not 'local', marks it as pending_sync so outbound sync pushes it.
 */
export async function createEvent(
  event: CalendarEvent
): Promise<{ id: string } | null> {
  const isLocal = event.source === "local";

  const { data, error } = await supabaseAdmin
    .from("calendar_events")
    .insert({
      ...event,
      pending_sync: !isLocal, // needs to be pushed to source
      synced_at: isLocal ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Calendar] Failed to create event:", error);
    return null;
  }

  return { id: data.id };
}

/**
 * Update an existing event. If it's synced to an external source,
 * marks it as pending_sync so the outbound sync pushes the change.
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<boolean> {
  // Get current event to check source
  const { data: existing } = await supabaseAdmin
    .from("calendar_events")
    .select("source")
    .eq("id", eventId)
    .single();

  if (!existing) return false;

  const isLocal = existing.source === "local";

  const { error } = await supabaseAdmin
    .from("calendar_events")
    .update({
      ...updates,
      pending_sync: !isLocal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    console.error("[Calendar] Failed to update event:", error);
    return false;
  }

  return true;
}

/**
 * Delete an event. If synced to external source, marks as cancelled + pending_sync
 * so the outbound sync deletes it from the source too.
 */
export async function deleteEvent(eventId: string): Promise<boolean> {
  const { data: existing } = await supabaseAdmin
    .from("calendar_events")
    .select("source, external_id")
    .eq("id", eventId)
    .single();

  if (!existing) return false;

  if (existing.source === "local" || !existing.external_id) {
    // Local-only: hard delete
    const { error } = await supabaseAdmin
      .from("calendar_events")
      .delete()
      .eq("id", eventId);
    return !error;
  }

  // Synced event: mark cancelled + pending so outbound sync deletes from source
  const { error } = await supabaseAdmin
    .from("calendar_events")
    .update({
      status: "cancelled",
      pending_sync: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  return !error;
}
