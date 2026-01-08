-- Migration: Add payment_type to pm_rent_payments
-- Distinguishes between move-in invoices and monthly rent invoices

-- Add payment_type column
ALTER TABLE pm_rent_payments
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'monthly';

-- Add constraint for valid payment types
ALTER TABLE pm_rent_payments
DROP CONSTRAINT IF EXISTS pm_rent_payments_payment_type_check;

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

-- Add comment
COMMENT ON COLUMN pm_rent_payments.payment_type IS 'Type of payment: monthly (regular rent), move_in (first month + deposits), late_fee (late fee only), other';
