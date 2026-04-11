-- MLS Email Blast Agent
-- Automated neighborhood email marketing: searches MLS by subdivision,
-- compiles results into branded HTML emails, sends to CRM contacts.

CREATE TABLE IF NOT EXISTS mls_email_blasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  search_criteria JSONB NOT NULL DEFAULT '{}',
  -- Shape: { subdivision, zip_codes[], city, statuses[], property_types[], date_range_days }
  alert_types TEXT[] DEFAULT '{new_listing,closed,price_change}',
  -- CRM contact selection
  crm_contact_ids TEXT[] DEFAULT '{}',
  crm_tag TEXT,
  schedule TEXT DEFAULT 'weekly' CHECK (schedule IN ('weekly', 'biweekly', 'monthly', 'manual')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ DEFAULT now(),
  total_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mls_email_blasts_agent ON mls_email_blasts(agent_id);
CREATE INDEX IF NOT EXISTS idx_mls_email_blasts_next_send ON mls_email_blasts(next_send_at) WHERE is_active = true;

ALTER TABLE mls_email_blasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can manage their own email blasts"
  ON mls_email_blasts FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Service role can manage all email blasts"
  ON mls_email_blasts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Send history
CREATE TABLE IF NOT EXISTS mls_blast_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blast_id UUID NOT NULL REFERENCES mls_email_blasts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  crm_contact_id TEXT,
  subject TEXT,
  listings_count INTEGER DEFAULT 0,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mls_blast_sends_blast ON mls_blast_sends(blast_id);
CREATE INDEX IF NOT EXISTS idx_mls_blast_sends_agent ON mls_blast_sends(agent_id);

ALTER TABLE mls_blast_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own blast sends"
  ON mls_blast_sends FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Service role can manage all blast sends"
  ON mls_blast_sends FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
