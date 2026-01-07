-- Combined migration: Create tenant_invitations table and fix auth trigger
-- Run this single migration to fix tenant registration

-- Step 1: Drop and recreate get_auth_user_by_email function
DROP FUNCTION IF EXISTS get_auth_user_by_email(TEXT);

CREATE OR REPLACE FUNCTION get_auth_user_by_email(user_email TEXT)
RETURNS TABLE (id UUID, email TEXT, deleted_at TIMESTAMPTZ, confirmed_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, email, deleted_at, confirmed_at
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
$$;

-- Step 2: Create tenant_invitations table
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
  auth_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lease_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_lease_id ON tenant_invitations(lease_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invitation_token);

COMMENT ON TABLE tenant_invitations IS 'Pending tenant portal invitations - auth users created when they register';
COMMENT ON COLUMN tenant_invitations.auth_user_id IS 'Set when tenant completes registration';

-- Step 3: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_auth_user();

-- Step 4: Create new auth trigger that checks role BEFORE accessing agents table
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_role TEXT;
  v_invitation RECORD;
  v_tenant_invitation RECORD;
  v_agent_exists BOOLEAN;
BEGIN
  -- Log the new auth user creation attempt
  RAISE NOTICE 'Auth user created: id=%, email=%, role=%', NEW.id, NEW.email, NEW.raw_user_meta_data->>'role';

  -- Get role from user metadata
  v_user_role := NEW.raw_user_meta_data->>'role';

  -- TENANT USER FLOW - Check this FIRST before accessing agents table
  IF v_user_role = 'tenant' THEN
    RAISE NOTICE 'Tenant user detected, checking tenant_invitations...';

    -- Check for valid tenant invitation
    SELECT *
    INTO v_tenant_invitation
    FROM tenant_invitations
    WHERE email = NEW.email
      AND registered_at IS NULL
      AND invitation_expires_at > NOW();

    IF v_tenant_invitation IS NULL THEN
      RAISE WARNING 'No valid tenant invitation found for: %', NEW.email;
      DELETE FROM auth.users WHERE id = NEW.id;
      RAISE EXCEPTION 'Tenant account creation requires a valid invitation.';
    END IF;

    -- Valid tenant invitation found - registration will create tenant_users record
    RAISE NOTICE 'Valid tenant invitation found for %', NEW.email;
    RETURN NEW;
  END IF;

  -- AGENT USER FLOW (default)
  -- Only check agents table for non-tenant users
  RAISE NOTICE 'Agent user detected, checking user_invitations...';

  -- Check if agent already exists (for existing users re-authenticating)
  SELECT EXISTS(
    SELECT 1 FROM agents WHERE id = NEW.id
  ) INTO v_agent_exists;

  -- If agent already exists, this is an existing user signing back in
  IF v_agent_exists THEN
    RAISE NOTICE 'Existing agent found for user %, skipping validation', NEW.email;
    RETURN NEW;
  END IF;

  -- Check for valid agent invitation
  SELECT *
  INTO v_invitation
  FROM user_invitations
  WHERE email = NEW.email
    AND status IN ('pending', 'accepted')
    AND expires_at > NOW();

  -- If no valid invitation found, reject the account creation
  IF v_invitation IS NULL THEN
    RAISE WARNING 'SECURITY: Unauthorized agent account creation attempt for: %', NEW.email;

    -- Log the security event
    INSERT INTO error_logs (
      endpoint,
      error_message,
      severity,
      user_agent,
      created_at
    ) VALUES (
      'auth.handle_new_auth_user',
      'Unauthorized account creation attempt for email: ' || NEW.email,
      'warning',
      'Database Trigger',
      NOW()
    );

    -- Delete the unauthorized auth user
    DELETE FROM auth.users WHERE id = NEW.id;
    RAISE EXCEPTION 'Agent account creation requires a valid invitation. Please contact an administrator.';
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
    RAISE WARNING 'Error in handle_new_auth_user: %', SQLERRM;

    -- Delete the auth user on any error
    DELETE FROM auth.users WHERE id = NEW.id;

    -- Re-raise the exception
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

COMMENT ON FUNCTION handle_new_auth_user IS 'Handles both agent and tenant user creation. Checks role BEFORE accessing agents table to prevent errors.';
