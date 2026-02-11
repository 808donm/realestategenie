# Property Management Complete Workflow Specification

## Overview
This document details the complete tenant lifecycle workflow from rental open house through lease termination, including all GHL Contract integration touchpoints.

---

## Step 1: Rental Open House → Application

### User Actions
1. Agent creates open house event with `event_type = 'rental'`
2. Prospective tenant visits property and scans QR code
3. Check-in form detects rental type and shows extended application fields

### Application Fields (Extended Check-in Form)
**Basic Info:**
- Name, email, phone (standard)
- Number of occupants
- Desired move-in date

**Employment:**
- Current employment status (employed, self-employed, retired, unemployed)
- Employer name
- Job title
- Length of employment
- Annual gross income
- Employer phone number

**Current Residence:**
- Current address
- Landlord/property manager name
- Landlord phone number
- Monthly rent currently paying
- Reason for moving
- How long at current address

**References:**
- Previous landlord name, phone
- Personal reference #1 (name, relationship, phone)
- Personal reference #2 (name, relationship, phone)

**Additional:**
- Pets (type, breed, weight, number)
- Vehicles (make, model, license plate)
- Emergency contact (name, relationship, phone)
- Background check consent checkbox
- Credit check authorization checkbox

### Database Actions
```sql
-- Create lead submission
INSERT INTO lead_submissions (...)

-- Create rental application
INSERT INTO pm_applications (
  agent_id,
  pm_property_id,
  pm_unit_id,
  lead_submission_id,
  applicant_name,
  applicant_email,
  applicant_phone,
  employment_status,
  employer_name,
  annual_income,
  current_address,
  move_in_date,
  applicant_references, -- JSONB
  pets, -- JSONB
  emergency_contact, -- JSONB
  status -- 'pending'
)
```

### GHL Sync
- Create/update contact with application data as custom fields
- Tag: `rental-application-submitted`
- Trigger: Application screening workflow
- Notification to agent

---

## Step 2: Application Review → Credit Check → Lease Creation

### User Actions
1. Agent views application at `/app/pm/applications`
2. Clicks **"Run Credit Check"** button

### Credit Check Options

**Option A: Manual (Phase 1)**
- Display links to credit check services:
  - TransUnion SmartMove (opens in new tab)
  - Experian RentBureau (opens in new tab)
  - MyRental (opens in new tab)
- Agent manually runs check and returns to mark result
- Field: `credit_check_result` (approved/declined/pending)
- Field: `credit_score` (number, optional)

**Option B: API Integration (Phase 2 - Future)**
- Direct API integration with credit check service
- Automated credit pull with consent
- Results stored in database

### Approval Flow
1. Agent reviews:
   - Application details
   - Credit check result
   - References (called manually)
   - Employment verification
2. Updates status: `pending → screening → approved/rejected`
3. If **approved**, clicks **"Create Lease"** button

### Database Actions
```sql
-- Update application
UPDATE pm_applications
SET
  status = 'approved',
  credit_check_result = 'approved',
  credit_score = 720,
  approved_date = NOW()
WHERE id = ?;

-- Create lease record
INSERT INTO pm_leases (
  agent_id,
  pm_property_id,
  pm_unit_id,
  pm_application_id,
  tenant_contact_id, -- from GHL
  lease_type, -- 'fixed-term'
  lease_status, -- 'pending-signature'
  start_date,
  end_date, -- 1 year from start
  monthly_rent,
  security_deposit,
  rent_due_day, -- e.g., 1st of month
  notice_period_days, -- default 30
  auto_invoice, -- true
  ghl_contract_id -- NULL initially, populated after contract creation
)
```

### GHL Contract Creation
**API Call:** Create contract from template

**Contract Template Variables:**
- Tenant name, email, phone
- Property address
- Unit number (if applicable)
- Lease start date, end date
- Monthly rent amount
- Security deposit amount
- Rent due day
- Notice period (30/45/60 days)
- Pet policy
- Special provisions

**Actions:**
1. Create contract via GHL API
2. Store `ghl_contract_id` in `pm_leases` table
3. GHL sends contract to tenant email for e-signature
4. GHL sends contract to agent email for e-signature
5. Update application status: `approved → lease-created`

### Lease Document Handling

**Standard Lease:**
- Pre-built template in GHL with fillable fields
- Auto-populated from lease data

**Custom Lease Upload:**
- Agent uploads PDF lease document
- Stored in Supabase Storage: `lease-documents/{lease_id}/custom-lease.pdf`
- Attached to GHL contract as document

**Database Fields:**
```sql
ALTER TABLE pm_leases
ADD COLUMN lease_document_type TEXT DEFAULT 'standard', -- 'standard' or 'custom'
ADD COLUMN custom_lease_url TEXT; -- Supabase storage URL if custom
```

---

## Step 3: Lease Signing & Activation

### Contract Signing Flow
1. Tenant receives email from GHL with contract link
2. Tenant e-signs contract
3. Agent receives notification
4. Agent e-signs contract
5. **GHL webhook fires** → `contract.signed` event

### Webhook Handler
**Endpoint:** `/api/webhooks/ghl/contract-signed`

```typescript
// Update lease status
UPDATE pm_leases
SET
  lease_status = 'active-fixed',
  signed_date = NOW()
WHERE ghl_contract_id = webhookData.contractId;
```

### First Invoice Creation (Combined)
**GHL Action:** Create combined invoice

**Invoice Line Items:**
1. First Month's Rent: `$monthly_rent`
2. Security Deposit: `$security_deposit`
3. **Total:** `$monthly_rent + $security_deposit`

**Invoice Details:**
- Due date: Lease start date (or immediate if already started)
- Payment link included in email
- Accept payments via GHL (credit card, ACH)

### Move-In Walkthrough Report

**Email Sent:** To tenant via GHL workflow

**Email Content:**
- Welcome message
- Lease start date reminder
- Move-in walkthrough instructions
- **Upload link** to submit report

**Upload Link:** Points to `/api/pm/leases/{lease_id}/move-in-report`

**Form Fields:**
- Overall property condition (dropdown: Excellent, Good, Fair, Poor)
- Room-by-room condition notes (textarea per room)
- Photo uploads (multiple, up to 20 photos)
- Tenant signature (digital)
- Date submitted

**Storage:**
- Photos: Supabase Storage `lease-documents/{lease_id}/move-in/`
- Report data: JSON stored in `pm_leases.move_in_report` field

```sql
ALTER TABLE pm_leases
ADD COLUMN move_in_report JSONB,
ADD COLUMN move_in_report_submitted_date TIMESTAMP;
```

### GHL Sync on Activation
- Update contact tag: `active-tenant`
- Remove tag: `rental-application`
- Add to "Active Tenants" segment
- Trigger recurring rent invoice workflow

### QBO Sync (if connected)
```typescript
// Create QBO Customer from tenant
POST /qbo/customer {
  DisplayName: tenant_name,
  PrimaryEmailAddr: tenant_email,
  Notes: `Tenant at ${property_address} - Lease start: ${start_date}`
}

// Create QBO Invoice for first payment
POST /qbo/invoice {
  CustomerRef: qbo_customer_id,
  Line: [
    { Description: "First Month Rent", Amount: monthly_rent },
    { Description: "Security Deposit", Amount: security_deposit }
  ]
}
```

---

## Step 4: Recurring Rent Billing

### Automated Invoice Generation
**Trigger:** GHL Workflow (scheduled daily check)

**Logic:**
```javascript
// Run daily for all active leases
FOR EACH lease WHERE lease_status IN ('active-fixed', 'active-month-to-month') {
  invoice_date = today
  due_date = next occurrence of rent_due_day

  // Create invoice 5 days before due date
  if (invoice_date == due_date - 5 days) {
    createRentInvoice(lease)
  }
}
```

**Invoice Details:**
- **Created:** 5 days before `rent_due_day`
- **Due date:** `rent_due_day` of current month
- **Amount:** `monthly_rent`
- **Description:** "Rent for [Property Address] - [Month Year]"

**Email to Tenant:**
- Subject: "Rent Due [Due Date] - [Property Address]"
- Invoice PDF attached
- **Payment link** to GHL payment page
- Payment methods: Credit card, ACH, bank transfer

### Payment Processing
**GHL Payment Received:**
1. Tenant clicks payment link
2. Pays via GHL payment form
3. Payment processed through GHL Payments
4. **GHL webhook fires** → `invoice.paid` event

**Webhook Handler:** `/api/webhooks/ghl/invoice-paid`

```typescript
// Mark invoice as paid in our DB (optional tracking)
UPDATE pm_invoices
SET
  status = 'paid',
  paid_date = NOW(),
  payment_method = webhookData.paymentMethod
WHERE ghl_invoice_id = webhookData.invoiceId;

// Sync to QBO
if (qbo_connected) {
  // Create QBO payment record
  POST /qbo/payment {
    CustomerRef: tenant_qbo_id,
    TotalAmt: amount,
    Line: [{
      Amount: amount,
      LinkedTxn: [{ TxnId: qbo_invoice_id }]
    }]
  }

  // Mark QBO invoice as paid
  POST /qbo/invoice/{id}?operation=update {
    Balance: 0
  }
}
```

### Late Payment Handling
**GHL Workflow:** Checks for unpaid invoices past due date

**Actions:**
- Day 1 late: Friendly reminder email
- Day 3 late: Second reminder + late fee added (if configured)
- Day 7 late: Agent notification
- Day 15 late: Final notice before legal action

---

## Step 5: Lease End Date Approaching

### Expiration Monitoring
**Trigger:** Daily cron job checks leases

```javascript
// 60 days before end_date
if (end_date - today == 60 days) {
  pm_leases.renewal_status = 'expiring-soon'
  notifyAgent(lease, "60 day renewal notice")
}

// 30 days before end_date
if (end_date - today == 30 days) {
  notifyAgent(lease, "30 day renewal decision needed")
}
```

### Agent Dashboard Alerts
At `/app/pm/leases`:
- Shows leases expiring in 60/30 days
- Badge: "Action Required"
- Options:
  1. **Renew Lease** → Create new 1-year lease (new contract)
  2. **Convert to Month-to-Month** → Allow automatic conversion
  3. **Do Not Renew** → Notify tenant lease ending

### Renewal Option: Create New Lease
- Creates new `pm_leases` record for next year
- New GHL contract generated
- Can update rent amount (market rate)
- Both parties must sign new contract
- Old lease ends on original `end_date`
- New lease begins day after

### Non-Renewal Option
- Agent selects "Do Not Renew"
- `renewal_status = 'not-renewing'`
- GHL sends non-renewal notice to tenant (required by law, typically 60 days)
- Lease ends on `end_date`
- Move-out process triggered

---

## Step 6: Automatic Month-to-Month Conversion

### Conversion Logic
**Trigger:** On `end_date` if `renewal_status != 'renewing' AND renewal_status != 'not-renewing'`

**Automated Actions:**
```sql
UPDATE pm_leases
SET
  lease_type = 'month-to-month',
  lease_status = 'active-month-to-month',
  end_date = NULL, -- No fixed end date
  converted_to_mtm_date = NOW()
WHERE id = ? AND end_date = CURRENT_DATE;
```

**GHL Actions:**
- Update contact tag: `month-to-month-tenant`
- Optional: Generate MTM addendum contract (depends on local law)
- Continue monthly rent invoices (same amount, same due day)

### Month-to-Month Rent Adjustments

**UI at `/app/pm/leases/{id}`:**
- Button: "Adjust Rent"
- Modal opens with options:
  - Custom amount: `$______`
  - Percentage increase:
    - [ ] 1.5% increase
    - [ ] 2% increase
    - [ ] 3% increase
    - [ ] Custom: ____%
  - Effective date: [date picker]
  - Notice period: [auto-calculated based on local law, default 30 days]

**Database:**
```sql
ALTER TABLE pm_leases
ADD COLUMN rent_increase_history JSONB; -- Array of {old_amount, new_amount, effective_date, notice_date}
```

**Process:**
1. Agent submits rent increase
2. System validates notice period (must give 30+ days notice)
3. GHL sends rent increase notice to tenant
4. On effective date, `monthly_rent` updated
5. Future invoices use new amount

### Notice Period Configuration

**Database Field:**
```sql
ALTER TABLE pm_leases
ADD COLUMN notice_period_days INTEGER DEFAULT 30;
```

**UI:** Editable at lease creation
- Default: 30 days
- Options: 30, 45, 60, 90 days
- Based on local landlord-tenant law

---

## Step 7: Tenant Gives Notice to Vacate

### Recording Notice
**Agent Action at `/app/pm/leases/{id}`:**
1. Clicks **"Record Move-Out Notice"** button
2. Form appears:
   - Notice date: [date picker] (defaults to today)
   - Planned move-out date: [auto-calculated: notice_date + notice_period_days]
   - Reason (optional): [dropdown: End of lease, Purchasing home, Relocating, Other]

**Database:**
```sql
UPDATE pm_leases
SET
  lease_status = 'notice-given',
  notice_date = ?,
  move_out_date = ?,
  move_out_reason = ?
WHERE id = ?;
```

### Notice Period Rules
- Notice must be at least `notice_period_days` (default 30)
- Move-out date calculated automatically
- Rent continues until `move_out_date`
- Final invoice pro-rated if moving mid-month

### Move-Out Checklist Generation

**GHL Workflow Triggered:** When `lease_status = 'notice-given'`

**Email Sent to Tenant:**
- Subject: "Move-Out Checklist - [Property Address]"
- Move-out date reminder
- Checklist based on lease provisions

**Checklist Items (Dynamic based on lease):**
- [ ] Professional carpet cleaning required
  - Upload receipt: [link]
- [ ] Professional house cleaning required
  - Upload receipt: [link]
- [ ] Repair any damage beyond normal wear and tear
- [ ] Remove all personal belongings
- [ ] Return all keys and access devices
- [ ] Forward mailing address for security deposit return
- [ ] Schedule final walkthrough with agent

**Upload Portal:** `/api/pm/leases/{lease_id}/move-out-checklist`

**Form Fields:**
- Checklist item uploads (receipts as PDFs)
- Photo uploads (property cleaned condition)
- Forwarding address
- Final utilities disconnection confirmations
- Tenant signature

**Storage:**
```sql
ALTER TABLE pm_leases
ADD COLUMN move_out_checklist JSONB,
ADD COLUMN move_out_checklist_submitted_date TIMESTAMP;
```

### Professional Service Requirements

**Lease Provisions Tracked:**
```sql
ALTER TABLE pm_leases
ADD COLUMN requires_professional_carpet_cleaning BOOLEAN DEFAULT false,
ADD COLUMN requires_professional_house_cleaning BOOLEAN DEFAULT false,
ADD COLUMN move_out_requirements JSONB; -- Custom requirements
```

**Checklist dynamically built from these fields**

---

## Step 8: Move-Out Inspection & Lease Completion

### Move-Out Walkthrough

**Agent Receives Email:**
- **Trigger:** 3 days before `move_out_date`
- **Subject:** "Move-Out Walkthrough Due - [Property Address]"
- **Content:**
  - Move-out date reminder
  - Tenant's uploaded move-out checklist (if submitted)
  - Link to upload move-out inspection report

**Move-Out Inspection Form:** `/api/pm/leases/{lease_id}/move-out-inspection`

**Form Fields:**
- Inspection date
- Room-by-room condition assessment
  - Compare to move-in report (shown side-by-side)
  - Note any damage beyond normal wear and tear
- Photo uploads (damage documentation)
- Overall property condition (dropdown)
- Cleaning compliance (meets standards: Yes/No)
- Carpet cleaning verification (receipt reviewed: Yes/No)
- Deductions itemized:
  - Damage repair costs
  - Cleaning costs (if not done)
  - Unpaid rent
  - Other charges
- Security deposit disposition:
  - [ ] Full refund
  - [ ] Partial refund (amount: $_____)
  - [ ] No refund (explain)
- Agent signature
- Date

**Storage:**
```sql
ALTER TABLE pm_leases
ADD COLUMN move_out_inspection JSONB,
ADD COLUMN move_out_inspection_date TIMESTAMP,
ADD COLUMN security_deposit_deductions JSONB,
ADD COLUMN security_deposit_refund_amount NUMERIC(10,2);
```

### Final Accounting

**Security Deposit Disposition:**
1. Agent submits move-out inspection
2. Deductions calculated automatically
3. Refund amount determined: `security_deposit - total_deductions`
4. **GHL Action:** Create refund invoice (or charge invoice if owed)

**If Refund Due:**
- Create GHL invoice with negative amount (credit)
- Or process refund via GHL Payments
- Email tenant itemized deduction statement (legally required)
- Mail check or ACH refund

**If Tenant Owes:**
- Create GHL invoice for balance owed
- Email tenant with itemized charges
- Collection workflow if unpaid

### QBO Sync
```typescript
// Record security deposit refund/charge
if (refund_amount > 0) {
  POST /qbo/refundreceipt {
    CustomerRef: tenant_qbo_id,
    TotalAmt: refund_amount
  }
} else if (tenant_owes > 0) {
  POST /qbo/invoice {
    CustomerRef: tenant_qbo_id,
    Line: [
      { Description: "Damage repair", Amount: damage_cost },
      { Description: "Cleaning", Amount: cleaning_cost },
      { Description: "Unpaid rent", Amount: unpaid_rent }
    ]
  }
}
```

### Lease Closure

**Final Database Update:**
```sql
UPDATE pm_leases
SET
  lease_status = 'ended',
  actual_end_date = move_out_date,
  auto_invoice = false,
  final_balance = tenant_balance
WHERE id = ?;
```

**GHL Actions:**
- Update tenant contact tag: `past-tenant`
- Remove from active tenant segment
- Archive contact (optional)
- Mark unit as vacant

**Unit Status:**
```sql
UPDATE pm_units
SET
  status = 'vacant',
  last_tenant_move_out = move_out_date
WHERE id = ?;
```

**Property Ready for New Rental:**
- Unit shows as available at `/app/pm/properties`
- Can create new rental open house event
- Cycle repeats

---

## Early Lease Termination

### Termination Scenarios

**Agent Action:** At `/app/pm/leases/{id}` → **"Terminate Lease Early"**

**Termination Options:**

#### Option 1: Tenant Responsible for Remaining Rent
- **Use Case:** Tenant breaks lease without cause
- **Fields:**
  - Termination date
  - Remaining months on lease
  - Total amount owed: `monthly_rent × remaining_months`
  - Payment plan option (Yes/No)

**Database:**
```sql
UPDATE pm_leases
SET
  lease_status = 'terminated',
  termination_date = ?,
  termination_type = 'tenant-liable',
  termination_balance_owed = ?
WHERE id = ?;
```

**GHL Action:**
- Create invoice for remaining rent
- Payment plan workflow (if selected)
- Collection workflow if unpaid

#### Option 2: Termination for Cause (Eviction)
- **Use Case:** Lease violation, non-payment, illegal activity
- **Fields:**
  - Termination date
  - Cause (dropdown):
    - Non-payment of rent
    - Lease violation
    - Property damage
    - Illegal activity
    - Unauthorized occupants/pets
    - Other
  - Detailed explanation (textarea)
  - Supporting documents (upload)

**Database:**
```sql
UPDATE pm_leases
SET
  lease_status = 'terminated',
  termination_date = ?,
  termination_type = 'for-cause',
  termination_reason = ?,
  termination_notes = ?
WHERE id = ?;
```

**GHL Actions:**
- Generate termination notice (legal document)
- Tag contact: `eviction-in-process`
- Trigger legal workflow

#### Option 3: Mutual Agreement / Other
- **Use Case:** Both parties agree to end lease early
- **Fields:**
  - Termination date
  - Reason (dropdown):
    - Mutual agreement
    - Property sold
    - Uninhabitable (repairs needed)
    - Owner move-in
    - Other
  - Early termination fee (if applicable)
  - Explanation (textarea)

**Database:**
```sql
UPDATE pm_leases
SET
  lease_status = 'terminated',
  termination_date = ?,
  termination_type = 'mutual-agreement',
  termination_reason = ?,
  early_termination_fee = ?
WHERE id = ?;
```

**Process:**
- Optional early termination fee invoice
- Abbreviated move-out process
- Security deposit handled per agreement

### Termination Database Schema

```sql
ALTER TABLE pm_leases
ADD COLUMN termination_date DATE,
ADD COLUMN termination_type TEXT, -- 'tenant-liable', 'for-cause', 'mutual-agreement'
ADD COLUMN termination_reason TEXT,
ADD COLUMN termination_notes TEXT,
ADD COLUMN termination_balance_owed NUMERIC(10,2),
ADD COLUMN termination_documents JSONB; -- URLs to uploaded docs
```

---

## Database Schema Summary

### Updated pm_leases Table

```sql
CREATE TABLE pm_leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  pm_property_id UUID REFERENCES pm_properties(id) ON DELETE SET NULL,
  pm_unit_id UUID REFERENCES pm_units(id) ON DELETE SET NULL,
  pm_application_id UUID REFERENCES pm_applications(id) ON DELETE SET NULL,

  -- GHL Integration
  tenant_contact_id TEXT, -- GHL contact ID
  ghl_contract_id TEXT, -- GHL contract ID

  -- Lease Terms
  lease_type TEXT NOT NULL DEFAULT 'fixed-term', -- 'fixed-term', 'month-to-month'
  lease_status TEXT NOT NULL DEFAULT 'pending-signature',
  start_date DATE NOT NULL,
  end_date DATE, -- NULL for month-to-month
  monthly_rent NUMERIC(10,2) NOT NULL,
  security_deposit NUMERIC(10,2),
  rent_due_day INTEGER DEFAULT 1, -- Day of month
  notice_period_days INTEGER DEFAULT 30,

  -- Lease Documents
  lease_document_type TEXT DEFAULT 'standard', -- 'standard' or 'custom'
  custom_lease_url TEXT,

  -- Special Provisions
  requires_professional_carpet_cleaning BOOLEAN DEFAULT false,
  requires_professional_house_cleaning BOOLEAN DEFAULT false,
  move_out_requirements JSONB,

  -- Lifecycle Tracking
  signed_date TIMESTAMP,
  converted_to_mtm_date TIMESTAMP,
  renewal_status TEXT, -- 'expiring-soon', 'renewing', 'converting-mtm', 'not-renewing'

  -- Rent Adjustments
  rent_increase_history JSONB, -- [{old_amount, new_amount, effective_date, notice_date}]

  -- Move-In
  move_in_report JSONB,
  move_in_report_submitted_date TIMESTAMP,

  -- Move-Out Notice
  notice_date DATE,
  move_out_date DATE,
  move_out_reason TEXT,
  move_out_checklist JSONB,
  move_out_checklist_submitted_date TIMESTAMP,

  -- Move-Out Inspection
  move_out_inspection JSONB,
  move_out_inspection_date TIMESTAMP,
  security_deposit_deductions JSONB,
  security_deposit_refund_amount NUMERIC(10,2),
  actual_end_date DATE,

  -- Early Termination
  termination_date DATE,
  termination_type TEXT, -- 'tenant-liable', 'for-cause', 'mutual-agreement'
  termination_reason TEXT,
  termination_notes TEXT,
  termination_balance_owed NUMERIC(10,2),
  termination_documents JSONB,

  -- Billing
  auto_invoice BOOLEAN DEFAULT true,
  final_balance NUMERIC(10,2),

  -- QBO Sync
  qbo_customer_id TEXT,
  qbo_last_synced TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT lease_type_check CHECK (lease_type IN ('fixed-term', 'month-to-month')),
  CONSTRAINT lease_status_check CHECK (lease_status IN (
    'pending-signature',
    'active-fixed',
    'active-month-to-month',
    'notice-given',
    'ended',
    'terminated'
  ))
);

-- Indexes
CREATE INDEX idx_leases_agent ON pm_leases(agent_id);
CREATE INDEX idx_leases_property ON pm_leases(pm_property_id);
CREATE INDEX idx_leases_unit ON pm_leases(pm_unit_id);
CREATE INDEX idx_leases_status ON pm_leases(lease_status);
CREATE INDEX idx_leases_end_date ON pm_leases(end_date) WHERE end_date IS NOT NULL;
CREATE INDEX idx_leases_ghl_contract ON pm_leases(ghl_contract_id);
```

### Updated pm_applications Table

```sql
ALTER TABLE pm_applications
ADD COLUMN credit_check_result TEXT, -- 'approved', 'declined', 'pending'
ADD COLUMN credit_score INTEGER,
ADD COLUMN approved_date TIMESTAMP;
```

### New pm_units Status Values

```sql
ALTER TABLE pm_units
ADD COLUMN last_tenant_move_out DATE;
```

---

## Implementation Phases

### Phase 1A: Enhanced Application ✅ COMPLETE
- Extended check-in form for rentals
- Application database schema
- GHL sync for applications

### Phase 1B: Credit Check & Lease Creation (CURRENT)
- Credit check links/manual workflow
- Lease creation flow
- GHL contract integration
- Standard lease templates
- Custom lease upload

### Phase 1C: Lease Activation & Move-In
- Contract signing webhook handler
- Combined first invoice (rent + deposit)
- Move-in walkthrough email & upload portal
- GHL workflow triggers

### Phase 1D: Recurring Billing
- 5-day advance invoice creation
- GHL payment processing
- QBO payment sync
- Late payment workflows

### Phase 2A: Lease Lifecycle
- Expiration monitoring (60/30 days)
- Renewal workflows
- Month-to-month conversion (automatic)
- Rent adjustment for MTM

### Phase 2B: Move-Out Process
- Notice recording
- Move-out checklist generation (dynamic based on lease provisions)
- Receipt upload portal
- Move-out inspection form
- Security deposit disposition

### Phase 2C: Early Termination
- Termination options (tenant-liable, for-cause, mutual)
- Balance calculation
- Legal notice generation

### Phase 3: Advanced Features
- Credit check API integration (TransUnion, Experian)
- Automated late fees
- Owner portal (for multi-owner properties)
- Maintenance request integration with work orders
- Reporting & analytics

---

## GHL Webhooks Required

| Event | Webhook Endpoint | Purpose |
|-------|-----------------|---------|
| `contract.signed` | `/api/webhooks/ghl/contract-signed` | Activate lease when fully executed |
| `invoice.paid` | `/api/webhooks/ghl/invoice-paid` | Mark rent as paid, sync to QBO |
| `invoice.overdue` | `/api/webhooks/ghl/invoice-overdue` | Trigger late payment workflow |
| `contact.updated` | `/api/webhooks/ghl/contact-updated` | Sync tenant info changes |

---

## API Endpoints Required

### Public/Tenant-Facing
- `GET /api/pm/leases/{id}/move-in-report` - Move-in report upload form
- `POST /api/pm/leases/{id}/move-in-report` - Submit move-in report
- `GET /api/pm/leases/{id}/move-out-checklist` - Move-out checklist upload form
- `POST /api/pm/leases/{id}/move-out-checklist` - Submit move-out checklist

### Agent-Facing
- `POST /api/pm/applications/{id}/approve` - Approve application
- `POST /api/pm/leases/create` - Create lease & GHL contract
- `POST /api/pm/leases/{id}/upload-custom-lease` - Upload custom lease PDF
- `POST /api/pm/leases/{id}/record-notice` - Record tenant notice to vacate
- `POST /api/pm/leases/{id}/move-out-inspection` - Submit move-out inspection
- `POST /api/pm/leases/{id}/adjust-rent` - Adjust MTM rent
- `POST /api/pm/leases/{id}/terminate` - Early termination

### Webhooks
- `POST /api/webhooks/ghl/contract-signed` - Handle contract signing
- `POST /api/webhooks/ghl/invoice-paid` - Handle payment
- `POST /api/webhooks/ghl/invoice-overdue` - Handle late payment

---

## Next Steps

Ready to proceed with **Phase 1B: Credit Check & Lease Creation**?

This will include:
1. Database migration for enhanced pm_leases table
2. Credit check UI (manual links to services)
3. Lease creation form with all provisions
4. GHL contract API integration
5. Custom lease upload functionality
