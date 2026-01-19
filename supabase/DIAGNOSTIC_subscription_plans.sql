-- DIAGNOSTIC: Check Subscription Plans Setup
-- Run this in Supabase SQL Editor to diagnose the "no plans available" issue

-- Step 1: Check if subscription_plans table exists and has data
SELECT
  'Table Check' as test,
  COUNT(*) as plan_count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_plans,
  COUNT(CASE WHEN is_custom = false THEN 1 END) as non_custom_plans
FROM subscription_plans;

-- Step 2: Check if the required columns exist
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subscription_plans'
  AND column_name IN ('stripe_price_id', 'stripe_yearly_price_id', 'is_active', 'is_custom')
ORDER BY column_name;

-- Step 3: Check actual plan data
SELECT
  name,
  slug,
  is_active,
  is_custom,
  tier_level,
  CASE
    WHEN stripe_price_id IS NULL THEN '❌ Missing'
    ELSE '✅ Set'
  END as monthly_price_id_status,
  CASE
    WHEN stripe_yearly_price_id IS NULL THEN '❌ Missing'
    ELSE '✅ Set'
  END as yearly_price_id_status
FROM subscription_plans
ORDER BY tier_level;

-- Step 4: What the API should return
SELECT
  id,
  name,
  slug,
  monthly_price,
  annual_price,
  max_agents,
  max_properties,
  max_tenants
FROM subscription_plans
WHERE is_active = true
  AND is_custom = false
ORDER BY tier_level;
