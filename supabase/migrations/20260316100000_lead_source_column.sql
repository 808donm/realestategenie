-- Add lead_source column to track where leads originate from
ALTER TABLE lead_submissions
  ADD COLUMN IF NOT EXISTS lead_source TEXT NOT NULL DEFAULT 'open_house';

-- Backfill existing leads as open_house (they all came from QR check-ins)
UPDATE lead_submissions SET lead_source = 'open_house' WHERE lead_source IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_submissions_lead_source ON lead_submissions (lead_source);
