-- GHL Open House Registrations and Flyer Delivery
-- Architecture: Model registrations as events, not contact state

-- Table: open_house_registrations
-- Tracks each contact's registration to each open house (many-to-many)
CREATE TABLE IF NOT EXISTS open_house_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Core relationships
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES open_house_events(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES lead_submissions(id) ON DELETE CASCADE,
  ghl_contact_id TEXT NOT NULL,

  -- GHL Custom Object IDs (when using Custom Objects)
  ghl_registration_id TEXT,
  ghl_open_house_id TEXT,

  -- Registration state
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  flyer_status TEXT NOT NULL DEFAULT 'pending' CHECK (flyer_status IN ('pending', 'offered', 'sent', 'declined')),

  -- Flyer delivery tracking
  flyer_offered_at TIMESTAMPTZ,
  flyer_sent_at TIMESTAMPTZ,
  flyer_url TEXT,

  -- Offer token system (for multi-choice scenarios)
  last_offer_token TEXT,
  offer_token_expires_at TIMESTAMPTZ,
  offer_position INTEGER, -- Position in the offer list (1, 2, 3, etc.)

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(ghl_contact_id, event_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_registrations_contact ON open_house_registrations(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON open_house_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_agent ON open_house_registrations(agent_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON open_house_registrations(flyer_status);
CREATE INDEX IF NOT EXISTS idx_registrations_offer_token ON open_house_registrations(last_offer_token) WHERE last_offer_token IS NOT NULL;

-- Table: flyer_offer_sessions
-- Tracks active multi-choice offers to prevent stale replies
CREATE TABLE IF NOT EXISTS flyer_offer_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Core data
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  ghl_contact_id TEXT NOT NULL,
  offer_token TEXT NOT NULL UNIQUE,

  -- Offer details
  registration_ids UUID[] NOT NULL, -- Array of registration IDs in this offer
  offer_count INTEGER NOT NULL,
  offer_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Response tracking
  responded_at TIMESTAMPTZ,
  selected_position INTEGER,
  selected_registration_id UUID REFERENCES open_house_registrations(id),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'responded', 'expired', 'invalid')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offer_sessions_contact ON flyer_offer_sessions(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_offer_sessions_token ON flyer_offer_sessions(offer_token);
CREATE INDEX IF NOT EXISTS idx_offer_sessions_status ON flyer_offer_sessions(status);
CREATE INDEX IF NOT EXISTS idx_offer_sessions_expires ON flyer_offer_sessions(expires_at);

-- Comments
COMMENT ON TABLE open_house_registrations IS 'Many-to-many registrations: one contact can attend many open houses';
COMMENT ON COLUMN open_house_registrations.flyer_status IS 'pending → offered → sent (or declined)';
COMMENT ON COLUMN open_house_registrations.last_offer_token IS 'Token for multi-choice offers to prevent stale replies';

COMMENT ON TABLE flyer_offer_sessions IS 'Tracks active multi-property choice offers with expiration';
COMMENT ON COLUMN flyer_offer_sessions.offer_token IS 'Unique token to validate numeric replies';
COMMENT ON COLUMN flyer_offer_sessions.registration_ids IS 'Array of registration IDs in the order presented';

-- RLS policies
ALTER TABLE open_house_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flyer_offer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own registrations"
  ON open_house_registrations FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert own registrations"
  ON open_house_registrations FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own registrations"
  ON open_house_registrations FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can view own offer sessions"
  ON flyer_offer_sessions FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert own offer sessions"
  ON flyer_offer_sessions FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own offer sessions"
  ON flyer_offer_sessions FOR UPDATE
  USING (agent_id = auth.uid());

-- Function: auto-update updated_at
CREATE OR REPLACE FUNCTION update_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_registrations_timestamp
  BEFORE UPDATE ON open_house_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_registrations_updated_at();

-- Function: expire old offer sessions
CREATE OR REPLACE FUNCTION expire_old_offer_sessions()
RETURNS void AS $$
BEGIN
  UPDATE flyer_offer_sessions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- You can call this function periodically or on-demand
-- Example: SELECT expire_old_offer_sessions();
