-- Add timezone field to agents table for invoice generation timing
-- Default to America/New_York (EST) for existing users

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add a check constraint for valid IANA timezones (optional but recommended)
COMMENT ON COLUMN agents.timezone IS 'IANA timezone (e.g., America/New_York, America/Los_Angeles, America/Chicago)';

-- Common US timezones:
-- America/New_York (EST/EDT)
-- America/Chicago (CST/CDT)
-- America/Denver (MST/MDT)
-- America/Los_Angeles (PST/PDT)
-- America/Phoenix (MST - no DST)
-- Pacific/Honolulu (HST)
