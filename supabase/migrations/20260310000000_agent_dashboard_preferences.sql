-- Agent Dashboard Preferences for the Unified Command Center
CREATE TABLE IF NOT EXISTS agent_dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  default_zip_codes TEXT[] DEFAULT '{}',
  show_market_pulse BOOLEAN DEFAULT true,
  briefing_time TIME DEFAULT '07:00:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id)
);

-- RLS
ALTER TABLE agent_dashboard_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own dashboard preferences"
  ON agent_dashboard_preferences FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert own dashboard preferences"
  ON agent_dashboard_preferences FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own dashboard preferences"
  ON agent_dashboard_preferences FOR UPDATE
  USING (agent_id = auth.uid());
