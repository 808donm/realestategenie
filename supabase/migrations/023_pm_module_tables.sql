-- Migration 023: Property Management Module Tables
-- Adds core PM tables for lightweight property management

-- ============================================================================
-- PM PROPERTIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pm_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Address
  address TEXT NOT NULL,
  city TEXT,
  state_province TEXT,
  zip_postal_code TEXT,

  -- Property details
  property_type TEXT NOT NULL DEFAULT 'single_family',
    CONSTRAINT pm_properties_type_check CHECK (property_type IN ('single_family', 'condo', 'townhome', 'duplex', 'multi_unit')),
  units_count INTEGER NOT NULL DEFAULT 1,

  -- Owner (optional for v1)
  owner_contact_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- Rental terms (for single-unit properties)
  monthly_rent NUMERIC(10,2),
  security_deposit NUMERIC(10,2),
  pet_deposit NUMERIC(10,2),
  pet_policy TEXT,
  amenities TEXT[],

  -- Media
  property_photo_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'available',
    CONSTRAINT pm_properties_status_check CHECK (status IN ('available', 'rented', 'maintenance', 'unavailable')),

  -- Integration IDs
  ghl_custom_object_id TEXT,
  qbo_property_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_properties_agent_id ON pm_properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_pm_properties_status ON pm_properties(status);
CREATE INDEX IF NOT EXISTS idx_pm_properties_ghl_id ON pm_properties(ghl_custom_object_id);

COMMENT ON TABLE pm_properties IS 'Rental properties in PM portfolio (not sales listings)';
COMMENT ON COLUMN pm_properties.units_count IS 'Number of rentable units (1 for single-family, 2+ for multi-unit)';

-- ============================================================================
-- PM UNITS TABLE (for multi-unit properties)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pm_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pm_property_id UUID NOT NULL REFERENCES pm_properties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Unit details
  unit_number TEXT NOT NULL,
  monthly_rent NUMERIC(10,2) NOT NULL,
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  sqft INTEGER,

  -- Status
  status TEXT NOT NULL DEFAULT 'available',
    CONSTRAINT pm_units_status_check CHECK (status IN ('available', 'rented', 'maintenance', 'unavailable')),

  -- Integration IDs
  ghl_custom_object_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(pm_property_id, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_pm_units_property_id ON pm_units(pm_property_id);
CREATE INDEX IF NOT EXISTS idx_pm_units_agent_id ON pm_units(agent_id);
CREATE INDEX IF NOT EXISTS idx_pm_units_status ON pm_units(status);

COMMENT ON TABLE pm_units IS 'Individual rentable units for multi-unit properties';

-- ============================================================================
-- PM APPLICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pm_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Property/Unit link
  pm_property_id UUID REFERENCES pm_properties(id) ON DELETE SET NULL,
  pm_unit_id UUID REFERENCES pm_units(id) ON DELETE SET NULL,

  -- Link to lead submission (reuse contact data)
  lead_submission_id UUID REFERENCES lead_submissions(id) ON DELETE SET NULL,

  -- Applicant info (denormalized for quick access)
  applicant_name TEXT NOT NULL,
  applicant_email TEXT,
  applicant_phone TEXT,

  -- Application-specific fields
  employment_status TEXT,
  employer_name TEXT,
  annual_income NUMERIC(12,2),
  current_address TEXT,
  move_in_date DATE,
  applicant_references JSONB, -- [{name, phone, relationship}]
  pets JSONB, -- [{type, breed, weight}]
  emergency_contact JSONB, -- {name, phone, relationship}

  -- Full application data
  application_data JSONB,

  -- Application status
  status TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT pm_applications_status_check CHECK (status IN ('pending', 'screening', 'approved', 'rejected', 'withdrawn')),
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- Credit check
  credit_authorized BOOLEAN DEFAULT FALSE,
  credit_authorization_signed_at TIMESTAMPTZ,

  -- GHL sync
  ghl_contact_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_applications_agent_id ON pm_applications(agent_id);
CREATE INDEX IF NOT EXISTS idx_pm_applications_property_id ON pm_applications(pm_property_id);
CREATE INDEX IF NOT EXISTS idx_pm_applications_unit_id ON pm_applications(pm_unit_id);
CREATE INDEX IF NOT EXISTS idx_pm_applications_status ON pm_applications(status);
CREATE INDEX IF NOT EXISTS idx_pm_applications_lead_id ON pm_applications(lead_submission_id);

COMMENT ON TABLE pm_applications IS 'Rental applications submitted via rental open house check-ins';

-- ============================================================================
-- PM LEASES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pm_leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Property/Unit link
  pm_property_id UUID REFERENCES pm_properties(id) ON DELETE SET NULL,
  pm_unit_id UUID REFERENCES pm_units(id) ON DELETE SET NULL,

  -- Application link (optional - could be manual lease entry)
  pm_application_id UUID REFERENCES pm_applications(id) ON DELETE SET NULL,

  -- Tenant (stored in agents table as contacts)
  tenant_contact_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,

  -- Lease terms
  lease_start_date DATE NOT NULL,
  lease_end_date DATE NOT NULL,
  monthly_rent NUMERIC(10,2) NOT NULL,
  security_deposit NUMERIC(10,2),
  pet_deposit NUMERIC(10,2),
  rent_due_day INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT pm_leases_due_day_check CHECK (rent_due_day >= 1 AND rent_due_day <= 31),

  -- Lease status
  status TEXT NOT NULL DEFAULT 'draft',
    CONSTRAINT pm_leases_status_check CHECK (status IN ('draft', 'pending_start', 'active', 'ending', 'ended', 'terminated')),
  signed_at TIMESTAMPTZ,
  lease_document_url TEXT,

  -- Billing automation
  auto_invoice_enabled BOOLEAN DEFAULT TRUE,
  last_invoice_generated_at TIMESTAMPTZ,
  next_invoice_date DATE,

  -- GHL sync
  ghl_custom_object_id TEXT,
  ghl_contact_id TEXT,

  -- QBO sync
  qbo_customer_id TEXT,
  qbo_sync_enabled BOOLEAN DEFAULT FALSE,
  last_qbo_sync_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_leases_agent_id ON pm_leases(agent_id);
CREATE INDEX IF NOT EXISTS idx_pm_leases_property_id ON pm_leases(pm_property_id);
CREATE INDEX IF NOT EXISTS idx_pm_leases_unit_id ON pm_leases(pm_unit_id);
CREATE INDEX IF NOT EXISTS idx_pm_leases_tenant_id ON pm_leases(tenant_contact_id);
CREATE INDEX IF NOT EXISTS idx_pm_leases_status ON pm_leases(status);
CREATE INDEX IF NOT EXISTS idx_pm_leases_start_date ON pm_leases(lease_start_date);
CREATE INDEX IF NOT EXISTS idx_pm_leases_end_date ON pm_leases(lease_end_date);

COMMENT ON TABLE pm_leases IS 'Active lease agreements - drives recurring rent invoicing';
COMMENT ON COLUMN pm_leases.auto_invoice_enabled IS 'If true, automatically generate monthly rent invoices';

-- ============================================================================
-- PM WORK ORDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pm_work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Property/Unit link
  pm_property_id UUID NOT NULL REFERENCES pm_properties(id) ON DELETE CASCADE,
  pm_unit_id UUID REFERENCES pm_units(id) ON DELETE SET NULL,
  pm_lease_id UUID REFERENCES pm_leases(id) ON DELETE SET NULL,

  -- Work order details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
    CONSTRAINT pm_work_orders_category_check CHECK (category IN ('plumbing', 'electrical', 'hvac', 'appliance', 'pest', 'general', 'emergency')),
  priority TEXT NOT NULL DEFAULT 'medium',
    CONSTRAINT pm_work_orders_priority_check CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
  status TEXT NOT NULL DEFAULT 'new',
    CONSTRAINT pm_work_orders_status_check CHECK (status IN ('new', 'assigned', 'in_progress', 'waiting', 'completed', 'cancelled')),

  -- People
  reported_by_contact_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  assigned_to_vendor_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- Resolution
  estimated_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  completed_at TIMESTAMPTZ,
  notes TEXT,

  -- Attachments
  photos TEXT[],

  -- GHL sync
  ghl_custom_object_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_work_orders_agent_id ON pm_work_orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_pm_work_orders_property_id ON pm_work_orders(pm_property_id);
CREATE INDEX IF NOT EXISTS idx_pm_work_orders_unit_id ON pm_work_orders(pm_unit_id);
CREATE INDEX IF NOT EXISTS idx_pm_work_orders_lease_id ON pm_work_orders(pm_lease_id);
CREATE INDEX IF NOT EXISTS idx_pm_work_orders_status ON pm_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_pm_work_orders_priority ON pm_work_orders(priority);

COMMENT ON TABLE pm_work_orders IS 'Maintenance requests and work orders';

-- ============================================================================
-- EXTEND OPEN HOUSE EVENTS TABLE
-- ============================================================================

ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'sales',
ADD COLUMN IF NOT EXISTS pm_property_id UUID REFERENCES pm_properties(id) ON DELETE SET NULL;

ALTER TABLE open_house_events
ADD CONSTRAINT open_house_events_type_check CHECK (event_type IN ('sales', 'rental', 'both'));

CREATE INDEX IF NOT EXISTS idx_open_house_events_type ON open_house_events(event_type);
CREATE INDEX IF NOT EXISTS idx_open_house_events_pm_property ON open_house_events(pm_property_id);

COMMENT ON COLUMN open_house_events.event_type IS 'sales = traditional listing, rental = rental showing, both = attendee chooses';
COMMENT ON COLUMN open_house_events.pm_property_id IS 'Link to rental property if event_type is rental or both';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- PM Properties
ALTER TABLE pm_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own PM properties"
  ON pm_properties FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can create own PM properties"
  ON pm_properties FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own PM properties"
  ON pm_properties FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete own PM properties"
  ON pm_properties FOR DELETE
  USING (agent_id = auth.uid());

-- PM Units
ALTER TABLE pm_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own PM units"
  ON pm_units FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can create own PM units"
  ON pm_units FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own PM units"
  ON pm_units FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete own PM units"
  ON pm_units FOR DELETE
  USING (agent_id = auth.uid());

-- PM Applications
ALTER TABLE pm_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own PM applications"
  ON pm_applications FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can create own PM applications"
  ON pm_applications FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own PM applications"
  ON pm_applications FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete own PM applications"
  ON pm_applications FOR DELETE
  USING (agent_id = auth.uid());

-- PM Leases
ALTER TABLE pm_leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own PM leases"
  ON pm_leases FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can create own PM leases"
  ON pm_leases FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own PM leases"
  ON pm_leases FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete own PM leases"
  ON pm_leases FOR DELETE
  USING (agent_id = auth.uid());

-- PM Work Orders
ALTER TABLE pm_work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own PM work orders"
  ON pm_work_orders FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can create own PM work orders"
  ON pm_work_orders FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own PM work orders"
  ON pm_work_orders FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete own PM work orders"
  ON pm_work_orders FOR DELETE
  USING (agent_id = auth.uid());
