-- Market Report Configs
-- Admin-managed mapping of market reports to MLS identifiers.
-- Determines which reports an agent sees based on their MLS connection.

CREATE TABLE IF NOT EXISTS market_report_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mls_id TEXT NOT NULL,           -- "hicentral", "bright", etc.
  mls_name TEXT NOT NULL,         -- Display name: "HiCentral MLS"
  state TEXT NOT NULL,            -- "HI", "PA"
  report_slug TEXT NOT NULL,      -- Route slug matching /app/reports/{slug}
  report_title TEXT NOT NULL,     -- Display title
  report_description TEXT,        -- Short description for the report card
  report_category TEXT DEFAULT 'market_stats', -- market_stats, monthly, statewide, leaderboard
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_report_configs_mls ON market_report_configs(mls_id);
CREATE INDEX IF NOT EXISTS idx_market_report_configs_active ON market_report_configs(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_report_configs_dedup ON market_report_configs(mls_id, report_slug);

-- No RLS needed -- this is admin-managed config read by all authenticated users
ALTER TABLE market_report_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read market report configs"
  ON market_report_configs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage market report configs"
  ON market_report_configs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════
-- Seed initial configs for HiCentral and Bright MLS
-- ══════════════════════════════════════════════════════════════════

INSERT INTO market_report_configs (mls_id, mls_name, state, report_slug, report_title, report_description, report_category, display_order) VALUES
  -- HiCentral MLS (Oahu / All Hawaii)
  ('hicentral', 'HiCentral MLS', 'HI', 'market-statistics', 'Oahu Annual Resales', '40 years of residential sales data with line, bar, and area charts. Median prices, sales volume, and YoY trends.', 'market_stats', 1),
  ('hicentral', 'HiCentral MLS', 'HI', 'monthly-statistics', 'Oahu Monthly Report', 'Monthly resales: SF & condo sales, median prices, DOM, pending, inventory with YoY comparisons and trend charts.', 'monthly', 2),
  ('hicentral', 'HiCentral MLS', 'HI', 'hawaii-market-comparison', 'Statewide Comparison', 'Statewide stats: median prices, sales, YoY changes, DOM & inventory across all four counties.', 'statewide', 3),
  ('hicentral', 'HiCentral MLS', 'HI', 'maui-statistics', 'Maui Monthly Report', 'Maui County: SF & condo median prices, 12-month trends, area sales volume, and inventory analysis.', 'monthly', 4),
  ('hicentral', 'HiCentral MLS', 'HI', 'hawaii-island-statistics', 'Hawaii Island Monthly', 'Big Island: SF, condo & land - median prices, DOM, new vs sold listings with YoY comparisons.', 'monthly', 5),
  ('hicentral', 'HiCentral MLS', 'HI', 'kauai-statistics', 'Kauai Monthly', 'Garden Isle: SF, condo & land stats. Sales, inventory, and DOM by property type.', 'monthly', 6),
  ('hicentral', 'HiCentral MLS', 'HI', 'mls-leaderboard', 'MLS Agent Leaderboard', 'Market-wide agent rankings by closed transactions. Top agents and offices by sales, volume, and DOM.', 'leaderboard', 7),

  -- Bright MLS / RAYAC (York & Adams Counties, PA)
  ('bright', 'Bright MLS', 'PA', 'york-adams-market', 'York & Adams Counties', 'Monthly housing statistics: median prices, sales volume, DOM, inventory & school district breakdowns.', 'market_stats', 1),
  ('bright', 'Bright MLS', 'PA', 'mls-leaderboard', 'MLS Agent Leaderboard', 'Market-wide agent rankings by closed transactions. Top agents and offices by sales, volume, and DOM.', 'leaderboard', 2)

ON CONFLICT (mls_id, report_slug) DO NOTHING;
