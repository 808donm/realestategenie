-- Agent activity log for agency-level reporting
-- Tracks key agent actions: MLS searches, report generation, property views, etc.
-- Used by the Agency Dashboard to show per-agent activity metrics.

CREATE TABLE IF NOT EXISTS agent_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_agent_activity_agent_id ON agent_activity_log(agent_id);
CREATE INDEX idx_agent_activity_created ON agent_activity_log(created_at DESC);
CREATE INDEX idx_agent_activity_action ON agent_activity_log(action);
CREATE INDEX idx_agent_activity_agent_action ON agent_activity_log(agent_id, action, created_at DESC);

-- RLS: agents see own activity, admins/brokers see all in their account
ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_view_own_activity" ON agent_activity_log
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "agents_insert_own_activity" ON agent_activity_log
  FOR INSERT WITH CHECK (agent_id = auth.uid());

-- Admins can view all activity
CREATE POLICY "admins_view_all_activity" ON agent_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = auth.uid()
      AND (agents.is_admin = TRUE OR agents.role IN ('broker', 'admin'))
      AND agents.account_status = 'active'
    )
  );

-- Comment on action values for documentation
COMMENT ON COLUMN agent_activity_log.action IS 'Action types: login, mls_search, property_viewed, report_generated, cma_generated, lead_contacted, open_house_created, lead_captured, report_downloaded';
