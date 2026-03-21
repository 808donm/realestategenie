-- Migration: Flexible MLS connections
-- 1. Expand provider enum to include Bridge (Zillow), IDX Broker, and direct MLS feeds
-- 2. Add a human-readable label column (e.g. "HiCentral MLS", "Maui MLS")
-- 3. Seed disconnected MLS entries for all existing agents so the UI shows them as available
-- 4. Update handle_new_auth_user trigger to create default disconnected MLS entries for new agents

-- ============================================================================
-- 1. Expand provider check constraint
-- ============================================================================
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;

ALTER TABLE integrations
ADD CONSTRAINT integrations_provider_check
CHECK (provider IN (
  'ghl', 'n8n', 'idx', 'qbo', 'pandadoc', 'docusign', 'paypal', 'stripe',
  'trestle',   -- Cotality / CoreLogic MLS aggregator
  'bridge',    -- Zillow / Bridge Interactive
  'idx_broker', -- IDX Broker
  'direct_mls', -- Direct MLS data feed
  'attom'
));

-- ============================================================================
-- 2. Add label column for human-readable connection name
-- Allows future: one provider, multiple named connections
-- e.g. label = 'HiCentral MLS' or 'Maui MLS'
-- ============================================================================
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS label TEXT;

-- ============================================================================
-- 3. Seed disconnected MLS entries for all existing agents
-- This replaces any stale sample-data connections with a clean disconnected state
-- and ensures every agent sees all MLS options in their integrations page
-- ============================================================================
INSERT INTO integrations (agent_id, provider, status, config)
SELECT id, 'trestle', 'disconnected', '{}'::jsonb
FROM agents
ON CONFLICT (agent_id, provider) DO NOTHING;

INSERT INTO integrations (agent_id, provider, status, config)
SELECT id, 'bridge', 'disconnected', '{}'::jsonb
FROM agents
ON CONFLICT (agent_id, provider) DO NOTHING;

INSERT INTO integrations (agent_id, provider, status, config)
SELECT id, 'idx_broker', 'disconnected', '{}'::jsonb
FROM agents
ON CONFLICT (agent_id, provider) DO NOTHING;

-- ============================================================================
-- 4. Update handle_new_auth_user to create default disconnected MLS entries
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_role TEXT;
  v_invitation RECORD;
  v_tenant_invitation RECORD;
  v_agent_exists BOOLEAN;
  v_agent_count INTEGER;
  v_is_first_agent BOOLEAN;
BEGIN
  RAISE NOTICE 'Auth user created: id=%, email=%, role=%', NEW.id, NEW.email, NEW.raw_user_meta_data->>'role';

  v_user_role := NEW.raw_user_meta_data->>'role';

  -- TENANT USER FLOW
  IF v_user_role = 'tenant' THEN
    RAISE NOTICE 'Tenant user detected, checking tenant_invitations...';
    SELECT * INTO v_tenant_invitation
    FROM public.tenant_invitations
    WHERE email = NEW.email
      AND registered_at IS NULL
      AND invitation_expires_at > NOW();

    IF v_tenant_invitation IS NULL THEN
      RAISE WARNING 'No valid tenant invitation found for: %', NEW.email;
      DELETE FROM auth.users WHERE id = NEW.id;
      RAISE EXCEPTION 'Tenant account creation requires a valid invitation.';
    END IF;

    RAISE NOTICE 'Valid tenant invitation found for %', NEW.email;
    RETURN NEW;
  END IF;

  -- AGENT USER FLOW
  RAISE NOTICE 'Agent user detected, checking user_invitations...';

  SELECT EXISTS(SELECT 1 FROM public.agents WHERE id = NEW.id) INTO v_agent_exists;

  IF v_agent_exists THEN
    RAISE NOTICE 'Existing agent found for user %, skipping validation', NEW.email;
    RETURN NEW;
  END IF;

  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE email = NEW.email
    AND status IN ('pending', 'accepted')
    AND expires_at > NOW();

  IF v_invitation IS NULL THEN
    RAISE WARNING 'SECURITY: Unauthorized agent account creation attempt for: %', NEW.email;
    INSERT INTO public.error_logs (endpoint, error_message, severity, user_agent, created_at)
    VALUES ('auth.handle_new_auth_user', 'Unauthorized account creation attempt for email: ' || NEW.email, 'warning', 'Database Trigger', NOW());
    DELETE FROM auth.users WHERE id = NEW.id;
    RAISE EXCEPTION 'Agent account creation requires a valid invitation. Please contact an administrator.';
  END IF;

  SELECT COUNT(*) INTO v_agent_count FROM public.agents;
  v_is_first_agent := (v_agent_count = 0);

  IF v_is_first_agent THEN
    RAISE NOTICE 'First agent on site — granting admin privileges to %', NEW.email;
  END IF;

  RAISE NOTICE 'Valid invitation found for %, creating agent profile', NEW.email;

  INSERT INTO public.agents (id, email, display_name, account_status, is_admin, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', NEW.email),
    'active',
    v_is_first_agent,
    CASE WHEN v_is_first_agent THEN 'admin' ELSE 'agent' END
  );

  -- Create default disconnected MLS integration entries for the new agent
  -- This ensures every account sees all MLS options as available to configure
  -- (no pre-connected sample data)
  INSERT INTO public.integrations (agent_id, provider, status, config)
  VALUES
    (NEW.id, 'trestle',    'disconnected', '{}'::jsonb),
    (NEW.id, 'bridge',     'disconnected', '{}'::jsonb),
    (NEW.id, 'idx_broker', 'disconnected', '{}'::jsonb)
  ON CONFLICT (agent_id, provider) DO NOTHING;

  IF v_invitation.status = 'pending' THEN
    UPDATE public.user_invitations
    SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
    WHERE id = v_invitation.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_auth_user: %', SQLERRM;
    DELETE FROM auth.users WHERE id = NEW.id;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

COMMENT ON FUNCTION handle_new_auth_user IS
  'Handles agent and tenant user creation. First agent is auto-admin. '
  'Creates default disconnected MLS integration entries (Trestle, Bridge, IDX Broker) for each new agent.';

NOTIFY pgrst, 'reload schema';
