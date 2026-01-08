-- Add GHL invoice fields to pm_rent_payments
-- These fields store GHL invoice IDs and payment URLs

-- Add ghl_invoice_id column if it doesn't exist
ALTER TABLE pm_rent_payments
  ADD COLUMN IF NOT EXISTS ghl_invoice_id TEXT;

-- Add ghl_payment_url column if it doesn't exist
ALTER TABLE pm_rent_payments
  ADD COLUMN IF NOT EXISTS ghl_payment_url TEXT;

-- Add comments
COMMENT ON COLUMN pm_rent_payments.ghl_invoice_id IS 'GHL Invoice ID from invoice creation';
COMMENT ON COLUMN pm_rent_payments.ghl_payment_url IS 'GHL Payment URL for tenant to pay invoice';
