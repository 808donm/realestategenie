/**
 * Calendar System Types
 * Shared types for the two-way calendar sync system
 */

export type CalendarSource = "google" | "microsoft" | "ghl" | "local";

export type CalendarEventStatus = "confirmed" | "tentative" | "cancelled";

export type CalendarAttendee = {
  email: string;
  name?: string;
  responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
};

export type CalendarEvent = {
  id?: string;
  agent_id: string;
  source: CalendarSource;
  external_id?: string | null;
  calendar_id?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string; // ISO timestamp
  end_at: string;
  all_day?: boolean;
  status?: CalendarEventStatus;
  attendees?: CalendarAttendee[];
  recurrence?: string | null;
  reminder_minutes?: number | null;
  color?: string | null;
  metadata?: Record<string, any>;
  synced_at?: string | null;
  etag?: string | null;
  pending_sync?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CalendarSyncState = {
  id?: string;
  agent_id: string;
  provider: CalendarSource;
  sync_token?: string | null;
  channel_id?: string | null;
  channel_expiration?: string | null;
  subscription_id?: string | null;
  subscription_expiration?: string | null;
  last_full_sync_at?: string | null;
  last_incremental_sync_at?: string | null;
};

export type SyncResult = {
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
};

/**
 * Interface that each calendar provider must implement
 */
export interface CalendarProvider {
  source: CalendarSource;

  /** Fetch all events in a time range from the external calendar */
  fetchEvents(
    agentId: string,
    timeMin: string,
    timeMax: string,
    syncToken?: string,
  ): Promise<{
    events: ExternalCalendarEvent[];
    nextSyncToken?: string;
    deletedIds?: string[];
  }>;

  /** Push a locally created/updated event to the external calendar */
  pushEvent(agentId: string, event: CalendarEvent): Promise<{ externalId: string; etag?: string }>;

  /** Delete an event from the external calendar */
  deleteEvent(agentId: string, externalId: string): Promise<void>;
}

export type ExternalCalendarEvent = {
  externalId: string;
  calendarId?: string;
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  status?: CalendarEventStatus;
  attendees?: CalendarAttendee[];
  recurrence?: string;
  reminderMinutes?: number;
  etag?: string;
  metadata?: Record<string, any>;
};
