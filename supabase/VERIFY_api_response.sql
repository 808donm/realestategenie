-- Quick verification: What should the API return?
-- Run this to see exactly what the subscription-plans API should return

SELECT
  id,
  name,
  slug,
  monthly_price as "monthly_price",
  annual_price as "annual_price",
  tier_level as "tier_level",
  max_agents as "max_agents",
  max_properties as "max_properties",
  max_tenants as "max_tenants",
  is_active,
  is_custom,
  stripe_price_id,
  stripe_yearly_price_id
FROM subscription_plans
WHERE is_active = true
  AND is_custom = false
ORDER BY tier_level ASC;

-- This should return 4 plans:
-- 1. Solo Agent Pro
-- 2. Team Growth
-- 3. Brokerage Growth
-- 4. Brokerage Scale
