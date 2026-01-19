# Apply Complete Stripe Billing Migration

This consolidated migration adds all Stripe billing fields and populates price IDs in one step.

## What This Migration Does

1. ✅ Adds `stripe_price_id` column (monthly billing)
2. ✅ Adds `stripe_yearly_price_id` column (yearly billing)
3. ✅ Adds payment link reference columns
4. ✅ Populates all 4 subscription plans with Stripe price IDs
5. ✅ Populates payment links for backup/reference

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to: **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the **entire contents** of `078_stripe_billing_complete.sql`
5. Paste into the SQL editor
6. Click **Run** to execute

### Option 2: Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

## Verification

After running the migration, verify everything is set up correctly:

```sql
SELECT
  name,
  slug,
  monthly_price,
  annual_price,
  stripe_price_id,
  stripe_yearly_price_id,
  CASE
    WHEN stripe_price_id IS NOT NULL AND stripe_yearly_price_id IS NOT NULL
    THEN '✅ Complete'
    ELSE '❌ Missing'
  END as status
FROM subscription_plans
WHERE slug IN ('solo-agent-pro', 'team-growth', 'brokerage-growth', 'brokerage-scale')
ORDER BY tier_level;
```

**Expected Output:**

| name | slug | monthly_price | annual_price | stripe_price_id | stripe_yearly_price_id | status |
|------|------|---------------|--------------|-----------------|------------------------|--------|
| Solo Agent Pro | solo-agent-pro | 49.00 | 490.00 | price_1Snqlm... | price_1SnqrZ... | ✅ Complete |
| Team Growth | team-growth | 149.00 | 1490.00 | price_1SnqtZ... | price_1Snquh... | ✅ Complete |
| Brokerage Growth | brokerage-growth | 349.00 | 3490.00 | price_1Snqvx... | price_1SnqxJ... | ✅ Complete |
| Brokerage Scale | brokerage-scale | 799.00 | 7990.00 | price_1SrOwb... | price_1SrOyD... | ✅ Complete |

## Testing the System

Once migration is applied, test both subscription flows:

### Test 1: Approve Access Request with Monthly Billing
```
1. Go to Admin → Access Requests
2. Click "Approve & Send Payment Link" on a pending request
3. Select any plan
4. Choose "Monthly" billing frequency
5. Click "Approve & Send Payment Link"
6. Verify: Payment link generated successfully
7. Check email was sent
```

### Test 2: Send Invitation with Yearly Billing
```
1. Go to Admin → Access Requests
2. Click "+ Send Paid Invitation"
3. Enter test email: test@example.com
4. Enter test name: Test User
5. Select any plan
6. Choose "Yearly" billing frequency
7. Verify: Savings amount displayed
8. Click "Generate Payment Link"
9. Check payment link works in Stripe
```

## Troubleshooting

**If you get "column already exists" errors:**
- This is normal - the migration uses `IF NOT EXISTS` to be safe
- The migration will skip creating columns that already exist
- It will only populate/update the price IDs

**If you get "relation does not exist" errors:**
- Make sure you're connected to the correct database
- Verify subscription_plans table exists: `SELECT * FROM subscription_plans LIMIT 1;`
- Check that migrations 065 (subscription plans) has been run

**If price IDs don't populate:**
- Check if plan slugs match exactly
- Run verification query above to see current state
- Manually update if needed using the UPDATE statements in the migration

## What's Next

After successful migration:
1. ✅ Your subscription system is fully operational
2. ✅ Monthly and yearly billing both work
3. ✅ Admin can generate payment links with correct pricing
4. ✅ Emails show proper billing frequency and savings
5. ✅ Stripe checkout sessions work with metadata tracking

## Support

If you encounter any issues:
- Check the verification query output
- Review the complete documentation in `SUBSCRIPTION_SYSTEM_COMPLETE.md`
- Ensure environment variables are set (STRIPE_SECRET_KEY, etc.)
