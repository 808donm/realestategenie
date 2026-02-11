-- Enable RLS on pm_rent_payments
ALTER TABLE pm_rent_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Agents can manage their own rent payments
CREATE POLICY "Agents can manage rent payments"
  ON pm_rent_payments
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid());

-- Policy: Tenants can view their own rent payments
-- Tenants are identified by their tenant_users.id and linked through lease_id
CREATE POLICY "Tenants can view their rent payments"
  ON pm_rent_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_users
      WHERE tenant_users.lease_id = pm_rent_payments.lease_id
        AND tenant_users.id = auth.uid()
    )
  );

-- Add index for tenant queries
CREATE INDEX IF NOT EXISTS idx_pm_rent_payments_lease_id
  ON pm_rent_payments(lease_id);

-- Add index on tenant_users for faster RLS checks
CREATE INDEX IF NOT EXISTS idx_tenant_users_lease_id
  ON tenant_users(lease_id);

COMMENT ON POLICY "Agents can manage rent payments" ON pm_rent_payments IS 'Allows property managers to create, read, update, and delete rent payments for their properties';
COMMENT ON POLICY "Tenants can view their rent payments" ON pm_rent_payments IS 'Allows tenants to view rent payments for their leases';
