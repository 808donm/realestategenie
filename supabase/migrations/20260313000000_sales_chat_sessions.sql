-- Sales Chat Sessions
-- Tracks conversations from the Real Estate Genie marketing site chatbot.

CREATE TABLE IF NOT EXISTS sales_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  visitor_ip TEXT,
  booking_link_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for analytics (recent sessions, conversion tracking)
CREATE INDEX idx_sales_chat_sessions_created
  ON sales_chat_sessions (created_at DESC);

CREATE INDEX idx_sales_chat_sessions_booking
  ON sales_chat_sessions (booking_link_shared, created_at DESC)
  WHERE booking_link_shared = true;

-- No RLS needed — this table is only accessed by the service role
-- from the public sales-chat API endpoint. No user-scoped access.
ALTER TABLE sales_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on sales_chat_sessions"
  ON sales_chat_sessions FOR ALL
  USING (auth.role() = 'service_role');
