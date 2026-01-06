-- Add ghl_document_id column to pm_leases table
-- This stores the GHL document ID when using direct document creation API

ALTER TABLE pm_leases
ADD COLUMN IF NOT EXISTS ghl_document_id TEXT;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_pm_leases_ghl_document_id
ON pm_leases(ghl_document_id)
WHERE ghl_document_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN pm_leases.ghl_document_id IS 'GHL document ID when using direct document creation API (not workflow trigger pattern)';
