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
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Team details
  name TEXT NOT NULL,
  description TEXT,

  -- Team lead (can be null if broker manages directly)
  team_lead_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- Broker who owns this team
  broker_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Settings
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_team_lead ON teams(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_teams_broker ON teams(broker_id);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);

COMMENT ON TABLE teams IS 'Teams of agents managed by team leads or brokers';

-- ============================================================================
-- TEAM MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Membership details
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  -- Performance tracking
  total_deals INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0.00,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure agent can't be in same team twice
  UNIQUE(team_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_agent ON team_members(agent_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active);

COMMENT ON TABLE team_members IS 'Relationship between teams and agents';

-- ============================================================================
-- BROKER HIERARCHIES (Who can see what)
-- ============================================================================
-- This helps track which broker can see which agents/teams
CREATE TABLE IF NOT EXISTS broker_hierarchies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  broker_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Can be direct report or through team
  relationship_type TEXT NOT NULL,
    CONSTRAINT broker_hierarchies_type_check CHECK (relationship_type IN ('direct', 'team_member', 'sub_broker')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(broker_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_broker_hierarchies_broker ON broker_hierarchies(broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_hierarchies_agent ON broker_hierarchies(agent_id);

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

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Teams: Broker and team lead can see their teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

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
