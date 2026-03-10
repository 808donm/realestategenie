-- Seller Map Saved Searches
-- Stores agent-specific saved search configurations for the Seller Opportunity Map

CREATE TABLE IF NOT EXISTS seller_map_saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_miles DOUBLE PRECISION NOT NULL DEFAULT 2,
  filters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_seller_map_searches_agent ON seller_map_saved_searches(agent_id);
CREATE INDEX idx_seller_map_searches_team ON seller_map_saved_searches(team_id);

-- Row Level Security
ALTER TABLE seller_map_saved_searches ENABLE ROW LEVEL SECURITY;

-- Agents can see their own searches + team searches
CREATE POLICY "agents_own_searches" ON seller_map_saved_searches
  FOR ALL
  USING (
    agent_id = auth.uid()
    OR team_id IN (
      SELECT team_id FROM team_members WHERE agent_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (agent_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_seller_map_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seller_map_searches_updated_at
  BEFORE UPDATE ON seller_map_saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_map_searches_updated_at();
