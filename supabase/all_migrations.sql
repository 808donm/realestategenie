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
-- Feature Flags Table
-- Controls which features are enabled for each agent

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- MVP Features
  open_house_mvp BOOLEAN DEFAULT true,
  property_factsheet_upload BOOLEAN DEFAULT true,

  -- Future Features (Default OFF)
  marketing_packs BOOLEAN DEFAULT false,
  property_qa BOOLEAN DEFAULT false,
  idx_integration BOOLEAN DEFAULT false,
  transactions_os BOOLEAN DEFAULT false,
  documents_esign BOOLEAN DEFAULT false,
  vendor_directory BOOLEAN DEFAULT false,
  vendor_scheduling BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Agents can only read their own feature flags
CREATE POLICY "Agents can view own feature flags"
  ON feature_flags
  FOR SELECT
  USING (auth.uid() = agent_id);

-- Only system can update feature flags (admins would use service role)
CREATE POLICY "Only system can update feature flags"
  ON feature_flags
  FOR UPDATE
  USING (false);

-- Trigger to auto-create feature flags for new agents
CREATE OR REPLACE FUNCTION create_default_feature_flags()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO feature_flags (agent_id)
  VALUES (NEW.id)
  ON CONFLICT (agent_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_agent_created_create_feature_flags
  AFTER INSERT ON agents
  FOR EACH ROW
  EXECUTE FUNCTION create_default_feature_flags();

-- Create feature flags for existing agents
INSERT INTO feature_flags (agent_id)
SELECT id FROM agents
ON CONFLICT (agent_id) DO NOTHING;
-- Extend Agents Table with Branding Fields
-- Allows agents to customize their public-facing brand

ALTER TABLE agents
ADD COLUMN IF NOT EXISTS headshot_url TEXT,
ADD COLUMN IF NOT EXISTS brokerage_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7) DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS disclaimer_text TEXT,
ADD COLUMN IF NOT EXISTS disclaimer_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS landing_page_enabled BOOLEAN DEFAULT true;

-- Add default disclaimer text for existing agents
UPDATE agents
SET disclaimer_text = 'This information is deemed reliable but not guaranteed. All measurements and information should be independently verified.'
WHERE disclaimer_text IS NULL;

COMMENT ON COLUMN agents.headshot_url IS 'URL to agent headshot/logo in Supabase Storage';
COMMENT ON COLUMN agents.brokerage_name IS 'Agent brokerage/company name';
COMMENT ON COLUMN agents.bio IS 'Short bio displayed on attendee pages';
COMMENT ON COLUMN agents.theme_color IS 'Hex color code for agent branding (e.g., #3b82f6)';
COMMENT ON COLUMN agents.disclaimer_text IS 'Legal disclaimer shown on property pages';
COMMENT ON COLUMN agents.disclaimer_version IS 'Version number for tracking disclaimer changes';
COMMENT ON COLUMN agents.landing_page_enabled IS 'Whether to show custom landing page';
-- Teams/Workspaces for Multi-Agent Support
-- Allows solo agents to form teams and share resources

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, agent_id)
);

-- Indexes
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_agent_id ON team_members(agent_id);

-- RLS Policies for Teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their teams"
  ON teams
  FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_members WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents can create teams"
  ON teams
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update their teams"
  ON teams
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Team owners can delete their teams"
  ON teams
  FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for Team Members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view team membership"
  ON team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "Team owners and admins can add members"
  ON team_members
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE agent_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can update members"
  ON team_members
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE agent_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can remove members"
  ON team_members
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE agent_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Trigger to auto-add owner as team member
CREATE OR REPLACE FUNCTION add_owner_to_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (team_id, agent_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_team_created_add_owner
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_team();
-- Property Fact Sheet Fields for Open House Events
-- Verified property information shown to attendees

ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS beds INTEGER,
ADD COLUMN IF NOT EXISTS baths NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS sqft INTEGER,
ADD COLUMN IF NOT EXISTS price NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS key_features TEXT[], -- Array of bullet points
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

COMMENT ON COLUMN open_house_events.beds IS 'Number of bedrooms';
COMMENT ON COLUMN open_house_events.baths IS 'Number of bathrooms (can be decimal, e.g., 2.5)';
COMMENT ON COLUMN open_house_events.sqft IS 'Square footage';
COMMENT ON COLUMN open_house_events.price IS 'Listing price';
COMMENT ON COLUMN open_house_events.key_features IS 'Array of key property features';
COMMENT ON COLUMN open_house_events.hoa_fee IS 'Monthly HOA fee (if applicable)';
COMMENT ON COLUMN open_house_events.parking_notes IS 'Parking instructions for attendees';
COMMENT ON COLUMN open_house_events.showing_notes IS 'Special showing instructions';
COMMENT ON COLUMN open_house_events.disclosure_url IS 'Link to property disclosures';
COMMENT ON COLUMN open_house_events.offer_deadline IS 'Deadline for offers';
COMMENT ON COLUMN open_house_events.flyer_url IS 'URL to uploaded property flyer PDF';
COMMENT ON COLUMN open_house_events.flyer_enabled IS 'Whether flyer download is enabled for attendees';
COMMENT ON COLUMN open_house_events.listing_description IS 'Full listing description text';
COMMENT ON COLUMN open_house_events.verified_by IS 'Agent who verified the fact sheet';
COMMENT ON COLUMN open_house_events.verified_at IS 'When fact sheet was verified';
-- Lead Handling Rules and Consent Configuration
-- Per-event rules for how to handle leads based on representation status

ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS represented_send_info_only BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS unrepresented_ask_reach_out BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS unrepresented_notify_immediately BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS unrepresented_start_workflows BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS consent_sms_text TEXT,
ADD COLUMN IF NOT EXISTS consent_email_text TEXT,
ADD COLUMN IF NOT EXISTS consent_version INTEGER DEFAULT 1;

-- Set default consent text for existing events
UPDATE open_house_events
SET consent_sms_text = 'By checking this box, you agree to receive SMS messages from us about this property and related listings. Message and data rates may apply. Reply STOP to opt out.'
WHERE consent_sms_text IS NULL;

UPDATE open_house_events
SET consent_email_text = 'By checking this box, you agree to receive email communications from us about this property and related listings. You can unsubscribe at any time.'
WHERE consent_email_text IS NULL;

COMMENT ON COLUMN open_house_events.represented_send_info_only IS 'If visitor is represented, only send property info (no agent outreach)';
COMMENT ON COLUMN open_house_events.unrepresented_ask_reach_out IS 'Ask unrepresented visitors if they want agent to reach out';
COMMENT ON COLUMN open_house_events.unrepresented_notify_immediately IS 'Notify agent immediately when unrepresented visitor requests reach-out';
COMMENT ON COLUMN open_house_events.unrepresented_start_workflows IS 'Trigger automation workflows for unrepresented visitors';
COMMENT ON COLUMN open_house_events.consent_sms_text IS 'SMS consent disclaimer text (versioned)';
COMMENT ON COLUMN open_house_events.consent_email_text IS 'Email consent disclaimer text (versioned)';
COMMENT ON COLUMN open_house_events.consent_version IS 'Version number for tracking consent text changes';
-- Integrations Table
-- Stores OAuth tokens, API keys, and webhook URLs for GHL, n8n, etc.

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('ghl', 'n8n', 'idx', 'qbo', 'pandadoc', 'docusign', 'paypal', 'stripe', 'trestle')),
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  config JSONB DEFAULT '{}'::jsonb, -- OAuth tokens, webhook URLs, API keys
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, provider)
);

CREATE INDEX idx_integrations_agent_provider ON integrations(agent_id, provider);

-- Integration Mappings (for GHL pipelines, stages, etc.)
CREATE TABLE IF NOT EXISTS integration_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES open_house_events(id) ON DELETE CASCADE,
  ghl_pipeline_id TEXT,
  ghl_stage_hot TEXT,
  ghl_stage_warm TEXT,
  ghl_stage_cold TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integration_mappings_event ON integration_mappings(event_id);
CREATE INDEX idx_integration_mappings_integration ON integration_mappings(integration_id);

-- RLS Policies for Integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own integrations"
  ON integrations
  FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert own integrations"
  ON integrations
  FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update own integrations"
  ON integrations
  FOR UPDATE
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete own integrations"
  ON integrations
  FOR DELETE
  USING (auth.uid() = agent_id);

-- RLS Policies for Integration Mappings
ALTER TABLE integration_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own integration mappings"
  ON integration_mappings
  FOR SELECT
  USING (
    integration_id IN (
      SELECT id FROM integrations WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents can insert own integration mappings"
  ON integration_mappings
  FOR INSERT
  WITH CHECK (
    integration_id IN (
      SELECT id FROM integrations WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents can update own integration mappings"
  ON integration_mappings
  FOR UPDATE
  USING (
    integration_id IN (
      SELECT id FROM integrations WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents can delete own integration mappings"
  ON integration_mappings
  FOR DELETE
  USING (
    integration_id IN (
      SELECT id FROM integrations WHERE agent_id = auth.uid()
    )
  );

-- Ensure provider check constraint includes all supported providers (migrations 040, 061, 080, 20260226)
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;
ALTER TABLE integrations ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN ('ghl', 'n8n', 'idx', 'qbo', 'pandadoc', 'docusign', 'paypal', 'stripe', 'trestle', 'attom'));

COMMENT ON TABLE integrations IS 'OAuth connections and API configurations for third-party integrations (GHL, n8n, QuickBooks, PandaDoc, DocuSign, Trestle, ATTOM, etc.)';
COMMENT ON TABLE integration_mappings IS 'Per-event mappings for GHL pipelines, stages, and other integration-specific settings';
-- Webhook Event Logs
-- Tracks all webhook deliveries to n8n and other systems

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'lead.submitted', 'open_house.published', etc.
  payload JSONB NOT NULL,
  webhook_url TEXT NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error TEXT,
  attempts INTEGER DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_agent ON webhook_logs(agent_id);
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- RLS Policies
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own webhook logs"
  ON webhook_logs
  FOR SELECT
  USING (auth.uid() = agent_id);

COMMENT ON TABLE webhook_logs IS 'Log of all webhook deliveries for debugging and monitoring';
COMMENT ON COLUMN webhook_logs.event_type IS 'Type of event that triggered the webhook';
COMMENT ON COLUMN webhook_logs.payload IS 'JSON payload sent to webhook';
COMMENT ON COLUMN webhook_logs.status_code IS 'HTTP status code from webhook response';
COMMENT ON COLUMN webhook_logs.attempts IS 'Number of delivery attempts (max 3)';
COMMENT ON COLUMN webhook_logs.delivered_at IS 'Timestamp when webhook was successfully delivered';
-- Add GHL sync fields to lead_submissions table

ALTER TABLE lead_submissions
ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT,
ADD COLUMN IF NOT EXISTS ghl_opportunity_id TEXT,
ADD COLUMN IF NOT EXISTS ghl_sync_error TEXT;

COMMENT ON COLUMN lead_submissions.ghl_contact_id IS 'GHL Contact ID after successful sync';
COMMENT ON COLUMN lead_submissions.ghl_opportunity_id IS 'GHL Opportunity ID after successful sync';
COMMENT ON COLUMN lead_submissions.ghl_sync_error IS 'Last error message from GHL sync attempt';

-- Add index for GHL contact lookups
CREATE INDEX IF NOT EXISTS idx_lead_submissions_ghl_contact ON lead_submissions(ghl_contact_id) WHERE ghl_contact_id IS NOT NULL;
-- Add latitude and longitude to open_house_events table
ALTER TABLE open_house_events
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Add index for location-based queries
CREATE INDEX idx_open_house_events_coordinates ON open_house_events(latitude, longitude);

-- Add comment explaining the fields
COMMENT ON COLUMN open_house_events.latitude IS 'Property latitude for map display (-90 to 90)';
COMMENT ON COLUMN open_house_events.longitude IS 'Property longitude for map display (-180 to 180)';
