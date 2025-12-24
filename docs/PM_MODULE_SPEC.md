# Property Management Module - Technical Specification

## Product Overview

The Real Estate Genie Property Management (PM) module is a **lightweight add-on** for independent agents and small agencies who moonlight as property managers. It is NOT a replacement for AppFolio or Buildium - it's a simpler, more affordable alternative for agencies managing 50-100 units across their team (townhomes, condos, single-family homes).

## Core Philosophy

**What PM Does:**
- Manage rental properties and units
- Track rental applications from open house events
- Manage leases and automate rent invoicing
- Handle maintenance work orders
- Sync to QuickBooks Online for accounting

**What PM Does NOT Do:**
- Trust/escrow accounting
- Full general ledger
- Complex owner distributions
- Replace QuickBooks Online
- Manage large apartment complexes

## Target Customer

- Independent agents doing sales + some PM
- Small agencies (non-branded)
- Managing 50-100 units across the agency (e.g., 10 agents × 10 units each)
- Already using QuickBooks Online
- Want speed, simplicity, affordability

## System Architecture

### Systems of Record

**GHL (System of Action)**
- CRM (contacts, conversations)
- Automations and workflows
- **Invoices and payments** (rent collection)
- Messaging (SMS/email)
- Custom objects (synced from our DB)

**Our App (Logic + Glue)**
- PM business logic
- Property/unit/lease orchestration
- Open house event extensions
- QBO authentication and sync
- Idempotency and error handling

**QuickBooks Online (Accounting System)**
- Official books
- Income tracking
- Payment reconciliation
- Accountant access

## Database Schema

### Core PM Tables

#### `pm_properties`
Rental properties in the portfolio (NOT sales listings).

```sql
- id (UUID, PK)
- agent_id (UUID, FK to agents)
- address (TEXT, required)
- city (TEXT)
- state_province (TEXT)
- zip_postal_code (TEXT)
- property_type (ENUM: single_family, condo, townhome, duplex, multi_unit)
- units_count (INT, default 1)
- owner_contact_id (UUID, FK to agents - optional for v1)
- monthly_rent (NUMERIC) -- base rent if single-unit
- security_deposit (NUMERIC)
- pet_deposit (NUMERIC)
- pet_policy (TEXT)
- amenities (TEXT[])
- property_photo_url (TEXT)
- status (ENUM: available, rented, maintenance, unavailable)
- ghl_custom_object_id (TEXT) -- sync to GHL
- qbo_property_id (TEXT) -- for future QBO property tracking
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### `pm_units`
Individual rentable units (for multi-unit properties like duplexes).

```sql
- id (UUID, PK)
- pm_property_id (UUID, FK to pm_properties)
- agent_id (UUID, FK to agents)
- unit_number (TEXT, e.g., "Unit A", "101")
- monthly_rent (NUMERIC)
- bedrooms (INT)
- bathrooms (NUMERIC)
- sqft (INT)
- status (ENUM: available, rented, maintenance, unavailable)
- ghl_custom_object_id (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### `pm_applications`
Rental applications submitted via rental open house check-ins.

```sql
- id (UUID, PK)
- agent_id (UUID, FK to agents)
- pm_property_id (UUID, FK to pm_properties, nullable)
- pm_unit_id (UUID, FK to pm_units, nullable)
- lead_submission_id (UUID, FK to lead_submissions) -- reuse contact data
- applicant_name (TEXT)
- applicant_email (TEXT)
- applicant_phone (TEXT)
-
-- Application-specific fields
- employment_status (TEXT)
- employer_name (TEXT)
- annual_income (NUMERIC)
- current_address (TEXT)
- move_in_date (DATE)
- references (JSONB) -- [{name, phone, relationship}]
- pets (JSONB) -- [{type, breed, weight}]
- emergency_contact (JSONB) -- {name, phone, relationship}
-
-- Application metadata
- application_data (JSONB) -- full form data
- status (ENUM: pending, screening, approved, rejected, withdrawn)
- notes (TEXT)
- reviewed_at (TIMESTAMPTZ)
- reviewed_by (UUID, FK to agents)
-
-- Credit check
- credit_authorized (BOOLEAN, default false)
- credit_authorization_signed_at (TIMESTAMPTZ)
-
-- GHL sync
- ghl_contact_id (TEXT)
-
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### `pm_leases`
Active lease agreements. Created after application approval.

```sql
- id (UUID, PK)
- agent_id (UUID, FK to agents)
- pm_property_id (UUID, FK to pm_properties, nullable)
- pm_unit_id (UUID, FK to pm_units, nullable)
- pm_application_id (UUID, FK to pm_applications, nullable)
- tenant_contact_id (UUID, FK to agents) -- the tenant (stored in agents table)
-
-- Lease terms
- lease_start_date (DATE, required)
- lease_end_date (DATE, required)
- monthly_rent (NUMERIC, required)
- security_deposit (NUMERIC)
- pet_deposit (NUMERIC)
- rent_due_day (INT, default 1) -- day of month rent is due
-
-- Lease status
- status (ENUM: draft, pending_start, active, ending, ended, terminated)
- signed_at (TIMESTAMPTZ)
- lease_document_url (TEXT) -- signed lease PDF
-
-- Billing automation
- auto_invoice_enabled (BOOLEAN, default true)
- last_invoice_generated_at (TIMESTAMPTZ)
- next_invoice_date (DATE)
-
-- GHL sync
- ghl_custom_object_id (TEXT)
- ghl_contact_id (TEXT) -- tenant in GHL
-
-- QBO sync
- qbo_customer_id (TEXT) -- tenant as QBO customer
- qbo_sync_enabled (BOOLEAN, default false)
- last_qbo_sync_at (TIMESTAMPTZ)
-
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### `pm_work_orders`
Maintenance requests and work orders.

```sql
- id (UUID, PK)
- agent_id (UUID, FK to agents)
- pm_property_id (UUID, FK to pm_properties)
- pm_unit_id (UUID, FK to pm_units, nullable)
- pm_lease_id (UUID, FK to pm_leases, nullable)
-
-- Work order details
- title (TEXT, required)
- description (TEXT)
- category (ENUM: plumbing, electrical, hvac, appliance, pest, general, emergency)
- priority (ENUM: low, medium, high, emergency)
- status (ENUM: new, assigned, in_progress, waiting, completed, cancelled)
-
-- People
- reported_by_contact_id (UUID, FK to agents) -- usually tenant
- assigned_to_vendor_id (UUID, FK to agents, nullable) -- vendor contact
-
-- Resolution
- estimated_cost (NUMERIC)
- actual_cost (NUMERIC)
- completed_at (TIMESTAMPTZ)
- notes (TEXT)
-
-- Attachments
- photos (TEXT[]) -- photo URLs
-
-- GHL sync
- ghl_custom_object_id (TEXT)
-
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Extended Open House Schema

Extend existing `open_house_events` table:

```sql
ALTER TABLE open_house_events
ADD COLUMN event_type TEXT DEFAULT 'sales', -- 'sales' | 'rental' | 'both'
ADD COLUMN pm_property_id UUID REFERENCES pm_properties(id) ON DELETE SET NULL;
```

**Logic:**
- `event_type = 'sales'`: Traditional open house (current behavior)
- `event_type = 'rental'`: Rental showing → check-in includes rental application
- `event_type = 'both'`: Attendee chooses sales lead OR rental application

## Naming Conventions

### Database Tables
- Prefix: `pm_` for all PM tables
- Snake_case for all table and column names
- Timestamps: Always `created_at` and `updated_at`

### GHL Custom Objects
- `Property` (synced from `pm_properties`)
- `Unit` (synced from `pm_units`)
- `Lease` (synced from `pm_leases`)
- `WorkOrder` (synced from `pm_work_orders`)

### Status Enums

**Property/Unit Status:**
- `available` - Ready to rent
- `rented` - Currently occupied
- `maintenance` - Under repair
- `unavailable` - Off market

**Application Status:**
- `pending` - Submitted, not yet reviewed
- `screening` - Under review
- `approved` - Ready to create lease
- `rejected` - Application denied
- `withdrawn` - Applicant withdrew

**Lease Status:**
- `draft` - Being created
- `pending_start` - Signed but not yet started
- `active` - Current lease
- `ending` - Notice given, ending soon
- `ended` - Lease completed
- `terminated` - Lease terminated early

**Work Order Status:**
- `new` - Just reported
- `assigned` - Assigned to vendor
- `in_progress` - Work underway
- `waiting` - Waiting on parts/approval
- `completed` - Work finished
- `cancelled` - Work order cancelled

## Scale Limits (v1)

Designed for agencies managing:
- **50-100 units** across the agency (e.g., 10 agents managing 10 units each)
- **Individual agents managing 10-20 units**
- **10-50 properties** total
- **Monthly rent invoicing** (not complex lease structures)

If a customer needs large-scale apartment complex management (200+ units), they should use AppFolio/Buildium.

## QuickBooks Online Integration

### Sync Scope (v1)

**What Syncs:**
1. Tenant (Contact) → QBO Customer
2. Rent Invoice → QBO Invoice
3. Payment → QBO Payment (applied to invoice)

**What Does NOT Sync:**
- Properties (QBO doesn't have a property concept)
- Work orders as expenses (phase 2)
- Owner distributions
- Trust accounting

### QBO Mapping (Required)

Per-agent configuration stored in `integrations` table:

```json
{
  "qbo_config": {
    "rent_income_account_id": "123",
    "rent_item_id": "456",
    "late_fee_item_id": "789",
    "deposit_account_id": "101",
    "customer_sync_enabled": true,
    "invoice_sync_enabled": true,
    "payment_sync_enabled": true
  }
}
```

### Idempotency Rules

**Critical:** Never create duplicates in QBO.

- Every invoice has stable `external_id`: `pm-inv-{lease_id}-{YYYY-MM}`
- Every payment has stable `external_id`: `pm-pay-{payment_id}`
- Store QBO IDs back in our database
- Re-sync updates existing records, never creates duplicates

## Billing Strategy

### Lease-Driven Invoicing (Default)

**When lease status → `active`:**
1. Generate first rent invoice (due on `lease_start_date`)
2. Schedule recurring monthly invoices (due on `rent_due_day`)

**Invoice Automation:**
- Daily cron job checks for leases needing invoices
- Creates GHL invoice via API
- Optionally syncs to QBO if enabled

**Reminders:**
- 3 days before due: "Rent due soon"
- On due date: "Rent is due today"
- 3 days overdue: "Rent is overdue"

### Manual Invoices (Fallback)

Agents can create one-off invoices for:
- Late fees
- Repair charges
- Pet fees

## User Interface

### Navigation Structure

**Main App Navigation:**
- Dashboard
- Open Houses (handles both sales AND rental events)
- Leads (sales leads)
- Neighborhoods
- Integrations
- Settings

**Dashboard Button:**
- "Property Management" → `/app/pm`

**PM Section (`/app/pm`) Navigation:**
- Properties
- Applications
- Leases
- Work Orders
- Settings (QBO mapping)

### Check-in Form Behavior

**Sales Event (`event_type = 'sales'`):**
- Current behavior (name, email, phone, preferences)

**Rental Event (`event_type = 'rental'`):**
- Name, email, phone
- Employment status, employer, income
- Current address, move-in date
- References
- Pet information
- Emergency contact
- Credit authorization checkbox

**Both Event (`event_type = 'both'`):**
- First question: "Are you interested in buying or renting?"
- Then show appropriate form

## Phase 1 Implementation Plan

### Phase 1A: Database + Documentation
- ✅ Create this spec document
- Create database migrations for all PM tables
- Extend `open_house_events` table

### Phase 1B: PM Section Structure
- Create `/app/pm` layout with PM navigation
- Add "Property Management" button to dashboard
- Create empty pages for Properties, Applications, Leases, Work Orders

### Phase 1C: Properties UI
- Properties list page
- Create property form
- Edit property form
- Property detail page

### Phase 1D: Open House Extensions
- Update "New Open House" form with event type selector
- If rental event, link to PM property
- Extend check-in form for rental applications

### Phase 1E: Applications
- Applications list page (with status filters)
- Application detail page
- "Approve" → Create Lease workflow

### Phase 1F: Leases
- Leases list page
- Create lease form
- Lease detail page
- Lease status transitions

## Future Phases

**Phase 2: Lease-Driven Billing**
- Automated rent invoice generation
- GHL invoice creation via API
- Payment tracking
- Reminders and notifications

**Phase 3: QuickBooks Online Integration**
- OAuth connection
- Mapping UI
- Tenant → Customer sync
- Invoice sync
- Payment sync
- Idempotency and error handling

**Phase 4: Work Orders**
- Work order intake (tenant-facing form)
- Work order management UI
- Vendor assignment
- Photo uploads
- Completion tracking

**Phase 5: Owner Features**
- Owner statement PDF
- CSV export for accountant
- Simple monthly summary
- No trust accounting, no distributions

## Technical Constraints

### What We Will NOT Build

1. **Trust Accounting** - Use QuickBooks if needed
2. **Owner Distributions** - Manual process
3. **Complex Lease Structures** - Simple monthly rent only
4. **Utility Billing** - Out of scope
5. **Application Screening Services** - Integrate with third-party if needed
6. **Bank Feeds** - QuickBooks handles this
7. **Chart of Accounts Management** - QuickBooks handles this

### Integration Boundaries

**GHL is for:**
- Contact management
- Invoicing and payments
- Workflows and automation
- SMS/email messaging

**QBO is for:**
- Accounting records
- Financial reporting
- Tax preparation
- Accountant access

**Our App is for:**
- PM business logic
- Property/unit/lease management
- Application processing
- Gluing GHL + QBO together

## Success Metrics

**Product is successful if:**
- Agents can manage 10-20 units without spreadsheets
- Rent invoices are automated
- Payments are collected via GHL
- QBO stays clean for accountants
- Support tickets are minimal

**Product needs reevaluation if:**
- Customers want 100+ units
- Support costs exceed development costs
- Feature requests drift toward AppFolio territory

---

**Last Updated:** 2025-12-24
**Version:** 1.0
**Status:** Phase 0 Complete - Ready for Phase 1 Implementation
