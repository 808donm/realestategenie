-- Genie Copilot conversation sessions
-- Stores multi-turn conversations between agents and the AI copilot

CREATE TABLE IF NOT EXISTS genie_copilot_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_sessions_agent
  ON genie_copilot_sessions (agent_id, updated_at DESC);

ALTER TABLE genie_copilot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own copilot sessions"
  ON genie_copilot_sessions FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Service role manages copilot sessions"
  ON genie_copilot_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
