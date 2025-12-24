-- Add agency_name field to agents table
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS agency_name TEXT;

-- Add comment
COMMENT ON COLUMN agents.agency_name IS 'Name of the real estate agency/company the agent works for';
