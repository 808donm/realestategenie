-- Migration: Add must_change_password flag to agents
-- Supports direct team member creation with temporary passwords

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN agents.must_change_password IS 'When true, user must change their password on next login before accessing the app';
