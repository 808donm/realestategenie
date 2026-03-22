-- Genie Assistant action log — audit trail for all AI-assisted actions

CREATE TABLE IF NOT EXISTS genie_action_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid,
  action_type text NOT NULL,
  action_detail jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'draft_only')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_genie_log_agent ON genie_action_log (agent_id);
CREATE INDEX IF NOT EXISTS idx_genie_log_lead ON genie_action_log (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_genie_log_created ON genie_action_log (created_at);

ALTER TABLE genie_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents read own action log"
  ON genie_action_log FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Agents insert own action log"
  ON genie_action_log FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Service role manages action log"
  ON genie_action_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
