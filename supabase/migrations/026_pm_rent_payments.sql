-- Migration: Rent Payment Tracking
-- Tracks all rent payments (invoices) for active leases

CREATE TABLE IF NOT EXISTS pm_rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  lease_id UUID NOT NULL REFERENCES pm_leases(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_contact_id TEXT NOT NULL, -- GHL contact ID

  -- Payment details
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  month INTEGER NOT NULL, -- 1-12
  year INTEGER NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'void'

  -- GHL integration
  ghl_invoice_id TEXT,
  invoice_sent_at TIMESTAMP,

  -- Payment tracking
  paid_at TIMESTAMP,
  payment_method TEXT, -- 'stripe', 'paypal', 'check', 'cash', 'other'
  payment_reference TEXT, -- Stripe payment intent ID, PayPal transaction ID, check number

  -- Late fees
  late_fee_amount NUMERIC(10,2) DEFAULT 0,
  late_fee_assessed_at TIMESTAMP,
  late_fee_waived BOOLEAN DEFAULT false,
  late_fee_waived_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_pm_rent_payments_lease ON pm_rent_payments(lease_id);
CREATE INDEX idx_pm_rent_payments_agent ON pm_rent_payments(agent_id);
CREATE INDEX idx_pm_rent_payments_status ON pm_rent_payments(status);
CREATE INDEX idx_pm_rent_payments_due_date ON pm_rent_payments(due_date);
CREATE INDEX idx_pm_rent_payments_month_year ON pm_rent_payments(month, year);
CREATE INDEX idx_pm_rent_payments_ghl_invoice ON pm_rent_payments(ghl_invoice_id) WHERE ghl_invoice_id IS NOT NULL;

-- Unique constraint: one invoice per lease per month
CREATE UNIQUE INDEX idx_pm_rent_payments_unique_month ON pm_rent_payments(lease_id, month, year);

-- Status constraint
ALTER TABLE pm_rent_payments
ADD CONSTRAINT pm_rent_payments_status_check
CHECK (status IN ('pending', 'paid', 'overdue', 'void', 'partial'));

-- Payment method constraint
ALTER TABLE pm_rent_payments
ADD CONSTRAINT pm_rent_payments_payment_method_check
CHECK (payment_method IN ('stripe', 'paypal', 'check', 'cash', 'bank_transfer', 'other') OR payment_method IS NULL);

-- RLS Policies
ALTER TABLE pm_rent_payments ENABLE ROW LEVEL SECURITY;

-- Agents can view their own rent payments
CREATE POLICY pm_rent_payments_agent_select ON pm_rent_payments
  FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

-- Agents can insert their own rent payments (via cron or manual)
CREATE POLICY pm_rent_payments_agent_insert ON pm_rent_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());

-- Agents can update their own rent payments
CREATE POLICY pm_rent_payments_agent_update ON pm_rent_payments
  FOR UPDATE
  TO authenticated
  USING (agent_id = auth.uid());

-- Service role can do anything (for cron jobs)
CREATE POLICY pm_rent_payments_service_all ON pm_rent_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE pm_rent_payments IS 'Tracks all rent invoices and payments for active leases';
COMMENT ON COLUMN pm_rent_payments.status IS 'Payment status: pending (not paid yet), paid (fully paid), overdue (past due date), void (cancelled), partial (partially paid)';
COMMENT ON COLUMN pm_rent_payments.ghl_invoice_id IS 'GoHighLevel invoice ID for syncing payment status';
COMMENT ON COLUMN pm_rent_payments.late_fee_amount IS 'Late fee assessed if payment is overdue';
COMMENT ON COLUMN pm_rent_payments.payment_reference IS 'External payment reference (Stripe payment intent, PayPal transaction, check number, etc.)';
