-- =============================================================================
-- Migration: Updated Subscription Plans + PM Add-on Plans
--
-- 1. Updates base plan pricing and Stripe product IDs
-- 2. Separates PM limits from base plans (base = 10 properties, 50 tenants)
-- 3. Creates pm_addon_plans table for PM tier upgrades
-- 4. Creates pm_addon_subscriptions to track active PM add-ons
-- 5. Creates gating function for property/tenant limits
-- =============================================================================

-- =============================================================================
-- PART 1: ADD stripe_product_id COLUMNS TO subscription_plans
-- =============================================================================

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_monthly_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_yearly_product_id TEXT,
  ADD COLUMN IF NOT EXISTS max_staff INTEGER DEFAULT 0;

COMMENT ON COLUMN subscription_plans.stripe_monthly_product_id IS 'Stripe Product ID for monthly subscription';
COMMENT ON COLUMN subscription_plans.stripe_yearly_product_id IS 'Stripe Product ID for yearly subscription';
COMMENT ON COLUMN subscription_plans.max_staff IS 'Maximum number of staff members (non-agent roles)';

-- =============================================================================
-- PART 2: UPDATE BASE PLAN PRICING AND LIMITS
-- All base plans now include 10 properties / 50 tenants as PM baseline
-- =============================================================================

-- Solo Agent Pro: $297/mo, $2,997/yr, 1 agent, 2 staff
UPDATE subscription_plans SET
  monthly_price = 297.00,
  annual_price = 2997.00,
  max_agents = 1,
  max_staff = 2,
  max_properties = 10,
  max_tenants = 50,
  stripe_monthly_product_id = 'prod_TlNWZnu0WPmV3p',
  stripe_yearly_product_id = 'prod_TlNcMbI5fKW8Vb',
  description = 'Perfect for independent agents. Includes 1 agent seat, up to 2 staff, and PM basics (10 properties, 50 tenants).'
WHERE slug = 'solo-agent-pro';

-- Team Growth: $1,397/mo, $13,997/yr, 12 agents, 5 staff
UPDATE subscription_plans SET
  monthly_price = 1397.00,
  annual_price = 13997.00,
  max_agents = 12,
  max_staff = 5,
  max_properties = 10,
  max_tenants = 50,
  stripe_monthly_product_id = 'prod_TlNeHguSTwN31E',
  stripe_yearly_product_id = 'prod_TlNg8yJd89uNeL',
  description = 'For growing teams. Includes up to 12 agents, 5 staff, and PM basics (10 properties, 50 tenants).'
WHERE slug = 'team-growth';

-- Brokerage Growth: $2,597/mo, $25,997/yr, 35 agents, 15 staff
UPDATE subscription_plans SET
  monthly_price = 2597.00,
  annual_price = 25997.00,
  max_agents = 35,
  max_staff = 15,
  max_properties = 10,
  max_tenants = 50,
  stripe_monthly_product_id = 'prod_TlNhTSF4CMVzav',
  stripe_yearly_product_id = 'prod_TlNiGMsZlBduAQ',
  description = 'For established brokerages. Includes up to 35 agents, 15 staff, and PM basics (10 properties, 50 tenants).'
WHERE slug = 'brokerage-growth';

-- Brokerage Scale: $3,997/mo, $39,997/yr, 120 agents, 25 staff
UPDATE subscription_plans SET
  monthly_price = 3997.00,
  annual_price = 39997.00,
  max_agents = 120,
  max_staff = 25,
  max_properties = 10,
  max_tenants = 50,
  stripe_monthly_product_id = 'prod_Tp32mc1obMTuHo',
  stripe_yearly_product_id = 'prod_Tp34GgU71KgZcx',
  description = 'Scale your operations. Includes up to 120 agents, 25 staff, and PM basics (10 properties, 50 tenants).'
WHERE slug = 'brokerage-scale';

-- Enterprise: custom pricing
UPDATE subscription_plans SET
  max_properties = 999999,
  max_tenants = 999999,
  max_staff = 999999,
  description = 'Custom solutions for large organizations with unlimited capacity.'
WHERE slug = 'enterprise';


-- =============================================================================
-- PART 3: PM ADD-ON PLANS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS pm_addon_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plan details
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Pricing (monthly only for add-ons)
  monthly_price NUMERIC(10,2) NOT NULL,

  -- PM-specific limits (these REPLACE the base plan limits, not add to them)
  max_properties INTEGER NOT NULL,
  max_tenants INTEGER NOT NULL,

  -- Stripe
  stripe_product_id TEXT,
  stripe_price_id TEXT,

  -- Plan hierarchy
  tier_level INTEGER NOT NULL,

  -- Settings
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_addon_plans_slug ON pm_addon_plans(slug);
CREATE INDEX IF NOT EXISTS idx_pm_addon_plans_active ON pm_addon_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_pm_addon_plans_tier ON pm_addon_plans(tier_level);

COMMENT ON TABLE pm_addon_plans IS 'Property Management add-on subscription plans that extend PM limits beyond the base 10/50';

ALTER TABLE pm_addon_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pm_addon_plans_view_all ON pm_addon_plans;
CREATE POLICY pm_addon_plans_view_all
  ON pm_addon_plans FOR SELECT
  USING (is_active = true);


-- =============================================================================
-- PART 4: SEED PM ADD-ON PLANS
-- =============================================================================

INSERT INTO pm_addon_plans (name, slug, description, monthly_price, max_properties, max_tenants, stripe_product_id, stripe_price_id, tier_level)
VALUES
  (
    'PM Solo',
    'pm-solo',
    'Manage up to 25 properties and 125 tenants',
    147.00,
    25,
    125,
    'prod_Ty5wtSQl4DquSi',
    'price_1T09kdDx8srgWVliZTXKfkTU',
    1
  ),
  (
    'PM Team',
    'pm-team',
    'Manage up to 50 properties and 250 tenants',
    297.00,
    50,
    250,
    'prod_Ty5xxphzzdGzIs',
    'price_1T09lVDx8srgWVlifMGPrMuD',
    2
  ),
  (
    'PM Growth',
    'pm-growth',
    'Manage up to 100 properties and 500 tenants',
    497.00,
    100,
    500,
    'prod_Ty5zpkPbBRH7Lz',
    'price_1T09n7Dx8srgWVliIApVsWZ4',
    3
  ),
  (
    'PM Scale',
    'pm-scale',
    'Manage up to 150 properties and 750 tenants',
    697.00,
    150,
    750,
    'prod_Ty5z73klz9t5vG',
    'price_1T09nyDx8srgWVlifo1C7znG',
    4
  )
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  max_properties = EXCLUDED.max_properties,
  max_tenants = EXCLUDED.max_tenants,
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_id = EXCLUDED.stripe_price_id,
  tier_level = EXCLUDED.tier_level;


-- =============================================================================
-- PART 5: PM ADD-ON SUBSCRIPTIONS TABLE
-- Tracks which accounts have purchased a PM add-on
-- =============================================================================

CREATE TABLE IF NOT EXISTS pm_addon_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Account or agent that owns this add-on
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- The PM add-on plan
  pm_addon_plan_id UUID NOT NULL REFERENCES pm_addon_plans(id),

  -- Stripe
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled', 'past_due', 'suspended')),

  -- Billing
  current_period_start DATE,
  current_period_end DATE,
  next_billing_date DATE,
  canceled_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active PM add-on per agent
  UNIQUE(agent_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_addon_subs_agent ON pm_addon_subscriptions(agent_id);
CREATE INDEX IF NOT EXISTS idx_pm_addon_subs_account ON pm_addon_subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_pm_addon_subs_plan ON pm_addon_subscriptions(pm_addon_plan_id);
CREATE INDEX IF NOT EXISTS idx_pm_addon_subs_status ON pm_addon_subscriptions(status);

COMMENT ON TABLE pm_addon_subscriptions IS 'Tracks active PM add-on subscriptions per agent/account';

ALTER TABLE pm_addon_subscriptions ENABLE ROW LEVEL SECURITY;

-- Agents can see their own PM add-on subscription
DROP POLICY IF EXISTS pm_addon_subs_view_own ON pm_addon_subscriptions;
CREATE POLICY pm_addon_subs_view_own
  ON pm_addon_subscriptions FOR SELECT
  USING (agent_id = auth.uid());

-- Trigger for updated_at
DROP TRIGGER IF EXISTS pm_addon_subs_updated_at ON pm_addon_subscriptions;
CREATE TRIGGER pm_addon_subs_updated_at
  BEFORE UPDATE ON pm_addon_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- PART 6: PM LIMIT GATING FUNCTION
-- Returns effective property/tenant limits by combining base plan + PM add-on
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_pm_limits(p_agent_id UUID)
RETURNS TABLE(
  max_properties INTEGER,
  max_tenants INTEGER,
  current_properties INTEGER,
  current_tenants INTEGER,
  has_pm_addon BOOLEAN,
  pm_addon_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_base_max_properties INTEGER;
  v_base_max_tenants INTEGER;
  v_addon_max_properties INTEGER;
  v_addon_max_tenants INTEGER;
  v_current_properties INTEGER;
  v_current_tenants INTEGER;
  v_has_addon BOOLEAN;
  v_addon_name TEXT;
BEGIN
  -- Get base plan limits
  SELECT sp.max_properties, sp.max_tenants
  INTO v_base_max_properties, v_base_max_tenants
  FROM public.agent_subscriptions asub
  INNER JOIN public.subscription_plans sp ON sp.id = asub.subscription_plan_id
  WHERE asub.agent_id = p_agent_id
    AND asub.status = 'active';

  -- Default to base PM limits if no subscription found
  IF v_base_max_properties IS NULL THEN
    v_base_max_properties := 10;
    v_base_max_tenants := 50;
  END IF;

  -- Check for PM add-on
  SELECT pap.max_properties, pap.max_tenants, pap.name
  INTO v_addon_max_properties, v_addon_max_tenants, v_addon_name
  FROM public.pm_addon_subscriptions pas
  INNER JOIN public.pm_addon_plans pap ON pap.id = pas.pm_addon_plan_id
  WHERE pas.agent_id = p_agent_id
    AND pas.status = 'active';

  v_has_addon := v_addon_max_properties IS NOT NULL;

  -- Count current usage
  SELECT COUNT(*) INTO v_current_properties
  FROM public.pm_properties
  WHERE agent_id = p_agent_id;

  SELECT COUNT(DISTINCT l.tenant_contact_id) INTO v_current_tenants
  FROM public.pm_leases l
  INNER JOIN public.pm_properties p ON p.id = l.pm_property_id
  WHERE p.agent_id = p_agent_id
    AND l.status = 'active';

  -- If tenant_contact_id doesn't exist, fall back to tenant_id
  IF v_current_tenants IS NULL THEN
    SELECT COUNT(DISTINCT l.tenant_id) INTO v_current_tenants
    FROM public.pm_leases l
    INNER JOIN public.pm_properties p ON p.id = l.property_id
    WHERE p.agent_id = p_agent_id
      AND l.status = 'active';
  END IF;

  v_current_tenants := COALESCE(v_current_tenants, 0);

  -- Effective limits: PM add-on REPLACES base limits (not additive)
  RETURN QUERY SELECT
    COALESCE(v_addon_max_properties, v_base_max_properties),
    COALESCE(v_addon_max_tenants, v_base_max_tenants),
    v_current_properties,
    v_current_tenants,
    v_has_addon,
    v_addon_name;
END;
$$;

COMMENT ON FUNCTION public.get_pm_limits IS 'Returns effective PM limits combining base plan + PM add-on, plus current usage';


-- =============================================================================
-- PART 7: PROPERTY ADD GATING FUNCTION
-- Returns true if the agent can still add properties
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_add_property(p_agent_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limits RECORD;
BEGIN
  SELECT * INTO v_limits
  FROM public.get_pm_limits(p_agent_id);

  RETURN v_limits.current_properties < v_limits.max_properties;
END;
$$;

COMMENT ON FUNCTION public.can_add_property IS 'Checks if agent can add another property based on PM limits';


-- =============================================================================
-- PART 8: TENANT ADD GATING FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_add_tenant(p_agent_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limits RECORD;
BEGIN
  SELECT * INTO v_limits
  FROM public.get_pm_limits(p_agent_id);

  RETURN v_limits.current_tenants < v_limits.max_tenants;
END;
$$;

COMMENT ON FUNCTION public.can_add_tenant IS 'Checks if agent can add another tenant based on PM limits';


-- =============================================================================
-- PART 9: UPDATE subscription_plan_limits VIEW
-- =============================================================================

DROP VIEW IF EXISTS subscription_plan_limits;

CREATE VIEW subscription_plan_limits AS
SELECT
  id,
  name,
  slug,
  tier_level,
  monthly_price,
  annual_price,
  max_agents AS agents_limit,
  max_staff AS staff_limit,
  max_assistants AS assistants_limit,
  max_administrators AS administrators_limit,
  max_offices AS offices_limit,
  max_properties AS base_properties_limit,
  max_tenants AS base_tenants_limit,
  stripe_monthly_product_id,
  stripe_yearly_product_id,
  (max_agents + COALESCE(max_staff, 0)) AS total_seats
FROM public.subscription_plans
WHERE is_active = true;

-- Restore security_invoker setting from earlier migration
ALTER VIEW subscription_plan_limits SET (security_invoker = true);

COMMENT ON VIEW subscription_plan_limits IS 'Plan limits view including new staff and PM baseline limits';
