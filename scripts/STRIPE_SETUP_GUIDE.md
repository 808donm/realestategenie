# Stripe Price IDs Setup Guide

## Issue Found
**Brokerage Growth - Monthly** has a duplicate payment link (same as Team Growth - Yearly). Please provide the correct link.

## What We Need

To complete the subscription integration, we need the actual **Stripe Price IDs** (not just payment links) for each plan. These are used to create checkout sessions with custom metadata for tracking access requests.

## How to Find Your Stripe Price IDs

1. **Login to Stripe Dashboard**: https://dashboard.stripe.com/

2. **Navigate to Products**: Click "Products" in the left sidebar

3. **For Each Product** (Solo Agent Pro, Team Growth, Brokerage Growth, Brokerage Scale):
   - Click on the product name
   - Under "Pricing", you'll see all price variants
   - Each price will have an ID that starts with `price_`
   - Identify which price is for monthly billing and which is for yearly

4. **Copy the Price IDs**: They look like:
   - `price_1A2B3C4D5E6F7G8H9I0J` (monthly)
   - `price_9I8H7G6F5E4D3C2B1A0J` (yearly)

## SQL Template to Update Database

Once you have the price IDs, run this SQL in your Supabase SQL Editor:

```sql
-- Solo Agent Pro
UPDATE subscription_plans
SET
  stripe_price_id = 'price_XXXXX_MONTHLY',
  stripe_yearly_price_id = 'price_XXXXX_YEARLY'
WHERE slug = 'solo-agent-pro';

-- Team Growth
UPDATE subscription_plans
SET
  stripe_price_id = 'price_XXXXX_MONTHLY',
  stripe_yearly_price_id = 'price_XXXXX_YEARLY'
WHERE slug = 'team-growth';

-- Brokerage Growth
UPDATE subscription_plans
SET
  stripe_price_id = 'price_XXXXX_MONTHLY',
  stripe_yearly_price_id = 'price_XXXXX_YEARLY'
WHERE slug = 'brokerage-growth';

-- Brokerage Scale
UPDATE subscription_plans
SET
  stripe_price_id = 'price_XXXXX_MONTHLY',
  stripe_yearly_price_id = 'price_XXXXX_YEARLY'
WHERE slug = 'brokerage-scale';
```

## Alternative: Using the Script

If you have `STRIPE_SECRET_KEY` set in your environment, you can run:

```bash
npx tsx scripts/get-stripe-price-ids.ts
```

This will automatically list all your Stripe prices and generate the SQL for you.

## What Happens Next

Once the price IDs are in the database:
1. Admin can choose billing frequency (monthly/yearly) when approving requests
2. System creates Stripe checkout sessions with proper metadata
3. Access requests are automatically tracked through the payment process
4. Payment links in the database serve as backup/reference
