-- Add GHL invoice fields and payment_type to pm_rent_payments
-- These fields store GHL invoice IDs, payment URLs, and payment types

-- Add payment_type column (from migration 056)
ALTER TABLE pm_rent_payments
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'monthly';

-- Add ghl_invoice_id column if it doesn't exist
ALTER TABLE pm_rent_payments
  ADD COLUMN IF NOT EXISTS ghl_invoice_id TEXT;

-- Add ghl_payment_url column if it doesn't exist
ALTER TABLE pm_rent_payments
  ADD COLUMN IF NOT EXISTS ghl_payment_url TEXT;

-- Drop existing constraint if exists (to avoid duplicate constraint error)
ALTER TABLE pm_rent_payments
  DROP CONSTRAINT IF EXISTS pm_rent_payments_payment_type_check;

-- Add constraint for valid payment types
ALTER TABLE pm_rent_payments
  ADD CONSTRAINT pm_rent_payments_payment_type_check
  CHECK (payment_type IN ('monthly', 'move_in', 'late_fee', 'other'));

-- Add index for filtering by payment type
CREATE INDEX IF NOT EXISTS idx_pm_rent_payments_payment_type
  ON pm_rent_payments(payment_type);

-- Update existing records without payment_type to 'monthly' (default)
UPDATE pm_rent_payments
  SET payment_type = 'monthly'
  WHERE payment_type IS NULL;

-- Add comments
COMMENT ON COLUMN pm_rent_payments.payment_type IS 'Type of payment: monthly (regular rent), move_in (first month + deposits), late_fee (late fee only), other';
COMMENT ON COLUMN pm_rent_payments.ghl_invoice_id IS 'GHL Invoice ID from invoice creation';
COMMENT ON COLUMN pm_rent_payments.ghl_payment_url IS 'GHL Payment URL for tenant to pay invoice';
