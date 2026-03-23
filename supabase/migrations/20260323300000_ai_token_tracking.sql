-- AI Token Usage Tracking — detailed token counts and estimated costs
-- Supplements api_call_log with AI-specific metrics for cost projection

CREATE TABLE IF NOT EXISTS ai_token_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  model text NOT NULL,                    -- 'openai/gpt-4o-mini', 'anthropic/claude-opus-4', etc.
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost numeric(10,6) NOT NULL DEFAULT 0, -- USD
  response_time_ms integer,
  source text,                            -- 'chat-prequalifier', 'sms-assistant', 'briefing', etc.
  agent_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_tokens_model ON ai_token_usage (model);
CREATE INDEX IF NOT EXISTS idx_ai_tokens_created ON ai_token_usage (created_at);
CREATE INDEX IF NOT EXISTS idx_ai_tokens_source ON ai_token_usage (source);
CREATE INDEX IF NOT EXISTS idx_ai_tokens_model_date ON ai_token_usage (model, created_at);

-- No RLS — admin-only access
