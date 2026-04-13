-- Skip Trace Usage Tracking & Billing
-- Tracks every skip trace call per agent for billing at $0.10/trace.
-- Global admin report shows usage across all agents.

CREATE TABLE IF NOT EXISTS skip_trace_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  address TEXT,
  owner_name TEXT,
  source TEXT DEFAULT 'manual', -- 'bird_dog', 'property_detail', 'manual'
  cost_cents INTEGER NOT NULL DEFAULT 10, -- $0.10 = 10 cents
  billing_month TEXT NOT NULL, -- 'YYYY-MM' for monthly aggregation
  cached BOOLEAN DEFAULT false, -- true if served from cache (no charge)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skip_trace_usage_agent ON skip_trace_usage(agent_id);
CREATE INDEX IF NOT EXISTS idx_skip_trace_usage_month ON skip_trace_usage(billing_month);
CREATE INDEX IF NOT EXISTS idx_skip_trace_usage_agent_month ON skip_trace_usage(agent_id, billing_month);

ALTER TABLE skip_trace_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own skip trace usage"
  ON skip_trace_usage FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Service role can manage all skip trace usage"
  ON skip_trace_usage FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Monthly billing summary view (for admin reporting)
CREATE OR REPLACE VIEW skip_trace_billing AS
SELECT
  agent_id,
  billing_month,
  COUNT(*) FILTER (WHERE NOT cached) AS billable_traces,
  COUNT(*) FILTER (WHERE cached) AS cached_traces,
  COUNT(*) AS total_traces,
  SUM(cost_cents) FILTER (WHERE NOT cached) AS total_cents,
  ROUND(SUM(cost_cents) FILTER (WHERE NOT cached) / 100.0, 2) AS total_dollars
FROM skip_trace_usage
GROUP BY agent_id, billing_month
ORDER BY billing_month DESC, total_cents DESC;
