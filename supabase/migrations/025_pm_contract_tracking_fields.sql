-- Migration: Add Contract Signing and Invoice Tracking Fields
-- Adds fields to track when contracts are signed and first invoices

-- Add contract tracking fields to pm_leases
ALTER TABLE pm_leases
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS first_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS first_invoice_sent_at TIMESTAMP;

-- Add lease signed tracking to pm_applications
ALTER TABLE pm_applications
  ADD COLUMN IF NOT EXISTS lease_signed_at TIMESTAMP;

-- Add helpful comments
COMMENT ON COLUMN pm_leases.contract_signed_at IS 'Timestamp when contract was fully executed (all parties signed)';
COMMENT ON COLUMN pm_leases.first_invoice_id IS 'GHL invoice ID for first month move-in charges';
COMMENT ON COLUMN pm_leases.first_invoice_sent_at IS 'Timestamp when first invoice was sent to tenant';
COMMENT ON COLUMN pm_applications.lease_signed_at IS 'Timestamp when lease contract was signed (after approval)';

-- Add index for contract tracking
CREATE INDEX IF NOT EXISTS idx_pm_leases_contract_signed ON pm_leases(contract_signed_at) WHERE contract_signed_at IS NOT NULL;
