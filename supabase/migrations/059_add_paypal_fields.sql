-- Add PayPal tracking fields to pm_rent_payments
ALTER TABLE pm_rent_payments
  ADD COLUMN IF NOT EXISTS paypal_order_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_payment_id TEXT;

-- Add indexes for PayPal lookups
CREATE INDEX IF NOT EXISTS idx_pm_rent_payments_paypal_order
  ON pm_rent_payments(paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pm_rent_payments_paypal_payment
  ON pm_rent_payments(paypal_payment_id)
  WHERE paypal_payment_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN pm_rent_payments.paypal_order_id IS 'PayPal order ID created during checkout';
COMMENT ON COLUMN pm_rent_payments.paypal_payment_id IS 'PayPal payment/transaction ID after capture';
