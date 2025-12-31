-- Add GoHighLevel (GHL) tracking fields to pm_leases table
-- This migration adds fields to support GHL Documents & Contracts integration

-- Add GHL contact ID (the tenant contact in GHL)
ALTER TABLE pm_leases
ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT;

-- Add GHL document URL (the signed lease PDF from GHL)
ALTER TABLE pm_leases
ADD COLUMN IF NOT EXISTS ghl_document_url TEXT;

-- Add GHL template ID (which template was used)
ALTER TABLE pm_leases
ADD COLUMN IF NOT EXISTS ghl_template_id TEXT;

-- Add additional lease fields for form data
ALTER TABLE pm_leases
ADD COLUMN IF NOT EXISTS subletting_allowed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pet_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pet_types TEXT,
ADD COLUMN IF NOT EXISTS pet_weight_limit TEXT,
ADD COLUMN IF NOT EXISTS authorized_occupants TEXT,
ADD COLUMN IF NOT EXISTS late_fee_amount TEXT DEFAULT '$50.00',
ADD COLUMN IF NOT EXISTS late_fee_type TEXT DEFAULT 'per occurrence',
ADD COLUMN IF NOT EXISTS late_grace_days INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS nsf_fee DECIMAL(10,2) DEFAULT 35.00,
ADD COLUMN IF NOT EXISTS deposit_return_days INTEGER DEFAULT 60;

-- Add index for GHL contact lookups
CREATE INDEX IF NOT EXISTS idx_pm_leases_ghl_contact
ON pm_leases(ghl_contact_id)
WHERE ghl_contact_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN pm_leases.ghl_contact_id IS 'GoHighLevel contact ID for the tenant';
COMMENT ON COLUMN pm_leases.ghl_document_url IS 'URL to signed lease document in GHL storage';
COMMENT ON COLUMN pm_leases.ghl_template_id IS 'GHL template ID used for this lease';
COMMENT ON COLUMN pm_leases.subletting_allowed IS 'Whether tenant may sublet the property';
COMMENT ON COLUMN pm_leases.pets_allowed IS 'Whether pets are allowed';
COMMENT ON COLUMN pm_leases.pet_count IS 'Maximum number of pets allowed';
COMMENT ON COLUMN pm_leases.pet_types IS 'Allowed pet types (e.g., "Dogs, Cats")';
COMMENT ON COLUMN pm_leases.pet_weight_limit IS 'Maximum pet weight (e.g., "50 pounds")';
COMMENT ON COLUMN pm_leases.authorized_occupants IS 'Names of all authorized occupants';
COMMENT ON COLUMN pm_leases.late_fee_amount IS 'Late fee amount (e.g., "$50.00" or "5%")';
COMMENT ON COLUMN pm_leases.late_fee_type IS 'How late fee is calculated: "per day" or "per occurrence"';
COMMENT ON COLUMN pm_leases.late_grace_days IS 'Days after due date before late fee applies';
COMMENT ON COLUMN pm_leases.nsf_fee IS 'Fee for returned/insufficient funds check';
COMMENT ON COLUMN pm_leases.deposit_return_days IS 'Days to return security deposit (state-specific)';
