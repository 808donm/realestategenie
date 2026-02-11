-- Teams/Workspaces for Multi-Agent Support
-- Allows solo agents to form teams and share resources

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, agent_id)
);

-- Indexes
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_agent_id ON team_members(agent_id);

-- RLS Policies for Teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their teams"
  ON teams
  FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_members WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents can create teams"
  ON teams
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update their teams"
  ON teams
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Team owners can delete their teams"
  ON teams
  FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for Team Members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view team membership"
  ON team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "Team owners and admins can add members"
  ON team_members
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE agent_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can update members"
  ON team_members
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE agent_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can remove members"
  ON team_members
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE agent_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Trigger to auto-add owner as team member
CREATE OR REPLACE FUNCTION add_owner_to_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (team_id, agent_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_team_created_add_owner
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_team();
