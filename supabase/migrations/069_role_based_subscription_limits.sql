-- Migration: Role-Based Subscription Limits
-- Add role-specific seat limits and office limits to subscription plans

-- ============================================================================
-- ADD ROLE-SPECIFIC LIMIT COLUMNS
-- ============================================================================

ALTER TABLE subscription_plans
  ADD COLUMN max_assistants INTEGER DEFAULT 0,
  ADD COLUMN max_administrators INTEGER DEFAULT 0,
  ADD COLUMN max_offices INTEGER DEFAULT 1;

-- Rename max_agents to clarify it's for agent role specifically
-- (keeping the column but updating documentation)
COMMENT ON COLUMN subscription_plans.max_agents IS 'Maximum number of agents (not including assistants or administrators)';
COMMENT ON COLUMN subscription_plans.max_assistants IS 'Maximum number of assistant role members';
COMMENT ON COLUMN subscription_plans.max_administrators IS 'Maximum number of administrator role members';
COMMENT ON COLUMN subscription_plans.max_offices IS 'Maximum number of physical office locations';

-- ============================================================================
-- UPDATE EXISTING PLANS WITH ROLE LIMITS
-- ============================================================================

-- Solo Agent Pro (Tier 1)
-- - 1 agent (the account owner)
-- - 0 assistants
-- - 0 administrators
-- - 1 office (virtual/single location)
UPDATE subscription_plans SET
  max_agents = 1,
  max_assistants = 0,
  max_administrators = 0,
  max_offices = 1
WHERE slug = 'solo-agent-pro';

-- Team Growth (Tier 2)
-- - Up to 5 agents
-- - Up to 2 assistants
-- - 0 administrators
-- - 1 office
UPDATE subscription_plans SET
  max_agents = 5,
  max_assistants = 2,
  max_administrators = 0,
  max_offices = 1
WHERE slug = 'team-growth';

-- Brokerage Growth (Tier 3)
-- - Up to 10 agents in one office
-- - 1 administrator
-- - Up to 5 assistants
-- - 1 office
UPDATE subscription_plans SET
  max_agents = 10,
  max_assistants = 5,
  max_administrators = 1,
  max_offices = 1
WHERE slug = 'brokerage-growth';

-- Brokerage Scale (Tier 4)
-- - Up to 25 agents across 5 offices
-- - Up to 5 administrators
-- - Up to 10 assistants
-- - Up to 5 offices
UPDATE subscription_plans SET
  max_agents = 25,
  max_assistants = 10,
  max_administrators = 5,
  max_offices = 5
WHERE slug = 'brokerage-scale';

-- Enterprise (Tier 5)
-- - Custom/unlimited (using high number)
-- - All limits customizable per contract
UPDATE subscription_plans SET
  max_agents = 999999,
  max_assistants = 999999,
  max_administrators = 999999,
  max_offices = 999999
WHERE slug = 'enterprise';

-- ============================================================================
-- CREATE VIEW FOR PLAN LIMITS
-- ============================================================================

CREATE OR REPLACE VIEW subscription_plan_limits AS
SELECT
  id,
  name,
  slug,
  tier_level,
  max_agents AS agents_limit,
  max_assistants AS assistants_limit,
  max_administrators AS administrators_limit,
  max_offices AS offices_limit,
  max_properties AS properties_limit,
  max_tenants AS tenants_limit,
  -- Total people count
  (max_agents + max_assistants + max_administrators) AS total_seats
FROM subscription_plans
WHERE is_active = true;

COMMENT ON VIEW subscription_plan_limits IS 'Easy-to-read view of all subscription plan limits';

-- ============================================================================
-- VALIDATION FUNCTION
-- ============================================================================

-- Function to check if account can add a member with specific role
CREATE OR REPLACE FUNCTION can_add_account_member(
  p_account_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan_id UUID;
  v_max_agents INT;
  v_max_assistants INT;
  v_max_administrators INT;
  v_current_agents INT;
  v_current_assistants INT;
  v_current_administrators INT;
BEGIN
  -- Get account's plan
  SELECT subscription_plan_id INTO v_plan_id
  FROM accounts
  WHERE id = p_account_id;

  IF v_plan_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get plan limits
  SELECT max_agents, max_assistants, max_administrators
  INTO v_max_agents, v_max_assistants, v_max_administrators
  FROM subscription_plans
  WHERE id = v_plan_id;

  -- Get current counts
  SELECT
    COUNT(*) FILTER (WHERE account_role = 'agent'),
    COUNT(*) FILTER (WHERE account_role = 'assistant'),
    COUNT(*) FILTER (WHERE account_role = 'admin')
  INTO v_current_agents, v_current_assistants, v_current_administrators
  FROM account_members
  WHERE account_id = p_account_id
    AND is_active = true;

  -- Check limits based on role
  CASE p_role
    WHEN 'agent' THEN
      RETURN v_current_agents < v_max_agents;
    WHEN 'assistant' THEN
      RETURN v_current_assistants < v_max_assistants;
    WHEN 'admin' THEN
      RETURN v_current_administrators < v_max_administrators;
    WHEN 'owner' THEN
      -- Only one owner allowed
      RETURN NOT EXISTS (
        SELECT 1 FROM account_members
        WHERE account_id = p_account_id
          AND account_role = 'owner'
          AND is_active = true
      );
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_add_account_member IS 'Validates if an account can add a member with the specified role based on subscription limits';

-- Function to check if account can add an office
CREATE OR REPLACE FUNCTION can_add_office(p_account_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan_id UUID;
  v_max_offices INT;
  v_current_offices INT;
BEGIN
  -- Get account's plan
  SELECT subscription_plan_id INTO v_plan_id
  FROM accounts
  WHERE id = p_account_id;

  IF v_plan_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get plan limit
  SELECT max_offices INTO v_max_offices
  FROM subscription_plans
  WHERE id = v_plan_id;

  -- Get current count
  SELECT COUNT(*) INTO v_current_offices
  FROM offices
  WHERE account_id = p_account_id
    AND is_active = true;

  RETURN v_current_offices < v_max_offices;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_add_office IS 'Validates if an account can add another office based on subscription limits';
