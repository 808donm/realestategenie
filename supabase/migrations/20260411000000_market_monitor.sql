-- Market Monitor Agent
-- Automated MLS alert system that monitors on-market listings for
-- an agent's buyer/seller clients. Sends alerts via email, SMS, and CRM.

-- ══════════════════════════════════════════════════════════════════
-- 1. Client Monitor Profiles
-- Agent creates a monitoring profile per client with search criteria
-- and notification preferences.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS market_monitor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Client info
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_crm_contact_id TEXT,

  -- Search criteria (JSONB for flexibility)
  search_criteria JSONB NOT NULL DEFAULT '{}',
  -- Shape: { zip_codes: string[], city: string, beds_min: number, beds_max: number,
  --          baths_min: number, baths_max: number, price_min: number, price_max: number,
  --          property_types: string[] }

  -- Notification channel preferences
  notify_email BOOLEAN NOT NULL DEFAULT true,
  notify_sms BOOLEAN NOT NULL DEFAULT false,
  notify_crm BOOLEAN NOT NULL DEFAULT false,

  -- Alert type toggles
  alert_new_listing BOOLEAN NOT NULL DEFAULT true,
  alert_price_drop BOOLEAN NOT NULL DEFAULT true,
  alert_back_on_market BOOLEAN NOT NULL DEFAULT true,
  alert_expired_withdrawn BOOLEAN NOT NULL DEFAULT false,
  alert_pending BOOLEAN NOT NULL DEFAULT false,

  -- Delta detection: listing keys from last scan
  watched_listing_keys TEXT[] DEFAULT '{}',

  -- State
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_scan_at TIMESTAMPTZ,
  next_scan_at TIMESTAMPTZ DEFAULT now(),
  total_alerts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_monitor_profiles_agent ON market_monitor_profiles(agent_id);
CREATE INDEX IF NOT EXISTS idx_market_monitor_profiles_next_scan ON market_monitor_profiles(next_scan_at) WHERE is_active = true;

ALTER TABLE market_monitor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can manage their own monitor profiles"
  ON market_monitor_profiles FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Service role can manage all monitor profiles"
  ON market_monitor_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════
-- 2. Alerts
-- Individual alerts sent to clients when listings match criteria
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS market_monitor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES market_monitor_profiles(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Listing info
  listing_key TEXT NOT NULL,
  listing_id TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  photo_url TEXT,

  -- Property details
  property_type TEXT,
  beds SMALLINT,
  baths NUMERIC(3,1),
  sqft INTEGER,
  year_built SMALLINT,
  list_price INTEGER,

  -- Alert content
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'new_listing', 'price_drop', 'back_on_market', 'expired_withdrawn', 'pending'
  )),
  alert_title TEXT NOT NULL,
  alert_details JSONB NOT NULL DEFAULT '{}',

  -- AVM comparison
  genie_avm JSONB,

  -- Delivery tracking
  email_sent BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,
  crm_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  sms_sent_at TIMESTAMPTZ,
  crm_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_monitor_alerts_profile ON market_monitor_alerts(profile_id);
CREATE INDEX IF NOT EXISTS idx_market_monitor_alerts_agent ON market_monitor_alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_market_monitor_alerts_created ON market_monitor_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_monitor_alerts_type ON market_monitor_alerts(alert_type);

-- Prevent duplicate alerts for the same listing/type on the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_monitor_alerts_dedup
  ON market_monitor_alerts(profile_id, listing_key, alert_type, (created_at::date));

ALTER TABLE market_monitor_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own monitor alerts"
  ON market_monitor_alerts FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Service role can manage all monitor alerts"
  ON market_monitor_alerts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
