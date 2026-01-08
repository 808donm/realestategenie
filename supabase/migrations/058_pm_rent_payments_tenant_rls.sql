-- Enable RLS on pm_rent_payments
ALTER TABLE pm_rent_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Agents can manage their own rent payments
CREATE POLICY "Agents can manage rent payments"
  ON pm_rent_payments
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid());

-- Policy: Tenants can view their own rent payments
-- Tenants are identified by their tenant_users.id matching the lease's tenant_user_id
CREATE POLICY "Tenants can view their rent payments"
  ON pm_rent_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM pm_leases
      WHERE pm_leases.id = pm_rent_payments.lease_id
        AND pm_leases.tenant_user_id = auth.uid()
    )
  );

-- Add index for tenant queries
CREATE INDEX IF NOT EXISTS idx_pm_rent_payments_lease_id
  ON pm_rent_payments(lease_id);

COMMENT ON POLICY "Agents can manage rent payments" ON pm_rent_payments IS 'Allows property managers to create, read, update, and delete rent payments for their properties';
COMMENT ON POLICY "Tenants can view their rent payments" ON pm_rent_payments IS 'Allows tenants to view rent payments for their leases';
