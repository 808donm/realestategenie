-- Migration 034: PM Showings Table
-- Creates separate table for rental property showings within PM module

-- ============================================================================
-- PM SHOWINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pm_showings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  pm_property_id UUID NOT NULL REFERENCES pm_properties(id) ON DELETE CASCADE,

  -- Showing details
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),

  -- Optional notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pm_showings_agent_id ON pm_showings(agent_id);
CREATE INDEX IF NOT EXISTS idx_pm_showings_property_id ON pm_showings(pm_property_id);
CREATE INDEX IF NOT EXISTS idx_pm_showings_status ON pm_showings(status);
CREATE INDEX IF NOT EXISTS idx_pm_showings_start_at ON pm_showings(start_at);

-- Comments
COMMENT ON TABLE pm_showings IS 'Rental property showings - separate from sales open houses';
COMMENT ON COLUMN pm_showings.status IS 'draft (not visible), published (public QR code active), cancelled (past showing)';

-- ============================================================================
-- PUBLIC VIEW FOR RENTAL SHOWINGS
-- ============================================================================
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

-- Grant access to the view
GRANT SELECT ON public_pm_showing TO anon, authenticated;

COMMENT ON VIEW public_pm_showing IS 'Public view of published rental showings for attendee check-in';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE pm_showings ENABLE ROW LEVEL SECURITY;

-- Agents can view their own showings
CREATE POLICY pm_showings_agent_select ON pm_showings
  FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

-- Agents can create their own showings
CREATE POLICY pm_showings_agent_insert ON pm_showings
  FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());

-- Agents can update their own showings
CREATE POLICY pm_showings_agent_update ON pm_showings
  FOR UPDATE
  TO authenticated
  USING (agent_id = auth.uid());

-- Agents can delete their own showings
CREATE POLICY pm_showings_agent_delete ON pm_showings
  FOR DELETE
  TO authenticated
  USING (agent_id = auth.uid());

-- ============================================================================
-- UPDATE TRIGGER
-- ============================================================================
CREATE TRIGGER update_pm_showings_updated_at
  BEFORE UPDATE ON pm_showings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LINK APPLICATIONS TO SHOWINGS
-- ============================================================================
-- Add pm_showing_id to applications table
ALTER TABLE pm_applications
ADD COLUMN IF NOT EXISTS pm_showing_id UUID REFERENCES pm_showings(id) ON DELETE SET NULL;

-- Add index for showing lookups
CREATE INDEX IF NOT EXISTS idx_pm_applications_showing_id ON pm_applications(pm_showing_id);

COMMENT ON COLUMN pm_applications.pm_showing_id IS 'Link to the rental showing where this application was submitted';
