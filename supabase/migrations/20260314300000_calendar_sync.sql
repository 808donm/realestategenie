-- Calendar Events Table
-- Merged view of events from Google Calendar, Microsoft/Outlook, GHL, and local
-- Individual calendars are the source of truth; on conflict, source wins

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('google', 'microsoft', 'ghl', 'local')),
  external_id TEXT,                    -- ID in the source calendar
  calendar_id TEXT,                    -- which calendar within the provider (e.g. primary, work)
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  attendees JSONB DEFAULT '[]'::jsonb, -- [{email, name, responseStatus}]
  recurrence TEXT,                     -- RRULE string
  reminder_minutes INTEGER,
  color TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,  -- source-specific extra data
  synced_at TIMESTAMPTZ,               -- last successful sync timestamp
  etag TEXT,                           -- change detection (Google etag, Microsoft changeKey)
  pending_sync BOOLEAN DEFAULT FALSE,  -- true when local edit hasn't been pushed to source yet
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, source, external_id)
);

CREATE INDEX idx_calendar_events_agent ON calendar_events(agent_id);
CREATE INDEX idx_calendar_events_range ON calendar_events(agent_id, start_at, end_at);
CREATE INDEX idx_calendar_events_source ON calendar_events(agent_id, source);
CREATE INDEX idx_calendar_events_pending ON calendar_events(agent_id, pending_sync) WHERE pending_sync = TRUE;

-- Calendar Sync State
-- Tracks sync tokens and page tokens per provider per agent for incremental sync
CREATE TABLE IF NOT EXISTS calendar_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'ghl')),
  sync_token TEXT,                     -- Google syncToken / Microsoft deltaLink
  channel_id TEXT,                     -- Google push notification channel ID
  channel_expiration TIMESTAMPTZ,      -- when the push channel expires
  subscription_id TEXT,                -- Microsoft subscription ID
  subscription_expiration TIMESTAMPTZ, -- when the Microsoft subscription expires
  last_full_sync_at TIMESTAMPTZ,       -- last time we did a full sync
  last_incremental_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, provider)
);

CREATE INDEX idx_calendar_sync_state_agent ON calendar_sync_state(agent_id);

-- RLS Policies for Calendar Events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert own calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update own calendar events"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete own calendar events"
  ON calendar_events FOR DELETE
  USING (auth.uid() = agent_id);

-- Service role bypass for sync operations
CREATE POLICY "Service role full access to calendar events"
  ON calendar_events FOR ALL
  USING (current_setting('role') = 'service_role');

-- RLS Policies for Calendar Sync State
ALTER TABLE calendar_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own sync state"
  ON calendar_sync_state FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Service role full access to sync state"
  ON calendar_sync_state FOR ALL
  USING (current_setting('role') = 'service_role');

-- Update integrations provider CHECK to include calendar providers
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;
ALTER TABLE integrations ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN ('ghl', 'n8n', 'idx', 'qbo', 'pandadoc', 'docusign', 'paypal', 'stripe', 'trestle', 'attom', 'realie', 'federal_data', 'google_calendar', 'microsoft_calendar'));

COMMENT ON TABLE calendar_events IS 'Merged calendar events from all connected calendar providers with two-way sync';
COMMENT ON TABLE calendar_sync_state IS 'Incremental sync state (tokens, channels, subscriptions) per provider per agent';
