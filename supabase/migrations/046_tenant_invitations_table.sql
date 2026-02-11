-- Create tenant_invitations table to track pending invitations
-- This allows sending invitations before auth users are created

CREATE TABLE IF NOT EXISTS tenant_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID NOT NULL REFERENCES pm_leases(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  tenant_name TEXT,
  phone TEXT,
  invitation_token TEXT NOT NULL UNIQUE,
  invitation_expires_at TIMESTAMPTZ NOT NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  registered_at TIMESTAMPTZ,
  auth_user_id UUID, -- Set when they actually register
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one invitation per lease
  UNIQUE(lease_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_lease_id ON tenant_invitations(lease_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invitation_token);

COMMENT ON TABLE tenant_invitations IS 'Pending tenant portal invitations - auth users created when they register';
COMMENT ON COLUMN tenant_invitations.auth_user_id IS 'Set when tenant completes registration';
