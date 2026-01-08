-- Add Stripe tracking fields to pm_rent_payments
ALTER TABLE pm_rent_payments
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pm_rent_payments_stripe_session
  ON pm_rent_payments(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pm_rent_payments_stripe_payment_intent
  ON pm_rent_payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
