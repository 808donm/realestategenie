-- Chat Widget Sessions
-- Tracks conversations from the embeddable website chat widget.

CREATE TABLE IF NOT EXISTS chat_widget_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ghl_contact_id TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  qualification_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  heat_score INTEGER NOT NULL DEFAULT 0,
  heat_level TEXT NOT NULL DEFAULT 'cold'
    CHECK (heat_level IN ('hot', 'warm', 'cold')),
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  visitor_ip TEXT,
  contact_created BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for agent dashboard queries
CREATE INDEX idx_chat_widget_sessions_agent
  ON chat_widget_sessions (agent_id, created_at DESC);

-- Index for finding sessions by contact
CREATE INDEX idx_chat_widget_sessions_contact
  ON chat_widget_sessions (ghl_contact_id)
  WHERE ghl_contact_id IS NOT NULL;

-- RLS policies
ALTER TABLE chat_widget_sessions ENABLE ROW LEVEL SECURITY;

-- Agents can view their own chat sessions
CREATE POLICY "Agents can view their own chat sessions"
  ON chat_widget_sessions FOR SELECT
  USING (agent_id = auth.uid());

-- Service role can do everything (for the public chat API)
CREATE POLICY "Service role full access on chat_widget_sessions"
  ON chat_widget_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE TRIGGER chat_widget_sessions_updated_at
  BEFORE UPDATE ON chat_widget_sessions
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
