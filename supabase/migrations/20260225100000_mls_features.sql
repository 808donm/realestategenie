-- MLS Features: Open House Sync, Lead Matching, CMA Storage
-- Supports: Auto-fill from MLS, Bi-directional OH sync, Lead-to-listing matching, CMA reports

-- 1. Add MLS sync fields to open_house_events
ALTER TABLE open_house_events ADD COLUMN IF NOT EXISTS mls_listing_key TEXT;
ALTER TABLE open_house_events ADD COLUMN IF NOT EXISTS mls_listing_id TEXT;
ALTER TABLE open_house_events ADD COLUMN IF NOT EXISTS mls_open_house_key TEXT;
ALTER TABLE open_house_events ADD COLUMN IF NOT EXISTS mls_synced_at TIMESTAMPTZ;
ALTER TABLE open_house_events ADD COLUMN IF NOT EXISTS mls_source TEXT CHECK (mls_source IN ('local', 'mls', 'synced'));

CREATE INDEX IF NOT EXISTS idx_ohe_mls_listing_key ON open_house_events (mls_listing_key) WHERE mls_listing_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ohe_mls_oh_key ON open_house_events (mls_open_house_key) WHERE mls_open_house_key IS NOT NULL;

-- 2. Lead-listing matches table
CREATE TABLE IF NOT EXISTS lead_listing_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES lead_submissions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  listing_key TEXT NOT NULL,
  listing_id TEXT,
  address TEXT NOT NULL,
  city TEXT,
  postal_code TEXT,
  list_price NUMERIC(12,2),
  bedrooms INTEGER,
  bathrooms INTEGER,
  living_area INTEGER,
  property_type TEXT,
  match_score INTEGER NOT NULL DEFAULT 0 CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'sent', 'viewed', 'dismissed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_lead_id ON lead_listing_matches (lead_id);
CREATE INDEX IF NOT EXISTS idx_llm_agent_id ON lead_listing_matches (agent_id);
CREATE INDEX IF NOT EXISTS idx_llm_status ON lead_listing_matches (status);

-- RLS for lead_listing_matches
ALTER TABLE lead_listing_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_listing_matches_agent_policy ON lead_listing_matches;
CREATE POLICY lead_listing_matches_agent_policy ON lead_listing_matches
  FOR ALL USING (agent_id = auth.uid());

-- 3. CMA reports table
CREATE TABLE IF NOT EXISTS cma_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  subject_address TEXT NOT NULL,
  subject_city TEXT,
  subject_postal_code TEXT,
  subject_listing_key TEXT,
  subject_list_price NUMERIC(12,2),
  subject_beds INTEGER,
  subject_baths INTEGER,
  subject_sqft INTEGER,
  subject_year_built INTEGER,
  subject_property_type TEXT,
  comps JSONB NOT NULL DEFAULT '[]',
  stats JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cma_agent_id ON cma_reports (agent_id);

-- RLS for cma_reports
ALTER TABLE cma_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cma_reports_agent_policy ON cma_reports;
CREATE POLICY cma_reports_agent_policy ON cma_reports
  FOR ALL USING (agent_id = auth.uid());
