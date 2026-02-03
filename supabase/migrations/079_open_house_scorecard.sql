-- ============================================================================
-- OPEN HOUSE SCORECARD - CONTACT TRACKING
-- ============================================================================

-- Add contact tracking fields to lead_submissions (only if table exists)
DO $$
BEGIN
  -- Check if lead_submissions table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lead_submissions') THEN
    -- Add contacted_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns
                   WHERE table_name = 'lead_submissions' AND column_name = 'contacted_at') THEN
      ALTER TABLE lead_submissions ADD COLUMN contacted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    -- Add contact_method column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns
                   WHERE table_name = 'lead_submissions' AND column_name = 'contact_method') THEN
      ALTER TABLE lead_submissions ADD COLUMN contact_method TEXT DEFAULT NULL;
    END IF;

    -- Add contact_notes column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns
                   WHERE table_name = 'lead_submissions' AND column_name = 'contact_notes') THEN
      ALTER TABLE lead_submissions ADD COLUMN contact_notes TEXT DEFAULT NULL;
    END IF;
  END IF;
END $$;

-- Index for contact tracking (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lead_submissions') THEN
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_lead_submissions_contacted_at') THEN
      CREATE INDEX idx_lead_submissions_contacted_at ON lead_submissions(contacted_at);
    END IF;
  END IF;
END $$;

-- Comments (only if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns
             WHERE table_name = 'lead_submissions' AND column_name = 'contacted_at') THEN
    COMMENT ON COLUMN lead_submissions.contacted_at IS 'Timestamp when the lead was first contacted';
  END IF;
  IF EXISTS (SELECT FROM information_schema.columns
             WHERE table_name = 'lead_submissions' AND column_name = 'contact_method') THEN
    COMMENT ON COLUMN lead_submissions.contact_method IS 'Method of contact (call, text, email)';
  END IF;
  IF EXISTS (SELECT FROM information_schema.columns
             WHERE table_name = 'lead_submissions' AND column_name = 'contact_notes') THEN
    COMMENT ON COLUMN lead_submissions.contact_notes IS 'Notes about the contact attempt';
  END IF;
END $$;

-- Create scorecard metrics view (only if both tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lead_submissions')
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'open_house_events') THEN

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

  END IF;
END $$;
