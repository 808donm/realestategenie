/**
 * Microsoft / Outlook Calendar API Client
 *
 * Uses Microsoft Graph API for calendar operations.
 * OAuth via Azure AD with delegated permissions.
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

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

// --- Token Management ---

export async function getValidMicrosoftCalendarTokens(agentId: string): Promise<{
  access_token: string;
  refresh_token: string;
} | null> {
  const { data: integration } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("agent_id", agentId)
    .eq("provider", "microsoft_calendar")
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
  console.log("[Microsoft Calendar] Token expired, refreshing...");

  const tenant = process.env.MICROSOFT_CALENDAR_TENANT_ID || "common";
  const response = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CALENDAR_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "Calendars.ReadWrite offline_access",
      }),
    }
  );

  if (!response.ok) {
    console.error("[Microsoft Calendar] Token refresh failed:", await response.text());
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
        refresh_token: tokens.refresh_token || refreshToken,
        expires_at: newExpiresAt.toISOString(),
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

async function graphRequest<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${GRAPH_API_BASE}${endpoint}`;

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
    console.error("[Microsoft Calendar] API error:", response.status, error);
    throw new Error(`Microsoft Graph API Error (${response.status}): ${error}`);
  }

  // DELETE returns 204 No Content
  if (response.status === 204) return {} as T;
  return response.json();
}

// --- Type Mappings ---

function mapMicrosoftStatus(showAs?: string): CalendarEventStatus {
  switch (showAs) {
    case "tentative": return "tentative";
    case "free": return "confirmed";
    default: return "confirmed";
  }
}

function mapMicrosoftEvent(event: any): ExternalCalendarEvent {
  const isAllDay = event.isAllDay || false;
  return {
    externalId: event.id,
    calendarId: event.calendar?.id || undefined,
    title: event.subject || "(No title)",
    description: event.body?.content || undefined,
    location: event.location?.displayName || undefined,
    startAt: isAllDay
      ? event.start.dateTime + "Z"
      : new Date(event.start.dateTime + "Z").toISOString(),
    endAt: isAllDay
      ? event.end.dateTime + "Z"
      : new Date(event.end.dateTime + "Z").toISOString(),
    allDay: isAllDay,
    status: event.isCancelled ? "cancelled" : mapMicrosoftStatus(event.showAs),
    attendees: (event.attendees || []).map((a: any) => ({
      email: a.emailAddress?.address,
      name: a.emailAddress?.name,
      responseStatus: a.status?.response,
    })),
    recurrence: event.recurrence
      ? JSON.stringify(event.recurrence)
      : undefined,
    reminderMinutes: event.isReminderOn ? event.reminderMinutesBeforeStart : undefined,
    etag: event.changeKey,
    metadata: {
      webLink: event.webLink,
      onlineMeetingUrl: event.onlineMeetingUrl,
      importance: event.importance,
      sensitivity: event.sensitivity,
    },
  };
}

function toMicrosoftEvent(event: CalendarEvent): any {
  const body: any = {
    subject: event.title,
    body: event.description
      ? { contentType: "text", content: event.description }
      : undefined,
    isAllDay: event.all_day || false,
  };

  if (event.all_day) {
    body.start = { dateTime: event.start_at.split("T")[0] + "T00:00:00", timeZone: "UTC" };
    body.end = { dateTime: event.end_at.split("T")[0] + "T00:00:00", timeZone: "UTC" };
  } else {
    body.start = { dateTime: event.start_at.replace("Z", ""), timeZone: "UTC" };
    body.end = { dateTime: event.end_at.replace("Z", ""), timeZone: "UTC" };
  }

  if (event.location) {
    body.location = { displayName: event.location };
  }

  if (event.attendees && event.attendees.length > 0) {
    body.attendees = event.attendees.map((a) => ({
      emailAddress: { address: a.email, name: a.name },
      type: "required",
    }));
  }

  if (event.reminder_minutes != null) {
    body.isReminderOn = true;
    body.reminderMinutesBeforeStart = event.reminder_minutes;
  }

  return body;
}

// --- CalendarProvider Implementation ---

export class MicrosoftCalendarProvider implements CalendarProvider {
  source = "microsoft" as const;

  async fetchEvents(
    agentId: string,
    timeMin: string,
    timeMax: string,
    syncToken?: string
  ): Promise<{ events: ExternalCalendarEvent[]; nextSyncToken?: string; deletedIds?: string[] }> {
    const tokens = await getValidMicrosoftCalendarTokens(agentId);
    if (!tokens) throw new Error("Microsoft Calendar not connected");

    const events: ExternalCalendarEvent[] = [];
    const deletedIds: string[] = [];

    if (syncToken) {
      // Delta query for incremental sync
      let deltaLink: string | null = syncToken;

      while (deltaLink) {
        try {
          const data: Record<string, any> = await graphRequest<Record<string, any>>(tokens.access_token, deltaLink);

          for (const item of data.value || []) {
            if (item["@removed"]) {
              deletedIds.push(item.id);
            } else {
              events.push(mapMicrosoftEvent(item));
            }
          }

          deltaLink = data["@odata.nextLink"] || null;
          if (data["@odata.deltaLink"]) {
            return {
              events,
              nextSyncToken: data["@odata.deltaLink"] as string,
              deletedIds,
            };
          }
        } catch (err: any) {
          // If delta token expired, do full sync
          if (err.message?.includes("410") || err.message?.includes("syncStateNotFound")) {
            console.log("[Microsoft Calendar] Delta token expired, doing full sync");
            return this.fetchEvents(agentId, timeMin, timeMax);
          }
          throw err;
        }
      }
    }

    // Full sync using calendarView
    let url = `/me/calendarView?startDateTime=${encodeURIComponent(timeMin)}&endDateTime=${encodeURIComponent(timeMax)}&$top=100`;
    let nextSyncToken: string | undefined;

    while (url) {
      const data = await graphRequest<any>(tokens.access_token, url);

      for (const item of data.value || []) {
        events.push(mapMicrosoftEvent(item));
      }

      url = data["@odata.nextLink"] || "";
      if (data["@odata.deltaLink"]) {
        nextSyncToken = data["@odata.deltaLink"];
      }
    }

    // If no deltaLink from calendarView, get one via delta endpoint
    if (!nextSyncToken) {
      try {
        const deltaData = await graphRequest<any>(
          tokens.access_token,
          `/me/calendarView/delta?startDateTime=${encodeURIComponent(timeMin)}&endDateTime=${encodeURIComponent(timeMax)}`
        );
        // Consume all pages to get the deltaLink
        let nextLink = deltaData["@odata.nextLink"];
        nextSyncToken = deltaData["@odata.deltaLink"];
        while (nextLink && !nextSyncToken) {
          const page = await graphRequest<any>(tokens.access_token, nextLink);
          nextLink = page["@odata.nextLink"];
          nextSyncToken = page["@odata.deltaLink"];
        }
      } catch {
        // Delta not available, will do full sync next time
      }
    }

    return { events, nextSyncToken, deletedIds };
  }

  async pushEvent(agentId: string, event: CalendarEvent) {
    const tokens = await getValidMicrosoftCalendarTokens(agentId);
    if (!tokens) throw new Error("Microsoft Calendar not connected");

    const body = toMicrosoftEvent(event);

    if (event.external_id) {
      const data = await graphRequest<any>(
        tokens.access_token,
        `/me/events/${event.external_id}`,
        { method: "PATCH", body: JSON.stringify(body) }
      );
      return { externalId: data.id, etag: data.changeKey };
    } else {
      const data = await graphRequest<any>(
        tokens.access_token,
        `/me/events`,
        { method: "POST", body: JSON.stringify(body) }
      );
      return { externalId: data.id, etag: data.changeKey };
    }
  }

  async deleteEvent(agentId: string, externalId: string) {
    const tokens = await getValidMicrosoftCalendarTokens(agentId);
    if (!tokens) throw new Error("Microsoft Calendar not connected");

    await graphRequest(
      tokens.access_token,
      `/me/events/${externalId}`,
      { method: "DELETE" }
    );
  }
}

// --- Subscription Management ---

export async function createMicrosoftSubscription(
  agentId: string,
  webhookUrl: string
): Promise<{ subscriptionId: string; expiration: string } | null> {
  const tokens = await getValidMicrosoftCalendarTokens(agentId);
  if (!tokens) return null;

  // Microsoft subscriptions expire in max 3 days for calendar
  const expiration = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 60000); // 3 days minus 1 min

  const data = await graphRequest<any>(
    tokens.access_token,
    `${GRAPH_API_BASE}/subscriptions`,
    {
      method: "POST",
      body: JSON.stringify({
        changeType: "created,updated,deleted",
        notificationUrl: webhookUrl,
        resource: "/me/events",
        expirationDateTime: expiration.toISOString(),
        clientState: process.env.CRON_SECRET || "calendar-sync",
      }),
    }
  );

  await supabaseAdmin
    .from("calendar_sync_state")
    .upsert(
      {
        agent_id: agentId,
        provider: "microsoft",
        subscription_id: data.id,
        subscription_expiration: data.expirationDateTime,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,provider" }
    );

  return { subscriptionId: data.id, expiration: data.expirationDateTime };
}

export async function renewMicrosoftSubscription(
  agentId: string
): Promise<boolean> {
  const tokens = await getValidMicrosoftCalendarTokens(agentId);
  if (!tokens) return false;

  const { data: syncState } = await supabaseAdmin
    .from("calendar_sync_state")
    .select("subscription_id")
    .eq("agent_id", agentId)
    .eq("provider", "microsoft")
    .single();

  if (!syncState?.subscription_id) return false;

  const expiration = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 60000);

  await graphRequest(
    tokens.access_token,
    `${GRAPH_API_BASE}/subscriptions/${syncState.subscription_id}`,
    {
      method: "PATCH",
      body: JSON.stringify({ expirationDateTime: expiration.toISOString() }),
    }
  );

  await supabaseAdmin
    .from("calendar_sync_state")
    .update({
      subscription_expiration: expiration.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("agent_id", agentId)
    .eq("provider", "microsoft");

  return true;
}
