-- Migration: Agent Billing and Subscription Management
-- Creates tables for tracking agent subscriptions, invoices, and payments to the platform

-- ============================================================================
-- AGENT SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Subscription details
  plan_type TEXT NOT NULL DEFAULT 'free',
    CONSTRAINT agent_subscriptions_plan_check CHECK (plan_type IN ('free', 'starter', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT agent_subscriptions_status_check CHECK (status IN ('active', 'cancelled', 'past_due', 'suspended')),

  -- Pricing
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    CONSTRAINT agent_subscriptions_cycle_check CHECK (billing_cycle IN ('monthly', 'annual')),

  -- Billing dates
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  next_billing_date DATE,
  trial_end_date DATE,
  cancelled_at TIMESTAMPTZ,

  -- Stripe integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_payment_method_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_agent_id ON agent_subscriptions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_status ON agent_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_stripe_customer ON agent_subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

COMMENT ON TABLE agent_subscriptions IS 'Agent subscription plans and billing cycles';
COMMENT ON COLUMN agent_subscriptions.plan_type IS 'Subscription tier (free, starter, professional, enterprise)';
COMMENT ON COLUMN agent_subscriptions.status IS 'Subscription status (active, cancelled, past_due, suspended)';

-- ============================================================================
-- AGENT INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES agent_subscriptions(id) ON DELETE SET NULL,

  -- Invoice details
  invoice_number TEXT NOT NULL UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) DEFAULT 0.00,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft',
    CONSTRAINT agent_invoices_status_check CHECK (status IN ('draft', 'pending', 'paid', 'failed', 'refunded', 'void')),

  -- Dates
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,

  -- Payment tracking
  payment_method TEXT,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,

  -- Line items (JSONB for flexibility)
  line_items JSONB DEFAULT '[]'::jsonb,

  -- Notes
  description TEXT,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_invoices_agent_id ON agent_invoices(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_invoices_status ON agent_invoices(status);
CREATE INDEX IF NOT EXISTS idx_agent_invoices_invoice_number ON agent_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_agent_invoices_due_date ON agent_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_agent_invoices_stripe_invoice ON agent_invoices(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

COMMENT ON TABLE agent_invoices IS 'Invoices for agent platform usage and subscriptions';
COMMENT ON COLUMN agent_invoices.line_items IS 'Array of line items [{description, quantity, unit_price, amount}]';

-- ============================================================================
-- AGENT PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES agent_invoices(id) ON DELETE SET NULL,

  -- Payment details
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
    CONSTRAINT agent_payments_method_check CHECK (payment_method IN ('stripe', 'paypal', 'bank_transfer', 'check', 'other')),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT agent_payments_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),

  -- Payment gateway info
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  paypal_transaction_id TEXT,

  -- Transaction details
  transaction_id TEXT,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_payments_agent_id ON agent_payments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_payments_invoice_id ON agent_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_agent_payments_status ON agent_payments(status);
CREATE INDEX IF NOT EXISTS idx_agent_payments_date ON agent_payments(payment_date);

COMMENT ON TABLE agent_payments IS 'Payment records for agent billing';

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_agent_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_subscriptions_updated_at
  BEFORE UPDATE ON agent_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_billing_updated_at();

CREATE TRIGGER agent_invoices_updated_at
  BEFORE UPDATE ON agent_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_billing_updated_at();

CREATE TRIGGER agent_payments_updated_at
  BEFORE UPDATE ON agent_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_billing_updated_at();

-- ============================================================================
-- INVOICE NUMBER GENERATION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_agent_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  -- Get the highest invoice number and increment
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)),
    0
  ) + 1
  INTO next_number
  FROM agent_invoices;

  -- Format as INV-XXXXXX (6 digits)
  invoice_num := 'INV-' || LPAD(next_number::TEXT, 6, '0');

  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Subscriptions: Agents can view their own
ALTER TABLE agent_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_subscriptions_view_own
  ON agent_subscriptions
  FOR SELECT
  USING (agent_id = auth.uid());

-- Invoices: Agents can view their own
ALTER TABLE agent_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_invoices_view_own
  ON agent_invoices
  FOR SELECT
  USING (agent_id = auth.uid());

-- Payments: Agents can view their own
ALTER TABLE agent_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_payments_view_own
  ON agent_payments
  FOR SELECT
  USING (agent_id = auth.uid());

-- ============================================================================
-- SEED DATA: Create free plan for existing agents
-- ============================================================================
INSERT INTO agent_subscriptions (agent_id, plan_type, status, monthly_price, current_period_start, current_period_end, next_billing_date)
SELECT
  id,
  'free',
  'active',
  0.00,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 month',
  CURRENT_DATE + INTERVAL '1 month'
FROM agents
WHERE NOT EXISTS (
  SELECT 1 FROM agent_subscriptions WHERE agent_subscriptions.agent_id = agents.id
);
