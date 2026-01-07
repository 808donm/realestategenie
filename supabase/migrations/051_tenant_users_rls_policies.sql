-- Enable RLS and create policies for tenant_users table
-- This allows tenants to read their own records

-- Enable RLS on tenant_users
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Tenants can view their own record" ON tenant_users;
DROP POLICY IF EXISTS "Agents can view tenant records" ON tenant_users;

-- Policy: Tenants can view their own record
CREATE POLICY "Tenants can view their own record"
ON tenant_users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy: Agents can view all tenant records
CREATE POLICY "Agents can view tenant records"
ON tenant_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents WHERE id = auth.uid()
  )
);

-- Enable RLS on tenant_invitations
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Agents can manage tenant invitations" ON tenant_invitations;

-- Policy: Agents can manage their tenant invitations
CREATE POLICY "Agents can manage tenant invitations"
ON tenant_invitations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pm_leases l
    INNER JOIN agents a ON l.agent_id = a.id
    WHERE l.id = tenant_invitations.lease_id
      AND a.id = auth.uid()
  )
);

COMMENT ON POLICY "Tenants can view their own record" ON tenant_users IS 'Allows tenants to read their own tenant_users record';
COMMENT ON POLICY "Agents can view tenant records" ON tenant_users IS 'Allows agents to read all tenant records';
COMMENT ON POLICY "Agents can manage tenant invitations" ON tenant_invitations IS 'Allows agents to manage invitations for their leases';
