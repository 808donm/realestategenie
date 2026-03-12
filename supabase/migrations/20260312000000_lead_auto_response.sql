-- Lead Auto-Response Engine tables
-- Supports both GHL SMS and website chat widget channels

-- ─── Lead Conversations ──────────────────────────────────────────────────────
-- Tracks multi-turn AI conversations with leads across all channels
CREATE TABLE IF NOT EXISTS lead_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  contact_id TEXT,                        -- GHL contact ID (set after contact creation)
  conversation_id TEXT,                    -- GHL conversation ID
  lead_submission_id UUID REFERENCES lead_submissions(id),

  -- Channel source
  source TEXT NOT NULL DEFAULT 'ghl'
    CHECK (source IN ('ghl', 'widget', 'web_form')),
  widget_session_id TEXT,

  -- State machine
  current_phase TEXT NOT NULL DEFAULT 'greeting'
    CHECK (current_phase IN ('greeting', 'qualifying', 'scheduling', 'escalated', 'handed_off')),

  -- Conversation history (for AI context window)
  messages JSONB NOT NULL DEFAULT '[]',    -- [{role, content, timestamp}]

  -- Extracted qualification data
  extracted_data JSONB NOT NULL DEFAULT '{}',

  -- Inbound contact info (from widget or SMS before GHL contact exists)
  contact_phone TEXT,
  contact_name TEXT,
  contact_email TEXT,

  -- Scoring
  heat_score_at_start INTEGER DEFAULT 0,
  current_heat_score INTEGER DEFAULT 0,

  -- Lifecycle
  escalated_at TIMESTAMPTZ,
  handed_off_at TIMESTAMPTZ,
  last_ai_response_at TIMESTAMPTZ,
  last_lead_message_at TIMESTAMPTZ,
  ai_message_count INTEGER DEFAULT 0,

  -- Settings snapshot (copied from agent settings at conversation start)
  escalation_threshold INTEGER DEFAULT 80,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for lead_conversations
CREATE INDEX idx_lead_conversations_agent_id ON lead_conversations(agent_id);
CREATE INDEX idx_lead_conversations_contact_id ON lead_conversations(contact_id);
CREATE INDEX idx_lead_conversations_source ON lead_conversations(source);
CREATE INDEX idx_lead_conversations_phase ON lead_conversations(current_phase);
CREATE INDEX idx_lead_conversations_widget_session ON lead_conversations(widget_session_id);

-- ─── Lead Response Settings ──────────────────────────────────────────────────
-- Per-agent configuration for the auto-response engine
CREATE TABLE IF NOT EXISTS lead_response_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE UNIQUE,
  auto_response_enabled BOOLEAN DEFAULT true,
  response_mode TEXT DEFAULT 'autonomous'
    CHECK (response_mode IN ('autonomous', 'suggest_only', 'disabled')),
  escalation_threshold INTEGER DEFAULT 80,
  greeting_template TEXT,
  business_hours_only BOOLEAN DEFAULT false,
  max_ai_messages INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── AI Message Log ──────────────────────────────────────────────────────────
-- Audit trail for every AI-generated message
CREATE TABLE IF NOT EXISTS ai_message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES lead_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_body TEXT NOT NULL,
  ai_model TEXT,
  tokens_used INTEGER,
  qualification_extracted JSONB,
  heat_score_before INTEGER,
  heat_score_after INTEGER,
  sent_via TEXT DEFAULT 'sms',
  ghl_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_message_log_conversation ON ai_message_log(conversation_id);
CREATE INDEX idx_ai_message_log_created ON ai_message_log(created_at);

-- ─── Widget Sessions ─────────────────────────────────────────────────────────
-- Anonymous visitor sessions for the embeddable chat widget
CREATE TABLE IF NOT EXISTS widget_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  conversation_id UUID REFERENCES lead_conversations(id),
  visitor_metadata JSONB DEFAULT '{}',     -- browser, referrer, page URL
  ip_hash TEXT,                             -- hashed for rate limiting, not PII
  messages_this_hour INTEGER DEFAULT 0,
  hour_window_start TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_widget_sessions_token ON widget_sessions(session_token);
CREATE INDEX idx_widget_sessions_agent ON widget_sessions(agent_id);
CREATE INDEX idx_widget_sessions_expires ON widget_sessions(expires_at);

-- ─── RLS Policies ────────────────────────────────────────────────────────────
ALTER TABLE lead_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_response_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_message_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_sessions ENABLE ROW LEVEL SECURITY;

-- Agents can view their own conversations
CREATE POLICY "Agents can view own conversations"
  ON lead_conversations FOR SELECT
  USING (agent_id IN (
    SELECT id FROM agents WHERE user_id = auth.uid()
  ));

-- Agents can update their own conversations (handoff)
CREATE POLICY "Agents can update own conversations"
  ON lead_conversations FOR UPDATE
  USING (agent_id IN (
    SELECT id FROM agents WHERE user_id = auth.uid()
  ));

-- Service role can do everything (for webhook/engine operations)
CREATE POLICY "Service role full access to conversations"
  ON lead_conversations FOR ALL
  USING (auth.role() = 'service_role');

-- Settings: agents can manage their own
CREATE POLICY "Agents can manage own response settings"
  ON lead_response_settings FOR ALL
  USING (agent_id IN (
    SELECT id FROM agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role full access to response settings"
  ON lead_response_settings FOR ALL
  USING (auth.role() = 'service_role');

-- AI message log: agents can view their conversation logs
CREATE POLICY "Agents can view own message logs"
  ON ai_message_log FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM lead_conversations WHERE agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Service role full access to message logs"
  ON ai_message_log FOR ALL
  USING (auth.role() = 'service_role');

-- Widget sessions: service role only (public API uses service role)
CREATE POLICY "Service role full access to widget sessions"
  ON widget_sessions FOR ALL
  USING (auth.role() = 'service_role');
