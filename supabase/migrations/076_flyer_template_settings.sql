-- Flyer Template Settings
-- Stores agent's customization preferences for open house flyers

CREATE TABLE flyer_template_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Template selection
  template_id TEXT NOT NULL, -- 'modern', 'classic', 'minimal', 'luxury', 'bold'

  -- Brand settings
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af', -- Brand primary color
  secondary_color TEXT DEFAULT '#64748b', -- Brand secondary color
  font_family TEXT DEFAULT 'inter', -- 'inter', 'montserrat', 'playfair', 'roboto'

  -- Property fields to display (boolean toggles)
  show_price BOOLEAN DEFAULT true,
  show_bedrooms BOOLEAN DEFAULT true,
  show_bathrooms BOOLEAN DEFAULT true,
  show_square_feet BOOLEAN DEFAULT true,
  show_lot_size BOOLEAN DEFAULT true,
  show_year_built BOOLEAN DEFAULT false,
  show_property_type BOOLEAN DEFAULT true,
  show_mls_number BOOLEAN DEFAULT false,

  -- Layout options
  header_style TEXT DEFAULT 'centered', -- 'centered', 'left', 'split'
  footer_style TEXT DEFAULT 'contact', -- 'contact', 'qr', 'minimal'
  image_layout TEXT DEFAULT 'hero', -- 'hero', 'grid', 'side'

  -- Agent contact preferences
  show_agent_photo BOOLEAN DEFAULT true,
  show_agent_phone BOOLEAN DEFAULT true,
  show_agent_email BOOLEAN DEFAULT true,
  show_agent_website BOOLEAN DEFAULT true,
  show_qr_code BOOLEAN DEFAULT false,

  -- Additional customization
  custom_tagline TEXT,
  custom_footer_text TEXT,

  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one settings record per agent
  UNIQUE(agent_id)
);

-- Index for faster lookups
CREATE INDEX idx_flyer_template_settings_agent ON flyer_template_settings(agent_id);

-- Enable RLS
ALTER TABLE flyer_template_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Agents can view their own template settings"
  ON flyer_template_settings
  FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert their own template settings"
  ON flyer_template_settings
  FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update their own template settings"
  ON flyer_template_settings
  FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete their own template settings"
  ON flyer_template_settings
  FOR DELETE
  USING (agent_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_flyer_template_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER flyer_template_settings_updated_at
  BEFORE UPDATE ON flyer_template_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_flyer_template_settings_updated_at();
