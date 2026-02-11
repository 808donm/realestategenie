-- Migration: Late Fee Configuration for Leases
-- Adds late fee settings to pm_leases table

ALTER TABLE pm_leases
  ADD COLUMN IF NOT EXISTS late_fee_grace_days INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS late_fee_type TEXT DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS late_fee_flat_amount NUMERIC(10,2) DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS late_fee_percentage NUMERIC(5,4) DEFAULT 0.05;

-- Constraint for late fee type
ALTER TABLE pm_leases DROP CONSTRAINT IF EXISTS pm_leases_late_fee_type_check;
ALTER TABLE pm_leases
ADD CONSTRAINT pm_leases_late_fee_type_check
CHECK (late_fee_type IN ('flat', 'percentage', 'both', 'none'));

-- Comments
COMMENT ON COLUMN pm_leases.late_fee_grace_days IS 'Number of days after due date before late fee is assessed (default: 5)';
COMMENT ON COLUMN pm_leases.late_fee_type IS 'Type of late fee: flat ($50), percentage (5%), both (flat + percentage), or none';
COMMENT ON COLUMN pm_leases.late_fee_flat_amount IS 'Flat late fee amount in dollars (e.g., $50)';
COMMENT ON COLUMN pm_leases.late_fee_percentage IS 'Percentage of rent as late fee (e.g., 0.05 = 5%)';

-- Set defaults for existing leases
UPDATE pm_leases
SET
  late_fee_grace_days = 5,
  late_fee_type = 'flat',
  late_fee_flat_amount = 50.00,
  late_fee_percentage = 0.05
WHERE
  late_fee_grace_days IS NULL;
