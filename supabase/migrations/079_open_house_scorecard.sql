-- ============================================================================
-- OPEN HOUSE SCORECARD - CONTACT TRACKING
-- ============================================================================

-- Add contact tracking fields to lead_submissions
ALTER TABLE lead_submissions
ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS contact_method TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS contact_notes TEXT DEFAULT NULL;

-- Index for contact tracking
CREATE INDEX IF NOT EXISTS idx_lead_submissions_contacted_at ON lead_submissions(contacted_at);

-- Comment
COMMENT ON COLUMN lead_submissions.contacted_at IS 'Timestamp when the lead was first contacted';
COMMENT ON COLUMN lead_submissions.contact_method IS 'Method of contact (call, text, email)';
COMMENT ON COLUMN lead_submissions.contact_notes IS 'Notes about the contact attempt';

-- Create a view for scorecard metrics calculation
CREATE OR REPLACE VIEW open_house_scorecard_metrics AS
SELECT
  e.id AS event_id,
  e.agent_id,
  e.address,
  e.start_at,
  e.end_at,
  e.status,
  COUNT(ls.id) AS total_signins,
  COUNT(ls.contacted_at) AS total_contacted,
  COUNT(CASE WHEN ls.contacted_at IS NOT NULL
    AND ls.contacted_at <= ls.created_at + INTERVAL '5 minutes'
    THEN 1 END) AS contacted_within_5min,
  COUNT(CASE WHEN (ls.payload->>'representation') IN ('have_agent', 'working_with_agent', 'yes')
    THEN 1 END) AS has_realtor,
  COUNT(CASE WHEN (ls.payload->>'representation') IN ('no_agent', 'looking', 'no', 'none', 'need_agent')
    OR (ls.payload->>'representation') IS NULL
    OR (ls.payload->>'representation') = ''
    THEN 1 END) AS looking_for_agent
FROM open_house_events e
LEFT JOIN lead_submissions ls ON ls.event_id = e.id
GROUP BY e.id, e.agent_id, e.address, e.start_at, e.end_at, e.status;

-- RLS - use the same permissions as the underlying tables
-- The view inherits RLS from the base tables since we're querying through them
