-- Create table to track open house flyer follow-ups
CREATE TABLE IF NOT EXISTS open_house_flyer_followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES lead_submissions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES open_house_events(id) ON DELETE CASCADE,
  ghl_contact_id TEXT NOT NULL,

  -- Follow-up state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'responded_yes', 'responded_no', 'flyer_sent', 'needs_clarification', 'error')),

  -- Message tracking
  thank_you_sent_at TIMESTAMPTZ,
  thank_you_message_id TEXT, -- GHL message ID

  response_received_at TIMESTAMPTZ,
  response_text TEXT, -- The actual response from the lead

  clarification_sent_at TIMESTAMPTZ, -- If they attended multiple, we ask which one
  clarification_message_id TEXT,

  selected_event_id UUID REFERENCES open_house_events(id), -- Which event they want the flyer for

  flyer_sent_at TIMESTAMPTZ,
  flyer_message_id TEXT,
  flyer_link TEXT, -- The flyer URL that was sent

  -- Error tracking
  last_error TEXT,
  error_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_flyer_followups_agent ON open_house_flyer_followups(agent_id);
CREATE INDEX IF NOT EXISTS idx_flyer_followups_lead ON open_house_flyer_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_flyer_followups_event ON open_house_flyer_followups(event_id);
CREATE INDEX IF NOT EXISTS idx_flyer_followups_ghl_contact ON open_house_flyer_followups(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_flyer_followups_status ON open_house_flyer_followups(status);
CREATE INDEX IF NOT EXISTS idx_flyer_followups_created_at ON open_house_flyer_followups(created_at DESC);

-- Create table to track which open houses each contact has attended
-- This helps us quickly determine if a contact attended multiple open houses
CREATE TABLE IF NOT EXISTS contact_open_house_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  ghl_contact_id TEXT NOT NULL,
  event_id UUID NOT NULL REFERENCES open_house_events(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES lead_submissions(id) ON DELETE CASCADE,
  attended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Composite unique constraint to prevent duplicates
  UNIQUE(ghl_contact_id, event_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for attendance lookup
CREATE INDEX IF NOT EXISTS idx_attendance_ghl_contact ON contact_open_house_attendance(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON contact_open_house_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_agent ON contact_open_house_attendance(agent_id);

-- Add comments
COMMENT ON TABLE open_house_flyer_followups IS 'Tracks the state of flyer follow-up messages sent via GHL';
COMMENT ON COLUMN open_house_flyer_followups.status IS 'Current state: pending → sent → responded_yes/no → flyer_sent or needs_clarification';
COMMENT ON TABLE contact_open_house_attendance IS 'Tracks which open houses each GHL contact has attended';

-- RLS policies
ALTER TABLE open_house_flyer_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_open_house_attendance ENABLE ROW LEVEL SECURITY;

-- Agents can only see their own follow-ups
CREATE POLICY "Agents can view own flyer followups"
  ON open_house_flyer_followups FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert own flyer followups"
  ON open_house_flyer_followups FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own flyer followups"
  ON open_house_flyer_followups FOR UPDATE
  USING (agent_id = auth.uid());

-- Agents can only see their own attendance records
CREATE POLICY "Agents can view own attendance records"
  ON contact_open_house_attendance FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert own attendance records"
  ON contact_open_house_attendance FOR INSERT
  WITH CHECK (agent_id = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_flyer_followups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flyer_followups_timestamp
  BEFORE UPDATE ON open_house_flyer_followups
  FOR EACH ROW
  EXECUTE FUNCTION update_flyer_followups_updated_at();
