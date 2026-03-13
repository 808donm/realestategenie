-- Fix user_invitations: rename 'token' column to 'invitation_token'
-- to match the application code in /api/account/members/invite/route.ts
-- The original migration (014) created the column as 'token' but the
-- invite API expects 'invitation_token'.

ALTER TABLE user_invitations
  RENAME COLUMN token TO invitation_token;
