# Tenant Portal - Full Feature Specification

## Overview

Self-service portal for tenants to manage their rental experience, pay rent, submit maintenance requests, and communicate with property managers.

## User Decisions

- **Timing**: End of Phase 1 (after monthly invoicing)
- **Payment**: Stripe + PayPal integration
- **Messaging**: Sync to GHL conversations
- **Scope**: Full-featured from the start

---

## Core Features

### 1. Authentication & Onboarding

**Tenant Invitation Flow:**
```
1. Lease activated (contract signed) → Trigger
2. System creates tenant_user record
3. Email sent with magic link to set password
4. Tenant clicks link → /tenant/register?token=xxx
5. Tenant sets password & completes profile
6. Redirected to dashboard
```

**Database:**
```sql
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY REFERENCES auth.users,
  lease_id UUID REFERENCES pm_leases NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  emergency_contact JSONB,
  preferences JSONB, -- notifications, autopay settings
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  UNIQUE(lease_id) -- One tenant account per lease
);
```

**Auth Strategy:**
- Unified auth system with role-based access
- RLS policies: tenants can only see their own lease data
- Role field in auth metadata: { role: "tenant" }

---

### 2. Dashboard

**Layout:**
```
┌─────────────────────────────────────────┐
│  🏠 [Property Address]                  │
│  Lease ends: [Date] (X days)            │
├─────────────────────────────────────────┤
│  💰 Rent Due                            │
│  $X,XXX.XX due on [Date]                │
│  [Pay Now Button]                       │
├─────────────────────────────────────────┤
│  📋 Recent Activity                     │
│  • Rent payment received - Jan 1        │
│  • Work order #123 completed - Dec 28   │
│  • Message from property manager        │
├─────────────────────────────────────────┤
│  🔧 Active Work Orders (2)              │
│  #456 - Leaky faucet - In Progress      │
│  #457 - AC not cooling - Assigned       │
└─────────────────────────────────────────┘
```

**Data Sources:**
- Lease info from `pm_leases`
- Invoices from GHL API
- Work orders from `pm_work_orders`
- Messages from `pm_messages` + GHL

---

### 3. Invoices & Statements

**View Invoices:**
```typescript
// Sync GHL invoices to local cache for performance
CREATE TABLE tenant_invoice_cache (
  id UUID PRIMARY KEY,
  ghl_invoice_id TEXT UNIQUE NOT NULL,
  lease_id UUID REFERENCES pm_leases,
  tenant_user_id UUID REFERENCES tenant_users,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT, -- 'draft', 'sent', 'paid', 'overdue', 'void'
  description TEXT,
  invoice_data JSONB, -- Full GHL invoice object
  paid_at TIMESTAMP,
  payment_method TEXT, -- 'stripe', 'paypal', 'check', 'other'
  stripe_payment_intent_id TEXT,
  paypal_transaction_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Features:**
- List all invoices (current + historical)
- Filter: Paid / Unpaid / Overdue
- Download invoice PDF
- View line items (rent, late fees, utilities, etc.)
- Payment history with receipts

**Sync Strategy:**
```typescript
// Webhook: invoice.created, invoice.updated from GHL
// → Update tenant_invoice_cache
// Nightly cron: Sync all invoices to catch any missed webhooks
```

---

### 4. Payment Processing

**Dual Payment Providers:**

**Stripe Integration:**
```typescript
// Use Stripe Payment Intents API
// Support: Credit/Debit Cards, ACH Bank Transfers

const paymentIntent = await stripe.paymentIntents.create({
  amount: invoice.amount * 100, // cents
  currency: 'usd',
  customer: tenant.stripe_customer_id,
  payment_method: savedPaymentMethod.id,
  metadata: {
    lease_id: lease.id,
    ghl_invoice_id: invoice.ghl_invoice_id,
  }
});
```

**PayPal Integration:**
```typescript
// PayPal Orders API v2
// Support: PayPal balance, PayPal Credit, Cards via PayPal

const order = await paypal.orders.create({
  intent: 'CAPTURE',
  purchase_units: [{
    reference_id: invoice.ghl_invoice_id,
    amount: {
      currency_code: 'USD',
      value: invoice.amount.toFixed(2)
    }
  }]
});
```

**Payment Methods Table:**
```sql
CREATE TABLE tenant_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_user_id UUID REFERENCES tenant_users NOT NULL,
  provider TEXT NOT NULL, -- 'stripe' or 'paypal'

  -- Stripe fields
  stripe_payment_method_id TEXT,
  stripe_customer_id TEXT,

  -- PayPal fields
  paypal_billing_agreement_id TEXT,

  -- Common fields
  type TEXT NOT NULL, -- 'card', 'bank_account', 'paypal'
  last4 TEXT,
  brand TEXT, -- 'visa', 'mastercard', 'paypal'
  exp_month INTEGER,
  exp_year INTEGER,

  is_default BOOLEAN DEFAULT false,
  is_autopay_enabled BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Payment Flow:**
```
1. Tenant clicks "Pay Now" on invoice
2. Select payment method (or add new)
3. Review amount, late fees if any
4. Confirm payment
5. Process via Stripe or PayPal
6. On success:
   - Update invoice cache status = 'paid'
   - Call GHL API to mark invoice paid
   - Send receipt email
   - Add note to GHL contact
7. Redirect to success page with receipt
```

**Autopay:**
```typescript
// Cron job runs daily at 6 AM
// Finds invoices due in 3 days with autopay enabled
// Automatically charges default payment method
// Sends email notification

// Table:
CREATE TABLE autopay_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES tenant_invoice_cache,
  tenant_user_id UUID REFERENCES tenant_users,
  payment_method_id UUID REFERENCES tenant_payment_methods,
  amount NUMERIC(10,2),
  status TEXT, -- 'pending', 'success', 'failed', 'retry'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 5. Work Orders

**Submit Work Order:**
```typescript
// Form fields:
interface WorkOrderSubmission {
  title: string; // "Kitchen faucet leaking"
  description: string; // Detailed description
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'other';
  priority: 'normal' | 'urgent' | 'emergency';
  location: string; // "Kitchen", "Master Bathroom"
  photos: File[]; // Up to 5 photos
  tenant_availability: string; // "Weekdays after 5pm"
}
```

**Database:**
```sql
-- Already exists from migration 023, just needs enhancement:
ALTER TABLE pm_work_orders
  ADD COLUMN IF NOT EXISTS photos JSONB,
  ADD COLUMN IF NOT EXISTS tenant_availability TEXT,
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors,
  ADD COLUMN IF NOT EXISTS completion_photos JSONB,
  ADD COLUMN IF NOT EXISTS tenant_rating INTEGER, -- 1-5 stars
  ADD COLUMN IF NOT EXISTS tenant_feedback TEXT;
```

**Status Workflow:**
```
submitted → assigned → scheduled → in-progress → completed → closed
            ↓
         cancelled
```

**Notifications:**
- Status changes → Email + in-app notification
- Vendor assigned → SMS to tenant
- Scheduled date confirmed → Calendar invite
- Work completed → Request for rating

**Photos:**
```sql
-- Store in Supabase Storage
-- Bucket: work-order-photos
-- Path: {lease_id}/{work_order_id}/{photo_id}.jpg

-- RLS Policies:
-- Tenants can upload to their own work orders
-- Agents/vendors can upload completion photos
-- Both can view all photos for the work order
```

---

### 6. Messages / Communication

**Architecture:**
```
Tenant Portal ←→ pm_messages table ←→ GHL Conversations API
                     (sync)
```

**Database:**
```sql
CREATE TABLE pm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES pm_leases NOT NULL,
  from_user_id UUID REFERENCES auth.users NOT NULL,
  from_user_type TEXT NOT NULL, -- 'tenant' or 'agent'
  to_user_id UUID REFERENCES auth.users NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB,

  -- GHL sync fields
  ghl_message_id TEXT,
  ghl_conversation_id TEXT,
  synced_to_ghl BOOLEAN DEFAULT false,

  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pm_messages_lease ON pm_messages(lease_id);
CREATE INDEX idx_pm_messages_unread ON pm_messages(to_user_id, read_at) WHERE read_at IS NULL;
```

**Sync Strategy:**

**Outbound (Tenant → GHL):**
```typescript
// When tenant sends message in portal:
1. Insert into pm_messages
2. Call GHL API to create message in conversation
3. Update pm_messages.ghl_message_id
4. Agent sees message in GHL
```

**Inbound (Agent → Tenant):**
```typescript
// GHL Webhook: message.created
1. Check if message is from agent to tenant contact
2. Find tenant_user by ghl_contact_id
3. Insert into pm_messages
4. Trigger email notification to tenant
5. Show unread badge in portal
```

**Features:**
- Real-time chat interface
- File attachments (lease questions, inspection photos)
- Read receipts
- Email notifications for new messages
- Message history with search

---

### 7. Lease Information

**Display:**
- Property address, unit number
- Lease start/end dates
- Monthly rent amount
- Security deposit amount
- Pet deposit (if any)
- Rent due day of month
- Notice period required
- Move-out requirements
- Download signed lease PDF

**Lease Document Access:**
```sql
-- Lease documents stored in Supabase Storage
-- Generate signed URL with 1-hour expiration

SELECT lease_document_url
FROM pm_leases
WHERE id = tenant_lease_id;

-- Or from GHL if contract stored there:
const contract = await ghlClient.getContract(lease.ghl_contract_id);
const documentUrl = contract.signedDocumentUrl;
```

---

### 8. Move-In Report

**Submission Form:**
```typescript
interface MoveInReport {
  submitted_at: Date;
  rooms: {
    [roomName: string]: {
      condition: 'excellent' | 'good' | 'fair' | 'poor';
      notes: string;
      photos: string[]; // URLs
      items: {
        [itemName: string]: {
          condition: string;
          notes: string;
        }
      }
    }
  };
  overall_condition: string;
  tenant_signature: string; // Base64 signature image
}
```

**Database:**
```sql
-- Store in pm_leases.move_in_report JSONB field
UPDATE pm_leases
SET
  move_in_report = $1,
  move_in_report_submitted_date = NOW()
WHERE id = $2;
```

**Features:**
- Room-by-room checklist
- Photo upload (before move-in condition)
- Pre-filled common items per room type
- E-signature
- PDF generation of report
- Stored with lease for move-out comparison

---

### 9. Move-Out Process

**Notice Submission:**
```typescript
// Tenant submits intent to move out
interface MoveOutNotice {
  intended_move_out_date: Date;
  forwarding_address: string;
  forwarding_city: string;
  forwarding_state: string;
  forwarding_zip: string;
  reason: string; // optional
  request_walkthrough: boolean;
  preferred_walkthrough_dates: Date[];
}

// Updates lease record:
UPDATE pm_leases SET
  notice_date = NOW(),
  move_out_date = $1,
  status = 'notice-given'
WHERE id = lease_id;
```

**Move-Out Checklist:**
```typescript
interface MoveOutChecklist {
  tasks: {
    professional_carpet_cleaning: {
      completed: boolean;
      receipt_url: string;
      company_name: string;
      date: Date;
    };
    professional_house_cleaning: {
      completed: boolean;
      receipt_url: string;
      company_name: string;
      date: Date;
    };
    utilities_transferred: boolean;
    keys_returned: boolean;
    forwarding_address_submitted: boolean;
    property_walkthrough_scheduled: boolean;
  };
  completion_percentage: number;
  submitted_at: Date;
}

-- Store in pm_leases.move_out_checklist JSONB
```

**Security Deposit Return:**
```typescript
// After agent completes move-out inspection
interface SecurityDepositStatement {
  original_deposit: number;
  deductions: {
    description: string;
    amount: number;
    category: 'cleaning' | 'repairs' | 'unpaid_rent' | 'other';
  }[];
  total_deductions: number;
  refund_amount: number;
  refund_method: 'check' | 'direct_deposit';
  refund_sent_date: Date;
  notes: string;
}

-- Display in portal
-- Tenant can dispute if needed
-- PDF download of itemized statement
```

---

### 10. Notifications & Preferences

**Notification Types:**
```sql
CREATE TABLE tenant_notification_preferences (
  tenant_user_id UUID PRIMARY KEY REFERENCES tenant_users,

  -- Channels
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT false,

  -- Event preferences
  rent_due_reminder BOOLEAN DEFAULT true,
  rent_due_days_before INTEGER DEFAULT 3,
  payment_received BOOLEAN DEFAULT true,
  work_order_updates BOOLEAN DEFAULT true,
  new_messages BOOLEAN DEFAULT true,
  lease_expiring_reminder BOOLEAN DEFAULT true,
  lease_expiring_days_before INTEGER DEFAULT 60,

  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Notification Events:**
- Rent due in X days
- Payment received confirmation
- Work order status change
- New message from property manager
- Lease expiring in X days
- Late fee assessed
- Autopay success/failure
- Move-out reminder (checklist)

---

## Route Structure

```
/tenant/login                    - Login page
/tenant/register                 - Registration (from invite link)
/tenant/dashboard                - Main dashboard
/tenant/invoices                 - All invoices (current + historical)
/tenant/invoices/[id]            - Invoice detail with pay button
/tenant/payment-methods          - Manage cards/banks/PayPal
/tenant/payment-methods/add      - Add new payment method
/tenant/autopay                  - Configure autopay settings
/tenant/work-orders              - List all work orders
/tenant/work-orders/new          - Submit new work order
/tenant/work-orders/[id]         - Work order detail & status
/tenant/messages                 - Message inbox
/tenant/messages/[conversationId] - Conversation thread
/tenant/lease                    - Lease information & document
/tenant/move-in-report           - Submit/view move-in report
/tenant/move-out                 - Move-out process hub
/tenant/move-out/notice          - Submit move-out notice
/tenant/move-out/checklist       - Move-out checklist
/tenant/settings                 - Profile & preferences
/tenant/settings/notifications   - Notification preferences
```

---

## API Routes

```
/api/tenant/auth/register        - Complete tenant registration
/api/tenant/auth/resend-invite   - Resend invite email

/api/tenant/invoices             - GET: List invoices
/api/tenant/invoices/[id]        - GET: Invoice details
/api/tenant/invoices/[id]/pay    - POST: Process payment

/api/tenant/payment-methods      - GET: List, POST: Add
/api/tenant/payment-methods/[id] - DELETE: Remove, PATCH: Set default

/api/tenant/work-orders          - GET: List, POST: Create
/api/tenant/work-orders/[id]     - GET: Detail, PATCH: Update
/api/tenant/work-orders/[id]/photos - POST: Upload photos

/api/tenant/messages             - GET: List conversations, POST: Send
/api/tenant/messages/[id]/read   - POST: Mark as read

/api/tenant/lease                - GET: Lease info
/api/tenant/lease/document       - GET: Download lease PDF

/api/tenant/move-in-report       - POST: Submit report
/api/tenant/move-out/notice      - POST: Submit move-out notice
/api/tenant/move-out/checklist   - POST: Update checklist

/api/tenant/notifications/prefs  - GET/PATCH: Notification preferences
```

---

## Webhooks

**From GHL:**
```typescript
// Invoice webhooks
/api/webhooks/ghl/invoice-created
/api/webhooks/ghl/invoice-paid
/api/webhooks/ghl/invoice-overdue

// Message webhooks
/api/webhooks/ghl/message-created
```

**From Stripe:**
```typescript
/api/webhooks/stripe
// Events:
// - payment_intent.succeeded
// - payment_intent.failed
// - customer.subscription.created (for autopay)
```

**From PayPal:**
```typescript
/api/webhooks/paypal
// Events:
// - PAYMENT.CAPTURE.COMPLETED
// - PAYMENT.CAPTURE.DENIED
```

---

## Payment Flow Diagrams

### Stripe Payment Flow
```
Tenant clicks "Pay Now"
  ↓
Select/Add payment method
  ↓
Create PaymentIntent
  ↓
Stripe processes payment
  ↓
Webhook: payment_intent.succeeded
  ↓
Update invoice status → 'paid'
  ↓
Call GHL API: markInvoicePaid()
  ↓
Send receipt email
  ↓
Add note to tenant GHL contact
```

### PayPal Payment Flow
```
Tenant clicks "Pay with PayPal"
  ↓
Redirect to PayPal
  ↓
Tenant approves payment
  ↓
PayPal redirects back to app
  ↓
Capture payment
  ↓
Webhook: PAYMENT.CAPTURE.COMPLETED
  ↓
Update invoice status → 'paid'
  ↓
Call GHL API: markInvoicePaid()
  ↓
Send receipt email
```

### Autopay Flow
```
Cron: Daily 6 AM
  ↓
Find invoices due in 3 days
  ↓
Filter: autopay_enabled = true
  ↓
For each invoice:
  ↓
Get default payment method
  ↓
Create payment (Stripe or PayPal)
  ↓
If success:
  - Mark paid
  - Send confirmation email
  ↓
If failure:
  - Log error
  - Send failure notification
  - Retry logic (up to 3 times)
```

---

## Implementation Phases

### Phase 1E-1: Foundation (Week 1)
- [ ] Tenant authentication & registration
- [ ] Tenant invitation email system
- [ ] Basic dashboard layout
- [ ] RLS policies for tenant data access
- [ ] Route structure setup

### Phase 1E-2: Payments (Week 2)
- [ ] Stripe integration
  - [ ] Payment Intents API
  - [ ] Customer & PaymentMethod management
  - [ ] Webhook handler
- [ ] PayPal integration
  - [ ] Orders API v2
  - [ ] Webhook handler
- [ ] Payment methods CRUD
- [ ] Invoice payment flow
- [ ] Receipt generation

### Phase 1E-3: Work Orders (Week 3)
- [ ] Work order submission form
- [ ] Photo upload to Supabase Storage
- [ ] Work order list & detail views
- [ ] Status tracking
- [ ] Email notifications
- [ ] Agent work order management UI

### Phase 1E-4: Messaging (Week 4)
- [ ] Message UI (inbox + thread view)
- [ ] GHL conversation sync (bidirectional)
- [ ] File attachments
- [ ] Unread badges
- [ ] Email notifications

### Phase 1E-5: Lease & Reports (Week 5)
- [ ] Lease information display
- [ ] Lease document download
- [ ] Move-in report form with photos
- [ ] Move-out notice submission
- [ ] Move-out checklist
- [ ] Security deposit statement

### Phase 1E-6: Autopay & Polish (Week 6)
- [ ] Autopay configuration UI
- [ ] Autopay cron job
- [ ] Retry logic for failed payments
- [ ] Notification preferences
- [ ] Email templates (all types)
- [ ] Mobile responsive design
- [ ] Testing & bug fixes

---

## Security Considerations

**Row Level Security (RLS):**
```sql
-- Tenants can only see their own lease data
CREATE POLICY tenant_own_lease ON pm_leases
  FOR SELECT
  TO authenticated
  USING (
    tenant_contact_id = auth.uid()
    OR
    id IN (SELECT lease_id FROM tenant_users WHERE id = auth.uid())
  );

-- Tenants can only see invoices for their lease
CREATE POLICY tenant_own_invoices ON tenant_invoice_cache
  FOR SELECT
  TO authenticated
  USING (
    tenant_user_id = auth.uid()
  );

-- Similar policies for work_orders, messages, payment_methods
```

**Payment Security:**
- Never store full card numbers
- Use Stripe/PayPal tokenization
- PCI DSS compliance via providers
- Secure webhook signature verification
- HTTPS only for all routes

**Data Privacy:**
- Tenants can only see their own data
- Audit log for sensitive operations
- Secure document URLs (signed, expiring)
- GDPR-compliant data export/deletion

---

## Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_MODE=live # or 'sandbox'

# Email (for notifications)
SENDGRID_API_KEY=...
TENANT_NOTIFICATION_EMAIL=notifications@realestategenie.app

# GHL (already configured)
GHL_API_KEY=...
GHL_LOCATION_ID=...

# App URLs
NEXT_PUBLIC_APP_URL=https://www.realestategenie.app
TENANT_PORTAL_URL=https://www.realestategenie.app/tenant
```

---

## Success Metrics

**Adoption:**
- % of tenants who activate their portal account
- Average time from invite to activation

**Engagement:**
- % of rent payments made via portal
- Average work orders submitted per month
- Message response time (tenant → agent)

**Efficiency:**
- Reduction in phone calls to property manager
- % of invoices paid on time
- Autopay enrollment rate

**Satisfaction:**
- Work order completion rating
- Portal NPS score
- Feature usage heatmap

---

## Future Enhancements (Phase 3+)

- **Roommate Management**: Multiple tenants per lease
- **Renters Insurance**: Partner integration
- **Community Board**: Announcements, events
- **Amenity Booking**: Reserve shared spaces (pool, gym)
- **Package Tracking**: Delivery notifications
- **Maintenance Marketplace**: Tenant can choose vendor
- **Move-In/Out Scheduling**: Calendar integration
- **Virtual Tours**: For current tenants to show unit
- **Lease Renewal**: In-app renewal process
- **Utility Management**: Track & split utilities
- **Pet Registration**: Pet profiles, vaccinations
- **Parking Management**: Assign spots, guest passes
- **Mobile App**: Native iOS/Android apps

---

## Technical Stack Summary

**Frontend:**
- Next.js 16 App Router
- React Server Components
- Shadcn UI components
- Tailwind CSS

**Backend:**
- Next.js API routes
- Supabase PostgreSQL
- Supabase Storage (files)
- Supabase Auth

**Integrations:**
- GoHighLevel (CRM, invoicing)
- Stripe (card payments, ACH)
- PayPal (PayPal payments)
- SendGrid (transactional emails)

**Infrastructure:**
- Vercel (hosting)
- Supabase (database, auth, storage)
- Cron (via Vercel Cron or external)

---

## Next Steps

1. **Complete Phase 1D**: Monthly invoicing automation
2. **Review & Approve**: This tenant portal spec
3. **Begin Phase 1E**: Tenant portal development (6 weeks)
4. **Beta Testing**: Invite 5-10 tenants for feedback
5. **Production Launch**: Full rollout to all tenants

---

**Questions?**
- Payment provider credentials setup?
- Email service preference (SendGrid, AWS SES, Postmark)?
- Mobile app in Phase 2 or Phase 3?
- Preferred cron service (Vercel Cron, external)?
