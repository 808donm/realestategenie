-- Fix: Remove infinite recursion in agents RLS policies
-- The issue: policies were checking the agents table FROM WITHIN agents table policies
-- Solution: Use a security definer function that bypasses RLS

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all agents" ON agents;
DROP POLICY IF EXISTS "Admins can update agents" ON agents;
DROP POLICY IF EXISTS "Users can view own profile" ON agents;
DROP POLICY IF EXISTS "Users can update own profile" ON agents;
DROP POLICY IF EXISTS "Admins can view any agent" ON agents;
DROP POLICY IF EXISTS "Admins can update any agent" ON agents;

-- Create a security definer function to check if current user is admin
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin AND account_status = 'active'
     FROM agents
     WHERE id = auth.uid()),
    FALSE
  );
$$;

-- Now create simple policies using the function
-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON agents FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON agents FOR SELECT
  TO authenticated
  USING (is_admin_user());

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON agents FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Policy 4: Admins can update any profile
CREATE POLICY "Admins can update all profiles"
  ON agents FOR UPDATE
  TO authenticated
  USING (is_admin_user());
