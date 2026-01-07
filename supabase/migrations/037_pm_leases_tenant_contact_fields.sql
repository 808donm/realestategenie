-- Migration: Add tenant contact fields to pm_leases
-- Adds denormalized tenant contact fields for quick access

-- Add tenant contact fields
ALTER TABLE pm_leases
  ADD COLUMN IF NOT EXISTS tenant_name TEXT,
  ADD COLUMN IF NOT EXISTS tenant_email TEXT,
  ADD COLUMN IF NOT EXISTS tenant_phone TEXT;

-- Create indexes for searching
CREATE INDEX IF NOT EXISTS idx_pm_leases_tenant_email ON pm_leases(tenant_email);
CREATE INDEX IF NOT EXISTS idx_pm_leases_tenant_name ON pm_leases(tenant_name);

-- Add comments
COMMENT ON COLUMN pm_leases.tenant_name IS 'Denormalized tenant name for quick access';
COMMENT ON COLUMN pm_leases.tenant_email IS 'Denormalized tenant email for quick access and notifications';
COMMENT ON COLUMN pm_leases.tenant_phone IS 'Denormalized tenant phone for quick access';
