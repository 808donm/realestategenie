-- Admin Level Split
-- Replaces binary is_admin with tiered admin_level:
--   'none'   = regular agent
--   'admin'  = site/account admin (manages their brokerage)
--   'global' = global platform admin (full access + impersonation)

ALTER TABLE agents ADD COLUMN IF NOT EXISTS admin_level TEXT DEFAULT 'none'
  CHECK (admin_level IN ('none', 'admin', 'global'));

-- Migrate existing is_admin data
UPDATE agents SET admin_level = 'global' WHERE is_admin = true;

-- Set all active account owners/admins to site admin
UPDATE agents SET admin_level = 'admin'
WHERE admin_level = 'none'
AND id IN (
  SELECT agent_id FROM account_members
  WHERE account_role IN ('owner', 'admin') AND is_active = true
);

-- Set global admin (platform owner)
UPDATE agents SET admin_level = 'global'
WHERE email = 'dmangiarelli@ent-techsolutions.com';

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_agents_admin_level ON agents(admin_level) WHERE admin_level != 'none';
