-- Migration 034: PM Showings Table (Simplified)
-- Creates table for rental property showings

-- First, check if table exists and drop it to start fresh
DROP TABLE IF EXISTS pm_showings CASCADE;
DROP VIEW IF EXISTS public_pm_showing CASCADE;

-- Create the pm_showings table
CREATE TABLE pm_showings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  pm_property_id UUID NOT NULL REFERENCES pm_properties(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pm_showings_status_check CHECK (status IN ('draft', 'published', 'cancelled'))
);

-- Create indexes
CREATE INDEX idx_pm_showings_agent_id ON pm_showings(agent_id);
CREATE INDEX idx_pm_showings_property_id ON pm_showings(pm_property_id);
CREATE INDEX idx_pm_showings_status ON pm_showings(status);
CREATE INDEX idx_pm_showings_start_at ON pm_showings(start_at);

-- Enable RLS
ALTER TABLE pm_showings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY pm_showings_agent_select ON pm_showings
  FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY pm_showings_agent_insert ON pm_showings
  FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY pm_showings_agent_update ON pm_showings
  FOR UPDATE TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY pm_showings_agent_delete ON pm_showings
  FOR DELETE TO authenticated
  USING (agent_id = auth.uid());

-- Create update trigger
CREATE TRIGGER update_pm_showings_updated_at
  BEFORE UPDATE ON pm_showings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create public view for showings
CREATE VIEW public_pm_showing AS
SELECT
  s.id,
  s.pm_property_id,
  s.start_at,
  s.end_at,
  s.notes,
  p.address,
  p.city,
  p.state_province,
  p.zip_postal_code,
  p.property_type,
  p.bedrooms,
  p.bathrooms,
  p.square_feet,
  p.monthly_rent,
  p.security_deposit,
  p.pet_policy,
  p.description,
  p.amenities,
  p.features,
  p.property_photo_url,
  a.display_name,
  a.license_number,
  a.phone_e164,
  a.headshot_url,
  a.company_logo_url
FROM pm_showings s
JOIN pm_properties p ON s.pm_property_id = p.id
JOIN agents a ON s.agent_id = a.id
WHERE s.status = 'published';

-- Grant access to view
GRANT SELECT ON public_pm_showing TO anon, authenticated;

-- Add pm_showing_id column to applications table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pm_applications'
    AND column_name = 'pm_showing_id'
  ) THEN
    ALTER TABLE pm_applications
    ADD COLUMN pm_showing_id UUID REFERENCES pm_showings(id) ON DELETE SET NULL;

    CREATE INDEX idx_pm_applications_showing_id ON pm_applications(pm_showing_id);
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE pm_showings IS 'Rental property showings - separate from sales open houses';
COMMENT ON VIEW public_pm_showing IS 'Public view of published rental showings for attendee check-in';
