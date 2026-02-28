-- Migration: Account-Based Subscriptions
-- Transforms individual agent subscriptions into account-based team management
-- Made idempotent so it can be re-run safely if partially applied.

-- ============================================================================
-- ACCOUNTS TABLE
-- ============================================================================
-- Core account/organization structure. Each account has an owner and subscription.
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  billing_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_accounts_subscription_plan_id ON accounts(subscription_plan_id);

-- ============================================================================
-- OFFICES TABLE
-- ============================================================================
-- Physical office locations for Brokerage Scale and Enterprise tiers
CREATE TABLE IF NOT EXISTS offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offices_account_id ON offices(account_id);

-- ============================================================================
-- ACCOUNT MEMBERS TABLE
-- ============================================================================
-- Junction table linking agents to accounts with role-based access
CREATE TABLE IF NOT EXISTS account_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  account_role TEXT NOT NULL CHECK (account_role IN ('owner', 'admin', 'agent', 'assistant')),
  office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_account_members_account_id ON account_members(account_id);
CREATE INDEX IF NOT EXISTS idx_account_members_agent_id ON account_members(agent_id);
CREATE INDEX IF NOT EXISTS idx_account_members_office_id ON account_members(office_id);
CREATE INDEX IF NOT EXISTS idx_account_members_role ON account_members(account_role);
CREATE INDEX IF NOT EXISTS idx_account_members_active ON account_members(is_active) WHERE is_active = true;

-- ============================================================================
-- UPDATE EXISTING TABLES
-- ============================================================================

-- Link agent_subscriptions to accounts
ALTER TABLE agent_subscriptions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_account_id ON agent_subscriptions(account_id);

-- Update user_invitations to include account context and role assignment
ALTER TABLE user_invitations
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS invited_role TEXT CHECK (invited_role IN ('admin', 'agent', 'assistant')),
  ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES offices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_invitations_account_id ON user_invitations(account_id);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR ACCOUNTS
-- ============================================================================

-- Account owners and admins can view their accounts
DROP POLICY IF EXISTS "Account owners and admins can view accounts" ON accounts;
CREATE POLICY "Account owners and admins can view accounts"
  ON accounts FOR SELECT
  USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT account_id FROM account_members
      WHERE agent_id = auth.uid()
        AND account_role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- Only owners can update accounts
DROP POLICY IF EXISTS "Account owners can update accounts" ON accounts;
CREATE POLICY "Account owners can update accounts"
  ON accounts FOR UPDATE
  USING (owner_id = auth.uid());

-- ============================================================================
-- RLS POLICIES FOR OFFICES
-- ============================================================================

-- Account members can view offices in their account
DROP POLICY IF EXISTS "Account members can view offices" ON offices;
CREATE POLICY "Account members can view offices"
  ON offices FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE agent_id = auth.uid()
        AND is_active = true
    )
  );

-- Account owners and admins can manage offices
DROP POLICY IF EXISTS "Account admins can insert offices" ON offices;
CREATE POLICY "Account admins can insert offices"
  ON offices FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE agent_id = auth.uid()
        AND account_role IN ('owner', 'admin')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Account admins can update offices" ON offices;
CREATE POLICY "Account admins can update offices"
  ON offices FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE agent_id = auth.uid()
        AND account_role IN ('owner', 'admin')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Account admins can delete offices" ON offices;
CREATE POLICY "Account admins can delete offices"
  ON offices FOR DELETE
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE agent_id = auth.uid()
        AND account_role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- ============================================================================
-- RLS POLICIES FOR ACCOUNT MEMBERS
-- ============================================================================

-- Account members can view other members in their account
DROP POLICY IF EXISTS "Account members can view members" ON account_members;
CREATE POLICY "Account members can view members"
  ON account_members FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE agent_id = auth.uid()
        AND is_active = true
    )
  );

-- Account owners and admins can add members
DROP POLICY IF EXISTS "Account admins can add members" ON account_members;
CREATE POLICY "Account admins can add members"
  ON account_members FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE agent_id = auth.uid()
        AND account_role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- Account owners and admins can update members
DROP POLICY IF EXISTS "Account admins can update members" ON account_members;
CREATE POLICY "Account admins can update members"
  ON account_members FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE agent_id = auth.uid()
        AND account_role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- Account owners and admins can remove members
DROP POLICY IF EXISTS "Account admins can remove members" ON account_members;
CREATE POLICY "Account admins can remove members"
  ON account_members FOR DELETE
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE agent_id = auth.uid()
        AND account_role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get account for current user
CREATE OR REPLACE FUNCTION get_user_account_id()
RETURNS UUID AS $$
  SELECT account_id
  FROM account_members
  WHERE agent_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user has account role
CREATE OR REPLACE FUNCTION has_account_role(required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM account_members
    WHERE agent_id = auth.uid()
      AND account_role = required_role
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is account admin (owner or admin)
CREATE OR REPLACE FUNCTION is_account_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM account_members
    WHERE agent_id = auth.uid()
      AND account_role IN ('owner', 'admin')
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON TABLE accounts IS 'Organization/account structure for team-based subscriptions';
COMMENT ON TABLE offices IS 'Physical office locations for multi-office brokerages';
COMMENT ON TABLE account_members IS 'Junction table linking agents to accounts with role-based access';
