-- Extend Agents Table with Branding Fields
-- Allows agents to customize their public-facing brand

ALTER TABLE agents
ADD COLUMN IF NOT EXISTS headshot_url TEXT,
ADD COLUMN IF NOT EXISTS brokerage_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7) DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS disclaimer_text TEXT,
ADD COLUMN IF NOT EXISTS disclaimer_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS landing_page_enabled BOOLEAN DEFAULT true;

-- Add default disclaimer text for existing agents
UPDATE agents
SET disclaimer_text = 'This information is deemed reliable but not guaranteed. All measurements and information should be independently verified.'
WHERE disclaimer_text IS NULL;

COMMENT ON COLUMN agents.headshot_url IS 'URL to agent headshot/logo in Supabase Storage';
COMMENT ON COLUMN agents.brokerage_name IS 'Agent brokerage/company name';
COMMENT ON COLUMN agents.bio IS 'Short bio displayed on attendee pages';
COMMENT ON COLUMN agents.theme_color IS 'Hex color code for agent branding (e.g., #3b82f6)';
COMMENT ON COLUMN agents.disclaimer_text IS 'Legal disclaimer shown on property pages';
COMMENT ON COLUMN agents.disclaimer_version IS 'Version number for tracking disclaimer changes';
COMMENT ON COLUMN agents.landing_page_enabled IS 'Whether to show custom landing page';
