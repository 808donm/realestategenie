-- Add consent tracking column to lead_submissions table
-- This stores SMS and email consent captured during lead submission

ALTER TABLE lead_submissions
ADD COLUMN IF NOT EXISTS consent JSONB DEFAULT '{"sms": false, "email": false}'::jsonb;

COMMENT ON COLUMN lead_submissions.consent IS 'Consent captured during submission: {sms: boolean, email: boolean, captured_at: ISO timestamp}';

-- Create index for querying by consent type
CREATE INDEX IF NOT EXISTS idx_lead_submissions_consent_sms ON lead_submissions ((consent->>'sms')) WHERE (consent->>'sms')::boolean = true;
CREATE INDEX IF NOT EXISTS idx_lead_submissions_consent_email ON lead_submissions ((consent->>'email')) WHERE (consent->>'email')::boolean = true;
