/**
 * Google Calendar API Client
 *
 * Handles OAuth, event CRUD, and push notification channel management.
 * Uses Google Calendar API v3.
 */

import { createClient } from "@supabase/supabase-js";
import type {
  CalendarProvider,
  CalendarEvent,
  ExternalCalendarEvent,
  CalendarEventStatus,
} from "@/lib/calendar/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";

// --- Token Management ---

export async function getValidGoogleCalendarTokens(agentId: string): Promise<{
  access_token: string;
  refresh_token: string;
} | null> {
  const { data: integration } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("agent_id", agentId)
    .eq("provider", "google_calendar")
    .eq("status", "connected")
    .single();

  if (!integration) return null;

  const config = integration.config as any;
  const accessToken = config.access_token;
  const refreshToken = config.refresh_token;
  const expiresAtStr = config.expires_at;

  if (!accessToken || !refreshToken || !expiresAtStr) return null;

  const expiresAt = new Date(expiresAtStr);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt > fiveMinutesFromNow) {
    return { access_token: accessToken, refresh_token: refreshToken };
  }

  // Refresh the token
  console.log("[Google Calendar] Token expired, refreshing...");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    console.error("[Google Calendar] Token refresh failed:", await response.text());
    return null;
  }

  const tokens = await response.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await supabaseAdmin
    .from("integrations")
    .update({
      config: {
        ...config,
        access_token: tokens.access_token,
        expires_at: newExpiresAt.toISOString(),
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", integration.id);

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || refreshToken,
  };
}

// --- API Helpers ---

async function googleRequest<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${GOOGLE_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Google Calendar] API error:", response.status, error);
    throw new Error(`Google Calendar API Error (${response.status}): ${error}`);
  }

  return response.json();
}

// --- Type Mappings ---

function mapGoogleStatus(status?: string): CalendarEventStatus {
  switch (status) {
    case "confirmed": return "confirmed";
    case "tentative": return "tentative";
    case "cancelled": return "cancelled";
    default: return "confirmed";
  }
}

function mapGoogleEvent(event: any): ExternalCalendarEvent {
  const isAllDay = !!event.start?.date;
  return {
    externalId: event.id,
    calendarId: event.organizer?.email || "primary",
    title: event.summary || "(No title)",
    description: event.description || undefined,
    location: event.location || undefined,
    startAt: isAllDay
      ? new Date(event.start.date).toISOString()
      : event.start.dateTime,
    endAt: isAllDay
      ? new Date(event.end.date).toISOString()
      : event.end.dateTime,
    allDay: isAllDay,
    status: mapGoogleStatus(event.status),
    attendees: (event.attendees || []).map((a: any) => ({
      email: a.email,
      name: a.displayName,
      responseStatus: a.responseStatus,
    })),
    recurrence: event.recurrence?.join("\n") || undefined,
    reminderMinutes: event.reminders?.overrides?.[0]?.minutes,
    etag: event.etag,
    metadata: {
      htmlLink: event.htmlLink,
      hangoutLink: event.hangoutLink,
      creator: event.creator,
    },
  };
}

function toGoogleEvent(event: CalendarEvent): any {
  const isAllDay = event.all_day;
  const body: any = {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    status: event.status || "confirmed",
  };

  if (isAllDay) {
    body.start = { date: event.start_at.split("T")[0] };
    body.end = { date: event.end_at.split("T")[0] };
  } else {
    body.start = { dateTime: event.start_at };
    body.end = { dateTime: event.end_at };
  }

  if (event.attendees && event.attendees.length > 0) {
    body.attendees = event.attendees.map((a) => ({
      email: a.email,
      displayName: a.name,
    }));
  }

  if (event.reminder_minutes != null) {
    body.reminders = {
      useDefault: false,
      overrides: [{ method: "popup", minutes: event.reminder_minutes }],
    };
  }

  return body;
}

// --- CalendarProvider Implementation ---

export class GoogleCalendarProvider implements CalendarProvider {
  source = "google" as const;

  async fetchEvents(
    agentId: string,
    timeMin: string,
    timeMax: string,
    syncToken?: string
  ): Promise<{ events: ExternalCalendarEvent[]; nextSyncToken?: string; deletedIds?: string[] }> {
    const tokens = await getValidGoogleCalendarTokens(agentId);
    if (!tokens) throw new Error("Google Calendar not connected");

    const events: ExternalCalendarEvent[] = [];
    const deletedIds: string[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    do {
      const params = new URLSearchParams();

      if (syncToken) {
        // Incremental sync
        params.set("syncToken", syncToken);
      } else {
        // Full sync
        params.set("timeMin", timeMin);
        params.set("timeMax", timeMax);
        params.set("singleEvents", "true");
        params.set("orderBy", "startTime");
      }

      params.set("maxResults", "250");
      if (pageToken) params.set("pageToken", pageToken);

      try {
        const data = await googleRequest<any>(
          tokens.access_token,
          `/calendars/primary/events?${params}`
        );

        for (const item of data.items || []) {
          if (item.status === "cancelled") {
            deletedIds.push(item.id);
          } else {
            events.push(mapGoogleEvent(item));
          }
        }

        pageToken = data.nextPageToken;
        nextSyncToken = data.nextSyncToken;
      } catch (err: any) {
        // If sync token is invalid, do a full sync
        if (err.message?.includes("410") && syncToken) {
          console.log("[Google Calendar] Sync token expired, doing full sync");
          return this.fetchEvents(agentId, timeMin, timeMax);
        }
        throw err;
      }
    } while (pageToken);

    return { events, nextSyncToken, deletedIds };
  }

  async pushEvent(agentId: string, event: CalendarEvent) {
    const tokens = await getValidGoogleCalendarTokens(agentId);
    if (!tokens) throw new Error("Google Calendar not connected");

    const body = toGoogleEvent(event);

    if (event.external_id) {
      // Update existing
      const data = await googleRequest<any>(
        tokens.access_token,
        `/calendars/primary/events/${event.external_id}`,
        { method: "PUT", body: JSON.stringify(body) }
      );
      return { externalId: data.id, etag: data.etag };
    } else {
      // Create new
      const data = await googleRequest<any>(
        tokens.access_token,
        `/calendars/primary/events`,
        { method: "POST", body: JSON.stringify(body) }
      );
      return { externalId: data.id, etag: data.etag };
    }
  }

  async deleteEvent(agentId: string, externalId: string) {
    const tokens = await getValidGoogleCalendarTokens(agentId);
    if (!tokens) throw new Error("Google Calendar not connected");

    await fetch(
      `${GOOGLE_API_BASE}/calendars/primary/events/${externalId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );
  }
}

// --- Push Notification Channel Management ---

export async function setupGooglePushChannel(
  agentId: string,
  webhookUrl: string
): Promise<{ channelId: string; expiration: string } | null> {
  const tokens = await getValidGoogleCalendarTokens(agentId);
  if (!tokens) return null;

  const channelId = crypto.randomUUID();
  const expiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const data = await googleRequest<any>(
    tokens.access_token,
    `/calendars/primary/events/watch`,
    {
      method: "POST",
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
        expiration: expiration.getTime(),
      }),
    }
  );

  // Save channel info to sync state
  await supabaseAdmin
    .from("calendar_sync_state")
    .upsert(
      {
        agent_id: agentId,
        provider: "google",
        channel_id: data.id,
        channel_expiration: new Date(parseInt(data.expiration)).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,provider" }
    );

  return { channelId: data.id, expiration: data.expiration };
}

export async function stopGooglePushChannel(
  agentId: string
): Promise<void> {
  const tokens = await getValidGoogleCalendarTokens(agentId);
  if (!tokens) return;

  const { data: syncState } = await supabaseAdmin
    .from("calendar_sync_state")
    .select("channel_id")
    .eq("agent_id", agentId)
    .eq("provider", "google")
    .single();

  if (!syncState?.channel_id) return;

  await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: syncState.channel_id,
      resourceId: syncState.channel_id,
    }),
  });
}
