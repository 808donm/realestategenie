-- Property Intelligence Reports table
-- Stores generated reports for sharing via public links
CREATE TABLE IF NOT EXISTS property_intelligence_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  report_data JSONB NOT NULL DEFAULT '{}',
  agent_branding JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for agent lookups
CREATE INDEX IF NOT EXISTS idx_pir_agent_id ON property_intelligence_reports(agent_id);
CREATE INDEX IF NOT EXISTS idx_pir_created_at ON property_intelligence_reports(created_at DESC);

-- RLS policies
ALTER TABLE property_intelligence_reports ENABLE ROW LEVEL SECURITY;

-- Agents can read their own reports
CREATE POLICY pir_agent_read ON property_intelligence_reports
  FOR SELECT USING (agent_id = auth.uid());

-- Agents can insert their own reports
CREATE POLICY pir_agent_insert ON property_intelligence_reports
  FOR INSERT WITH CHECK (agent_id = auth.uid());

-- Public read access (for shareable links) — service role bypasses RLS
-- The public /report/[id] page uses the admin client to read
