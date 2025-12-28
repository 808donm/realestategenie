-- Migration 039: Add GHL Location ID to Agents
-- Stores the GoHighLevel sub-account (location) ID for each agent

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS ghl_location_id TEXT;

CREATE INDEX IF NOT EXISTS idx_agents_ghl_location_id ON agents(ghl_location_id);

COMMENT ON COLUMN agents.ghl_location_id IS 'GoHighLevel sub-account (location) ID for this agent';
