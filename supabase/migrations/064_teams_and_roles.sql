-- Migration: Teams, Roles, and Organizational Structure
-- Creates tables for managing teams, roles, and hierarchical structures for brokers and team leads

-- ============================================================================
-- AGENT ROLES
-- ============================================================================
-- Add role column to agents table
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add constraint for valid roles
ALTER TABLE agents
  DROP CONSTRAINT IF EXISTS agents_role_check;

ALTER TABLE agents
  ADD CONSTRAINT agents_role_check CHECK (role IN ('agent', 'team_lead', 'broker', 'admin'));

COMMENT ON COLUMN agents.role IS 'User role: agent (individual), team_lead (manages team), broker (manages all), admin (platform admin)';
COMMENT ON COLUMN agents.is_active IS 'Whether the agent account is active';

CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================
-- Create table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teams') THEN
    CREATE TABLE teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      team_lead_id UUID REFERENCES agents(id) ON DELETE SET NULL,
      broker_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Add columns if table already exists but columns are missing
ALTER TABLE teams ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_lead_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES agents(id) ON DELETE CASCADE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE teams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows to have non-null created_at/updated_at if needed
UPDATE teams SET created_at = NOW() WHERE created_at IS NULL;
UPDATE teams SET updated_at = NOW() WHERE updated_at IS NULL;

-- Add NOT NULL constraints after filling in values
DO $$
BEGIN
  -- Only add constraints if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'teams_name_not_null' AND table_name = 'teams'
  ) THEN
    ALTER TABLE teams ALTER COLUMN name SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'teams_broker_id_not_null' AND table_name = 'teams'
  ) THEN
    ALTER TABLE teams ALTER COLUMN broker_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'teams_created_at_not_null' AND table_name = 'teams'
  ) THEN
    ALTER TABLE teams ALTER COLUMN created_at SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'teams_updated_at_not_null' AND table_name = 'teams'
  ) THEN
    ALTER TABLE teams ALTER COLUMN updated_at SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teams_team_lead ON teams(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_teams_broker ON teams(broker_id);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);

COMMENT ON TABLE teams IS 'Teams of agents managed by team leads or brokers';

-- ============================================================================
-- TEAM MEMBERS TABLE
-- ============================================================================
-- Create table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_members') THEN
    CREATE TABLE team_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      left_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT true,
      total_deals INTEGER DEFAULT 0,
      total_revenue NUMERIC(12,2) DEFAULT 0.00,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(team_id, agent_id)
    );
  END IF;
END $$;

-- Add columns if table already exists but columns are missing
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS total_deals INTEGER DEFAULT 0;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows
UPDATE team_members SET joined_at = NOW() WHERE joined_at IS NULL;
UPDATE team_members SET created_at = NOW() WHERE created_at IS NULL;
UPDATE team_members SET updated_at = NOW() WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_agent ON team_members(agent_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_members_team_id_agent_id_key'
  ) THEN
    ALTER TABLE team_members ADD CONSTRAINT team_members_team_id_agent_id_key UNIQUE(team_id, agent_id);
  END IF;
END $$;

COMMENT ON TABLE team_members IS 'Relationship between teams and agents';

-- ============================================================================
-- BROKER HIERARCHIES (Who can see what)
-- ============================================================================
-- This helps track which broker can see which agents/teams
-- Create table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'broker_hierarchies') THEN
    CREATE TABLE broker_hierarchies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      broker_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      relationship_type TEXT NOT NULL CHECK (relationship_type IN ('direct', 'team_member', 'sub_broker')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(broker_id, agent_id)
    );
  END IF;
END $$;

-- Add columns if table already exists but columns are missing
ALTER TABLE broker_hierarchies ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES agents(id) ON DELETE CASCADE;
ALTER TABLE broker_hierarchies ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;
ALTER TABLE broker_hierarchies ADD COLUMN IF NOT EXISTS relationship_type TEXT;
ALTER TABLE broker_hierarchies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows
UPDATE broker_hierarchies SET created_at = NOW() WHERE created_at IS NULL;

-- Add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'broker_hierarchies_type_check'
  ) THEN
    ALTER TABLE broker_hierarchies ADD CONSTRAINT broker_hierarchies_type_check
      CHECK (relationship_type IN ('direct', 'team_member', 'sub_broker'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_broker_hierarchies_broker ON broker_hierarchies(broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_hierarchies_agent ON broker_hierarchies(agent_id);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'broker_hierarchies_broker_id_agent_id_key'
  ) THEN
    ALTER TABLE broker_hierarchies ADD CONSTRAINT broker_hierarchies_broker_id_agent_id_key UNIQUE(broker_id, agent_id);
  END IF;
END $$;

COMMENT ON TABLE broker_hierarchies IS 'Tracks which brokers can view which agents data';

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS teams_updated_at ON teams;
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

DROP TRIGGER IF EXISTS team_members_updated_at ON team_members;
CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Teams: Broker and team lead can see their teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teams_view_own ON teams;
CREATE POLICY teams_view_own
  ON teams
  FOR SELECT
  USING (
    broker_id = auth.uid() OR
    team_lead_id = auth.uid() OR
    -- Agents can see their own team
    id IN (SELECT team_id FROM team_members WHERE agent_id = auth.uid() AND is_active = true)
  );

-- Team members: Viewable by broker, team lead, and team members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_members_view_own ON team_members;
CREATE POLICY team_members_view_own
  ON team_members
  FOR SELECT
  USING (
    agent_id = auth.uid() OR
    team_id IN (
      SELECT id FROM teams
      WHERE broker_id = auth.uid() OR team_lead_id = auth.uid()
    )
  );

-- Broker hierarchies: Only viewable by the broker
ALTER TABLE broker_hierarchies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS broker_hierarchies_view_own ON broker_hierarchies;
CREATE POLICY broker_hierarchies_view_own
  ON broker_hierarchies
  FOR SELECT
  USING (broker_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get all agents under a broker (including through teams)
CREATE OR REPLACE FUNCTION get_broker_agents(broker_uuid UUID)
RETURNS TABLE(agent_id UUID, agent_name TEXT, agent_email TEXT, team_name TEXT, relationship TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    a.id,
    a.display_name,
    a.email,
    t.name,
    CASE
      WHEN tm.team_id IS NOT NULL THEN 'team_member'
      WHEN a.id IN (SELECT agent_id FROM broker_hierarchies WHERE broker_id = broker_uuid AND relationship_type = 'direct') THEN 'direct'
      ELSE 'other'
    END AS relationship
  FROM agents a
  LEFT JOIN team_members tm ON tm.agent_id = a.id AND tm.is_active = true
  LEFT JOIN teams t ON t.id = tm.team_id
  WHERE (
    -- Direct reports
    a.id IN (SELECT agent_id FROM broker_hierarchies WHERE broker_id = broker_uuid)
    OR
    -- Team members of broker's teams
    tm.team_id IN (SELECT id FROM teams WHERE broker_id = broker_uuid)
  )
  AND a.is_active = true
  AND a.id != broker_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team lead's agents
CREATE OR REPLACE FUNCTION get_team_lead_agents(lead_uuid UUID)
RETURNS TABLE(agent_id UUID, agent_name TEXT, agent_email TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.display_name,
    a.email
  FROM agents a
  INNER JOIN team_members tm ON tm.agent_id = a.id
  INNER JOIN teams t ON t.id = tm.team_id
  WHERE t.team_lead_id = lead_uuid
    AND tm.is_active = true
    AND a.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA: Set first user as broker (if exists)
-- ============================================================================
-- This is optional - you can manually set roles instead
-- UPDATE agents SET role = 'broker' WHERE created_at = (SELECT MIN(created_at) FROM agents) LIMIT 1;
