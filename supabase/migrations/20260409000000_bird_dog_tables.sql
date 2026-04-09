-- Bird Dog Automated Prospecting Agent
-- Automated property search that hunts for off-market leads matching
-- agent criteria on a scheduled basis (daily/weekly/monthly).

-- ══════════════════════════════════════════════════════════════════
-- 1. Saved Searches
-- Agent's search criteria and schedule configuration
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bird_dog_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  search_criteria JSONB NOT NULL DEFAULT '{}',
  schedule TEXT NOT NULL DEFAULT 'weekly' CHECK (schedule IN ('daily', 'weekly', 'monthly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_property_ids TEXT[] DEFAULT '{}',
  last_run_new_count INTEGER DEFAULT 0,
  next_run_at TIMESTAMPTZ DEFAULT now(),
  total_results INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bird_dog_searches_agent ON bird_dog_searches(agent_id);
CREATE INDEX IF NOT EXISTS idx_bird_dog_searches_next_run ON bird_dog_searches(next_run_at) WHERE is_active = true;

ALTER TABLE bird_dog_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can manage their own bird dog searches"
  ON bird_dog_searches FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Service role can manage all bird dog searches"
  ON bird_dog_searches FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════
-- 2. Results
-- Individual property leads found by each search run
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bird_dog_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES bird_dog_searches(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  reapi_property_id TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  property_type TEXT,
  beds SMALLINT,
  baths NUMERIC(3,1),
  sqft INTEGER,
  year_built SMALLINT,
  owner_name TEXT,
  owner_name_2 TEXT,
  mailing_address TEXT,
  absentee_owner BOOLEAN,
  out_of_state_absentee BOOLEAN,
  estimated_value INTEGER,
  estimated_equity INTEGER,
  equity_percent NUMERIC(5,1),
  mortgage_balance INTEGER,
  last_sale_date TEXT,
  last_sale_price INTEGER,
  ownership_length INTEGER,
  lead_score TEXT NOT NULL CHECK (lead_score IN ('hot', 'warm', 'cold')),
  lead_score_reasons TEXT[] DEFAULT '{}',
  lead_flags JSONB DEFAULT '{}',
  property_data JSONB DEFAULT '{}',
  is_new BOOLEAN NOT NULL DEFAULT true,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(search_id, reapi_property_id)
);

CREATE INDEX IF NOT EXISTS idx_bird_dog_results_search ON bird_dog_results(search_id);
CREATE INDEX IF NOT EXISTS idx_bird_dog_results_agent ON bird_dog_results(agent_id);
CREATE INDEX IF NOT EXISTS idx_bird_dog_results_score ON bird_dog_results(lead_score);
CREATE INDEX IF NOT EXISTS idx_bird_dog_results_zip ON bird_dog_results(zip);

ALTER TABLE bird_dog_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can manage their own bird dog results"
  ON bird_dog_results FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Service role can manage all bird dog results"
  ON bird_dog_results FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════
-- 3. Skip Trace Contacts
-- Contact information from skip trace lookups on results
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bird_dog_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES bird_dog_results(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  reapi_property_id TEXT,
  owner_name TEXT,
  phones JSONB DEFAULT '[]',
  emails JSONB DEFAULT '[]',
  addresses JSONB DEFAULT '[]',
  social_profiles JSONB DEFAULT '[]',
  demographics JSONB DEFAULT '{}',
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bird_dog_contacts_result ON bird_dog_contacts(result_id);
CREATE INDEX IF NOT EXISTS idx_bird_dog_contacts_agent ON bird_dog_contacts(agent_id);

ALTER TABLE bird_dog_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can manage their own bird dog contacts"
  ON bird_dog_contacts FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Service role can manage all bird dog contacts"
  ON bird_dog_contacts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
