-- DOM Prospecting Enhancement: Global listings cache + monitored properties + alert support
--
-- 1. dom_listings_cache — ALL active Oahu listings, refreshed weekly by cron
-- 2. dom_monitored_properties — Agent's watch list for individual properties
-- 3. Modify mls_watchdog_alerts to support DOM tier change alerts

-- ============================================================================
-- 1. Global Listings Cache
-- MLS (Trestle) is source of truth. Realie/RentCast supplement only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS dom_listings_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- MLS fields (Trestle — source of truth)
  listing_key text NOT NULL,
  listing_id text,
  standard_status text NOT NULL DEFAULT 'Active',
  address text NOT NULL,
  city text,
  state text,
  zip_code text NOT NULL,
  latitude numeric,
  longitude numeric,
  property_type text,
  raw_property_type text,
  list_price numeric,
  original_list_price numeric,
  beds integer,
  baths integer,
  sqft integer,
  year_built integer,
  -- DOM data (MLS is truth — used for live recalculation)
  days_on_market integer,
  cumulative_days_on_market integer,
  on_market_date date,
  -- Agent info (from MLS)
  listing_agent_name text,
  listing_agent_phone text,
  listing_agent_email text,
  listing_office_name text,
  -- Realie supplement (fills empty fields, never overwrites MLS)
  avm_value numeric,
  avm_low numeric,
  avm_high numeric,
  equity_estimate numeric,
  owner_name text,
  owner_occupied text,
  absentee_status text,
  lien_count integer,
  lien_balance numeric,
  -- RentCast supplement (fills empty fields, never overwrites MLS)
  rental_avm numeric,
  hoa_fee numeric,
  -- Source tracking & cache management
  data_source text NOT NULL DEFAULT 'mls' CHECK (data_source IN ('mls', 'rentcast')),
  batch_id uuid NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '8 days'),
  UNIQUE (listing_key, batch_id)
);

CREATE INDEX IF NOT EXISTS idx_dom_cache_zip ON dom_listings_cache (zip_code);
CREATE INDEX IF NOT EXISTS idx_dom_cache_status ON dom_listings_cache (standard_status);
CREATE INDEX IF NOT EXISTS idx_dom_cache_prop_type ON dom_listings_cache (property_type);
CREATE INDEX IF NOT EXISTS idx_dom_cache_price ON dom_listings_cache (list_price);
CREATE INDEX IF NOT EXISTS idx_dom_cache_on_market ON dom_listings_cache (on_market_date);
CREATE INDEX IF NOT EXISTS idx_dom_cache_batch ON dom_listings_cache (batch_id);
CREATE INDEX IF NOT EXISTS idx_dom_cache_expires ON dom_listings_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_dom_cache_listing_key ON dom_listings_cache (listing_key);

-- No RLS — server-side only (cron writes, API routes read via service role)

-- ============================================================================
-- 2. Monitored Properties — Agent's watch list
-- ============================================================================

CREATE TABLE IF NOT EXISTS dom_monitored_properties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_key text NOT NULL,
  listing_id text,
  -- Snapshot at time of flagging
  address text NOT NULL,
  city text,
  zip_code text NOT NULL,
  property_type text,
  list_price numeric,
  on_market_date date,
  -- Tier tracking (for alerting on escalation)
  current_tier text CHECK (current_tier IN ('red', 'orange', 'charcoal', 'below')),
  previous_tier text CHECK (previous_tier IN ('red', 'orange', 'charcoal', 'below')),
  -- Agent's threshold multipliers (inherited from search)
  red_multiplier numeric NOT NULL DEFAULT 2.0,
  orange_multiplier numeric NOT NULL DEFAULT 1.5,
  charcoal_multiplier numeric NOT NULL DEFAULT 1.15,
  -- Enrichment data (refreshed weekly by cron)
  latest_list_price numeric,
  latest_dom integer,
  latest_status text,
  last_enriched_at timestamptz,
  enrichment_data jsonb DEFAULT '{}'::jsonb,
  -- Status
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, listing_key)
);

CREATE INDEX IF NOT EXISTS idx_dom_monitor_agent ON dom_monitored_properties (agent_id);
CREATE INDEX IF NOT EXISTS idx_dom_monitor_active ON dom_monitored_properties (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dom_monitor_listing ON dom_monitored_properties (listing_key);
CREATE INDEX IF NOT EXISTS idx_dom_monitor_tier ON dom_monitored_properties (current_tier);

-- RLS: agents manage own rows
ALTER TABLE dom_monitored_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own monitored properties"
  ON dom_monitored_properties FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Service role manages all monitored properties"
  ON dom_monitored_properties FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. Extend mls_watchdog_alerts for DOM tier change alerts
-- Make watch_rule_id and farm_area_id nullable so DOM alerts can omit them
-- Add monitored_property_id for linking DOM alerts
-- ============================================================================

-- Make existing NOT NULL columns nullable
ALTER TABLE mls_watchdog_alerts
  ALTER COLUMN watch_rule_id DROP NOT NULL,
  ALTER COLUMN farm_area_id DROP NOT NULL;

-- Add monitored_property_id column
ALTER TABLE mls_watchdog_alerts
  ADD COLUMN IF NOT EXISTS monitored_property_id uuid REFERENCES dom_monitored_properties(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_watchdog_alerts_monitor ON mls_watchdog_alerts (monitored_property_id)
  WHERE monitored_property_id IS NOT NULL;

-- Add 'dom_tier_change' to alert_type options (no constraint to modify — alert_type is free text)
