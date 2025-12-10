-- Add GHL sync fields to lead_submissions table

ALTER TABLE lead_submissions
ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT,
ADD COLUMN IF NOT EXISTS ghl_opportunity_id TEXT,
ADD COLUMN IF NOT EXISTS ghl_sync_error TEXT;

COMMENT ON COLUMN lead_submissions.ghl_contact_id IS 'GHL Contact ID after successful sync';
COMMENT ON COLUMN lead_submissions.ghl_opportunity_id IS 'GHL Opportunity ID after successful sync';
COMMENT ON COLUMN lead_submissions.ghl_sync_error IS 'Last error message from GHL sync attempt';

-- Add index for GHL contact lookups
CREATE INDEX IF NOT EXISTS idx_lead_submissions_ghl_contact ON lead_submissions(ghl_contact_id) WHERE ghl_contact_id IS NOT NULL;
