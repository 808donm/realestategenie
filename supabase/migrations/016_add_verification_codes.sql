-- Migration 016: Add email verification codes to user invitations
-- Adds verification code and expiration for email verification during signup

ALTER TABLE user_invitations
  ADD COLUMN IF NOT EXISTS verification_code TEXT,
  ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;

COMMENT ON COLUMN user_invitations.verification_code IS '6-digit code for email verification';
COMMENT ON COLUMN user_invitations.verification_code_expires_at IS 'Expiration time for verification code (15 minutes)';
COMMENT ON COLUMN user_invitations.verification_attempts IS 'Number of failed verification attempts';
