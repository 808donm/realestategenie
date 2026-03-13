-- MLS Watchdog: Farm Areas, Watch Rules, Listing Snapshots & Alerts
-- Enables agents to monitor MLS listings in their farm areas with configurable alerts.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Farm Areas — geographic zones agents want to monitor
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mls_farm_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,

  -- Geography (one of these must be set)
  search_type TEXT NOT NULL CHECK (search_type IN ('zip', 'radius', 'tmk')),
  postal_codes TEXT[],                          -- zip mode: one or more zips
  center_lat DOUBLE PRECISION,                  -- radius mode
  center_lng DOUBLE PRECISION,                  -- radius mode
  radius_miles DOUBLE PRECISION DEFAULT 2,      -- radius mode
  tmk_prefix TEXT,                              -- tmk mode: e.g. '1-5-3'

  -- Filters
  property_types TEXT[] DEFAULT '{}',           -- e.g. {'Residential', 'Land'}
  min_price INTEGER,
  max_price INTEGER,
  min_beds INTEGER,
  min_baths INTEGER,
  statuses TEXT[] DEFAULT '{Active}',           -- MLS statuses to monitor

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_farm_areas_agent ON mls_farm_areas(agent_id);
CREATE INDEX idx_farm_areas_active ON mls_farm_areas(is_active) WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Watch Rules — alert triggers attached to a farm area
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mls_watch_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_area_id UUID NOT NULL REFERENCES mls_farm_areas(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Trigger type
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'dom_threshold',          -- Days on Market crosses a threshold
    'price_drop_amount',      -- Single price change >= $X
    'price_drop_pct',         -- Cumulative % drop from OriginalListPrice
    'status_change',          -- Listing status changes (expired, withdrawn, back on market)
    'new_listing'             -- New listing appears in farm area
  )),

  -- Trigger configuration
  threshold_value NUMERIC,              -- DOM days, dollar amount, or percentage
  status_triggers TEXT[] DEFAULT '{}',  -- For status_change: {'Expired','Withdrawn','Canceled','Active'(back on market)}

  -- Notification channels
  notify_push BOOLEAN NOT NULL DEFAULT true,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  notify_sms BOOLEAN NOT NULL DEFAULT false,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_watch_rules_farm ON mls_watch_rules(farm_area_id);
CREATE INDEX idx_watch_rules_agent ON mls_watch_rules(agent_id);
CREATE INDEX idx_watch_rules_active ON mls_watch_rules(is_active) WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Listing Snapshots — daily state of each listing for diff detection
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mls_listing_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_key TEXT NOT NULL,
  listing_id TEXT,

  -- Snapshot data
  standard_status TEXT NOT NULL,
  list_price NUMERIC NOT NULL,
  original_list_price NUMERIC,
  days_on_market INTEGER,
  cumulative_days_on_market INTEGER,
  on_market_date DATE,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  property_type TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  living_area NUMERIC,
  list_agent_name TEXT,
  list_office_name TEXT,
  photo_url TEXT,

  -- Tracking
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one snapshot per listing per day
CREATE UNIQUE INDEX idx_snapshots_listing_date ON mls_listing_snapshots(listing_key, snapshot_date);
CREATE INDEX idx_snapshots_date ON mls_listing_snapshots(snapshot_date);
CREATE INDEX idx_snapshots_postal ON mls_listing_snapshots(postal_code);
CREATE INDEX idx_snapshots_status ON mls_listing_snapshots(standard_status);

-- Auto-clean snapshots older than 90 days (run via pg_cron or manual cleanup)
-- DELETE FROM mls_listing_snapshots WHERE snapshot_date < CURRENT_DATE - INTERVAL '90 days';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Watchdog Alerts — triggered notifications
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mls_watchdog_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  watch_rule_id UUID NOT NULL REFERENCES mls_watch_rules(id) ON DELETE CASCADE,
  farm_area_id UUID NOT NULL REFERENCES mls_farm_areas(id) ON DELETE CASCADE,

  -- Listing info
  listing_key TEXT NOT NULL,
  listing_id TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,

  -- Alert details
  alert_type TEXT NOT NULL,          -- matches trigger_type
  alert_title TEXT NOT NULL,         -- e.g. "Price dropped $25,000 (8.3%)"
  alert_details JSONB NOT NULL DEFAULT '{}',
  -- For price alerts: {previousPrice, currentPrice, originalPrice, dropAmount, dropPct}
  -- For DOM alerts: {daysOnMarket, threshold}
  -- For status alerts: {previousStatus, newStatus}
  -- For new listing: {listPrice, propertyType, beds, baths}

  -- AI enrichment (populated asynchronously)
  ai_suggested_outreach TEXT,
  property_enrichment JSONB,         -- ATTOM/Realie data if available

  -- Notification status
  push_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,

  -- User action
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'acted', 'dismissed')),
  acted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_agent ON mls_watchdog_alerts(agent_id);
CREATE INDEX idx_alerts_agent_status ON mls_watchdog_alerts(agent_id, status);
CREATE INDEX idx_alerts_created ON mls_watchdog_alerts(created_at DESC);
CREATE INDEX idx_alerts_listing ON mls_watchdog_alerts(listing_key);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Push Notification Subscriptions — Web Push API
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_push_sub_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_push_sub_agent ON push_subscriptions(agent_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Row Level Security
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE mls_farm_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mls_watch_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mls_watchdog_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
-- mls_listing_snapshots: no RLS (shared data, written by cron with service role)

CREATE POLICY "agents_own_farm_areas" ON mls_farm_areas
  FOR ALL USING (
    agent_id = auth.uid()
    OR team_id IN (
      SELECT team_id FROM team_members WHERE agent_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "agents_own_watch_rules" ON mls_watch_rules
  FOR ALL USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "agents_own_alerts" ON mls_watchdog_alerts
  FOR ALL USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "agents_own_push_subs" ON push_subscriptions
  FOR ALL USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. Updated_at triggers
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_mls_watchdog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER farm_areas_updated_at
  BEFORE UPDATE ON mls_farm_areas
  FOR EACH ROW EXECUTE FUNCTION update_mls_watchdog_updated_at();

CREATE TRIGGER watch_rules_updated_at
  BEFORE UPDATE ON mls_watch_rules
  FOR EACH ROW EXECUTE FUNCTION update_mls_watchdog_updated_at();
