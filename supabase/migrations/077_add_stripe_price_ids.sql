-- Migration: Add Stripe Price IDs for Monthly and Yearly Billing
-- Updates subscription plans with actual Stripe price IDs from the Stripe dashboard

-- Solo Agent Pro
UPDATE subscription_plans
SET
  stripe_price_id = 'price_1SnqlmDx8srgWVliuSNRjVAl',
  stripe_yearly_price_id = 'price_1SnqrZDx8srgWVli28hMxYa2'
WHERE slug = 'solo-agent-pro';

-- Team Growth
UPDATE subscription_plans
SET
  stripe_price_id = 'price_1SnqtZDx8srgWVliHZ5jpEIg',
  stripe_yearly_price_id = 'price_1SnquhDx8srgWVliZRkXeTa3'
WHERE slug = 'team-growth';

-- Brokerage Growth
UPDATE subscription_plans
SET
  stripe_price_id = 'price_1SnqvxDx8srgWVliqUWlqXVL',
  stripe_yearly_price_id = 'price_1SnqxJDx8srgWVli6qn717jX'
WHERE slug = 'brokerage-growth';

-- Brokerage Scale
UPDATE subscription_plans
SET
  stripe_price_id = 'price_1SrOwbDx8srgWVliG9rdIxMI',
  stripe_yearly_price_id = 'price_1SrOyDDx8srgWVlix07cBocg'
WHERE slug = 'brokerage-scale';
