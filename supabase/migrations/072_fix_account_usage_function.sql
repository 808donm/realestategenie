-- Migration: Fix calculate_account_usage function column reference
-- Corrects property_id to pm_property_id in the tenant count query

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
      INNER JOIN pm_properties p ON p.id = l.pm_property_id  -- FIXED: was property_id
      INNER JOIN account_members am2 ON am2.agent_id = p.agent_id
      WHERE am2.account_id = account_uuid
        AND am2.is_active = true
        AND l.status = 'active'
    ) AS tenants_count
  FROM account_members am
  WHERE am.account_id = account_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
