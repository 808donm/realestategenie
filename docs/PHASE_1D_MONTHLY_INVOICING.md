# Phase 1D: Monthly Invoicing Automation

## Overview

Automated recurring rent invoice generation and payment tracking for active leases.

## Features Implemented

### 1. Monthly Invoice Generation (Cron Job)

**Route:** `/api/cron/monthly-invoices`

**Schedule:** 1st of every month at midnight (configured in `vercel.json`)

**What it does:**
- Finds all active leases with `auto_invoice_enabled = true`
- Creates rent invoice in GoHighLevel for each lease
- Sends invoice to tenant automatically
- Records payment in `pm_rent_payments` table
- Skips if invoice already exists for current month

**Cron Schedule:**
```json
{
  "path": "/api/cron/monthly-invoices",
  "schedule": "0 0 1 * *"
}
```

### 2. Late Fee Assessment (Cron Job)

**Route:** `/api/cron/assess-late-fees`

**Schedule:** Daily at 9 AM (configured in `vercel.json`)

**What it does:**
- Finds unpaid rent payments past grace period (default: 5 days)
- Calculates late fee based on lease configuration:
  - **Flat:** $50 (default)
  - **Percentage:** 5% of rent (default)
  - **Both:** Flat + Percentage
  - **None:** No late fee
- Updates payment status to `overdue`
- Adds note to tenant contact in GHL
- Optionally adds late fee line item to GHL invoice

**Cron Schedule:**
```json
{
  "path": "/api/cron/assess-late-fees",
  "schedule": "0 9 * * *"
}
```

### 3. Invoice Paid Webhook

**Route:** `/api/webhooks/ghl/invoice-paid`

**Triggered by:** GoHighLevel when invoice is paid

**What it does:**
- Receives webhook from GHL when tenant pays invoice
- Updates `pm_rent_payments` status to `paid`
- Records payment method and timestamp
- Adds confirmation note to tenant contact in GHL

**Webhook Payload:**
```json
{
  "type": "invoice.paid",
  "locationId": "...",
  "invoiceId": "...",
  "contactId": "...",
  "amount": 1500.00,
  "paidAt": "2024-01-15T10:30:00Z",
  "paymentMethod": "card"
}
```

### 4. Rent Payment Tracking

**Table:** `pm_rent_payments`

**Schema:**
```sql
- id: UUID (primary key)
- lease_id: Reference to pm_leases
- agent_id: Reference to auth.users
- tenant_contact_id: GHL contact ID
- amount: Monthly rent amount
- due_date: When rent is due
- month: 1-12
- year: Current year
- status: pending/paid/overdue/void/partial
- ghl_invoice_id: GHL invoice ID for syncing
- paid_at: Timestamp when paid
- payment_method: stripe/paypal/check/cash/other
- late_fee_amount: Late fee if assessed
- late_fee_assessed_at: When late fee was added
```

### 5. Agent Payment Dashboard

**Route:** `/app/pm/payments`

**Features:**
- Revenue stats (total collected, outstanding balance)
- Overdue payment count
- Payment history with status badges
- Late fee tracking
- Payment method display

## Configuration

### Late Fee Configuration (Per Lease)

Added to `pm_leases` table via migration 027:

```sql
- late_fee_grace_days: INTEGER (default: 5)
  Number of days after due date before late fee

- late_fee_type: TEXT (default: 'flat')
  Options: 'flat', 'percentage', 'both', 'none'

- late_fee_flat_amount: NUMERIC (default: 50.00)
  Flat late fee in dollars

- late_fee_percentage: NUMERIC (default: 0.05)
  Percentage of rent (0.05 = 5%)
```

### Environment Variables

Required for cron jobs:

```bash
# Cron security
CRON_SECRET=your_random_secret_here

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# GHL (already configured)
GHL_API_KEY=...
```

## Setup Instructions

### 1. Run Database Migrations

```sql
-- In Supabase SQL Editor
\i supabase/migrations/026_pm_rent_payments.sql
\i supabase/migrations/027_pm_leases_late_fee_config.sql
```

### 2. Configure Vercel Cron Jobs

The `vercel.json` file already contains the cron configuration:

```json
{
  "crons": [
    {
      "path": "/api/cron/monthly-invoices",
      "schedule": "0 0 1 * *"
    },
    {
      "path": "/api/cron/assess-late-fees",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Deploy to Vercel and crons will run automatically.

### 3. Set CRON_SECRET Environment Variable

In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add `CRON_SECRET` with a random secure string
3. Redeploy

Example:
```bash
CRON_SECRET=your_secure_random_string_here_min_32_chars
```

### 4. Configure GHL Webhook

In GoHighLevel dashboard:
1. Go to Settings → Webhooks
2. Add webhook for `invoice.paid` event
3. URL: `https://www.realestategenie.app/api/webhooks/ghl/invoice-paid`
4. Method: POST

## Testing

### Manual Testing

#### Test Monthly Invoice Generation:
```bash
curl -X POST https://www.realestategenie.app/api/cron/monthly-invoices \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "results": {
    "total": 5,
    "success": 5,
    "failed": 0,
    "skipped": 0,
    "errors": []
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Test Late Fee Assessment:
```bash
curl -X POST https://www.realestategenie.app/api/cron/assess-late-fees \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "results": {
    "total": 2,
    "assessed": 2,
    "skipped": 0,
    "errors": []
  },
  "timestamp": "2024-01-06T09:00:00.000Z"
}
```

#### Test Invoice Paid Webhook:
```bash
curl -X POST https://www.realestategenie.app/api/webhooks/ghl/invoice-paid \
  -H "Content-Type: application/json" \
  -d '{
    "type": "invoice.paid",
    "invoiceId": "ghl_invoice_123",
    "contactId": "ghl_contact_456",
    "amount": 1500.00,
    "paidAt": "2024-01-05T10:30:00Z",
    "paymentMethod": "card"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "payment_id": "uuid-here"
}
```

## Workflow

### Complete Rent Payment Lifecycle

```
1. Lease activated (contract signed)
   ↓
2. Monthly invoice cron runs on 1st of month
   ↓
3. Invoice created in GHL, sent to tenant
   ↓
4. Recorded in pm_rent_payments (status: pending)
   ↓
5. EITHER:
   A. Tenant pays → GHL webhook fires → status: paid
   B. Tenant doesn't pay → Late fee cron runs → status: overdue
   ↓
6. Agent views payment status in /app/pm/payments
```

### Late Fee Example Timeline

- **Jan 1:** Rent invoice created, due Jan 5
- **Jan 5:** Due date passes, still in grace period (5 days)
- **Jan 10:** Late fee cron runs, assesses $50 late fee, status → overdue
- **Jan 12:** Tenant pays $1,550 (rent + late fee)
- **Jan 12:** Webhook fires, status → paid

## Next Steps

**Phase 1E: Tenant Portal** will allow tenants to:
- View invoices in their portal
- Pay rent via Stripe or PayPal
- See payment history
- Enable autopay
- Submit work orders
- Message property manager

This completes Phase 1 - the backend invoice automation system is now fully operational.
