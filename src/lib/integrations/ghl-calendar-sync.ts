/**
 * GHL Calendar / Appointments Sync
 *
 * Wraps GHL's appointment/calendar API as a CalendarProvider
 * for two-way sync with the merged calendar.
 */

import { createClient } from "@supabase/supabase-js";
import { getValidGHLConfig } from "./ghl-token-refresh";
import type { CalendarProvider, CalendarEvent, ExternalCalendarEvent, CalendarEventStatus } from "@/lib/calendar/types";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const GHL_BASE = "https://services.leadconnectorhq.com";

async function ghlRequest<T>(accessToken: string, endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${GHL_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[GHL Calendar] API error:", response.status, error);
    throw new Error(`GHL Calendar API Error (${response.status}): ${error}`);
  }

  if (response.status === 204) return {} as T;
  return response.json();
}

function mapGHLStatus(status?: string): CalendarEventStatus {
  switch (status) {
    case "confirmed":
      return "confirmed";
    case "cancelled":
    case "no_show":
      return "cancelled";
    default:
      return "confirmed";
  }
}

function mapGHLAppointment(appt: any): ExternalCalendarEvent {
  return {
    externalId: appt.id,
    calendarId: appt.calendarId || undefined,
    title: appt.title || appt.appointmentTitle || "(No title)",
    description: appt.notes || undefined,
    location: appt.address || undefined,
    startAt: appt.startTime || appt.start_time,
    endAt: appt.endTime || appt.end_time,
    allDay: false,
    status: mapGHLStatus(appt.appointmentStatus || appt.status),
    attendees: appt.contactId ? [{ email: appt.contactId, name: appt.contactName }] : [],
    etag: appt.updatedAt || appt.updated_at,
    metadata: {
      contactId: appt.contactId,
      assignedUserId: appt.assignedUserId,
      calendarId: appt.calendarId,
    },
  };
}

function toGHLAppointment(event: CalendarEvent, locationId: string): any {
  return {
    locationId,
    title: event.title,
    notes: event.description || undefined,
    address: event.location || undefined,
    startTime: event.start_at,
    endTime: event.end_at,
    appointmentStatus: event.status === "cancelled" ? "cancelled" : "confirmed",
    contactId: event.attendees?.[0]?.email || undefined,
    assignedUserId: event.metadata?.assignedUserId || undefined,
    calendarId: event.calendar_id || undefined,
  };
}

export class GHLCalendarProvider implements CalendarProvider {
  source = "ghl" as const;

  async fetchEvents(agentId: string, timeMin: string, timeMax: string, _syncToken?: string) {
    const config = await getValidGHLConfig(agentId);
    if (!config) throw new Error("GHL not connected");

    const events: ExternalCalendarEvent[] = [];

    // GHL uses different endpoints for appointments
    // Try the appointments endpoint with date range
    const params = new URLSearchParams({
      locationId: config.location_id,
      startDate: new Date(timeMin).getTime().toString(),
      endDate: new Date(timeMax).getTime().toString(),
    });

    try {
      const data = await ghlRequest<any>(config.access_token, `/calendars/events?${params}`);

      for (const appt of data.events || data.appointments || []) {
        events.push(mapGHLAppointment(appt));
      }
    } catch (err: any) {
      // Try alternative endpoint
      console.log("[GHL Calendar] Trying alternative appointments endpoint");
      try {
        const altData = await ghlRequest<any>(config.access_token, `/contacts/appointments?${params}`);

        for (const appt of altData.appointments || []) {
          events.push(mapGHLAppointment(appt));
        }
      } catch (altErr: any) {
        console.error("[GHL Calendar] Both endpoints failed:", altErr.message);
        throw err;
      }
    }

    // GHL doesn't support sync tokens, so no incremental sync
    return { events, deletedIds: [] };
  }

  async pushEvent(agentId: string, event: CalendarEvent) {
    const config = await getValidGHLConfig(agentId);
    if (!config) throw new Error("GHL not connected");

    const body = toGHLAppointment(event, config.location_id);

    if (event.external_id) {
      // Update existing appointment
      const data = await ghlRequest<any>(config.access_token, `/calendars/events/appointments/${event.external_id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      return { externalId: data.id || event.external_id, etag: data.updatedAt };
    } else {
      // Create new appointment
      const data = await ghlRequest<any>(config.access_token, `/calendars/events/appointments`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return { externalId: data.id, etag: data.updatedAt };
    }
  }

  async deleteEvent(agentId: string, externalId: string) {
    const config = await getValidGHLConfig(agentId);
    if (!config) throw new Error("GHL not connected");

    await ghlRequest(config.access_token, `/calendars/events/appointments/${externalId}`, { method: "DELETE" });
  }
}
