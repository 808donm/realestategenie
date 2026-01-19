-- Migration: Complete Stripe Billing Setup with Monthly and Yearly Support
-- Consolidates all Stripe billing fields and price IDs in correct order

-- Step 1: Add monthly Stripe price ID column (if not exists)
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price ON subscription_plans(stripe_price_id);

COMMENT ON COLUMN subscription_plans.stripe_price_id IS 'Stripe Price ID for monthly recurring subscription billing';

-- Step 2: Add yearly Stripe price ID column
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_yearly_price_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_yearly_price ON subscription_plans(stripe_yearly_price_id);

COMMENT ON COLUMN subscription_plans.stripe_yearly_price_id IS 'Stripe Price ID for yearly recurring subscription billing';

-- Step 3: Add payment link fields for reference/backup
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_payment_link_monthly TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_yearly TEXT;

COMMENT ON COLUMN subscription_plans.stripe_payment_link_monthly IS 'Direct Stripe payment link for monthly billing';
COMMENT ON COLUMN subscription_plans.stripe_payment_link_yearly IS 'Direct Stripe payment link for yearly billing';

-- Step 4: Populate Stripe price IDs and payment links for all plans

-- Solo Agent Pro
UPDATE subscription_plans
SET
  stripe_price_id = 'price_1SnqlmDx8srgWVliuSNRjVAl',
  stripe_yearly_price_id = 'price_1SnqrZDx8srgWVli28hMxYa2',
  stripe_payment_link_monthly = 'https://buy.stripe.com/6oU4gz04W6ACc9kgPyeEo00',
  stripe_payment_link_yearly = 'https://buy.stripe.com/7sYaEX8Bse343CO9n6eEo01'
WHERE slug = 'solo-agent-pro';

-- Team Growth
UPDATE subscription_plans
SET
  stripe_price_id = 'price_1SnqtZDx8srgWVliHZ5jpEIg',
  stripe_yearly_price_id = 'price_1SnquhDx8srgWVliZRkXeTa3',
  stripe_payment_link_monthly = 'https://buy.stripe.com/6oU8wP8Bs0ceflwfLueEo02',
  stripe_payment_link_yearly = 'https://buy.stripe.com/4gMbJ1g3U5wy5KW56QeEo03'
WHERE slug = 'team-growth';

-- Brokerage Growth
UPDATE subscription_plans
SET
  stripe_price_id = 'price_1SnqvxDx8srgWVliqUWlqXVL',
  stripe_yearly_price_id = 'price_1SnqxJDx8srgWVli6qn717jX',
  stripe_payment_link_monthly = 'https://buy.stripe.com/9B68wP4lc9MOddo2YIeEo08',
  stripe_payment_link_yearly = 'https://buy.stripe.com/aFa9AT6tk0ceflwczieEo05'
WHERE slug = 'brokerage-growth';

-- Brokerage Scale
UPDATE subscription_plans
SET
  stripe_price_id = 'price_1SrOwbDx8srgWVliG9rdIxMI',
  stripe_yearly_price_id = 'price_1SrOyDDx8srgWVlix07cBocg',
  stripe_payment_link_monthly = 'https://buy.stripe.com/6oU14ndVM7EGc9kczieEo06',
  stripe_payment_link_yearly = 'https://buy.stripe.com/aFaeVdg3U1giflw42MeEo07'
WHERE slug = 'brokerage-scale';
