-- Add RLS policies for tenant work orders
-- Allows tenants to create and view their own work orders

-- Drop any existing tenant work order policies
DROP POLICY IF EXISTS "Tenants can view their work orders" ON pm_work_orders;
DROP POLICY IF EXISTS "Tenants can create work orders" ON pm_work_orders;

-- Policy: Tenants can view their own work orders
CREATE POLICY "Tenants can view their work orders"
ON pm_work_orders
FOR SELECT
TO authenticated
USING (
  pm_lease_id IN (
    SELECT lease_id FROM tenant_users WHERE id = auth.uid()
  )
);

-- Policy: Tenants can create work orders for their lease
CREATE POLICY "Tenants can create work orders"
ON pm_work_orders
FOR INSERT
TO authenticated
WITH CHECK (
  pm_lease_id IN (
    SELECT lease_id FROM tenant_users WHERE id = auth.uid()
  )
);

COMMENT ON POLICY "Tenants can view their work orders" ON pm_work_orders IS 'Allows tenants to view work orders for their lease';
COMMENT ON POLICY "Tenants can create work orders" ON pm_work_orders IS 'Allows tenants to create maintenance requests for their lease';
