-- Migration: Account Usage Tracking
-- Track usage metrics at the account level instead of individual agent level

-- ============================================================================
-- CREATE ACCOUNT USAGE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS account_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- Role-based member counts
  current_agents INTEGER DEFAULT 0,
  current_assistants INTEGER DEFAULT 0,
  current_administrators INTEGER DEFAULT 0,
  current_owners INTEGER DEFAULT 1, -- Always at least 1
  -- Resource counts
  current_offices INTEGER DEFAULT 0,
  current_properties INTEGER DEFAULT 0,
  current_tenants INTEGER DEFAULT 0,
  -- Calculation metadata
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id)
);

CREATE INDEX IF NOT EXISTS idx_account_usage_account_id ON account_usage(account_id);

-- Enable RLS
ALTER TABLE account_usage ENABLE ROW LEVEL SECURITY;

-- Account members can view their account's usage
DROP POLICY IF EXISTS "Account members can view usage" ON account_usage;
CREATE POLICY "Account members can view usage"
  ON account_usage FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE agent_id = auth.uid()
        AND is_active = true
    )
  );

-- ============================================================================
-- USAGE CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_account_usage(account_uuid UUID)
RETURNS TABLE(
  agents_count INTEGER,
  assistants_count INTEGER,
  administrators_count INTEGER,
  owners_count INTEGER,
  offices_count INTEGER,
  properties_count INTEGER,
  tenants_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Count active members by role
    COUNT(*) FILTER (WHERE am.account_role = 'agent' AND am.is_active = true)::INTEGER AS agents_count,
    COUNT(*) FILTER (WHERE am.account_role = 'assistant' AND am.is_active = true)::INTEGER AS assistants_count,
    COUNT(*) FILTER (WHERE am.account_role = 'admin' AND am.is_active = true)::INTEGER AS administrators_count,
    COUNT(*) FILTER (WHERE am.account_role = 'owner' AND am.is_active = true)::INTEGER AS owners_count,
    -- Count active offices
    (
      SELECT COUNT(*)::INTEGER
      FROM offices
      WHERE account_id = account_uuid
        AND is_active = true
    ) AS offices_count,
    -- Count properties across all account agents
    (
      SELECT COUNT(*)::INTEGER
      FROM pm_properties p
      INNER JOIN account_members am2 ON am2.agent_id = p.agent_id
      WHERE am2.account_id = account_uuid
        AND am2.is_active = true
    ) AS properties_count,
    -- Count unique active tenants across all account properties
    (
      SELECT COUNT(DISTINCT l.tenant_contact_id)::INTEGER
      FROM pm_leases l
      INNER JOIN pm_properties p ON p.id = l.pm_property_id
      INNER JOIN account_members am2 ON am2.agent_id = p.agent_id
      WHERE am2.account_id = account_uuid
        AND am2.is_active = true
        AND l.status = 'active'
    ) AS tenants_count
  FROM account_members am
  WHERE am.account_id = account_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_account_usage IS 'Calculates current usage counts for an account across all resources';

-- ============================================================================
-- USAGE UPDATE/UPSERT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_account_usage(account_uuid UUID)
RETURNS account_usage AS $$
DECLARE
  usage_data RECORD;
  result account_usage;
BEGIN
  -- Calculate usage
  SELECT * INTO usage_data
  FROM calculate_account_usage(account_uuid);

  -- Upsert into account_usage table
  INSERT INTO account_usage (
    account_id,
    current_agents,
    current_assistants,
    current_administrators,
    current_owners,
    current_offices,
    current_properties,
    current_tenants,
    last_calculated_at
  ) VALUES (
    account_uuid,
    usage_data.agents_count,
    usage_data.assistants_count,
    usage_data.administrators_count,
    usage_data.owners_count,
    usage_data.offices_count,
    usage_data.properties_count,
    usage_data.tenants_count,
    NOW()
  )
  ON CONFLICT (account_id) DO UPDATE SET
    current_agents = EXCLUDED.current_agents,
    current_assistants = EXCLUDED.current_assistants,
    current_administrators = EXCLUDED.current_administrators,
    current_owners = EXCLUDED.current_owners,
    current_offices = EXCLUDED.current_offices,
    current_properties = EXCLUDED.current_properties,
    current_tenants = EXCLUDED.current_tenants,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_account_usage IS 'Updates or creates account usage record with current counts';

-- ============================================================================
-- COMPREHENSIVE USAGE STATUS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW account_usage_status AS
SELECT
  a.id AS account_id,
  a.name AS account_name,
  a.owner_id,
  sp.name AS plan_name,
  sp.slug AS plan_slug,
  sp.tier_level,
  -- Current usage
  au.current_agents,
  au.current_assistants,
  au.current_administrators,
  au.current_owners,
  au.current_offices,
  au.current_properties,
  au.current_tenants,
  -- Plan limits
  sp.max_agents AS agents_limit,
  sp.max_assistants AS assistants_limit,
  sp.max_administrators AS administrators_limit,
  sp.max_offices AS offices_limit,
  sp.max_properties AS properties_limit,
  sp.max_tenants AS tenants_limit,
  -- Usage percentages
  CASE WHEN sp.max_agents > 0 THEN (au.current_agents::FLOAT / sp.max_agents * 100)::INTEGER ELSE 0 END AS agents_usage_pct,
  CASE WHEN sp.max_assistants > 0 THEN (au.current_assistants::FLOAT / sp.max_assistants * 100)::INTEGER ELSE 0 END AS assistants_usage_pct,
  CASE WHEN sp.max_administrators > 0 THEN (au.current_administrators::FLOAT / sp.max_administrators * 100)::INTEGER ELSE 0 END AS administrators_usage_pct,
  CASE WHEN sp.max_offices > 0 THEN (au.current_offices::FLOAT / sp.max_offices * 100)::INTEGER ELSE 0 END AS offices_usage_pct,
  CASE WHEN sp.max_properties > 0 THEN (au.current_properties::FLOAT / sp.max_properties * 100)::INTEGER ELSE 0 END AS properties_usage_pct,
  CASE WHEN sp.max_tenants > 0 THEN (au.current_tenants::FLOAT / sp.max_tenants * 100)::INTEGER ELSE 0 END AS tenants_usage_pct,
  -- Available seats
  GREATEST(0, sp.max_agents - au.current_agents) AS agents_available,
  GREATEST(0, sp.max_assistants - au.current_assistants) AS assistants_available,
  GREATEST(0, sp.max_administrators - au.current_administrators) AS administrators_available,
  GREATEST(0, sp.max_offices - au.current_offices) AS offices_available,
  GREATEST(0, sp.max_properties - au.current_properties) AS properties_available,
  GREATEST(0, sp.max_tenants - au.current_tenants) AS tenants_available,
  -- Warning flags (at 70% or more)
  (au.current_agents::FLOAT / NULLIF(sp.max_agents, 0) >= 0.7) AS agents_warning,
  (au.current_assistants::FLOAT / NULLIF(sp.max_assistants, 0) >= 0.7) AS assistants_warning,
  (au.current_administrators::FLOAT / NULLIF(sp.max_administrators, 0) >= 0.7) AS administrators_warning,
  (au.current_offices::FLOAT / NULLIF(sp.max_offices, 0) >= 0.7) AS offices_warning,
  (au.current_properties::FLOAT / NULLIF(sp.max_properties, 0) >= 0.7) AS properties_warning,
  (au.current_tenants::FLOAT / NULLIF(sp.max_tenants, 0) >= 0.7) AS tenants_warning,
  -- Critical flags (at 100% or more)
  (au.current_agents >= sp.max_agents) AS agents_critical,
  (au.current_assistants >= sp.max_assistants) AS assistants_critical,
  (au.current_administrators >= sp.max_administrators) AS administrators_critical,
  (au.current_offices >= sp.max_offices) AS offices_critical,
  (au.current_properties >= sp.max_properties) AS properties_critical,
  (au.current_tenants >= sp.max_tenants) AS tenants_critical,
  -- Metadata
  au.last_calculated_at,
  au.updated_at
FROM accounts a
LEFT JOIN account_usage au ON au.account_id = a.id
LEFT JOIN subscription_plans sp ON sp.id = a.subscription_plan_id
WHERE a.is_active = true;

COMMENT ON VIEW account_usage_status IS 'Comprehensive view of account usage with limits, percentages, and warning flags';

-- ============================================================================
-- TRIGGERS TO AUTOMATICALLY UPDATE USAGE
-- ============================================================================

-- Trigger function to update usage when members change
CREATE OR REPLACE FUNCTION trigger_update_account_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update usage for the affected account
  PERFORM update_account_usage(
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.account_id
      ELSE NEW.account_id
    END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on account_members
DROP TRIGGER IF EXISTS account_members_update_usage ON account_members;
CREATE TRIGGER account_members_update_usage
  AFTER INSERT OR UPDATE OR DELETE ON account_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_account_usage();

-- Trigger on offices
DROP TRIGGER IF EXISTS offices_update_usage ON offices;
CREATE TRIGGER offices_update_usage
  AFTER INSERT OR UPDATE OR DELETE ON offices
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_account_usage();

COMMENT ON FUNCTION trigger_update_account_usage IS 'Automatically updates account usage when members or offices change';

-- ============================================================================
-- INITIAL USAGE CALCULATION
-- ============================================================================

-- Create usage records for any existing accounts
-- (Will be populated during migration 071 when accounts are created)

COMMENT ON TABLE account_usage IS 'Tracks current resource usage for each account with automatic updates via triggers';
