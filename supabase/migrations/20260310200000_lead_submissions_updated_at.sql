-- Add updated_at column to lead_submissions
-- Several API routes reference this column for tracking stage changes
ALTER TABLE lead_submissions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Apply the auto-update trigger
CREATE TRIGGER update_lead_submissions_updated_at
  BEFORE UPDATE ON lead_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
