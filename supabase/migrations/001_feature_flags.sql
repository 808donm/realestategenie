-- Feature Flags Table
-- Controls which features are enabled for each agent

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- MVP Features
  open_house_mvp BOOLEAN DEFAULT true,
  property_factsheet_upload BOOLEAN DEFAULT true,

  -- Future Features (Default OFF)
  marketing_packs BOOLEAN DEFAULT false,
  property_qa BOOLEAN DEFAULT false,
  idx_integration BOOLEAN DEFAULT false,
  transactions_os BOOLEAN DEFAULT false,
  documents_esign BOOLEAN DEFAULT false,
  vendor_directory BOOLEAN DEFAULT false,
  vendor_scheduling BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Agents can only read their own feature flags
CREATE POLICY "Agents can view own feature flags"
  ON feature_flags
  FOR SELECT
  USING (auth.uid() = agent_id);

-- Only system can update feature flags (admins would use service role)
CREATE POLICY "Only system can update feature flags"
  ON feature_flags
  FOR UPDATE
  USING (false);

-- Trigger to auto-create feature flags for new agents
CREATE OR REPLACE FUNCTION create_default_feature_flags()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO feature_flags (agent_id)
  VALUES (NEW.id)
  ON CONFLICT (agent_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_agent_created_create_feature_flags
  AFTER INSERT ON agents
  FOR EACH ROW
  EXECUTE FUNCTION create_default_feature_flags();

-- Create feature flags for existing agents
INSERT INTO feature_flags (agent_id)
SELECT id FROM agents
ON CONFLICT (agent_id) DO NOTHING;
