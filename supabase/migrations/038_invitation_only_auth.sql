-- Migration 038: Invitation-Only Authentication
-- Enforces that only users with valid invitations can create accounts
-- Prevents unauthorized account creation via OAuth or magic links

-- ============================================================================
-- UPDATE AUTH USER CREATION TRIGGER TO VALIDATE INVITATIONS
-- ============================================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_agent_profile();

-- Create new function with invitation validation
CREATE OR REPLACE FUNCTION create_agent_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_invitation RECORD;
  v_agent_exists BOOLEAN;
BEGIN
  -- Log the new auth user creation attempt
  RAISE NOTICE 'Auth user created: id=%, email=%', NEW.id, NEW.email;

  -- Check if agent already exists (for existing users re-authenticating)
  SELECT EXISTS(
    SELECT 1 FROM agents WHERE id = NEW.id
  ) INTO v_agent_exists;

  -- If agent already exists, this is an existing user signing back in
  IF v_agent_exists THEN
    RAISE NOTICE 'Existing agent found for user %, skipping validation', NEW.email;
    RETURN NEW;
  END IF;

  -- New user: Check for valid invitation
  SELECT *
  INTO v_invitation
  FROM user_invitations
  WHERE email = NEW.email
    AND status IN ('pending', 'accepted')
    AND expires_at > NOW();

  -- If no valid invitation found, reject the account creation
  IF v_invitation IS NULL THEN
    RAISE WARNING 'SECURITY: Unauthorized account creation attempt for email: %', NEW.email;

    -- Log the security event
    INSERT INTO error_logs (
      endpoint,
      error_message,
      severity,
      user_agent,
      created_at
    ) VALUES (
      'auth.on_auth_user_created',
      'Unauthorized account creation attempt for email: ' || NEW.email,
      'warning',
      'Database Trigger',
      NOW()
    );

    -- Delete the unauthorized auth user
    DELETE FROM auth.users WHERE id = NEW.id;

    RAISE EXCEPTION 'Account creation requires a valid invitation. Please contact an administrator.';
  END IF;

  -- Valid invitation found: Create agent profile
  RAISE NOTICE 'Valid invitation found for %, creating agent profile', NEW.email;

  INSERT INTO agents (id, email, display_name, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      NEW.email
    ),
    'active'
  );

  -- Mark invitation as accepted (if not already)
  IF v_invitation.status = 'pending' THEN
    UPDATE user_invitations
    SET status = 'accepted',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = v_invitation.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors
    RAISE WARNING 'Error in create_agent_profile: %', SQLERRM;

    -- Delete the auth user on any error
    DELETE FROM auth.users WHERE id = NEW.id;

    -- Re-raise the exception
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_agent_profile();

COMMENT ON FUNCTION create_agent_profile IS 'Validates invitation before creating agent profile. Rejects unauthorized account creation.';

-- ============================================================================
-- ADD INDEX FOR INVITATION EMAIL LOOKUPS
-- ============================================================================

-- Ensure fast invitation lookup by email (may already exist from migration 014)
CREATE INDEX IF NOT EXISTS idx_user_invitations_email_status
ON user_invitations(email, status)
WHERE status IN ('pending', 'accepted');

COMMENT ON INDEX idx_user_invitations_email_status IS 'Optimizes invitation validation during auth user creation';
