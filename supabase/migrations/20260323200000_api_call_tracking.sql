-- API Call Tracking — logs all external API calls for usage reporting and cost projection
-- Tracks RentCast, Realie, Trestle (MLS), and other integrations

CREATE TABLE IF NOT EXISTS api_call_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL,         -- 'rentcast', 'realie', 'trestle', 'ghl', 'federal', 'openai'
  endpoint text NOT NULL,         -- '/properties', '/avm/value', '/Property', etc.
  method text NOT NULL DEFAULT 'GET',
  status_code integer,
  response_time_ms integer,       -- milliseconds
  cache_hit boolean DEFAULT false,
  agent_id uuid,                  -- which agent triggered it (null for system/cron)
  source text,                    -- 'seller-map', 'property-data', 'dom-prospecting', 'cron', etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for reporting queries
CREATE INDEX IF NOT EXISTS idx_api_log_provider ON api_call_log (provider);
CREATE INDEX IF NOT EXISTS idx_api_log_created ON api_call_log (created_at);
CREATE INDEX IF NOT EXISTS idx_api_log_provider_date ON api_call_log (provider, created_at);
CREATE INDEX IF NOT EXISTS idx_api_log_agent ON api_call_log (agent_id) WHERE agent_id IS NOT NULL;

-- Materialized summary for fast dashboard queries (refreshed by cron or on demand)
CREATE TABLE IF NOT EXISTS api_usage_daily (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  provider text NOT NULL,
  endpoint text NOT NULL,
  total_calls integer NOT NULL DEFAULT 0,
  cache_hits integer NOT NULL DEFAULT 0,
  avg_response_ms integer,
  unique_agents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, provider, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_api_daily_date ON api_usage_daily (date);
CREATE INDEX IF NOT EXISTS idx_api_daily_provider ON api_usage_daily (provider, date);

-- No RLS — admin-only access via server-side routes
