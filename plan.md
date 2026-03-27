# Calendar System with Two-Way Sync

## Architecture Overview

Internal `calendar_events` table is a **merged mirror**. Each event tracks its `source` (google, microsoft, ghl, local) and `external_id`. Individual calendars are the source of truth — on conflict, the source calendar's version wins.

**Sync flow:**

- Inbound: Google/Microsoft/GHL → webhooks/polling → upsert into `calendar_events`
- Outbound: User edits event in app → push change to source calendar → confirm → update local
- Local-only events: created in app, user picks which calendar to push to (or keep local)

---

## Implementation Steps

### Step 1: Database Migration — `calendar_events` table

File: `supabase/migrations/XXX_calendar_events.sql`

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('google', 'microsoft', 'ghl', 'local')),
  external_id TEXT,                    -- ID in the source calendar
  calendar_id TEXT,                    -- which calendar within the provider
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  attendees JSONB DEFAULT '[]',        -- [{email, name, status}]
  recurrence TEXT,                     -- RRULE string
  reminder_minutes INTEGER,
  color TEXT,
  metadata JSONB DEFAULT '{}',         -- source-specific extra data
  synced_at TIMESTAMPTZ,               -- last successful sync timestamp
  etag TEXT,                           -- for change detection (Google uses etags, Microsoft uses changeKey)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, source, external_id)
);

CREATE INDEX idx_calendar_events_agent ON calendar_events(agent_id);
CREATE INDEX idx_calendar_events_range ON calendar_events(agent_id, start_at, end_at);
CREATE INDEX idx_calendar_events_source ON calendar_events(agent_id, source);
```

Plus `calendar_sync_state` table for tracking sync tokens/page tokens per provider.

### Step 2: Google Calendar Integration

**Files:**

- `app/api/integrations/google-calendar/connect/route.ts` — OAuth redirect
- `app/api/integrations/google-calendar/callback/route.ts` — Token exchange
- `src/lib/integrations/google-calendar-client.ts` — API client
- `src/lib/integrations/google-calendar-token.ts` — Token refresh (follows `ghl-token-refresh.ts` pattern)
- `app/api/webhooks/google-calendar/route.ts` — Push notification receiver

**OAuth scopes:** `https://www.googleapis.com/auth/calendar`

**Sync strategy:**

- Initial: full sync using `events.list` with `syncToken` support
- Ongoing: Google push notifications (webhook channel) for real-time updates
- Outbound: on local edit, call `events.update`/`events.insert`/`events.delete`
- Conflict: compare `etag` — if Google's etag differs from stored, Google wins

### Step 3: Microsoft/Outlook Calendar Integration

**Files:**

- `app/api/integrations/microsoft-calendar/connect/route.ts` — OAuth via Azure AD
- `app/api/integrations/microsoft-calendar/callback/route.ts` — Token exchange
- `src/lib/integrations/microsoft-calendar-client.ts` — Graph API client
- `src/lib/integrations/microsoft-calendar-token.ts` — Token refresh
- `app/api/webhooks/microsoft-calendar/route.ts` — Subscription notification receiver

**OAuth scopes:** `Calendars.ReadWrite`, `offline_access`

**Sync strategy:**

- Initial: delta query via `GET /me/calendarView/delta`
- Ongoing: Graph API subscriptions (webhooks) — must renew every 3 days via cron
- Outbound: `PATCH /me/events/{id}`, `POST /me/events`, `DELETE /me/events/{id}`
- Conflict: compare `changeKey` — if Microsoft's differs, Microsoft wins

### Step 4: GHL Calendar Sync

**Files:**

- Extend existing `src/lib/integrations/ghl-client.ts` with calendar methods
- `src/lib/integrations/ghl-calendar-sync.ts` — Sync logic
- Extend `app/api/webhooks/ghl/route.ts` to handle appointment events

**Sync strategy:**

- GHL has appointment/calendar endpoints in its API
- Existing webhook handler already receives events — add appointment event types
- Outbound: create/update GHL appointments via API
- Conflict: GHL version wins

### Step 5: Sync Engine

File: `src/lib/calendar/sync-engine.ts`

Core logic:

```
inboundSync(source, events[]):
  for each event:
    find existing by (agent_id, source, external_id)
    if exists and source etag/changeKey changed → update local (source wins)
    if not exists → insert
    if exists locally but missing from source list → mark cancelled

outboundSync(localEvent):
  push to source calendar API
  update local external_id and etag
  if source rejects (409 conflict) → re-fetch source version → overwrite local
```

### Step 6: Cron Jobs

**Files:**

- `app/api/cron/calendar-sync/route.ts` — Periodic full sync (fallback for missed webhooks)
- `app/api/cron/microsoft-subscription-renew/route.ts` — Renew Microsoft webhook subscriptions

**Schedule:**

- Calendar sync: every 15 minutes
- Microsoft subscription renewal: every 2 days

### Step 7: Calendar UI

**Files:**

- `app/app/calendar/page.tsx` — Calendar page (server component wrapper)
- `app/app/property-data/calendar-view.client.tsx` — Main calendar client component
- Uses FullCalendar (React) library for the calendar grid

**Features:**

- Month/week/day views
- Color-coded by source (Google=blue, Microsoft=green, GHL=purple, Local=gray)
- Click event → detail panel with edit capability
- Create event → pick target calendar or keep local
- Filter by source calendar
- Shows sync status indicator per provider

### Step 8: Integration Settings Cards

**Files:**

- `app/app/integrations/google-calendar-card.tsx` — Connect/disconnect/test
- `app/app/integrations/microsoft-calendar-card.tsx` — Connect/disconnect/test
- Add to existing integrations page grid

---

## Conflict Resolution Rules

1. If event exists in source AND locally with different data → **source wins**, overwrite local
2. If user edits a synced event in the app → push to source, then re-fetch to confirm
3. If push to source fails (network) → mark event as `pending_sync`, retry on next cron
4. Local-only events are never overwritten (no external source to conflict with)
5. Deleted in source → mark as cancelled locally
6. Deleted locally (synced event) → delete from source calendar too
