-- Migration: Add Stripe billing fields
-- Adds fields for Stripe Checkout Session integration

-- Add Stripe price ID to subscription plans
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price ON subscription_plans(stripe_price_id);

COMMENT ON COLUMN subscription_plans.stripe_price_id IS 'Stripe Price ID for recurring subscription billing';

-- Add Stripe billing fields to agent_subscriptions
ALTER TABLE agent_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_latest_invoice_id TEXT;

CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_stripe_customer ON agent_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_stripe_subscription ON agent_subscriptions(stripe_subscription_id);

COMMENT ON COLUMN agent_subscriptions.stripe_customer_id IS 'Stripe Customer ID for billing';
COMMENT ON COLUMN agent_subscriptions.stripe_subscription_id IS 'Stripe Subscription ID';
COMMENT ON COLUMN agent_subscriptions.stripe_latest_invoice_id IS 'Latest invoice ID from Stripe';
