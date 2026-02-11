-- Fix infinite recursion in tenant lease RLS policy
-- The previous policy created a circular dependency by checking tenant_users from pm_leases

-- First, create a helper function with SECURITY DEFINER to safely get user email
-- Note: Using public schema since we can't create functions in auth schema
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Tenants can view their own lease" ON pm_leases;

-- Create a simpler policy that checks the lease's tenant_email using the helper function
CREATE POLICY "Tenants can view their own lease"
ON pm_leases
FOR SELECT
TO authenticated
USING (
  -- Check if the authenticated user's email matches the tenant email on the lease
  tenant_email = public.get_current_user_email()
);

COMMENT ON POLICY "Tenants can view their own lease" ON pm_leases IS 'Allows tenants to view their lease by matching tenant_email with auth user email';
