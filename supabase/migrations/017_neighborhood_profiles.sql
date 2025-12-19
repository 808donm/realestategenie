-- Migration 017: Neighborhood Profiles
-- Adds table for storing AI-generated neighborhood profiles

-- ============================================================================
-- NEIGHBORHOOD PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS neighborhood_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  neighborhood_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state_province TEXT NOT NULL,

  -- AI-generated content stored as JSONB
  profile_data JSONB NOT NULL,

  -- Metadata
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_downloaded_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for neighborhood_profiles
CREATE INDEX IF NOT EXISTS idx_neighborhood_profiles_agent_id ON neighborhood_profiles(agent_id);
CREATE INDEX IF NOT EXISTS idx_neighborhood_profiles_created_at ON neighborhood_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_neighborhood_profiles_neighborhood_name ON neighborhood_profiles(neighborhood_name);

-- RLS for neighborhood_profiles
ALTER TABLE neighborhood_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own profiles"
  ON neighborhood_profiles FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can create own profiles"
  ON neighborhood_profiles FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own profiles"
  ON neighborhood_profiles FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete own profiles"
  ON neighborhood_profiles FOR DELETE
  USING (agent_id = auth.uid());

COMMENT ON TABLE neighborhood_profiles IS 'AI-generated neighborhood profiles for client prospecting';
COMMENT ON COLUMN neighborhood_profiles.profile_data IS 'JSONB containing lifestyle_vibe, location_intelligence, market_pulse, community_resources, amenities';
