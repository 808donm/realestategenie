-- AI SMS Conversations
-- Tracks conversation threads between the AI assistant and leads via SMS.

CREATE TABLE IF NOT EXISTS ai_sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ghl_contact_id TEXT NOT NULL,
  property_address TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'handed_off', 'closed')),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  handoff_reason TEXT,
  handed_off_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for looking up active conversations by contact
CREATE INDEX idx_ai_sms_conversations_contact
  ON ai_sms_conversations (ghl_contact_id, agent_id, status);

-- Index for agent dashboard queries
CREATE INDEX idx_ai_sms_conversations_agent
  ON ai_sms_conversations (agent_id, status, updated_at DESC);

-- RLS policies
ALTER TABLE ai_sms_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own AI conversations"
  ON ai_sms_conversations FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can update their own AI conversations"
  ON ai_sms_conversations FOR UPDATE
  USING (agent_id = auth.uid());

-- Service role can do everything (for webhook handlers)
CREATE POLICY "Service role full access on ai_sms_conversations"
  ON ai_sms_conversations FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE TRIGGER ai_sms_conversations_updated_at
  BEFORE UPDATE ON ai_sms_conversations
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
