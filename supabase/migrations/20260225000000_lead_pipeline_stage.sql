-- Add pipeline_stage column to lead_submissions
-- Tracks which stage of the sales pipeline each lead is in.
-- Defaults to 'new_lead' for all existing and new rows.

ALTER TABLE lead_submissions
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'new_lead';

-- Add an index for fast stage-based queries
CREATE INDEX IF NOT EXISTS idx_lead_submissions_pipeline_stage
  ON lead_submissions (agent_id, pipeline_stage);

-- Add a check constraint to enforce valid stage values
ALTER TABLE lead_submissions
  ADD CONSTRAINT chk_pipeline_stage CHECK (
    pipeline_stage IN (
      'new_lead',
      'initial_contact',
      'qualification',
      'initial_consultation',
      'property_search_listing_prep',
      'open_houses_and_tours',
      'offer_and_negotiation',
      'under_contract_escrow',
      'closing_coordination',
      'closed_and_followup',
      'review_request'
    )
  );
