-- Migration: Enhanced PM Leases Table for Full Lifecycle Management
-- Adds fields for lease lifecycle, move-in/move-out, termination, and GHL contract integration
-- Works with existing schema from migration 023

-- Add new fields to pm_leases
ALTER TABLE pm_leases
  -- Lease type (new field for fixed-term vs month-to-month)
  ADD COLUMN IF NOT EXISTS lease_type TEXT NOT NULL DEFAULT 'fixed-term',

  -- GHL Contract Integration (ghl_contact_id already exists, adding contract ID)
  ADD COLUMN IF NOT EXISTS ghl_contract_id TEXT,

  -- Lease Document Type (lease_document_url already exists)
  ADD COLUMN IF NOT EXISTS lease_document_type TEXT DEFAULT 'standard',

  -- Notice period (configurable 30/45/60 days)
  ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30,

  -- Special Provisions (move-out requirements)
  ADD COLUMN IF NOT EXISTS requires_professional_carpet_cleaning BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_professional_house_cleaning BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS move_out_requirements JSONB,

  -- Lifecycle Tracking
  ADD COLUMN IF NOT EXISTS converted_to_mtm_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS renewal_status TEXT,

  -- Rent Adjustments (for month-to-month)
  ADD COLUMN IF NOT EXISTS rent_increase_history JSONB,

  -- Move-In Process
  ADD COLUMN IF NOT EXISTS move_in_report JSONB,
  ADD COLUMN IF NOT EXISTS move_in_report_submitted_date TIMESTAMP,

  -- Move-Out Notice
  ADD COLUMN IF NOT EXISTS notice_date DATE,
  ADD COLUMN IF NOT EXISTS move_out_date DATE,
  ADD COLUMN IF NOT EXISTS move_out_reason TEXT,
  ADD COLUMN IF NOT EXISTS move_out_checklist JSONB,
  ADD COLUMN IF NOT EXISTS move_out_checklist_submitted_date TIMESTAMP,

  -- Move-Out Inspection
  ADD COLUMN IF NOT EXISTS move_out_inspection JSONB,
  ADD COLUMN IF NOT EXISTS move_out_inspection_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS security_deposit_deductions JSONB,
  ADD COLUMN IF NOT EXISTS security_deposit_refund_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS actual_end_date DATE,

  -- Early Termination
  ADD COLUMN IF NOT EXISTS termination_date DATE,
  ADD COLUMN IF NOT EXISTS termination_type TEXT,
  ADD COLUMN IF NOT EXISTS termination_reason TEXT,
  ADD COLUMN IF NOT EXISTS termination_notes TEXT,
  ADD COLUMN IF NOT EXISTS termination_balance_owed NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS termination_documents JSONB,

  -- Billing
  ADD COLUMN IF NOT EXISTS final_balance NUMERIC(10,2);

-- Update the existing status check constraint to include new statuses
-- First drop the old constraint
ALTER TABLE pm_leases DROP CONSTRAINT IF EXISTS pm_leases_status_check;

-- Add updated constraint with new statuses for month-to-month and notice
ALTER TABLE pm_leases
ADD CONSTRAINT pm_leases_status_check
CHECK (status IN (
  'draft',
  'pending_start',
  'active',
  'ending',
  'ended',
  'terminated',
  -- New statuses for enhanced workflow
  'pending-signature',
  'active-fixed',
  'active-month-to-month',
  'notice-given'
));

-- Add check constraints for new fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pm_leases_lease_type_check'
  ) THEN
    ALTER TABLE pm_leases
    ADD CONSTRAINT pm_leases_lease_type_check
    CHECK (lease_type IN ('fixed-term', 'month-to-month'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pm_leases_termination_type_check'
  ) THEN
    ALTER TABLE pm_leases
    ADD CONSTRAINT pm_leases_termination_type_check
    CHECK (termination_type IN ('tenant-liable', 'for-cause', 'mutual-agreement') OR termination_type IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pm_leases_document_type_check'
  ) THEN
    ALTER TABLE pm_leases
    ADD CONSTRAINT pm_leases_document_type_check
    CHECK (lease_document_type IN ('standard', 'custom'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pm_leases_renewal_status_check'
  ) THEN
    ALTER TABLE pm_leases
    ADD CONSTRAINT pm_leases_renewal_status_check
    CHECK (renewal_status IN ('expiring-soon', 'renewing', 'converting-mtm', 'not-renewing') OR renewal_status IS NULL);
  END IF;
END
$$;

-- Add indexes for performance on new fields
CREATE INDEX IF NOT EXISTS idx_pm_leases_ghl_contract ON pm_leases(ghl_contract_id);
CREATE INDEX IF NOT EXISTS idx_pm_leases_lease_type ON pm_leases(lease_type);
CREATE INDEX IF NOT EXISTS idx_pm_leases_notice_date ON pm_leases(notice_date) WHERE notice_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_leases_move_out_date ON pm_leases(move_out_date) WHERE move_out_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_leases_renewal_status ON pm_leases(renewal_status) WHERE renewal_status IS NOT NULL;

-- Add credit check fields to pm_applications
ALTER TABLE pm_applications
  ADD COLUMN IF NOT EXISTS credit_check_result TEXT,
  ADD COLUMN IF NOT EXISTS credit_score INTEGER,
  ADD COLUMN IF NOT EXISTS approved_date TIMESTAMP;

-- Add check constraint for credit check result
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pm_applications_credit_check_check'
  ) THEN
    ALTER TABLE pm_applications
    ADD CONSTRAINT pm_applications_credit_check_check
    CHECK (credit_check_result IN ('approved', 'declined', 'pending') OR credit_check_result IS NULL);
  END IF;
END
$$;

-- Add index for credit check lookup
CREATE INDEX IF NOT EXISTS idx_pm_applications_credit_check ON pm_applications(credit_check_result);

-- Add last tenant move-out date to pm_units
ALTER TABLE pm_units
  ADD COLUMN IF NOT EXISTS last_tenant_move_out DATE;

-- Add helpful comments on new columns
COMMENT ON COLUMN pm_leases.lease_type IS 'Type of lease: fixed-term (1 year) or month-to-month';
COMMENT ON COLUMN pm_leases.ghl_contract_id IS 'GoHighLevel contract ID for e-signature integration';
COMMENT ON COLUMN pm_leases.lease_document_type IS 'Standard template or custom uploaded lease';
COMMENT ON COLUMN pm_leases.notice_period_days IS 'Required notice period (30/45/60 days) before move-out';
COMMENT ON COLUMN pm_leases.renewal_status IS 'Tracks renewal decision: expiring-soon, renewing, converting-mtm, not-renewing';
COMMENT ON COLUMN pm_leases.rent_increase_history IS 'JSON array of rent adjustments during month-to-month period';
COMMENT ON COLUMN pm_leases.move_in_report IS 'JSON of tenant-submitted move-in condition report';
COMMENT ON COLUMN pm_leases.move_out_checklist IS 'JSON of tenant-submitted move-out checklist and receipts';
COMMENT ON COLUMN pm_leases.move_out_inspection IS 'JSON of agent move-out inspection report';
COMMENT ON COLUMN pm_leases.security_deposit_deductions IS 'JSON itemized list of deductions from security deposit';
COMMENT ON COLUMN pm_leases.termination_type IS 'Reason for early termination if applicable';
COMMENT ON COLUMN pm_applications.credit_check_result IS 'Result of credit check: approved, declined, or pending';
COMMENT ON COLUMN pm_units.last_tenant_move_out IS 'Date when last tenant moved out (for vacancy tracking)';

-- Update existing data to use new lease_type field
-- All existing leases are assumed to be fixed-term
UPDATE pm_leases SET lease_type = 'fixed-term' WHERE lease_type IS NULL;
