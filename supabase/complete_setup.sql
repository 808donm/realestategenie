-- =============================================================================
-- Real Estate Genie - Complete Database Setup
-- Run this entire file in Supabase SQL Editor to set up your database
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- STEP 1: CREATE CORE TABLES
-- =============================================================================

-- AGENTS TABLE
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

-- OPEN HOUSE EVENTS TABLE
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

-- LEAD SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS lead_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES open_house_events(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  heat_score INTEGER NOT NULL DEFAULT 0 CHECK (heat_score >= 0 AND heat_score <= 100),
  pushed_to_ghl BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- STEP 2: ADD EXTENDED COLUMNS
-- =============================================================================

-- Add branding fields to agents (migration 002)
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS headshot_url TEXT,
ADD COLUMN IF NOT EXISTS brokerage_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7) DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS disclaimer_text TEXT,
ADD COLUMN IF NOT EXISTS disclaimer_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS landing_page_enabled BOOLEAN DEFAULT true;

-- Add property fact sheet fields (migration 004)
ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS beds INTEGER,
ADD COLUMN IF NOT EXISTS baths NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS sqft INTEGER,
ADD COLUMN IF NOT EXISTS price NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS key_features TEXT[],
ADD COLUMN IF NOT EXISTS hoa_fee NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS parking_notes TEXT,
ADD COLUMN IF NOT EXISTS showing_notes TEXT,
ADD COLUMN IF NOT EXISTS disclosure_url TEXT,
ADD COLUMN IF NOT EXISTS offer_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS flyer_url TEXT,
ADD COLUMN IF NOT EXISTS flyer_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS listing_description TEXT,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES agents(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Add lead handling rules (migration 005)
ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS represented_send_info_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS unrepresented_ask_reach_out BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS unrepresented_notify_immediately BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS unrepresented_start_workflows BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS consent_sms_text TEXT,
ADD COLUMN IF NOT EXISTS consent_email_text TEXT,
ADD COLUMN IF NOT EXISTS consent_version INTEGER DEFAULT 1;

-- Add GHL sync fields (migration 008)
ALTER TABLE lead_submissions
ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT,
ADD COLUMN IF NOT EXISTS ghl_opportunity_id TEXT,
ADD COLUMN IF NOT EXISTS ghl_sync_error TEXT,
ADD COLUMN IF NOT EXISTS ghl_synced_at TIMESTAMPTZ;

-- Add map coordinates (migration 009)
ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- =============================================================================
-- STEP 3: CREATE FEATURE FLAGS TABLE (migration 001)
-- =============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  teams_enabled BOOLEAN DEFAULT false,
  ai_chat_enabled BOOLEAN DEFAULT false,
  sms_enabled BOOLEAN DEFAULT false,
  idx_integration_enabled BOOLEAN DEFAULT false,
  custom_branding_enabled BOOLEAN DEFAULT false,
  advanced_analytics_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- STEP 4: CREATE TEAMS TABLES (migration 003)
-- =============================================================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, agent_id)
);

-- =============================================================================
-- STEP 5: CREATE INTEGRATIONS TABLES (migration 006)
-- =============================================================================

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('ghl', 'n8n', 'idx')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  webhook_url TEXT,
  webhook_secret TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, provider)
);

CREATE TABLE IF NOT EXISTS integration_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  mapping_type TEXT NOT NULL,
  mapping_key TEXT NOT NULL,
  mapping_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(integration_id, mapping_type, mapping_key)
);

-- =============================================================================
-- STEP 6: CREATE WEBHOOK LOGS TABLE (migration 007)
-- =============================================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_body TEXT,
  status_code INTEGER,
  delivered_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- STEP 7: CREATE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_open_house_events_agent_id ON open_house_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_open_house_events_status ON open_house_events(status);
CREATE INDEX IF NOT EXISTS idx_open_house_events_start_at ON open_house_events(start_at);
CREATE INDEX IF NOT EXISTS idx_open_house_events_coordinates ON open_house_events(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_lead_submissions_event_id ON lead_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_lead_submissions_agent_id ON lead_submissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_submissions_heat_score ON lead_submissions(heat_score);
CREATE INDEX IF NOT EXISTS idx_lead_submissions_created_at ON lead_submissions(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_log_agent_id ON audit_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_agent_id ON team_members(agent_id);

CREATE INDEX IF NOT EXISTS idx_integrations_agent_id ON integrations(agent_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_agent_id ON webhook_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);

-- =============================================================================
-- STEP 8: ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_house_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 9: CREATE RLS POLICIES
-- =============================================================================

-- Agents policies
DROP POLICY IF EXISTS "Users can view own agent profile" ON agents;
CREATE POLICY "Users can view own agent profile" ON agents FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own agent profile" ON agents;
CREATE POLICY "Users can update own agent profile" ON agents FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own agent profile" ON agents;
CREATE POLICY "Users can insert own agent profile" ON agents FOR INSERT WITH CHECK (auth.uid() = id);

-- Open house events policies
DROP POLICY IF EXISTS "Agents can view own events" ON open_house_events;
CREATE POLICY "Agents can view own events" ON open_house_events FOR SELECT USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Agents can insert own events" ON open_house_events;
CREATE POLICY "Agents can insert own events" ON open_house_events FOR INSERT WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS "Agents can update own events" ON open_house_events;
CREATE POLICY "Agents can update own events" ON open_house_events FOR UPDATE USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Agents can delete own events" ON open_house_events;
CREATE POLICY "Agents can delete own events" ON open_house_events FOR DELETE USING (agent_id = auth.uid());

-- Lead submissions policies
DROP POLICY IF EXISTS "Agents can view own leads" ON lead_submissions;
CREATE POLICY "Agents can view own leads" ON lead_submissions FOR SELECT USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Agents can insert leads" ON lead_submissions;
CREATE POLICY "Agents can insert leads" ON lead_submissions FOR INSERT WITH CHECK (agent_id = auth.uid());

-- Audit log policies
DROP POLICY IF EXISTS "Agents can view own audit logs" ON audit_log;
CREATE POLICY "Agents can view own audit logs" ON audit_log FOR SELECT USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;
CREATE POLICY "System can insert audit logs" ON audit_log FOR INSERT WITH CHECK (true);

-- Feature flags policies
DROP POLICY IF EXISTS "Agents can view own flags" ON feature_flags;
CREATE POLICY "Agents can view own flags" ON feature_flags FOR SELECT USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Agents can update own flags" ON feature_flags;
CREATE POLICY "Agents can update own flags" ON feature_flags FOR UPDATE USING (agent_id = auth.uid());

-- Teams policies
DROP POLICY IF EXISTS "Team owners can manage teams" ON teams;
CREATE POLICY "Team owners can manage teams" ON teams FOR ALL USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Team members can view teams" ON teams;
CREATE POLICY "Team members can view teams" ON teams FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_id = teams.id AND agent_id = auth.uid()));

-- Team members policies
DROP POLICY IF EXISTS "Team members can view members" ON team_members;
CREATE POLICY "Team members can view members" ON team_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.agent_id = auth.uid()));

-- Integrations policies
DROP POLICY IF EXISTS "Agents can manage own integrations" ON integrations;
CREATE POLICY "Agents can manage own integrations" ON integrations FOR ALL USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Agents can manage own integration mappings" ON integration_mappings;
CREATE POLICY "Agents can manage own integration mappings" ON integration_mappings FOR ALL
  USING (EXISTS (SELECT 1 FROM integrations WHERE id = integration_mappings.integration_id AND agent_id = auth.uid()));

-- Webhook logs policies
DROP POLICY IF EXISTS "Agents can view own webhook logs" ON webhook_logs;
CREATE POLICY "Agents can view own webhook logs" ON webhook_logs FOR SELECT USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "System can insert webhook logs" ON webhook_logs;
CREATE POLICY "System can insert webhook logs" ON webhook_logs FOR INSERT WITH CHECK (true);

-- =============================================================================
-- STEP 10: CREATE TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_open_house_events_updated_at ON open_house_events;
CREATE TRIGGER update_open_house_events_updated_at BEFORE UPDATE ON open_house_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create agent profile on signup
CREATE OR REPLACE FUNCTION create_agent_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agents (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_agent_profile();

-- Auto-create feature flags for new agents
CREATE OR REPLACE FUNCTION create_feature_flags_for_agent()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO feature_flags (agent_id)
  VALUES (NEW.id)
  ON CONFLICT (agent_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_agent_created ON agents;
CREATE TRIGGER on_agent_created
  AFTER INSERT ON agents
  FOR EACH ROW EXECUTE FUNCTION create_feature_flags_for_agent();

-- Auto-add team owner as member
CREATE OR REPLACE FUNCTION add_team_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (team_id, agent_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_team_created ON teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON teams
  FOR EACH ROW EXECUTE FUNCTION add_team_owner_as_member();

-- =============================================================================
-- STEP 11: CREATE PUBLIC VIEW FOR ATTENDEES
-- =============================================================================

DROP VIEW IF EXISTS public_open_house_event;
CREATE VIEW public_open_house_event AS
SELECT
  ohe.id,
  ohe.address,
  ohe.start_at,
  ohe.end_at,
  ohe.details_page_enabled,
  ohe.flyer_pdf_url,
  ohe.pdf_download_enabled,
  ohe.latitude,
  ohe.longitude,
  a.display_name,
  a.license_number,
  a.phone_e164,
  a.locations_served,
  a.photo_url
FROM open_house_events ohe
JOIN agents a ON ohe.agent_id = a.id
WHERE ohe.status = 'published';

-- =============================================================================
-- STEP 12: GRANT PERMISSIONS
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON public_open_house_event TO anon, authenticated;

-- =============================================================================
-- COMPLETE! Your database is ready to use.
-- =============================================================================
