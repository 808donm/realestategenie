-- Migration 033: Ensure all users have agent records
-- This fixes issues where users might not have agent records created

-- Insert missing agent records for any auth users that don't have them
INSERT INTO agents (id, email, display_name, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'display_name', u.email),
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM agents a WHERE a.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Update the trigger function to handle conflicts gracefully
CREATE OR REPLACE FUNCTION create_agent_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agents (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, agents.display_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON FUNCTION create_agent_profile() IS 'Creates or updates agent profile when user signs up';
