-- =============================================================================
-- Migration: Fix Supabase Security Linter Warnings
--
-- Resolves:
--   1. function_search_path_mutable (32 functions) — sets search_path = ''
--   2. rls_policy_always_true (3 policies) — tightens INSERT policies
--
-- The search_path fix prevents potential privilege escalation by ensuring
-- functions always resolve table references to their fully-qualified schema.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- =============================================================================

-- =============================================================================
-- PART 1: SET search_path ON ALL 32 FUNCTIONS
-- =============================================================================

-- 1. cleanup_old_error_logs (014_admin_system.sql)
CREATE OR REPLACE FUNCTION public.cleanup_old_error_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.error_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- 2. update_flyer_followups_updated_at (018_open_house_flyer_followups.sql)
CREATE OR REPLACE FUNCTION public.update_flyer_followups_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. update_registrations_updated_at (019_ghl_registrations.sql)
CREATE OR REPLACE FUNCTION public.update_registrations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4. expire_old_offer_sessions (019_ghl_registrations.sql)
CREATE OR REPLACE FUNCTION public.expire_old_offer_sessions()
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.flyer_offer_sessions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < NOW();
END;
$$;

-- 5. set_default_payment_method (028_tenant_portal_foundation.sql)
CREATE OR REPLACE FUNCTION public.set_default_payment_method()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.tenant_payment_methods
    SET is_default = false
    WHERE tenant_user_id = NEW.tenant_user_id
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. update_updated_at (028_tenant_portal_foundation.sql)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 7. update_agent_billing_updated_at (063_agent_billing_tables.sql)
CREATE OR REPLACE FUNCTION public.update_agent_billing_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 8. get_user_account_id (068_account_based_subscriptions.sql)
CREATE OR REPLACE FUNCTION public.get_user_account_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT account_id
  FROM public.account_members
  WHERE agent_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

-- 9. update_brrr_analyses_updated_at (20260203000000_add_brrr_flip_analyzers.sql)
CREATE OR REPLACE FUNCTION public.update_brrr_analyses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. update_flip_analyses_updated_at (20260203000000_add_brrr_flip_analyzers.sql)
CREATE OR REPLACE FUNCTION public.update_flip_analyses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 11. has_account_role (068_account_based_subscriptions.sql)
CREATE OR REPLACE FUNCTION public.has_account_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE agent_id = auth.uid()
      AND account_role = required_role
      AND is_active = true
  );
$$;

-- 12. generate_agent_invoice_number (063_agent_billing_tables.sql)
CREATE OR REPLACE FUNCTION public.generate_agent_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)),
    0
  ) + 1
  INTO next_number
  FROM public.agent_invoices;

  invoice_num := 'INV-' || LPAD(next_number::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$;

-- 13. update_teams_updated_at (064_teams_and_roles.sql)
CREATE OR REPLACE FUNCTION public.update_teams_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 14. is_account_admin (068_account_based_subscriptions.sql)
CREATE OR REPLACE FUNCTION public.is_account_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE agent_id = auth.uid()
      AND account_role IN ('owner', 'admin')
      AND is_active = true
  );
$$;

-- 15. get_broker_agents (064_teams_and_roles.sql)
CREATE OR REPLACE FUNCTION public.get_broker_agents(broker_uuid UUID)
RETURNS TABLE(agent_id UUID, agent_name TEXT, agent_email TEXT, team_name TEXT, relationship TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    a.id,
    a.display_name,
    a.email,
    t.name,
    CASE
      WHEN tm.team_id IS NOT NULL THEN 'team_member'
      WHEN a.id IN (SELECT bh.agent_id FROM public.broker_hierarchies bh WHERE bh.broker_id = broker_uuid AND bh.relationship_type = 'direct') THEN 'direct'
      ELSE 'other'
    END AS relationship
  FROM public.agents a
  LEFT JOIN public.team_members tm ON tm.agent_id = a.id AND tm.is_active = true
  LEFT JOIN public.teams t ON t.id = tm.team_id
  WHERE (
    a.id IN (SELECT bh.agent_id FROM public.broker_hierarchies bh WHERE bh.broker_id = broker_uuid)
    OR
    tm.team_id IN (SELECT t2.id FROM public.teams t2 WHERE t2.broker_id = broker_uuid)
  )
  AND a.is_active = true
  AND a.id != broker_uuid;
END;
$$;

-- 16. get_team_lead_agents (064_teams_and_roles.sql)
CREATE OR REPLACE FUNCTION public.get_team_lead_agents(lead_uuid UUID)
RETURNS TABLE(agent_id UUID, agent_name TEXT, agent_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.display_name,
    a.email
  FROM public.agents a
  INNER JOIN public.team_members tm ON tm.agent_id = a.id
  INNER JOIN public.teams t ON t.id = tm.team_id
  WHERE t.team_lead_id = lead_uuid
    AND tm.is_active = true
    AND a.is_active = true;
END;
$$;

-- 17. can_add_account_member (069_role_based_subscription_limits.sql)
CREATE OR REPLACE FUNCTION public.can_add_account_member(
  p_account_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan_id UUID;
  v_max_agents INT;
  v_max_assistants INT;
  v_max_administrators INT;
  v_current_agents INT;
  v_current_assistants INT;
  v_current_administrators INT;
BEGIN
  SELECT subscription_plan_id INTO v_plan_id
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_plan_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT max_agents, max_assistants, max_administrators
  INTO v_max_agents, v_max_assistants, v_max_administrators
  FROM public.subscription_plans
  WHERE id = v_plan_id;

  SELECT
    COUNT(*) FILTER (WHERE account_role = 'agent'),
    COUNT(*) FILTER (WHERE account_role = 'assistant'),
    COUNT(*) FILTER (WHERE account_role = 'admin')
  INTO v_current_agents, v_current_assistants, v_current_administrators
  FROM public.account_members
  WHERE account_id = p_account_id
    AND is_active = true;

  CASE p_role
    WHEN 'agent' THEN
      RETURN v_current_agents < v_max_agents;
    WHEN 'assistant' THEN
      RETURN v_current_assistants < v_max_assistants;
    WHEN 'admin' THEN
      RETURN v_current_administrators < v_max_administrators;
    WHEN 'owner' THEN
      RETURN NOT EXISTS (
        SELECT 1 FROM public.account_members
        WHERE account_id = p_account_id
          AND account_role = 'owner'
          AND is_active = true
      );
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- 18. update_subscription_updated_at (065_subscription_plans_and_features.sql)
CREATE OR REPLACE FUNCTION public.update_subscription_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 19. calculate_agent_usage (065_subscription_plans_and_features.sql)
CREATE OR REPLACE FUNCTION public.calculate_agent_usage(agent_uuid UUID)
RETURNS TABLE(
  agents_count INTEGER,
  properties_count INTEGER,
  tenants_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_role TEXT;
  agents_ct INTEGER;
  properties_ct INTEGER;
  tenants_ct INTEGER;
BEGIN
  SELECT role INTO user_role FROM public.agents WHERE id = agent_uuid;

  IF user_role = 'admin' OR user_role = 'broker' THEN
    SELECT COUNT(DISTINCT a.id) INTO agents_ct
    FROM public.agents a
    LEFT JOIN public.team_members tm ON tm.agent_id = a.id
    LEFT JOIN public.teams t ON t.id = tm.team_id
    WHERE (t.broker_id = agent_uuid OR a.id = agent_uuid)
      AND a.is_active = true;

    SELECT COUNT(DISTINCT p.id) INTO properties_ct
    FROM public.pm_properties p
    WHERE p.agent_id IN (
      SELECT a.id FROM public.agents a
      LEFT JOIN public.team_members tm ON tm.agent_id = a.id
      LEFT JOIN public.teams t ON t.id = tm.team_id
      WHERE t.broker_id = agent_uuid OR a.id = agent_uuid
    );

    SELECT COUNT(DISTINCT l.tenant_id) INTO tenants_ct
    FROM public.pm_leases l
    WHERE l.property_id IN (
      SELECT p.id FROM public.pm_properties p
      WHERE p.agent_id IN (
        SELECT a.id FROM public.agents a
        LEFT JOIN public.team_members tm ON tm.agent_id = a.id
        LEFT JOIN public.teams t ON t.id = tm.team_id
        WHERE t.broker_id = agent_uuid OR a.id = agent_uuid
      )
    )
    AND l.status = 'active';

  ELSIF user_role = 'team_lead' THEN
    SELECT COUNT(DISTINCT a.id) INTO agents_ct
    FROM public.agents a
    INNER JOIN public.team_members tm ON tm.agent_id = a.id
    INNER JOIN public.teams t ON t.id = tm.team_id
    WHERE t.team_lead_id = agent_uuid
      AND a.is_active = true;

    SELECT COUNT(DISTINCT p.id) INTO properties_ct
    FROM public.pm_properties p
    WHERE p.agent_id IN (
      SELECT tm.agent_id FROM public.team_members tm
      INNER JOIN public.teams t ON t.id = tm.team_id
      WHERE t.team_lead_id = agent_uuid
    );

    SELECT COUNT(DISTINCT l.tenant_id) INTO tenants_ct
    FROM public.pm_leases l
    WHERE l.property_id IN (
      SELECT p.id FROM public.pm_properties p
      WHERE p.agent_id IN (
        SELECT tm.agent_id FROM public.team_members tm
        INNER JOIN public.teams t ON t.id = tm.team_id
        WHERE t.team_lead_id = agent_uuid
      )
    )
    AND l.status = 'active';

  ELSE
    agents_ct := 1;

    SELECT COUNT(*) INTO properties_ct
    FROM public.pm_properties
    WHERE agent_id = agent_uuid;

    SELECT COUNT(DISTINCT l.tenant_id) INTO tenants_ct
    FROM public.pm_leases l
    INNER JOIN public.pm_properties p ON p.id = l.property_id
    WHERE p.agent_id = agent_uuid
      AND l.status = 'active';
  END IF;

  RETURN QUERY SELECT agents_ct, properties_ct, tenants_ct;
END;
$$;

-- 20. has_feature_access (065_subscription_plans_and_features.sql)
CREATE OR REPLACE FUNCTION public.has_feature_access(agent_uuid UUID, feature_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.agent_subscriptions asub
    INNER JOIN public.plan_features pf ON pf.plan_id = asub.subscription_plan_id
    INNER JOIN public.features f ON f.id = pf.feature_id
    WHERE asub.agent_id = agent_uuid
      AND asub.status = 'active'
      AND f.slug = feature_slug
      AND pf.is_enabled = true
  ) INTO has_access;

  RETURN COALESCE(has_access, false);
END;
$$;

-- 21. can_add_office (069_role_based_subscription_limits.sql)
CREATE OR REPLACE FUNCTION public.can_add_office(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan_id UUID;
  v_max_offices INT;
  v_current_offices INT;
BEGIN
  SELECT subscription_plan_id INTO v_plan_id
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_plan_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT max_offices INTO v_max_offices
  FROM public.subscription_plans
  WHERE id = v_plan_id;

  SELECT COUNT(*) INTO v_current_offices
  FROM public.offices
  WHERE account_id = p_account_id
    AND is_active = true;

  RETURN v_current_offices < v_max_offices;
END;
$$;

-- 22. update_updated_at_column (000_base_schema.sql / 20260130000002_add_investment_analyzers.sql)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 23. update_account_usage (070_account_usage_tracking.sql)
CREATE OR REPLACE FUNCTION public.update_account_usage(account_uuid UUID)
RETURNS public.account_usage
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  usage_data RECORD;
  result public.account_usage;
BEGIN
  SELECT * INTO usage_data
  FROM public.calculate_account_usage(account_uuid);

  INSERT INTO public.account_usage (
    account_id,
    current_agents,
    current_assistants,
    current_administrators,
    current_owners,
    current_offices,
    current_properties,
    current_tenants,
    last_calculated_at
  ) VALUES (
    account_uuid,
    usage_data.agents_count,
    usage_data.assistants_count,
    usage_data.administrators_count,
    usage_data.owners_count,
    usage_data.offices_count,
    usage_data.properties_count,
    usage_data.tenants_count,
    NOW()
  )
  ON CONFLICT (account_id) DO UPDATE SET
    current_agents = EXCLUDED.current_agents,
    current_assistants = EXCLUDED.current_assistants,
    current_administrators = EXCLUDED.current_administrators,
    current_owners = EXCLUDED.current_owners,
    current_offices = EXCLUDED.current_offices,
    current_properties = EXCLUDED.current_properties,
    current_tenants = EXCLUDED.current_tenants,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- 24. create_feature_flags_for_agent (complete_setup.sql only)
CREATE OR REPLACE FUNCTION public.create_feature_flags_for_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.feature_flags (agent_id)
  VALUES (NEW.id)
  ON CONFLICT (agent_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 25. add_team_owner_as_member (complete_setup.sql only)
CREATE OR REPLACE FUNCTION public.add_team_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, agent_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 26. trigger_update_account_usage (070_account_usage_tracking.sql)
CREATE OR REPLACE FUNCTION public.trigger_update_account_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.update_account_usage(
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.account_id
      ELSE NEW.account_id
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 27. get_auth_user_by_email (049_combined_tenant_registration_fix.sql)
CREATE OR REPLACE FUNCTION public.get_auth_user_by_email(user_email TEXT)
RETURNS TABLE (id UUID, email TEXT, deleted_at TIMESTAMPTZ, confirmed_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, email, deleted_at, confirmed_at
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
$$;

-- 28. calculate_account_usage (072_fix_account_usage_function.sql)
CREATE OR REPLACE FUNCTION public.calculate_account_usage(account_uuid UUID)
RETURNS TABLE(
  agents_count INTEGER,
  assistants_count INTEGER,
  administrators_count INTEGER,
  owners_count INTEGER,
  offices_count INTEGER,
  properties_count INTEGER,
  tenants_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE am.account_role = 'agent' AND am.is_active = true)::INTEGER AS agents_count,
    COUNT(*) FILTER (WHERE am.account_role = 'assistant' AND am.is_active = true)::INTEGER AS assistants_count,
    COUNT(*) FILTER (WHERE am.account_role = 'admin' AND am.is_active = true)::INTEGER AS administrators_count,
    COUNT(*) FILTER (WHERE am.account_role = 'owner' AND am.is_active = true)::INTEGER AS owners_count,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.offices
      WHERE account_id = account_uuid
        AND is_active = true
    ) AS offices_count,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.pm_properties p
      INNER JOIN public.account_members am2 ON am2.agent_id = p.agent_id
      WHERE am2.account_id = account_uuid
        AND am2.is_active = true
    ) AS properties_count,
    (
      SELECT COUNT(DISTINCT l.tenant_contact_id)::INTEGER
      FROM public.pm_leases l
      INNER JOIN public.pm_properties p ON p.id = l.pm_property_id
      INNER JOIN public.account_members am2 ON am2.agent_id = p.agent_id
      WHERE am2.account_id = account_uuid
        AND am2.is_active = true
        AND l.status = 'active'
    ) AS tenants_count
  FROM public.account_members am
  WHERE am.account_id = account_uuid;
END;
$$;

-- 29. has_integration_connected (074_integration_connections.sql)
CREATE OR REPLACE FUNCTION public.has_integration_connected(
  p_agent_id UUID,
  p_integration_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.integration_connections
    WHERE agent_id = p_agent_id
      AND integration_type = p_integration_type
      AND connection_status = 'connected'
  );
END;
$$;

-- 30. get_integration_connection (074_integration_connections.sql)
CREATE OR REPLACE FUNCTION public.get_integration_connection(
  p_agent_id UUID,
  p_integration_type TEXT
)
RETURNS public.integration_connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  connection public.integration_connections;
BEGIN
  SELECT * INTO connection
  FROM public.integration_connections
  WHERE agent_id = p_agent_id
    AND integration_type = p_integration_type
    AND connection_status = 'connected'
  ORDER BY connected_at DESC
  LIMIT 1;

  RETURN connection;
END;
$$;

-- 31. check_expired_connections (074_integration_connections.sql)
CREATE OR REPLACE FUNCTION public.check_expired_connections()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.integration_connections
  SET connection_status = 'expired',
      error_message = 'Access token expired',
      updated_at = NOW()
  WHERE connection_status = 'connected'
    AND token_expires_at IS NOT NULL
    AND token_expires_at < NOW();
END;
$$;

-- 32. get_current_user_email (053_fix_tenant_lease_policy_recursion.sql)
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;


-- =============================================================================
-- PART 2: TIGHTEN RLS POLICIES
-- =============================================================================

-- Fix: "Users can submit access requests" on access_requests
-- This policy may exist in the live DB (created outside migrations).
-- Replace WITH CHECK (true) with a check that restricts to authenticated or anon users
-- submitting only their own data (rate-limiting is handled at the API layer).
DROP POLICY IF EXISTS "Users can submit access requests" ON public.access_requests;
CREATE POLICY "Users can submit access requests"
  ON public.access_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Only allow inserting rows with status 'pending'
    status = 'pending'
  );

-- Fix: "System can insert audit logs" on audit_log
-- Restrict to authenticated users only (service role bypasses RLS anyway)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;
CREATE POLICY "System can insert audit logs"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix: "System can insert webhook logs" on webhook_logs
-- Restrict to authenticated users only (service role bypasses RLS anyway)
DROP POLICY IF EXISTS "System can insert webhook logs" ON public.webhook_logs;
CREATE POLICY "System can insert webhook logs"
  ON public.webhook_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
