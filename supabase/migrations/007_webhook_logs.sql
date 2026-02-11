-- Webhook Event Logs
-- Tracks all webhook deliveries to n8n and other systems

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'lead.submitted', 'open_house.published', etc.
  payload JSONB NOT NULL,
  webhook_url TEXT NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error TEXT,
  attempts INTEGER DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_agent ON webhook_logs(agent_id);
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- RLS Policies
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own webhook logs"
  ON webhook_logs
  FOR SELECT
  USING (auth.uid() = agent_id);

COMMENT ON TABLE webhook_logs IS 'Log of all webhook deliveries for debugging and monitoring';
COMMENT ON COLUMN webhook_logs.event_type IS 'Type of event that triggered the webhook';
COMMENT ON COLUMN webhook_logs.payload IS 'JSON payload sent to webhook';
COMMENT ON COLUMN webhook_logs.status_code IS 'HTTP status code from webhook response';
COMMENT ON COLUMN webhook_logs.attempts IS 'Number of delivery attempts (max 3)';
COMMENT ON COLUMN webhook_logs.delivered_at IS 'Timestamp when webhook was successfully delivered';
