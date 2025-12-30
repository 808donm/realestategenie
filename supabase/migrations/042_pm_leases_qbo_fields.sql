-- Add QuickBooks Online tracking fields to pm_leases
-- Migration: 042_pm_leases_qbo_fields.sql

ALTER TABLE pm_leases
ADD COLUMN IF NOT EXISTS qbo_customer_id TEXT,
ADD COLUMN IF NOT EXISTS qbo_invoice_id TEXT;

-- Add index for QBO invoice lookups
CREATE INDEX IF NOT EXISTS idx_pm_leases_qbo_invoice ON pm_leases(qbo_invoice_id) WHERE qbo_invoice_id IS NOT NULL;

-- Add QuickBooks tracking fields to pm_rent_payments
ALTER TABLE pm_rent_payments
ADD COLUMN IF NOT EXISTS qbo_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS qbo_payment_id TEXT;

-- Add index for QBO payment lookups
CREATE INDEX IF NOT EXISTS idx_pm_rent_payments_qbo_invoice ON pm_rent_payments(qbo_invoice_id) WHERE qbo_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_rent_payments_qbo_payment ON pm_rent_payments(qbo_payment_id) WHERE qbo_payment_id IS NOT NULL;
