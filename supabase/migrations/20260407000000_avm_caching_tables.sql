-- AVM Caching Tables
-- Supports 4 caching strategies for improving Genie AVM accuracy:
-- 1. Sale outcome tracking (measure actual accuracy)
-- 2. Historical comp cache (richer comp pool over time)
-- 3. List-to-sale ratio cache (calibrate list price weight by area)
-- 4. Genie AVM result cache (uses existing property_data_cache)

-- ══════════════════════════════════════════════════════════════════
-- 1. Sale Outcome Tracking
-- Records our AVM prediction vs actual sale price when a listing closes.
-- This is the ground truth dataset for measuring and improving accuracy.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS avm_sale_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  address_hash TEXT NOT NULL,
  genie_avm INTEGER NOT NULL,
  genie_avm_confidence TEXT,
  list_price INTEGER,
  sale_price INTEGER NOT NULL,
  close_date DATE NOT NULL,
  error_pct NUMERIC(6,2),
  abs_error_pct NUMERIC(6,2),
  property_type TEXT,
  zip_code TEXT NOT NULL,
  beds SMALLINT,
  baths NUMERIC(3,1),
  sqft INTEGER,
  year_built SMALLINT,
  subdivision TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(address_hash, close_date)
);

CREATE INDEX IF NOT EXISTS idx_avm_sale_outcomes_zip ON avm_sale_outcomes(zip_code);
CREATE INDEX IF NOT EXISTS idx_avm_sale_outcomes_type ON avm_sale_outcomes(property_type);
CREATE INDEX IF NOT EXISTS idx_avm_sale_outcomes_date ON avm_sale_outcomes(close_date);

ALTER TABLE avm_sale_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sale outcomes"
  ON avm_sale_outcomes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage sale outcomes"
  ON avm_sale_outcomes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════
-- 2. Historical Comp Cache
-- Every closed sale we encounter is cached here, building a richer
-- comp pool over time beyond what a single MLS query returns.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS comp_history_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  address_hash TEXT NOT NULL UNIQUE,
  close_price INTEGER NOT NULL,
  list_price INTEGER,
  close_date DATE NOT NULL,
  beds SMALLINT,
  baths NUMERIC(3,1),
  sqft INTEGER,
  year_built SMALLINT,
  lot_size INTEGER,
  property_type TEXT,
  property_sub_type TEXT,
  zip_code TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  subdivision TEXT,
  ownership_type TEXT,
  source TEXT NOT NULL CHECK (source IN ('mls', 'rentcast')),
  listing_key TEXT,
  days_on_market INTEGER,
  correlation NUMERIC(4,3),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comp_history_zip ON comp_history_cache(zip_code);
CREATE INDEX IF NOT EXISTS idx_comp_history_date ON comp_history_cache(close_date);
CREATE INDEX IF NOT EXISTS idx_comp_history_type ON comp_history_cache(property_type);
CREATE INDEX IF NOT EXISTS idx_comp_history_composite ON comp_history_cache(zip_code, property_type, beds);

ALTER TABLE comp_history_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read comp history"
  ON comp_history_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage comp history"
  ON comp_history_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════
-- 3. List-to-Sale Ratio Cache
-- Aggregated stats on how listing prices compare to actual sale
-- prices by ZIP/subdivision. Used to calibrate the list price weight.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS list_to_sale_ratio_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zip_code TEXT NOT NULL,
  subdivision TEXT,
  property_type TEXT,
  avg_ratio NUMERIC(6,4),
  median_ratio NUMERIC(6,4),
  sample_count INTEGER NOT NULL DEFAULT 0,
  period_months INTEGER NOT NULL DEFAULT 12,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(zip_code, COALESCE(subdivision, ''), COALESCE(property_type, ''))
);

CREATE INDEX IF NOT EXISTS idx_lts_ratio_zip ON list_to_sale_ratio_cache(zip_code);

ALTER TABLE list_to_sale_ratio_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ratios"
  ON list_to_sale_ratio_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage ratios"
  ON list_to_sale_ratio_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
