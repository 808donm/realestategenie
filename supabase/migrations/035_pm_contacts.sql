-- PM Contacts Table (for tenants and other contacts)
CREATE TABLE IF NOT EXISTS pm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Contact Information
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),

  -- Contact Type
  contact_type VARCHAR(50) NOT NULL DEFAULT 'tenant' CHECK (contact_type IN ('tenant', 'vendor', 'emergency', 'other')),

  -- GHL Integration (optional)
  ghl_contact_id VARCHAR(255),

  -- Additional Info
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pm_contacts_agent_id ON pm_contacts(agent_id);
CREATE INDEX idx_pm_contacts_email ON pm_contacts(email);
CREATE INDEX idx_pm_contacts_ghl_contact_id ON pm_contacts(ghl_contact_id);
CREATE INDEX idx_pm_contacts_contact_type ON pm_contacts(contact_type);

-- Updated at trigger
CREATE TRIGGER update_pm_contacts_updated_at
  BEFORE UPDATE ON pm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE pm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own contacts"
  ON pm_contacts FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can create their own contacts"
  ON pm_contacts FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update their own contacts"
  ON pm_contacts FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete their own contacts"
  ON pm_contacts FOR DELETE
  USING (agent_id = auth.uid());

-- Update pm_leases to reference pm_contacts instead of agents
-- First, make the column nullable temporarily
ALTER TABLE pm_leases ALTER COLUMN tenant_contact_id DROP NOT NULL;

-- Drop the old foreign key constraint
ALTER TABLE pm_leases DROP CONSTRAINT IF EXISTS pm_leases_tenant_contact_id_fkey;

-- Change the column type to match pm_contacts.id (UUID)
-- (it's already UUID, so this is just to be explicit)

-- Add new foreign key constraint pointing to pm_contacts
ALTER TABLE pm_leases
  ADD CONSTRAINT pm_leases_tenant_contact_id_fkey
  FOREIGN KEY (tenant_contact_id)
  REFERENCES pm_contacts(id)
  ON DELETE RESTRICT;

-- Make it NOT NULL again
ALTER TABLE pm_leases ALTER COLUMN tenant_contact_id SET NOT NULL;
