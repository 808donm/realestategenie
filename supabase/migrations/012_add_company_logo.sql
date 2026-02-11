-- Add company logo to agents table
-- Allows agents to upload their brokerage/company logo

ALTER TABLE agents
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

COMMENT ON COLUMN agents.company_logo_url IS 'URL to company/brokerage logo in Supabase Storage';
