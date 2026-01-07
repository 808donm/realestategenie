-- Add ghl_payment_url column to pm_rent_payments
-- This stores the direct payment link URL from GHL Payment Links

ALTER TABLE pm_rent_payments
  ADD COLUMN IF NOT EXISTS ghl_payment_url TEXT;

COMMENT ON COLUMN pm_rent_payments.ghl_payment_url IS 'GHL Payment Link URL for tenant to pay via PayPal or other methods';
