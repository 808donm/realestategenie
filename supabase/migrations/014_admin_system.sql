-- Migration 014: Admin System
-- Adds admin roles, account status, user invitations, and error logging

-- ============================================================================
-- ADD ADMIN AND ACCOUNT STATUS TO AGENTS
-- ============================================================================

-- Add admin flag and account status to agents table
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'disabled', 'pending'));

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_agents_is_admin ON agents(is_admin);
CREATE INDEX IF NOT EXISTS idx_agents_account_status ON agents(account_status);

-- Set initial super admin (dmangiarelli@ent-techsolutions.com)
UPDATE agents
SET is_admin = TRUE, account_status = 'active'
WHERE email = 'dmangiarelli@ent-techsolutions.com';

COMMENT ON COLUMN agents.is_admin IS 'Whether this user has admin privileges';
COMMENT ON COLUMN agents.account_status IS 'Account status: active, disabled, or pending';

-- ============================================================================
-- USER INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for invitations
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON user_invitations(expires_at);

COMMENT ON TABLE user_invitations IS 'Tracks user invitation tokens and status';

-- ============================================================================
-- ERROR LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  endpoint TEXT,
  error_message TEXT NOT NULL,
  error_code TEXT,
  stack_trace TEXT,
  user_agent TEXT,
  ip_address TEXT,
  request_method TEXT,
  request_body JSONB,
  severity TEXT DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for error logs
CREATE INDEX IF NOT EXISTS idx_error_logs_agent_id ON error_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint ON error_logs(endpoint);

COMMENT ON TABLE error_logs IS 'System error logs for troubleshooting';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- User Invitations Policies
-- Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
  ON user_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = auth.uid()
      AND agents.is_admin = TRUE
      AND agents.account_status = 'active'
    )
  );

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
  ON user_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = auth.uid()
      AND agents.is_admin = TRUE
      AND agents.account_status = 'active'
    )
  );

-- Admins can update invitations
CREATE POLICY "Admins can update invitations"
  ON user_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = auth.uid()
      AND agents.is_admin = TRUE
      AND agents.account_status = 'active'
    )
  );

-- Error Logs Policies
-- Admins can view all error logs
CREATE POLICY "Admins can view all error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = auth.uid()
      AND agents.is_admin = TRUE
      AND agents.account_status = 'active'
    )
  );

-- Service role can insert error logs (for API routes)
CREATE POLICY "Service role can insert error logs"
  ON error_logs FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- ============================================================================
-- FUNCTIONS FOR ERROR LOG CLEANUP
-- ============================================================================

-- Function to automatically delete error logs older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

COMMENT ON FUNCTION cleanup_old_error_logs IS 'Deletes error logs older than 90 days';

-- ============================================================================
-- SCHEDULED CLEANUP (requires pg_cron extension)
-- ============================================================================
-- Note: This requires pg_cron extension to be enabled in Supabase
-- Run this manually in Supabase SQL editor after enabling pg_cron:
--
-- SELECT cron.schedule(
--   'cleanup-old-error-logs',
--   '0 2 * * *', -- Run at 2 AM daily
--   $$SELECT cleanup_old_error_logs()$$
-- );

-- ============================================================================
-- UPDATE AGENTS RLS POLICIES FOR ADMIN ACCESS
-- ============================================================================

-- Admins can view all agents
DROP POLICY IF EXISTS "Admins can view all agents" ON agents;
CREATE POLICY "Admins can view all agents"
  ON agents FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM agents AS admin
      WHERE admin.id = auth.uid()
      AND admin.is_admin = TRUE
      AND admin.account_status = 'active'
    )
  );

-- Admins can update other agents (for account management)
DROP POLICY IF EXISTS "Admins can update agents" ON agents;
CREATE POLICY "Admins can update agents"
  ON agents FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM agents AS admin
      WHERE admin.id = auth.uid()
      AND admin.is_admin = TRUE
      AND admin.account_status = 'active'
    )
  );
