# Apply Stripe Price IDs Migration

This migration adds the actual Stripe price IDs to your subscription plans table.

## Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to: **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `077_add_stripe_price_ids.sql` into the editor
5. Click **Run** to execute the migration

## Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase migration up
```

## Verification

After running the migration, verify the price IDs were added correctly:

```sql
SELECT
  name,
  slug,
  stripe_price_id as monthly_price_id,
  stripe_yearly_price_id as yearly_price_id
FROM subscription_plans
WHERE slug IN ('solo-agent-pro', 'team-growth', 'brokerage-growth', 'brokerage-scale')
ORDER BY tier_level;
```

Expected results:
- Solo Agent Pro: `price_1SnqlmDx8srgWVliuSNRjVAl` (monthly), `price_1SnqrZDx8srgWVli28hMxYa2` (yearly)
- Team Growth: `price_1SnqtZDx8srgWVliHZ5jpEIg` (monthly), `price_1SnquhDx8srgWVliZRkXeTa3` (yearly)
- Brokerage Growth: `price_1SnqvxDx8srgWVliqUWlqXVL` (monthly), `price_1SnqxJDx8srgWVli6qn717jX` (yearly)
- Brokerage Scale: `price_1SrOwbDx8srgWVliG9rdIxMI` (monthly), `price_1SrOyDDx8srgWVlix07cBocg` (yearly)

## Testing

After applying the migration, test the complete flow:

1. **Admin Panel** → **Access Requests**
2. Click **"Send Paid Invitation"** or approve a pending request
3. Select a plan
4. Choose **Monthly** or **Yearly** billing
5. Click **"Generate Payment Link"**
6. Verify:
   - Payment link is generated
   - Email is sent to the user
   - Stripe checkout shows correct price and billing frequency
   - After payment, user receives invitation

## What This Enables

✅ Dynamic checkout session creation with access request tracking
✅ Monthly and yearly billing options
✅ Automatic email sending with payment links
✅ Proper metadata tracking for Stripe webhooks
✅ Complete payment-before-access flow
