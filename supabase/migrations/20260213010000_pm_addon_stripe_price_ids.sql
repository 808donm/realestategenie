-- =============================================================================
-- Migration: Add Stripe Price IDs to PM Add-on Plans
--
-- Populates the stripe_price_id column for all PM add-on plans.
-- Base plan price IDs were already set in migration 078.
-- =============================================================================

-- PM Solo: $147/mo - up to 25 properties, 125 tenants
UPDATE pm_addon_plans
SET stripe_price_id = 'price_1T09kdDx8srgWVliZTXKfkTU'
WHERE slug = 'pm-solo';

-- PM Team: $297/mo - up to 50 properties, 250 tenants
UPDATE pm_addon_plans
SET stripe_price_id = 'price_1T09lVDx8srgWVlifMGPrMuD'
WHERE slug = 'pm-team';

-- PM Growth: $497/mo - up to 100 properties, 500 tenants
UPDATE pm_addon_plans
SET stripe_price_id = 'price_1T09n7Dx8srgWVliIApVsWZ4'
WHERE slug = 'pm-growth';

-- PM Scale: $697/mo - up to 150 properties, 750 tenants
UPDATE pm_addon_plans
SET stripe_price_id = 'price_1T09nyDx8srgWVlifo1C7znG'
WHERE slug = 'pm-scale';
