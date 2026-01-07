-- Add RLS policies to allow tenants to view their own leases
-- This completes the tenant portal access

-- Drop existing tenant lease policy if any
DROP POLICY IF EXISTS "Tenants can view their own lease" ON pm_leases;

-- Policy: Tenants can view their own lease
CREATE POLICY "Tenants can view their own lease"
ON pm_leases
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.lease_id = pm_leases.id
      AND tenant_users.id = auth.uid()
  )
);

-- Also ensure tenants can view related property and unit data
DROP POLICY IF EXISTS "Tenants can view their property" ON pm_properties;

CREATE POLICY "Tenants can view their property"
ON pm_properties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pm_leases l
    INNER JOIN tenant_users tu ON tu.lease_id = l.id
    WHERE l.pm_property_id = pm_properties.id
      AND tu.id = auth.uid()
  )
);

-- Units policy
DROP POLICY IF EXISTS "Tenants can view their unit" ON pm_units;

CREATE POLICY "Tenants can view their unit"
ON pm_units
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pm_leases l
    INNER JOIN tenant_users tu ON tu.lease_id = l.id
    WHERE l.pm_unit_id = pm_units.id
      AND tu.id = auth.uid()
  )
);

COMMENT ON POLICY "Tenants can view their own lease" ON pm_leases IS 'Allows tenants to read their lease through tenant_users linkage';
COMMENT ON POLICY "Tenants can view their property" ON pm_properties IS 'Allows tenants to read their property information';
COMMENT ON POLICY "Tenants can view their unit" ON pm_units IS 'Allows tenants to read their unit information';
