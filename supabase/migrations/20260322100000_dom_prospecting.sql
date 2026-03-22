-- DOM Prospecting: Saved searches and cached results for stale listing targeting
-- Agents can set up weekly automated searches that identify listings exceeding
-- average DOM thresholds by property type, tiered by urgency.

-- Saved DOM prospect searches (agent configures these)
CREATE TABLE IF NOT EXISTS dom_prospect_searches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'DOM Prospect Search',
  -- Search area
  zip_codes text[] NOT NULL DEFAULT '{}',
  -- Threshold multipliers (relative to avg DOM for property type in zip)
  -- e.g., 2.0 means trigger at 2x the average DOM
  red_multiplier numeric NOT NULL DEFAULT 2.0,
  orange_multiplier numeric NOT NULL DEFAULT 1.5,
  charcoal_multiplier numeric NOT NULL DEFAULT 1.15,
  -- Property type filters (null = all types)
  property_types text[] DEFAULT NULL,
  -- Price range filters
  min_price numeric DEFAULT NULL,
  max_price numeric DEFAULT NULL,
  -- Schedule
  is_active boolean NOT NULL DEFAULT true,
  notify_email boolean NOT NULL DEFAULT true,
  last_run_at timestamptz DEFAULT NULL,
  next_run_at timestamptz DEFAULT NULL,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Cached DOM prospect results (refreshed weekly by cron)
CREATE TABLE IF NOT EXISTS dom_prospect_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id uuid NOT NULL REFERENCES dom_prospect_searches(id) ON DELETE CASCADE,
  -- Listing data
  listing_key text,
  mls_number text,
  address text NOT NULL,
  city text,
  state text,
  zip_code text NOT NULL,
  latitude numeric,
  longitude numeric,
  -- Property details
  property_type text,
  list_price numeric,
  original_list_price numeric,
  beds integer,
  baths integer,
  sqft integer,
  year_built integer,
  -- DOM data
  days_on_market integer NOT NULL,
  cumulative_days_on_market integer,
  listed_date text,
  avg_dom_for_type numeric NOT NULL,
  dom_ratio numeric NOT NULL, -- actual DOM / avg DOM
  -- Tier classification
  tier text NOT NULL CHECK (tier IN ('red', 'orange', 'charcoal')),
  -- Agent info (from MLS)
  listing_agent_name text,
  listing_agent_phone text,
  listing_agent_email text,
  listing_office_name text,
  -- Data source
  data_source text NOT NULL DEFAULT 'mls' CHECK (data_source IN ('mls', 'rentcast')),
  -- Cache management
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dom_searches_agent ON dom_prospect_searches (agent_id);
CREATE INDEX IF NOT EXISTS idx_dom_searches_active ON dom_prospect_searches (is_active, next_run_at);
CREATE INDEX IF NOT EXISTS idx_dom_results_search ON dom_prospect_results (search_id);
CREATE INDEX IF NOT EXISTS idx_dom_results_tier ON dom_prospect_results (search_id, tier);
CREATE INDEX IF NOT EXISTS idx_dom_results_zip ON dom_prospect_results (zip_code);
CREATE INDEX IF NOT EXISTS idx_dom_results_expires ON dom_prospect_results (expires_at);

-- RLS
ALTER TABLE dom_prospect_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dom_prospect_results ENABLE ROW LEVEL SECURITY;

-- Agents can only see their own searches
CREATE POLICY "Agents manage own DOM searches"
  ON dom_prospect_searches FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Agents can read results for their own searches
CREATE POLICY "Agents read own DOM results"
  ON dom_prospect_results FOR SELECT
  TO authenticated
  USING (search_id IN (SELECT id FROM dom_prospect_searches WHERE agent_id = auth.uid()));

-- Service role can manage all (for cron job)
CREATE POLICY "Service role manages DOM results"
  ON dom_prospect_results FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role manages DOM searches"
  ON dom_prospect_searches FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
