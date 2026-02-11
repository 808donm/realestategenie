# Real Estate Genie - Complete Subscription System

## 🎉 System Overview

Your Real Estate Genie subscription system is now fully configured with:
- ✅ Monthly and yearly billing options
- ✅ 4 subscription tiers (Solo Agent Pro, Team Growth, Brokerage Growth, Brokerage Scale)
- ✅ Two subscription paths (access request approval + direct invitation)
- ✅ Automated payment link email sending
- ✅ Stripe integration with dynamic checkout sessions
- ✅ Complete payment-before-access exclusivity

---

## 📊 Subscription Plans & Pricing

| Plan | Monthly | Yearly | Savings | Agents | Properties | Tenants |
|------|---------|--------|---------|--------|------------|---------|
| **Solo Agent Pro** | $49 | $490 | $98 | 1 | 5 | 50 |
| **Team Growth** | $149 | $1,490 | $298 | 5 | 25 | 250 |
| **Brokerage Growth** | $349 | $3,490 | $698 | 10 | 100 | 1,000 |
| **Brokerage Scale** | $799 | $7,990 | $1,598 | 25 | 300 | 3,000 |

---

## 🔄 Complete User Flow

### Path 1: Access Request → Approval
1. User visits public site and submits access request form
2. Request appears in Admin → Access Requests dashboard
3. Admin reviews request details
4. Admin clicks "Approve & Send Payment Link"
5. Admin selects:
   - Subscription plan (4 options)
   - Billing frequency (Monthly/Yearly)
   - Optional admin notes
6. System generates Stripe checkout session
7. User receives professional payment link email
8. User completes payment via Stripe
9. Stripe webhook triggers account creation
10. User receives invitation email
11. User creates account and logs in

### Path 2: Direct Invitation
1. Admin clicks "Send Paid Invitation" in dashboard
2. Admin enters:
   - Email address
   - Full name
   - Phone (optional)
   - Subscription plan
   - Billing frequency
   - Admin notes (optional)
3. System creates pre-approved access request
4. System generates Stripe checkout session
5. User receives payment link email
6. User completes payment
7. User receives invitation email
8. User creates account and logs in

---

## 💾 Database Schema

### Subscription Plans Table
```sql
subscription_plans
  - id (uuid)
  - name (text)
  - slug (text)
  - monthly_price (numeric)
  - annual_price (numeric)
  - stripe_price_id (text) -- Monthly Stripe Price ID
  - stripe_yearly_price_id (text) -- Yearly Stripe Price ID
  - stripe_payment_link_monthly (text) -- Direct payment link
  - stripe_payment_link_yearly (text) -- Direct payment link
  - max_agents (integer)
  - max_properties (integer)
  - max_tenants (integer)
  - tier_level (integer)
  - is_active (boolean)
  - is_custom (boolean)
```

### Access Requests Table
```sql
access_requests
  - id (uuid)
  - full_name (text)
  - email (text)
  - phone (text)
  - company (text)
  - message (text)
  - status (text) -- pending, approved, rejected
  - admin_notes (text)
  - reviewed_by (uuid) -- admin agent id
  - reviewed_at (timestamptz)
  - stripe_checkout_session_id (text)
  - payment_link_sent_at (timestamptz)
  - created_at (timestamptz)
```

---

## 🔌 Stripe Integration

### Price IDs Configured

**Solo Agent Pro**
- Monthly: `price_1SnqlmDx8srgWVliuSNRjVAl`
- Yearly: `price_1SnqrZDx8srgWVli28hMxYa2`

**Team Growth**
- Monthly: `price_1SnqtZDx8srgWVliHZ5jpEIg`
- Yearly: `price_1SnquhDx8srgWVliZRkXeTa3`

**Brokerage Growth**
- Monthly: `price_1SnqvxDx8srgWVliqUWlqXVL`
- Yearly: `price_1SnqxJDx8srgWVli6qn717jX`

**Brokerage Scale**
- Monthly: `price_1SrOwbDx8srgWVliG9rdIxMI`
- Yearly: `price_1SrOyDDx8srgWVlix07cBocg`

### Checkout Session Metadata
```javascript
{
  access_request_id: "uuid",
  applicant_email: "user@example.com",
  applicant_name: "John Doe",
  billing_frequency: "monthly" | "yearly"
}
```

---

## 📧 Email Templates

### Payment Link Email Features
- Professional HTML design with gradient header
- Plan name and pricing prominently displayed
- Billing frequency indication (month/year)
- Savings calculation for yearly billing
- Feature list (agents, properties, tenants)
- Large "Complete Payment" CTA button
- 4-step "What happens next" section
- Support contact information
- Plain text fallback version

---

## 🎨 Admin Dashboard Features

### Access Requests Page (`/admin/access-requests`)
- **Filter tabs**: Pending, Approved, Rejected, All
- **Send Paid Invitation button** (top of page)
- **Request cards** showing:
  - Applicant name, email, phone
  - Company (if provided)
  - Application message
  - Status badge
  - Admin notes (if any)
  - Action buttons (Approve/Reject/View Details)

### Approval Dialog
- Plan selector dropdown (4 plans with pricing)
- Billing frequency radio buttons (Monthly/Yearly)
- Real-time savings calculation display
- Admin notes textarea
- Plan details preview card
- "What happens next" instructions

### Send Invitation Dialog
- Email input (required)
- Full name input (required)
- Phone input (optional)
- Plan selector with pricing
- Billing frequency selector
- Admin notes (optional)
- "What happens next" instructions

---

## 🛠 API Endpoints

### `POST /api/admin/subscription-plans`
Fetches all active, non-custom subscription plans for admin selection.

**Response:**
```json
{
  "plans": [
    {
      "id": "uuid",
      "name": "Solo Agent Pro",
      "monthly_price": 49.00,
      "annual_price": 490.00,
      "max_agents": 1,
      "max_properties": 5,
      "max_tenants": 50,
      "tier_level": 1
    },
    ...
  ]
}
```

### `POST /api/admin/approve-access-request`
Approves an access request, generates payment link, sends email.

**Request:**
```json
{
  "requestId": "uuid",
  "planId": "uuid",
  "billingFrequency": "monthly" | "yearly",
  "adminNotes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/...",
  "emailSent": true
}
```

### `POST /api/admin/send-paid-invitation`
Creates pre-approved invitation, generates payment link, sends email.

**Request:**
```json
{
  "email": "string",
  "fullName": "string",
  "phone": "string (optional)",
  "planId": "uuid",
  "billingFrequency": "monthly" | "yearly",
  "adminNotes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/...",
  "accessRequestId": "uuid",
  "emailSent": true
}
```

---

## 🚀 Next Steps

### 1. Apply Database Migration

Run the migration to add Stripe price IDs:

**Option A: Supabase Dashboard**
1. Go to https://app.supabase.com
2. Navigate to SQL Editor
3. Open and run `supabase/migrations/077_add_stripe_price_ids.sql`

**Option B: Supabase CLI**
```bash
supabase migration up
```

See `supabase/migrations/077_APPLY_MIGRATION.md` for detailed instructions.

### 2. Test the Complete Flow

**Test Access Request Approval:**
1. Submit test access request via public form
2. Go to Admin → Access Requests
3. Click "Approve & Send Payment Link"
4. Select plan and billing frequency
5. Verify payment link works
6. Complete test payment in Stripe (use test card)
7. Verify webhook creates account

**Test Direct Invitation:**
1. Go to Admin → Access Requests
2. Click "+ Send Paid Invitation"
3. Fill in test user details
4. Select plan and billing frequency
5. Verify payment link generation
6. Check email delivery
7. Complete test payment

### 3. Production Checklist

- [ ] Database migration applied
- [ ] Stripe webhook endpoint configured (`/api/webhooks/stripe`)
- [ ] Stripe webhook secret added to environment variables
- [ ] Test mode payments working
- [ ] Email delivery working (Resend configured)
- [ ] Both subscription paths tested
- [ ] Monthly and yearly billing tested
- [ ] Ready to switch to Stripe live mode

### 4. Stripe Webhook Setup

Your webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`

Events to listen for:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## 📁 Key Files Modified/Created

### Database Migrations
- `supabase/migrations/076_add_yearly_stripe_fields.sql` - Added yearly price ID columns
- `supabase/migrations/077_add_stripe_price_ids.sql` - Populated actual Stripe price IDs
- `supabase/migrations/077_APPLY_MIGRATION.md` - Migration application guide

### Admin UI Components
- `app/app/admin/access-requests/access-requests-client.tsx` - Full UI with billing frequency

### API Routes
- `app/api/admin/subscription-plans/route.ts` - Fetch plans endpoint
- `app/api/admin/approve-access-request/route.ts` - Approval with billing frequency
- `app/api/admin/send-paid-invitation/route.ts` - Direct invitation with billing frequency

### Email System
- `src/lib/email/resend.ts` - Payment link email template with billing frequency

### Documentation & Scripts
- `scripts/get-stripe-price-ids.ts` - Utility to fetch Stripe price IDs
- `scripts/STRIPE_SETUP_GUIDE.md` - Setup instructions
- `SUBSCRIPTION_SYSTEM_COMPLETE.md` - This comprehensive guide

---

## 🎯 What This System Enables

✅ **Exclusive Access**: Payment required before any access to the platform
✅ **Flexible Billing**: Monthly and yearly options with automatic savings calculation
✅ **Two Subscription Paths**: Request-based and admin-initiated invitations
✅ **Professional Experience**: Branded emails with clear pricing and next steps
✅ **Admin Control**: Full visibility and control over who gets access
✅ **Automatic Processing**: Stripe webhooks handle account creation
✅ **Scalable Architecture**: Ready for growth with multiple tiers
✅ **Revenue Optimization**: Yearly billing incentivized with clear savings

---

## 📞 Support

For questions or issues:
- Check migration guide: `supabase/migrations/077_APPLY_MIGRATION.md`
- Review Stripe setup: `scripts/STRIPE_SETUP_GUIDE.md`
- Contact support: support@realestategenie.app

---

**Version**: 2.0
**Last Updated**: January 2026
**Status**: ✅ Ready for Production (after migration applied)
