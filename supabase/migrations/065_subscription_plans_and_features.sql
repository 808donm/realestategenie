-- Migration: Subscription Plans, Features, and Usage Tracking
-- Creates comprehensive subscription management system with feature gating and usage monitoring

-- ============================================================================
-- SUBSCRIPTION PLANS
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plan details
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Pricing
  monthly_price NUMERIC(10,2) NOT NULL,
  annual_price NUMERIC(10,2),

  -- Limits
  max_agents INTEGER NOT NULL,
  max_properties INTEGER NOT NULL,
  max_tenants INTEGER NOT NULL,

  -- Plan hierarchy (for upgrade suggestions)
  tier_level INTEGER NOT NULL,

  -- Settings
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier ON subscription_plans(tier_level);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

COMMENT ON TABLE subscription_plans IS 'Available subscription plans with usage limits';

-- ============================================================================
-- FEATURES
-- ============================================================================
CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Feature details
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT, -- e.g., 'property_management', 'open_houses', 'billing', 'integrations'

  -- Settings
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_features_slug ON features(slug);
CREATE INDEX IF NOT EXISTS idx_features_category ON features(category);
CREATE INDEX IF NOT EXISTS idx_features_active ON features(is_active);

COMMENT ON TABLE features IS 'Application features that can be enabled/disabled per plan';

-- ============================================================================
-- PLAN FEATURES (Junction Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,

  -- Feature status for this plan
  is_enabled BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(plan_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature ON plan_features(feature_id);

COMMENT ON TABLE plan_features IS 'Maps features to subscription plans';

-- ============================================================================
-- UPDATE AGENT SUBSCRIPTIONS TABLE
-- ============================================================================
-- Add subscription plan reference to existing agent_subscriptions table
ALTER TABLE agent_subscriptions ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES subscription_plans(id);

CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_plan ON agent_subscriptions(subscription_plan_id);

-- ============================================================================
-- USAGE TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Current usage counts
  current_agents INTEGER DEFAULT 1,
  current_properties INTEGER DEFAULT 0,
  current_tenants INTEGER DEFAULT 0,

  -- Last calculated
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(agent_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_usage_agent ON agent_usage(agent_id);

COMMENT ON TABLE agent_usage IS 'Tracks current usage for capacity warnings';

-- ============================================================================
-- USAGE ALERTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('warning_70', 'critical_100', 'admin_notification')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('agents', 'properties', 'tenants')),

  -- Usage at time of alert
  usage_count INTEGER NOT NULL,
  limit_count INTEGER NOT NULL,
  usage_percentage NUMERIC(5,2) NOT NULL,

  -- Alert status
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,

  -- Notification tracking
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_alerts_agent ON usage_alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_type ON usage_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_resolved ON usage_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_created ON usage_alerts(created_at);

COMMENT ON TABLE usage_alerts IS 'Tracks usage alerts and notifications sent to users';

-- ============================================================================
-- ADMIN NOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Note details
  note_type TEXT CHECK (note_type IN ('general', 'billing', 'support', 'sales_opportunity')),
  content TEXT NOT NULL,

  -- Priority
  is_urgent BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notes_agent ON admin_notes(agent_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_admin ON admin_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_type ON admin_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_admin_notes_urgent ON admin_notes(is_urgent);

COMMENT ON TABLE admin_notes IS 'Admin notes about agent accounts for internal tracking';

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS features_updated_at ON features;
CREATE TRIGGER features_updated_at
  BEFORE UPDATE ON features
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS agent_usage_updated_at ON agent_usage;
CREATE TRIGGER agent_usage_updated_at
  BEFORE UPDATE ON agent_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS usage_alerts_updated_at ON usage_alerts;
CREATE TRIGGER usage_alerts_updated_at
  BEFORE UPDATE ON usage_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS admin_notes_updated_at ON admin_notes;
CREATE TRIGGER admin_notes_updated_at
  BEFORE UPDATE ON admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Subscription plans: Readable by all authenticated users
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_plans_view_all ON subscription_plans;
CREATE POLICY subscription_plans_view_all
  ON subscription_plans
  FOR SELECT
  USING (is_active = true);

-- Features: Readable by all authenticated users
ALTER TABLE features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS features_view_all ON features;
CREATE POLICY features_view_all
  ON features
  FOR SELECT
  USING (is_active = true);

-- Plan features: Readable by all authenticated users
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_features_view_all ON plan_features;
CREATE POLICY plan_features_view_all
  ON plan_features
  FOR SELECT
  USING (true);

-- Agent usage: Users can see their own usage
ALTER TABLE agent_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_usage_view_own ON agent_usage;
CREATE POLICY agent_usage_view_own
  ON agent_usage
  FOR SELECT
  USING (agent_id = auth.uid());

-- Usage alerts: Users can see their own alerts
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_alerts_view_own ON usage_alerts;
CREATE POLICY usage_alerts_view_own
  ON usage_alerts
  FOR SELECT
  USING (agent_id = auth.uid());

-- Admin notes: Only admins can see notes
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_notes_view_admin ON admin_notes;
CREATE POLICY admin_notes_view_admin
  ON admin_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- SEED DATA: Insert default subscription plans
-- ============================================================================
INSERT INTO subscription_plans (name, slug, description, monthly_price, annual_price, max_agents, max_properties, max_tenants, tier_level, is_custom)
VALUES
  (
    'Solo Agent Pro',
    'solo-agent-pro',
    'Perfect for independent agents managing a small portfolio',
    49.00,
    490.00,
    1,
    5,
    50,
    1,
    false
  ),
  (
    'Team Growth',
    'team-growth',
    'Great for growing teams with multiple agents',
    149.00,
    1490.00,
    5,
    25,
    250,
    2,
    false
  ),
  (
    'Brokerage Growth',
    'brokerage-growth',
    'For established brokerages managing significant portfolios',
    349.00,
    3490.00,
    10,
    100,
    1000,
    3,
    false
  ),
  (
    'Brokerage Scale',
    'brokerage-scale',
    'Scale your operations with enterprise-grade features',
    799.00,
    7990.00,
    25,
    300,
    3000,
    4,
    false
  ),
  (
    'Enterprise',
    'enterprise',
    'Custom solutions for large organizations',
    0.00,
    0.00,
    999999,
    999999,
    999999,
    5,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  max_agents = EXCLUDED.max_agents,
  max_properties = EXCLUDED.max_properties,
  max_tenants = EXCLUDED.max_tenants,
  tier_level = EXCLUDED.tier_level;

-- ============================================================================
-- SEED DATA: Insert default features
-- ============================================================================
INSERT INTO features (name, slug, description, category)
VALUES
  ('Property Management', 'property-management', 'Manage properties and units', 'core'),
  ('Lease Management', 'lease-management', 'Create and manage leases', 'core'),
  ('Tenant Portal', 'tenant-portal', 'Self-service tenant portal', 'core'),
  ('Invoice Management', 'invoice-management', 'Generate and track invoices', 'core'),
  ('Payment Processing', 'payment-processing', 'Accept online payments', 'payments'),
  ('Open Houses', 'open-houses', 'Schedule and manage open houses', 'marketing'),
  ('Lead Management', 'lead-management', 'Track and nurture leads', 'marketing'),
  ('Neighborhood Profiles', 'neighborhood-profiles', 'Create neighborhood marketing pages', 'marketing'),
  ('Document Management', 'document-management', 'Store and manage documents', 'core'),
  ('QuickBooks Integration', 'quickbooks-integration', 'Sync with QuickBooks Online', 'integrations'),
  ('PayPal Integration', 'paypal-integration', 'Accept payments via PayPal', 'integrations'),
  ('Stripe Integration', 'stripe-integration', 'Accept payments via Stripe', 'integrations'),
  ('Team Management', 'team-management', 'Manage agent teams', 'team'),
  ('Broker Dashboard', 'broker-dashboard', 'Comprehensive broker analytics', 'analytics'),
  ('Team Lead Dashboard', 'team-lead-dashboard', 'Team performance tracking', 'analytics'),
  ('Advanced Analytics', 'advanced-analytics', 'In-depth business intelligence', 'analytics'),
  ('Custom Branding', 'custom-branding', 'White-label your portal', 'enterprise'),
  ('API Access', 'api-access', 'Programmatic access to your data', 'enterprise'),
  ('Priority Support', 'priority-support', '24/7 priority customer support', 'support'),
  ('Dedicated Account Manager', 'dedicated-account-manager', 'Personal account manager', 'support')
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- ============================================================================
-- SEED DATA: Map features to plans
-- ============================================================================
-- Get plan and feature IDs for mapping
DO $$
DECLARE
  solo_id UUID;
  team_id UUID;
  broker_growth_id UUID;
  broker_scale_id UUID;
  enterprise_id UUID;
BEGIN
  -- Get plan IDs
  SELECT id INTO solo_id FROM subscription_plans WHERE slug = 'solo-agent-pro';
  SELECT id INTO team_id FROM subscription_plans WHERE slug = 'team-growth';
  SELECT id INTO broker_growth_id FROM subscription_plans WHERE slug = 'brokerage-growth';
  SELECT id INTO broker_scale_id FROM subscription_plans WHERE slug = 'brokerage-scale';
  SELECT id INTO enterprise_id FROM subscription_plans WHERE slug = 'enterprise';

  -- Solo Agent Pro: Basic features
  INSERT INTO plan_features (plan_id, feature_id, is_enabled)
  SELECT solo_id, id, true FROM features
  WHERE slug IN (
    'property-management', 'lease-management', 'tenant-portal',
    'invoice-management', 'payment-processing', 'open-houses',
    'lead-management', 'document-management'
  )
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- Team Growth: Solo + team features
  INSERT INTO plan_features (plan_id, feature_id, is_enabled)
  SELECT team_id, id, true FROM features
  WHERE slug IN (
    'property-management', 'lease-management', 'tenant-portal',
    'invoice-management', 'payment-processing', 'open-houses',
    'lead-management', 'neighborhood-profiles', 'document-management',
    'quickbooks-integration', 'paypal-integration', 'stripe-integration',
    'team-management', 'team-lead-dashboard'
  )
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- Brokerage Growth: Team + broker features
  INSERT INTO plan_features (plan_id, feature_id, is_enabled)
  SELECT broker_growth_id, id, true FROM features
  WHERE slug IN (
    'property-management', 'lease-management', 'tenant-portal',
    'invoice-management', 'payment-processing', 'open-houses',
    'lead-management', 'neighborhood-profiles', 'document-management',
    'quickbooks-integration', 'paypal-integration', 'stripe-integration',
    'team-management', 'broker-dashboard', 'team-lead-dashboard',
    'advanced-analytics'
  )
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- Brokerage Scale: Brokerage Growth + priority support
  INSERT INTO plan_features (plan_id, feature_id, is_enabled)
  SELECT broker_scale_id, id, true FROM features
  WHERE slug IN (
    'property-management', 'lease-management', 'tenant-portal',
    'invoice-management', 'payment-processing', 'open-houses',
    'lead-management', 'neighborhood-profiles', 'document-management',
    'quickbooks-integration', 'paypal-integration', 'stripe-integration',
    'team-management', 'broker-dashboard', 'team-lead-dashboard',
    'advanced-analytics', 'priority-support'
  )
  ON CONFLICT (plan_id, feature_id) DO NOTHING;

  -- Enterprise: All features
  INSERT INTO plan_features (plan_id, feature_id, is_enabled)
  SELECT enterprise_id, id, true FROM features
  ON CONFLICT (plan_id, feature_id) DO NOTHING;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate current agent usage
CREATE OR REPLACE FUNCTION calculate_agent_usage(agent_uuid UUID)
RETURNS TABLE(
  agents_count INTEGER,
  properties_count INTEGER,
  tenants_count INTEGER
) AS $$
DECLARE
  user_role TEXT;
  agents_ct INTEGER;
  properties_ct INTEGER;
  tenants_ct INTEGER;
BEGIN
  -- Get user's role
  SELECT role INTO user_role FROM agents WHERE id = agent_uuid;

  -- Calculate based on role
  IF user_role = 'admin' OR user_role = 'broker' THEN
    -- Broker sees all their agents
    SELECT COUNT(DISTINCT a.id) INTO agents_ct
    FROM agents a
    LEFT JOIN team_members tm ON tm.agent_id = a.id
    LEFT JOIN teams t ON t.id = tm.team_id
    WHERE (t.broker_id = agent_uuid OR a.id = agent_uuid)
      AND a.is_active = true;

    -- Count properties for all broker's agents
    SELECT COUNT(DISTINCT p.id) INTO properties_ct
    FROM pm_properties p
    WHERE p.agent_id IN (
      SELECT a.id FROM agents a
      LEFT JOIN team_members tm ON tm.agent_id = a.id
      LEFT JOIN teams t ON t.id = tm.team_id
      WHERE t.broker_id = agent_uuid OR a.id = agent_uuid
    );

    -- Count tenants for all broker's properties
    SELECT COUNT(DISTINCT l.tenant_id) INTO tenants_ct
    FROM pm_leases l
    WHERE l.property_id IN (
      SELECT p.id FROM pm_properties p
      WHERE p.agent_id IN (
        SELECT a.id FROM agents a
        LEFT JOIN team_members tm ON tm.agent_id = a.id
        LEFT JOIN teams t ON t.id = tm.team_id
        WHERE t.broker_id = agent_uuid OR a.id = agent_uuid
      )
    )
    AND l.status = 'active';

  ELSIF user_role = 'team_lead' THEN
    -- Team lead sees their team
    SELECT COUNT(DISTINCT a.id) INTO agents_ct
    FROM agents a
    INNER JOIN team_members tm ON tm.agent_id = a.id
    INNER JOIN teams t ON t.id = tm.team_id
    WHERE t.team_lead_id = agent_uuid
      AND a.is_active = true;

    -- Count properties for team
    SELECT COUNT(DISTINCT p.id) INTO properties_ct
    FROM pm_properties p
    WHERE p.agent_id IN (
      SELECT tm.agent_id FROM team_members tm
      INNER JOIN teams t ON t.id = tm.team_id
      WHERE t.team_lead_id = agent_uuid
    );

    -- Count tenants for team properties
    SELECT COUNT(DISTINCT l.tenant_id) INTO tenants_ct
    FROM pm_leases l
    WHERE l.property_id IN (
      SELECT p.id FROM pm_properties p
      WHERE p.agent_id IN (
        SELECT tm.agent_id FROM team_members tm
        INNER JOIN teams t ON t.id = tm.team_id
        WHERE t.team_lead_id = agent_uuid
      )
    )
    AND l.status = 'active';

  ELSE
    -- Regular agent sees only their own
    agents_ct := 1;

    SELECT COUNT(*) INTO properties_ct
    FROM pm_properties
    WHERE agent_id = agent_uuid;

    SELECT COUNT(DISTINCT l.tenant_id) INTO tenants_ct
    FROM pm_leases l
    INNER JOIN pm_properties p ON p.id = l.property_id
    WHERE p.agent_id = agent_uuid
      AND l.status = 'active';
  END IF;

  RETURN QUERY SELECT agents_ct, properties_ct, tenants_ct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to a feature
CREATE OR REPLACE FUNCTION has_feature_access(agent_uuid UUID, feature_slug TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM agent_subscriptions asub
    INNER JOIN plan_features pf ON pf.plan_id = asub.subscription_plan_id
    INNER JOIN features f ON f.id = pf.feature_id
    WHERE asub.agent_id = agent_uuid
      AND asub.status = 'active'
      AND f.slug = feature_slug
      AND pf.is_enabled = true
  ) INTO has_access;

  RETURN COALESCE(has_access, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
