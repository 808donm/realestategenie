-- Migration: Tenant Portal Foundation
-- Creates all tables needed for tenant self-service portal

-- ============================================================================
-- 1. TENANT USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lease_id UUID NOT NULL REFERENCES pm_leases(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  emergency_contact JSONB, -- { name, phone, relationship }
  preferences JSONB DEFAULT '{}', -- { notifications, autopay, etc }

  -- Invitation tracking
  invited_at TIMESTAMP,
  invitation_token TEXT UNIQUE,
  invitation_expires_at TIMESTAMP,
  registered_at TIMESTAMP,

  -- Login tracking
  last_login_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- One tenant account per lease
  UNIQUE(lease_id)
);

CREATE INDEX idx_tenant_users_lease ON tenant_users(lease_id);
CREATE INDEX idx_tenant_users_email ON tenant_users(email);
CREATE INDEX idx_tenant_users_invitation_token ON tenant_users(invitation_token) WHERE invitation_token IS NOT NULL;

COMMENT ON TABLE tenant_users IS 'Tenant portal user accounts, linked to active leases';
COMMENT ON COLUMN tenant_users.invitation_token IS 'One-time token sent via email for initial registration';
COMMENT ON COLUMN tenant_users.emergency_contact IS 'JSON: { name, phone, relationship }';

-- ============================================================================
-- 2. PAYMENT METHODS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_user_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'stripe' or 'paypal'

  -- Stripe fields
  stripe_payment_method_id TEXT,
  stripe_customer_id TEXT,

  -- PayPal fields
  paypal_billing_agreement_id TEXT,
  paypal_payer_id TEXT,

  -- Common display fields
  type TEXT NOT NULL, -- 'card', 'bank_account', 'paypal'
  last4 TEXT,
  brand TEXT, -- 'visa', 'mastercard', 'amex', 'paypal'
  exp_month INTEGER,
  exp_year INTEGER,

  -- Settings
  is_default BOOLEAN DEFAULT false,
  is_autopay_enabled BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenant_payment_methods_tenant ON tenant_payment_methods(tenant_user_id);
CREATE INDEX idx_tenant_payment_methods_default ON tenant_payment_methods(tenant_user_id, is_default) WHERE is_default = true;

-- Constraint: Only one default payment method per tenant
CREATE UNIQUE INDEX idx_tenant_payment_methods_one_default ON tenant_payment_methods(tenant_user_id) WHERE is_default = true;

ALTER TABLE tenant_payment_methods
ADD CONSTRAINT tenant_payment_methods_provider_check
CHECK (provider IN ('stripe', 'paypal'));

ALTER TABLE tenant_payment_methods
ADD CONSTRAINT tenant_payment_methods_type_check
CHECK (type IN ('card', 'bank_account', 'paypal'));

COMMENT ON TABLE tenant_payment_methods IS 'Stored payment methods for tenants (Stripe & PayPal)';

-- ============================================================================
-- 3. MESSAGES (Tenant ↔ Agent Communication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES pm_leases(id) ON DELETE CASCADE,

  -- Sender/receiver
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  from_user_type TEXT NOT NULL, -- 'tenant' or 'agent'
  to_user_id UUID NOT NULL REFERENCES auth.users(id),
  to_user_type TEXT NOT NULL, -- 'tenant' or 'agent'

  -- Message content
  message TEXT NOT NULL,
  attachments JSONB, -- [{ filename, url, size, type }]

  -- GHL sync fields
  ghl_message_id TEXT,
  ghl_conversation_id TEXT,
  synced_to_ghl BOOLEAN DEFAULT false,
  sync_error TEXT,

  -- Read tracking
  read_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pm_messages_lease ON pm_messages(lease_id);
CREATE INDEX idx_pm_messages_from ON pm_messages(from_user_id);
CREATE INDEX idx_pm_messages_to ON pm_messages(to_user_id);
CREATE INDEX idx_pm_messages_unread ON pm_messages(to_user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_pm_messages_ghl_conversation ON pm_messages(ghl_conversation_id) WHERE ghl_conversation_id IS NOT NULL;

ALTER TABLE pm_messages
ADD CONSTRAINT pm_messages_user_type_check
CHECK (from_user_type IN ('tenant', 'agent') AND to_user_type IN ('tenant', 'agent'));

COMMENT ON TABLE pm_messages IS 'In-app messaging between tenants and agents, synced with GHL';

-- ============================================================================
-- 4. NOTIFICATION PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_notification_preferences (
  tenant_user_id UUID PRIMARY KEY REFERENCES tenant_users(id) ON DELETE CASCADE,

  -- Channels
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT false,

  -- Event preferences
  rent_due_reminder BOOLEAN DEFAULT true,
  rent_due_days_before INTEGER DEFAULT 3,
  payment_received BOOLEAN DEFAULT true,
  work_order_updates BOOLEAN DEFAULT true,
  new_messages BOOLEAN DEFAULT true,
  lease_expiring_reminder BOOLEAN DEFAULT true,
  lease_expiring_days_before INTEGER DEFAULT 60,

  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE tenant_notification_preferences IS 'Tenant notification settings and preferences';

-- ============================================================================
-- 5. AUTOPAY TRANSACTIONS LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS autopay_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  tenant_user_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
  rent_payment_id UUID NOT NULL REFERENCES pm_rent_payments(id) ON DELETE CASCADE,
  payment_method_id UUID NOT NULL REFERENCES tenant_payment_methods(id),

  -- Transaction details
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'success', 'failed', 'retry'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- External references
  stripe_payment_intent_id TEXT,
  paypal_transaction_id TEXT,

  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_autopay_transactions_tenant ON autopay_transactions(tenant_user_id);
CREATE INDEX idx_autopay_transactions_payment ON autopay_transactions(rent_payment_id);
CREATE INDEX idx_autopay_transactions_status ON autopay_transactions(status);

ALTER TABLE autopay_transactions
ADD CONSTRAINT autopay_transactions_status_check
CHECK (status IN ('pending', 'success', 'failed', 'retry', 'cancelled'));

COMMENT ON TABLE autopay_transactions IS 'Log of all autopay transaction attempts';

-- ============================================================================
-- 6. ENHANCEMENTS TO EXISTING TABLES
-- ============================================================================

-- Add tenant-facing fields to pm_work_orders
ALTER TABLE pm_work_orders
  ADD COLUMN IF NOT EXISTS tenant_availability TEXT,
  ADD COLUMN IF NOT EXISTS completion_photos JSONB,
  ADD COLUMN IF NOT EXISTS tenant_rating INTEGER,
  ADD COLUMN IF NOT EXISTS tenant_feedback TEXT;

COMMENT ON COLUMN pm_work_orders.tenant_availability IS 'When tenant is available for repairs (e.g., "Weekdays after 5pm")';
COMMENT ON COLUMN pm_work_orders.tenant_rating IS 'Tenant rating of work quality (1-5 stars)';

-- Add constraints
ALTER TABLE pm_work_orders DROP CONSTRAINT IF EXISTS pm_work_orders_tenant_rating_check;
ALTER TABLE pm_work_orders
ADD CONSTRAINT pm_work_orders_tenant_rating_check
CHECK (tenant_rating IS NULL OR (tenant_rating >= 1 AND tenant_rating <= 5));

-- Add tenant-submitted move-in/move-out reports to leases
-- (Already have move_in_report and move_out_checklist in pm_leases from migration 024)

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Tenant Users
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Tenants can view their own record
CREATE POLICY tenant_users_own_select ON tenant_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Agents can view tenant records for their leases
CREATE POLICY tenant_users_agent_select ON tenant_users
  FOR SELECT
  TO authenticated
  USING (
    lease_id IN (
      SELECT id FROM pm_leases WHERE agent_id = auth.uid()
    )
  );

-- Service role can do anything
CREATE POLICY tenant_users_service_all ON tenant_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Payment Methods
ALTER TABLE tenant_payment_methods ENABLE ROW LEVEL SECURITY;

-- Tenants can manage their own payment methods
CREATE POLICY tenant_payment_methods_own_all ON tenant_payment_methods
  FOR ALL
  TO authenticated
  USING (tenant_user_id = auth.uid())
  WITH CHECK (tenant_user_id = auth.uid());

-- Messages
ALTER TABLE pm_messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or received
CREATE POLICY pm_messages_participant_select ON pm_messages
  FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Users can send messages
CREATE POLICY pm_messages_send ON pm_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- Users can mark their own messages as read
CREATE POLICY pm_messages_mark_read ON pm_messages
  FOR UPDATE
  TO authenticated
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());

-- Notification Preferences
ALTER TABLE tenant_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Tenants can manage their own preferences
CREATE POLICY tenant_notification_preferences_own_all ON tenant_notification_preferences
  FOR ALL
  TO authenticated
  USING (tenant_user_id = auth.uid())
  WITH CHECK (tenant_user_id = auth.uid());

-- Autopay Transactions
ALTER TABLE autopay_transactions ENABLE ROW LEVEL SECURITY;

-- Tenants can view their own autopay transactions
CREATE POLICY autopay_transactions_own_select ON autopay_transactions
  FOR SELECT
  TO authenticated
  USING (tenant_user_id = auth.uid());

-- Service role can manage autopay (for cron jobs)
CREATE POLICY autopay_transactions_service_all ON autopay_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 8. FUNCTIONS
-- ============================================================================

-- Function to automatically set default payment method
CREATE OR REPLACE FUNCTION set_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is being set as default, unset all others for this tenant
  IF NEW.is_default = true THEN
    UPDATE tenant_payment_methods
    SET is_default = false
    WHERE tenant_user_id = NEW.tenant_user_id
      AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_default_payment_method
  BEFORE INSERT OR UPDATE ON tenant_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION set_default_payment_method();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenant_users_updated_at
  BEFORE UPDATE ON tenant_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_tenant_payment_methods_updated_at
  BEFORE UPDATE ON tenant_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_tenant_notification_preferences_updated_at
  BEFORE UPDATE ON tenant_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
