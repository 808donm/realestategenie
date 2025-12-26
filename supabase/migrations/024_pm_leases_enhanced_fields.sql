-- Migration: Enhanced PM Leases Table for Full Lifecycle Management
-- Adds fields for lease lifecycle, move-in/move-out, termination, and GHL contract integration

-- Add new fields to pm_leases
ALTER TABLE pm_leases
  -- Lease type and status enhancements
  ADD COLUMN IF NOT EXISTS lease_type TEXT NOT NULL DEFAULT 'fixed-term',
  ADD COLUMN IF NOT EXISTS lease_status TEXT NOT NULL DEFAULT 'pending-signature',

  -- GHL Contract Integration
  ADD COLUMN IF NOT EXISTS tenant_contact_id TEXT,
  ADD COLUMN IF NOT EXISTS ghl_contract_id TEXT,

  -- Lease Documents
  ADD COLUMN IF NOT EXISTS lease_document_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS custom_lease_url TEXT,

  -- Special Provisions (move-out requirements)
  ADD COLUMN IF NOT EXISTS requires_professional_carpet_cleaning BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_professional_house_cleaning BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS move_out_requirements JSONB,

  -- Lifecycle Tracking
  ADD COLUMN IF NOT EXISTS signed_date TIMESTAMP,
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

-- Add check constraints
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
    SELECT 1 FROM pg_constraint WHERE conname = 'pm_leases_lease_status_check'
  ) THEN
    ALTER TABLE pm_leases
    ADD CONSTRAINT pm_leases_lease_status_check
    CHECK (lease_status IN (
      'pending-signature',
      'active-fixed',
      'active-month-to-month',
      'notice-given',
      'ended',
      'terminated'
    ));
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
END
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pm_leases_ghl_contract ON pm_leases(ghl_contract_id);
CREATE INDEX IF NOT EXISTS idx_pm_leases_lease_status ON pm_leases(lease_status);
CREATE INDEX IF NOT EXISTS idx_pm_leases_end_date ON pm_leases(end_date) WHERE end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_leases_notice_date ON pm_leases(notice_date) WHERE notice_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_leases_move_out_date ON pm_leases(move_out_date) WHERE move_out_date IS NOT NULL;

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

-- Update RLS policies (already exist from previous migration, but ensure they cover new fields)
-- No changes needed - existing RLS policies on pm_leases, pm_applications, pm_units already cover all fields

-- Add helpful comments
COMMENT ON COLUMN pm_leases.lease_type IS 'Type of lease: fixed-term (1 year) or month-to-month';
COMMENT ON COLUMN pm_leases.lease_status IS 'Current status of the lease in its lifecycle';
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
