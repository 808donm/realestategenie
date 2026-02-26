-- Integrations Table
-- Stores OAuth tokens, API keys, and webhook URLs for GHL, n8n, etc.

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('ghl', 'n8n', 'idx', 'qbo', 'pandadoc', 'docusign', 'paypal', 'stripe', 'trestle', 'attom')),
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

COMMENT ON TABLE integrations IS 'OAuth connections and API configurations for third-party integrations';
COMMENT ON TABLE integration_mappings IS 'Per-event mappings for GHL pipelines, stages, and other integration-specific settings';
