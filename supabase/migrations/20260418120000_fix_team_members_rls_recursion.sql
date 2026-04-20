-- Fix infinite RLS recursion on team_members policies.
--
-- The original team_members SELECT policy from migration 003_teams_workspaces.sql
-- queried team_members from within its own USING clause, which PostgreSQL
-- detects as infinite recursion. The INSERT/UPDATE/DELETE policies on the
-- same table had the identical self-referencing pattern. The teams SELECT
-- policy also queried team_members, forming an indirect cycle.
--
-- Fix: introduce SECURITY DEFINER helper functions that perform the
-- team-membership lookup bypassing RLS. Policies call the helpers instead
-- of embedding a subquery into the recursed table. This is the standard
-- Supabase pattern for breaking cross-table RLS cycles.
--
-- Idempotent: uses CREATE OR REPLACE FUNCTION and DROP POLICY IF EXISTS
-- so the migration can be re-run safely.

-- ─── 1. Helper functions (SECURITY DEFINER to bypass RLS internally) ────

CREATE OR REPLACE FUNCTION auth_user_team_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT team_id FROM team_members WHERE agent_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_user_team_admin_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT team_id FROM team_members
  WHERE agent_id = auth.uid() AND role IN ('owner', 'admin');
$$;

-- Lock down who can execute. Only authenticated users should use these.
REVOKE ALL ON FUNCTION auth_user_team_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_user_team_admin_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_user_team_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION auth_user_team_admin_ids() TO authenticated;

-- ─── 2. Rewrite team_members policies ──────────────────────────────────

DROP POLICY IF EXISTS "Team members can view team membership" ON team_members;
CREATE POLICY team_members_select ON team_members FOR SELECT
  USING (agent_id = auth.uid() OR team_id IN (SELECT auth_user_team_ids()));

DROP POLICY IF EXISTS "Team owners and admins can add members" ON team_members;
CREATE POLICY team_members_insert ON team_members FOR INSERT
  WITH CHECK (team_id IN (SELECT auth_user_team_admin_ids()));

DROP POLICY IF EXISTS "Team owners and admins can update members" ON team_members;
CREATE POLICY team_members_update ON team_members FOR UPDATE
  USING (team_id IN (SELECT auth_user_team_admin_ids()));

DROP POLICY IF EXISTS "Team owners and admins can remove members" ON team_members;
CREATE POLICY team_members_delete ON team_members FOR DELETE
  USING (team_id IN (SELECT auth_user_team_admin_ids()));

-- Also drop the 064_teams_and_roles.sql duplicate if still present.
DROP POLICY IF EXISTS team_members_view_own ON team_members;

-- ─── 3. Fix teams SELECT policy (indirect cycle partner) ───────────────

DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
CREATE POLICY teams_select ON teams FOR SELECT
  USING (owner_id = auth.uid() OR id IN (SELECT auth_user_team_ids()));

COMMENT ON FUNCTION auth_user_team_ids() IS
  'Returns team_ids the current auth user belongs to. SECURITY DEFINER so it bypasses RLS when scanning team_members — required to break the team_members ↔ teams policy recursion.';

COMMENT ON FUNCTION auth_user_team_admin_ids() IS
  'Returns team_ids where the current auth user is an owner or admin. SECURITY DEFINER.';
