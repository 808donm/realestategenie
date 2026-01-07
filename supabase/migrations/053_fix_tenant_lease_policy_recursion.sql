-- Fix infinite recursion in tenant lease RLS policy
-- The previous policy created a circular dependency by checking tenant_users from pm_leases

-- Drop the problematic policy
DROP POLICY IF EXISTS "Tenants can view their own lease" ON pm_leases;

-- Create a simpler policy that only checks the lease's tenant_email
-- This completely avoids any reference to tenant_users, preventing recursion
CREATE POLICY "Tenants can view their own lease"
ON pm_leases
FOR SELECT
TO authenticated
USING (
  -- Check if the authenticated user's email matches the tenant email on the lease
  tenant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

COMMENT ON POLICY "Tenants can view their own lease" ON pm_leases IS 'Allows tenants to view their lease by matching tenant_email with auth user email';
