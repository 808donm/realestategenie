-- Create function to look up auth user by email
-- This allows us to find existing auth users when creation fails
-- Includes soft-deleted users (deleted_at is not null)

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_auth_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_user_by_email(TEXT) TO service_role;
