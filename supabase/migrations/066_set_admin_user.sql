-- Migration: Set Admin User Role
-- This ensures the specified user has admin role

-- Set admin role for dmangiarelli@ent-techsolutions.com
UPDATE agents
SET role = 'admin'
WHERE email = 'dmangiarelli@ent-techsolutions.com';

-- Verify the update
DO $$
DECLARE
  admin_count INTEGER;
  admin_email TEXT;
  admin_role TEXT;
BEGIN
  -- Check if admin was set
  SELECT COUNT(*), MAX(email), MAX(role)
  INTO admin_count, admin_email, admin_role
  FROM agents
  WHERE email = 'dmangiarelli@ent-techsolutions.com';

  IF admin_count = 0 THEN
    RAISE NOTICE 'WARNING: User dmangiarelli@ent-techsolutions.com not found in agents table';
  ELSIF admin_role != 'admin' THEN
    RAISE NOTICE 'WARNING: Role update may have failed. Current role: %', admin_role;
  ELSE
    RAISE NOTICE 'SUCCESS: User % now has admin role', admin_email;
  END IF;
END $$;

-- Show all admin users
SELECT id, email, role, display_name, is_active
FROM agents
WHERE role = 'admin';
