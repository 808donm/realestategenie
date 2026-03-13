-- Social Channel AI Conversations
-- Tracks conversation threads between the AI assistant and leads
-- across Facebook Messenger, Instagram DMs, LinkedIn, Google Business Messages, and WhatsApp.

CREATE TABLE IF NOT EXISTS ai_channel_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_contact_id TEXT NOT NULL,
  channel TEXT NOT NULL
    CHECK (channel IN ('sms', 'facebook', 'instagram', 'linkedin', 'google_business', 'whatsapp')),
  property_address TEXT,
  lead_source TEXT,
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

-- Index for looking up active conversations by contact + channel
CREATE INDEX idx_ai_channel_conversations_contact
  ON ai_channel_conversations (external_contact_id, agent_id, channel, status);

-- Index for agent dashboard queries
CREATE INDEX idx_ai_channel_conversations_agent
  ON ai_channel_conversations (agent_id, channel, status, updated_at DESC);

-- RLS policies
ALTER TABLE ai_channel_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own channel conversations"
  ON ai_channel_conversations FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can update their own channel conversations"
  ON ai_channel_conversations FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Service role full access on ai_channel_conversations"
  ON ai_channel_conversations FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE TRIGGER ai_channel_conversations_updated_at
  BEFORE UPDATE ON ai_channel_conversations
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- Add channel column to inbound_messages if it doesn't exist
-- (the existing message_type field already stores 'SMS', 'Email', etc.
--  but we want to normalize to the new channel enum values)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inbound_messages' AND column_name = 'channel'
  ) THEN
    ALTER TABLE inbound_messages ADD COLUMN channel TEXT;
    CREATE INDEX idx_inbound_messages_channel ON inbound_messages(channel);
  END IF;
END $$;

-- Add social_lead_response feature flag column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_flags' AND column_name = 'social_lead_response'
  ) THEN
    ALTER TABLE feature_flags ADD COLUMN social_lead_response BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

COMMENT ON TABLE ai_channel_conversations IS 'Tracks AI conversation threads across all messaging channels (SMS, Facebook, Instagram, LinkedIn, Google Business, WhatsApp)';
