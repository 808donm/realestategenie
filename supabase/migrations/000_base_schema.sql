-- Real Estate Genie - Base Schema
-- This creates all the core tables needed for the application
-- Run this BEFORE running migrations 001-009

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AGENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  phone_e164 TEXT,
  license_number TEXT,
  locations_served TEXT[] DEFAULT '{}',
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for agents
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent profile"
  ON agents FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own agent profile"
  ON agents FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own agent profile"
  ON agents FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- OPEN HOUSE EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS open_house_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  pdf_download_enabled BOOLEAN NOT NULL DEFAULT false,
  details_page_enabled BOOLEAN NOT NULL DEFAULT true,
  flyer_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for open_house_events
CREATE INDEX idx_open_house_events_agent_id ON open_house_events(agent_id);
CREATE INDEX idx_open_house_events_status ON open_house_events(status);
CREATE INDEX idx_open_house_events_start_at ON open_house_events(start_at);

-- RLS for open_house_events
ALTER TABLE open_house_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own events"
  ON open_house_events FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert own events"
  ON open_house_events FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own events"
  ON open_house_events FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete own events"
  ON open_house_events FOR DELETE
  USING (agent_id = auth.uid());

-- ============================================================================
-- PUBLIC VIEW FOR OPEN HOUSES (for attendees)
-- ============================================================================
CREATE OR REPLACE VIEW public_open_house_event AS
SELECT
  ohe.id,
  ohe.address,
  ohe.start_at,
  ohe.end_at,
  ohe.details_page_enabled,
  ohe.flyer_pdf_url,
  ohe.pdf_download_enabled,
  a.display_name,
  a.license_number,
  a.phone_e164,
  a.locations_served,
  a.photo_url
FROM open_house_events ohe
JOIN agents a ON ohe.agent_id = a.id
WHERE ohe.status = 'published';

-- ============================================================================
-- LEAD SUBMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES open_house_events(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  heat_score INTEGER NOT NULL DEFAULT 0 CHECK (heat_score >= 0 AND heat_score <= 100),
  pushed_to_ghl BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lead_submissions
CREATE INDEX idx_lead_submissions_event_id ON lead_submissions(event_id);
CREATE INDEX idx_lead_submissions_agent_id ON lead_submissions(agent_id);
CREATE INDEX idx_lead_submissions_heat_score ON lead_submissions(heat_score);
CREATE INDEX idx_lead_submissions_created_at ON lead_submissions(created_at);

-- RLS for lead_submissions
ALTER TABLE lead_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own leads"
  ON lead_submissions FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert leads"
  ON lead_submissions FOR INSERT
  WITH CHECK (agent_id = auth.uid());

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for audit_log
CREATE INDEX idx_audit_log_agent_id ON audit_log(agent_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- RLS for audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own audit logs"
  ON audit_log FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to agents
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to open_house_events
CREATE TRIGGER update_open_house_events_updated_at
  BEFORE UPDATE ON open_house_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUTO-CREATE AGENT PROFILE ON SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION create_agent_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agents (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_agent_profile();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant access to the view
GRANT SELECT ON public_open_house_event TO anon, authenticated;

COMMENT ON TABLE agents IS 'Real estate agent profiles';
COMMENT ON TABLE open_house_events IS 'Open house events created by agents';
COMMENT ON TABLE lead_submissions IS 'Lead submissions from open house attendees';
COMMENT ON TABLE audit_log IS 'Audit trail of important actions';
COMMENT ON VIEW public_open_house_event IS 'Public view of published open houses for attendees';
