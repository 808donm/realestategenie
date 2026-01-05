# Real Estate Open House AI App - Implementation Plan

## Project Overview
Building a comprehensive SaaS platform for real estate agents to manage open houses, capture leads, and automate follow-ups through GoHighLevel (GHL) and n8n integrations.

**Target Users:** Solo agents and small real estate teams

---

## 📐 Phase 1: Design System & Foundation (Days 1-2)

### 1.1 UI Component Library Setup
- Install & configure **shadcn/ui** or **Tailwind UI** components
- Professional component library:
  - Buttons (primary, secondary, ghost, outline)
  - Forms (inputs, selects, checkboxes, radio groups)
  - Modals/Dialogs
  - Dropdown menus
  - Tables with sorting/filtering
  - Toast notifications
  - Loading states & skeleton screens
  - Badges & status indicators
  - Tabs & accordions

### 1.2 Design System
- **Color Palette:**
  - Primary brand color (customizable per agent theme)
  - Secondary colors
  - Success (green), Warning (yellow), Danger (red), Info (blue)
  - Neutral grays (50-900)
  - Background colors

- **Typography Scale:**
  - Headings (H1-H6)
  - Body text (regular, small)
  - Labels & captions
  - Font families (sans-serif for UI, optional serif for branding)

- **Spacing System:**
  - Consistent spacing scale (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)
  - Padding & margin utilities

- **Component Styling:**
  - Card styles with shadows & borders
  - Border radius standards
  - Hover states & transitions
  - Focus states for accessibility

- **Optional: Dark mode support**

### 1.3 Database Schema Updates

#### Feature Flags Table
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  open_house_mvp BOOLEAN DEFAULT true,
  property_factsheet_upload BOOLEAN DEFAULT true,
  marketing_packs BOOLEAN DEFAULT false,
  property_qa BOOLEAN DEFAULT false,
  idx_integration BOOLEAN DEFAULT false,
  transactions_os BOOLEAN DEFAULT false,
  documents_esign BOOLEAN DEFAULT false,
  vendor_directory BOOLEAN DEFAULT false,
  vendor_scheduling BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Enhanced Agents Table
```sql
ALTER TABLE agents ADD COLUMN IF NOT EXISTS
  headshot_url TEXT,
  brokerage_name TEXT,
  bio TEXT,
  theme_color VARCHAR(7) DEFAULT '#3b82f6',
  disclaimer_text TEXT,
  disclaimer_version INTEGER DEFAULT 1,
  landing_page_enabled BOOLEAN DEFAULT true;
```

#### Teams/Workspaces Table
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, agent_id)
);
```

#### Property Fact Sheet Fields (Open House Events)
```sql
ALTER TABLE open_house_events ADD COLUMN IF NOT EXISTS
  beds INTEGER,
  baths NUMERIC(3,1),
  sqft INTEGER,
  price NUMERIC(12,2),
  key_features TEXT[], -- array of bullet points
  hoa_fee NUMERIC(10,2),
  parking_notes TEXT,
  showing_notes TEXT,
  disclosure_url TEXT,
  offer_deadline TIMESTAMPTZ,
  flyer_url TEXT,
  flyer_enabled BOOLEAN DEFAULT false,
  listing_description TEXT,
  verified_by UUID REFERENCES agents(id),
  verified_at TIMESTAMPTZ;
```

#### Lead Handling Rules & Consent
```sql
ALTER TABLE open_house_events ADD COLUMN IF NOT EXISTS
  represented_send_info_only BOOLEAN DEFAULT true,
  unrepresented_ask_reach_out BOOLEAN DEFAULT true,
  unrepresented_notify_immediately BOOLEAN DEFAULT true,
  unrepresented_start_workflows BOOLEAN DEFAULT true,
  consent_sms_text TEXT,
  consent_email_text TEXT,
  consent_version INTEGER DEFAULT 1;
```

#### Integrations Table
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'ghl', 'n8n', 'idx'
  status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
  config JSONB, -- OAuth tokens, webhook URLs, API keys
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, provider)
);

CREATE TABLE integration_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES open_house_events(id) ON DELETE CASCADE,
  ghl_pipeline_id TEXT,
  ghl_stage_hot TEXT,
  ghl_stage_warm TEXT,
  ghl_stage_cold TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔌 Phase 2: Integration Infrastructure (Days 3-5)

### 2.1 GoHighLevel (GHL) Integration

#### OAuth Connection Flow
- **OAuth 2.0 Authorization:**
  - Redirect to GHL OAuth consent page
  - Handle callback with authorization code
  - Exchange code for access token + refresh token
  - Store encrypted tokens in `integrations` table

- **Token Management:**
  - Automatic token refresh before expiry
  - Error handling for revoked tokens
  - Connection status monitoring

- **Implementation:**
  - `app/api/integrations/ghl/connect/route.ts` - Initiate OAuth
  - `app/api/integrations/ghl/callback/route.ts` - Handle OAuth callback
  - `app/api/integrations/ghl/disconnect/route.ts` - Revoke connection
  - `src/lib/integrations/ghl-client.ts` - GHL API client

#### GHL API Client
Features:
- Contact creation/update
- Pipeline & stage management
- Opportunity creation
- Custom field mapping
- Tag management
- Note/activity logging

**Key Functions:**
```typescript
class GHLClient {
  async createContact(data: ContactData): Promise<Contact>
  async updateContact(id: string, data: Partial<ContactData>): Promise<Contact>
  async createOpportunity(contactId: string, data: OpportunityData): Promise<Opportunity>
  async getPipelines(): Promise<Pipeline[]>
  async moveToStage(opportunityId: string, stageId: string): Promise<void>
  async addTag(contactId: string, tag: string): Promise<void>
  async addNote(contactId: string, note: string): Promise<void>
}
```

#### Lead Sync Automation
- **Trigger:** Lead submission (on `/api/leads/submit`)
- **Process:**
  1. Push lead to GHL as contact
  2. Create opportunity in mapped pipeline
  3. Set stage based on heat score (Hot/Warm/Cold)
  4. Add tags: `open-house`, `{event-address}`, `{timeline}`, `{financing}`
  5. Add note with full intake responses
  6. Log sync status in `lead_submissions.ghl_sync_status`

- **Error Handling:**
  - Retry logic (3 attempts with exponential backoff)
  - Log errors in `integrations.last_error`
  - UI notification for agent
  - Manual retry button

### 2.2 n8n Integration

#### Webhook System
- **Event Dispatcher:**
  - Centralized webhook publisher
  - Configurable per agent
  - Payload standardization

- **Webhook Configuration:**
  - Agent inputs webhook URL in Integrations page
  - Optional: Secret key for signature validation
  - Enable/disable per event type

- **Testing/Debugging:**
  - "Test Webhook" button sends sample payload
  - View last 10 webhook deliveries
  - Retry failed webhooks

- **Retry Logic:**
  - 3 attempts with exponential backoff (1s, 5s, 15s)
  - Mark as failed after 3 attempts
  - Agent notification

#### Event Types
1. **`lead.submitted`**
   - Payload: Full lead data + event details
   - Triggered: On successful intake submission

2. **`lead.hot_scored`**
   - Payload: Lead data + heat score
   - Triggered: When heat score >= 80 (Hot)

3. **`open_house.published`**
   - Payload: Event details + QR link
   - Triggered: When status changes to 'published'

4. **`open_house.ended`**
   - Payload: Event details + stats (total leads, hot/warm/cold counts)
   - Triggered: When end time passes or status set to 'archived'

5. **`consent.captured`**
   - Payload: Lead ID, consent type (SMS/Email), timestamp, version
   - Triggered: On consent checkbox acceptance

6. **`integration.connected`**
   - Payload: Integration provider, timestamp
   - Triggered: On successful OAuth connection

**Implementation:**
- `src/lib/webhooks/dispatcher.ts` - Webhook publisher
- `app/api/webhooks/n8n/test/route.ts` - Test endpoint
- `app/api/webhooks/deliver/route.ts` - Background job for delivery

---

## 🎨 Phase 3: Agent Dashboard Experience (Days 6-10)

### 3.1 Enhanced Dashboard (Screen 2)

**Layout:**
- **Stats Cards (Row A):**
  1. Today's Open Houses
     - Count of open houses happening today
     - Next start time
     - Quick link to event

  2. New Leads (24h)
     - Total count
     - Breakdown: Hot/Warm/Cold badges

  3. Needs Follow-up
     - Reach-out requested count
     - Uncontacted leads

  4. Integration Health
     - GHL status (✅/❌)
     - n8n status (✅/❌)
     - Last test time
     - Quick "Test Now" button

- **Upcoming Events (Row B):**
  - List of next 5 open houses
  - Address, date/time
  - Quick actions: View QR, View Event, Copy Link

- **Activity Feed (Row C):**
  - Real-time feed (use Supabase Realtime)
  - Types: Lead submitted, Pushed to GHL, Workflow started, Agent notified
  - Last 20 activities
  - Filter by event

- **Primary CTA:**
  - Large "+ Create Open House" button

**Implementation:**
- `app/app/dashboard/page.tsx` - Enhanced dashboard
- `app/app/dashboard/stats-cards.tsx` - Stats component
- `app/app/dashboard/activity-feed.tsx` - Activity component
- Use Supabase Realtime for live updates

### 3.2 Agent Branding Settings (Screen B1)

**Fields:**
- **Headshot/Logo Upload:**
  - Drag & drop or file picker
  - Crop/resize UI
  - Upload to Supabase Storage
  - Preview thumbnail

- **Display Name:** Text input
- **Brokerage Name:** Text input (optional)
- **License Number:** Text input
- **Phone Number:** E.164 input with validation
- **Email:** Email input (optional, public-facing)
- **Locations Served:** Multi-select dropdown + free text
- **Bio:** Textarea (500 char limit)
- **Theme Color:** Color picker
- **Disclaimer/Footer Text:** Textarea (editable, versioned)

**Live Preview Panel:**
- Split-screen or modal preview
- Shows how attendee will see:
  - Landing page header
  - Chat intake header
  - Thank you page
- Updates in real-time as agent edits

**Implementation:**
- `app/app/settings/branding/page.tsx` - Branding settings page
- `app/app/settings/branding/branding-form.tsx` - Form component
- `app/app/settings/branding/preview-panel.tsx` - Live preview
- `app/api/upload/headshot/route.ts` - Upload handler

### 3.3 Multi-step Open House Wizard (Screens 4.1-4.5)

**Wizard Structure:**
- Progress indicator at top (Step 1/5, 2/5, etc.)
- Back/Next buttons
- Save Draft button (always visible)
- Form state preservation

**Step 1: Basics**
- Event name (default: address)
- Property address (required, autocomplete)
- Date picker
- Start time / End time
- Agent contact to display (dropdown from team members)
- Optional: Listing link

**Step 2: Property Fact Sheet**
- Three input methods (tabs):
  1. **Upload Flyer:** PDF/Image upload → AI extraction (future)
  2. **Paste Listing:** Textarea → AI extraction (future)
  3. **Manual Entry:** Form fields

- Fact Sheet Fields:
  - Beds (number)
  - Baths (number, decimal)
  - Sqft (number)
  - Price (currency, optional)
  - Key features (bullet list, add/remove)
  - HOA fee (currency, optional)
  - Parking notes (text)
  - Showing notes (text)
  - Disclosure link (URL, optional)
  - Offer deadline (datetime, optional)

- **"Mark as Verified" button:**
  - Records agent ID + timestamp
  - Shows verification status badge

**Step 3: Lead Handling Rules**
- **Represented Visitor Behavior:**
  - Toggle: "Send property info only (no outreach)"
  - Message snippet preview (editable)

- **Unrepresented Visitor Behavior:**
  - Toggle: "Ask if they want agent to reach out"
  - Toggle: "Notify agent immediately" (if Yes)
  - Toggle: "Start follow-up workflows" (if Yes)

**Step 4: Consent Language**
- **SMS Consent Text:** Textarea (editable)
- **Email Consent Text:** Textarea (editable)
- Version label (auto-increment: v1, v2, v3...)
- Legal disclaimer preview
- "Reset to Default" button

**Step 5: Integrations Mapping**
- **GHL Configuration:**
  - Select pipeline (dropdown)
  - Default stage for new leads
  - Stage mapping:
    - Hot → Stage dropdown
    - Warm → Stage dropdown
    - Cold → Stage dropdown
  - "Test Push to GHL" button (sends dummy contact)

- **n8n Configuration:**
  - Toggle: Enable webhooks for this event
  - Event types to trigger (checkboxes)

- **Publish Button:**
  - Validates all required fields
  - Sets status to 'published'
  - Redirects to event detail page

**Implementation:**
- `app/app/open-houses/new/wizard/page.tsx` - Wizard container
- `app/app/open-houses/new/wizard/step-1.tsx` - Basics step
- `app/app/open-houses/new/wizard/step-2.tsx` - Fact sheet step
- `app/app/open-houses/new/wizard/step-3.tsx` - Lead rules step
- `app/app/open-houses/new/wizard/step-4.tsx` - Consent step
- `app/app/open-houses/new/wizard/step-5.tsx` - Integrations step
- `src/lib/wizard-state.ts` - Form state management

### 3.4 Open House Detail with Tabs (Screen 5)

**Header:**
- Address (large, bold)
- Date/time range
- Status badge (draft/published/archived)
- Status change dropdown + Save button

**Tabs:**

**Tab 1: Overview**
- **Stats Tiles:**
  - Leads collected (total count)
  - Hot/Warm/Cold breakdown
  - Reach-out requested count
  - Represented vs Unrepresented chart

- **CTA Row:**
  - View QR button
  - Copy link button
  - End event button (with confirmation)
  - Edit event button

**Tab 2: Live Leads**
- Real-time list (Supabase Realtime subscription)
- Columns:
  - Name
  - Heat badge (Hot/Warm/Cold with color)
  - Timeline
  - Financing
  - Representation
  - Reach-out requested (✓/✗)
  - Created time

- Quick actions per row:
  - View (modal or detail page)
  - Call (tel: link)
  - Text (sms: link)
  - Email (mailto: link)

- Sort by: Created time, Heat score, Name
- Filter by: Heat, Representation, Reach-out

**Tab 3: QR & Link**
- Large QR code display (canvas or SVG)
- Short link display + copy button
- Download QR PNG button (high-res)
- Optional: Print sign button (generates PDF with QR + property info)

**Tab 4: Settings**
- Edit fact sheet (inline editing or modal)
- Edit routing rules
- Edit consent language (shows version)
- Edit integration mapping
- Save changes button

**Implementation:**
- `app/app/open-houses/[id]/page.tsx` - Detail page with tabs
- `app/app/open-houses/[id]/overview-tab.tsx`
- `app/app/open-houses/[id]/leads-tab.tsx`
- `app/app/open-houses/[id]/qr-tab.tsx`
- `app/app/open-houses/[id]/settings-tab.tsx`

### 3.5 Leads List with Filters (Screen 6)

**Filters (Top Bar):**
- Date range (date picker, presets: Today, Last 7 days, Last 30 days, All time)
- Heat (multi-select: Hot, Warm, Cold)
- Representation (multi-select: Yes, No, Unsure)
- Reach-out requested (toggle)
- Event (dropdown of open houses)
- Search (by name, email, phone)

**Table Columns:**
- Name (clickable → lead detail)
- Event (address, clickable)
- Heat (badge)
- Timeline
- Financing
- Representation
- Consent badges (SMS ✓, Email ✓)
- GHL Status (synced, pending, failed)
- Created time

**Row Actions:**
- View (→ lead detail page)
- Call/Text/Email shortcuts (icon buttons)

**Pagination:**
- 25/50/100 per page
- Page numbers

**Export:**
- "Export to CSV" button (all filtered results)

**Implementation:**
- `app/app/leads/page.tsx` - Enhanced leads list
- `app/app/leads/filters.tsx` - Filter component
- `app/app/leads/table.tsx` - Table component
- `app/api/leads/export/route.ts` - CSV export

### 3.6 Lead Detail with Tabs (Screen 7)

**Header:**
- Lead name (large)
- Created time
- Event address (link)

**Tabs:**

**Tab 1: Overview**
- **Contact Card:**
  - Name, email, phone
  - Call/Text/Email buttons

- **Qualification:**
  - Heat score badge
  - Representation status
  - Reach-out requested (Yes/No)
  - Contact preference

- **Details:**
  - Timeline
  - Financing
  - Neighborhoods
  - Must-haves

**Tab 2: Responses**
- All intake form responses (formatted)
- Name, Email, Phone
- Consent (SMS, Email with version)
- Representation
- Timeline, Financing
- Neighborhoods, Must-haves
- Source (open_house_qr)
- Submitted at

**Tab 3: Automations**
- **GHL Integration:**
  - Push status (success/failed)
  - Contact ID (link to GHL)
  - Opportunity ID (link to GHL)
  - Pipeline + Stage
  - Pushed at timestamp
  - Error message (if failed)
  - Manual retry button

- **n8n Webhooks:**
  - List of webhooks fired
  - Event type
  - Payload preview
  - Response status
  - Fired at timestamp
  - Retry button (if failed)

- **Workflows Started:**
  - List of n8n workflows triggered
  - Workflow name/ID
  - Status
  - Started at

**Tab 4: Audit**
- **Consent Captured:**
  - Channel (SMS/Email)
  - Timestamp
  - Version
  - IP address (optional)

- **Data Writes:**
  - Created at
  - Updated at
  - Created by (system/agent)

- **Edits:**
  - Field changed
  - Old value → New value
  - Changed by
  - Changed at

**Implementation:**
- `app/app/leads/[id]/page.tsx` - Lead detail page
- `app/app/leads/[id]/overview-tab.tsx`
- `app/app/leads/[id]/responses-tab.tsx`
- `app/app/leads/[id]/automations-tab.tsx`
- `app/app/leads/[id]/audit-tab.tsx`

### 3.7 Integrations Management Page (Screen 8)

**Layout: Integration Cards**

**GHL Card:**
- **Header:** GoHighLevel logo + status badge
- **Status:** Connected ✅ / Disconnected ❌ / Error ⚠️
- **Info:**
  - Connected as: {GHL location name}
  - Last sync: {timestamp}
  - Contact count synced: {count}

- **Actions:**
  - "Connect" button (if disconnected)
  - "Reconnect" button (if connected)
  - "Test Connection" button → sends test contact
  - "Disconnect" button (with confirmation)

- **Configuration (if connected):**
  - Default pipeline (dropdown)
  - Default stage (dropdown)
  - Custom field mapping (expand/collapse)

**n8n Card:**
- **Header:** n8n logo + status badge
- **Status:** Configured ✅ / Not configured ❌
- **Info:**
  - Webhook URL input (text field)
  - Optional: Secret key input
  - Last webhook sent: {timestamp}
  - Success rate: {percentage}

- **Actions:**
  - "Test Webhook" button → sends test payload
  - "Save Configuration" button
  - "View Webhook Log" button (opens modal with last 10 deliveries)

- **Event Configuration:**
  - Checkboxes for event types:
    - Lead submitted
    - Lead hot scored
    - Open house published
    - Open house ended
    - Consent captured

**IDX Broker Card (Coming Soon):**
- Placeholder card
- "Coming Soon" badge
- Description of planned features

**Webhook Log Modal:**
- Table of last 10 webhook deliveries
- Columns: Event type, Status, Payload (expandable), Response, Timestamp
- Retry button per failed delivery

**Implementation:**
- `app/app/integrations/page.tsx` - Integrations page
- `app/app/integrations/ghl-card.tsx` - GHL card component
- `app/app/integrations/n8n-card.tsx` - n8n card component
- `app/app/integrations/webhook-log-modal.tsx` - Webhook log modal
- `app/api/integrations/ghl/test/route.ts` - Test GHL connection
- `app/api/integrations/n8n/test/route.ts` - Test n8n webhook

### 3.8 Audit Log with Filters (Screen 9)

**Filters:**
- Date range (date picker)
- Event (dropdown)
- Lead (search/dropdown)
- Action type (multi-select: created_event, captured_consent, pushed_to_ghl, etc.)
- Actor (system/agent)

**Table:**
- Timestamp (sortable)
- Actor (system icon or agent name)
- Action (badge with color coding)
- Object (event/lead with link)
- Details (expandable JSON or formatted text)

**Pagination:**
- 50/100 per page

**Export:**
- "Export to CSV" button

**Implementation:**
- `app/app/audit-log/page.tsx` - Audit log page
- `app/app/audit-log/filters.tsx` - Filter component
- `app/app/audit-log/table.tsx` - Table component
- `app/api/audit-log/export/route.ts` - CSV export

---

## 👥 Phase 4: Attendee Experience (Days 11-13)

### 4.1 Branded Welcome Page (Screen A1)

**URL:** `/oh/{eventId}`

**Layout:**

**Header (Branded):**
- Agent headshot/logo (large, centered or left-aligned)
- Agent name (large, bold)
- License # (smaller, gray)
- Locations served (badge list)
- Brokerage name (optional, smaller)

**Body:**
- Property address (very large, bold, centered)
- Open house date/time (medium, gray)
- **Primary CTA button:**
  - "Get Property Details"
  - Large, prominent
  - Agent's theme color
  - Clicks → navigates to intake form

**Footer:**
- Small print: Privacy policy link
- Consent context: "By continuing, you agree to our terms..."
- MLS/IDX disclaimer (if applicable)

**Styling:**
- Clean, modern, mobile-first
- Agent's theme color for accents
- White/light gray background
- Lots of whitespace
- Professional photography (if property photo available)

**Implementation:**
- `app/oh/[eventId]/welcome/page.tsx` - Welcome page
- Fetch agent branding + event details
- Apply theme color dynamically

### 4.2 Chat-style Intake (Screen A2)

**URL:** `/oh/{eventId}` (replaces current intake)

**Header Bar (Sticky):**
- Agent headshot/logo (small)
- Agent name + license #
- Locations served (collapsed, expandable)
- Theme color accent

**Chat UI:**
- Messages appear as bubbles (agent on left, user input on right)
- Progressive disclosure (one question at a time)
- Smooth scroll animations
- Progress indicator (e.g., "Question 3 of 9")

**Question Flow:**

1. **First name**
   - Bot: "Hi! Welcome to the open house at {address}. What's your first name?"
   - User: Text input → Submit

2. **Email (optional)**
   - Bot: "Great to meet you, {name}! What's your email address? (We'll send you property details)"
   - User: Email input → Submit or Skip

3. **Phone (optional)**
   - Bot: "And your phone number? (We can text you updates)"
   - User: Phone input → Submit or Skip

4. **Consent prompts (only if email/phone provided)**
   - If email provided:
     - Bot: Shows consent text
     - User: Checkbox "I agree to receive emails" → Continue
   - If phone provided:
     - Bot: Shows SMS consent text
     - User: Checkbox "I agree to receive SMS" → Continue

5. **Representation**
   - Bot: "Are you currently represented by an agent?"
   - User: Buttons (Yes / No / Not sure)

6. **Agent reach-out (if No)**
   - Bot: "Would you like the listing agent to reach out to you?"
   - User: Buttons (Yes, please / No, just browsing)

7. **Timeline**
   - Bot: "What's your timeline for buying?"
   - User: Buttons (0-3 months / 3-6 months / 6+ months / Just browsing)

8. **Financing**
   - Bot: "How will you finance your purchase?"
   - User: Buttons (Pre-approved / Cash / Need a lender / Not sure)

9. **Neighborhoods**
   - Bot: "Which neighborhoods are you interested in?"
   - User: Text input (comma-separated) → Submit or Skip

10. **Must-haves**
    - Bot: "Any must-haves? (e.g., 3 beds, parking, ocean view)"
    - User: Text input → Submit or Skip

**Submit:**
- Bot: "All set! Submitting your info..."
- Loading animation
- On success → Redirect to Thank You page

**Features:**
- Skip buttons on optional questions
- Back button (bottom left) to edit previous answers
- Keyboard support (Enter to submit)
- Mobile-optimized (large touch targets)

**Implementation:**
- `app/oh/[eventId]/page.tsx` - Chat intake page
- `app/oh/[eventId]/chat-intake.tsx` - Chat UI component
- State management for question flow
- Animations with Framer Motion or CSS transitions

### 4.3 Thank You Page (Screen A3)

**URL:** `/oh/{eventId}/thank-you`

**Header (Branded):**
- Agent headshot/logo
- Agent name + license #

**Body (Conditional Messaging):**

**If opted-in for follow-up:**
- "Thanks, {name}!"
- "We'll send property details to:"
  - Email: {email} (if provided)
  - SMS: {phone} (if provided)
- "The listing agent will reach out soon."

**If represented:**
- "Thanks for visiting!"
- "Since you're working with an agent, please coordinate offers and next steps through them."
- "Feel free to contact us via your agent if you have questions."

**If just browsing (no opt-in):**
- "Thanks for stopping by!"
- "We hope you enjoyed the property."
- "If you change your mind, feel free to reach out."

**CTAs:**
- **Primary:** "View Property Details" button → navigates to `/oh/{eventId}/details`
- **Secondary:** "Save Agent Contact" button → downloads vCard

**Footer:**
- Brokerage info
- MLS disclaimer
- Privacy policy link

**Implementation:**
- `app/oh/[eventId]/thank-you/page.tsx` - Thank you page
- Read lead submission from session/URL param
- Conditional rendering based on consent/representation

### 4.4 Property Details Page (Screen A3.5)

**URL:** `/oh/{eventId}/details`

**Header (Sticky, Branded):**
- Agent headshot/logo
- Agent name + license #
- Agent phone number (tap-to-call button)
- Locations served (collapsed, expandable)
- Theme color accent

**Body:**

**Property Address:**
- Large, bold
- Open house date/time below

**Key Facts (Cards):**
- Beds (icon + number)
- Baths (icon + number)
- Sqft (icon + number)
- Price (optional, large, formatted: $XXX,XXX)

**Highlights:**
- Bulleted list from verified fact sheet
- Clean, readable font
- Icons for visual interest

**Showing Notes:**
- Parking instructions
- Entry instructions
- Pet policy
- Other important info

**Disclosures:**
- Link to disclosure documents (if provided)
- "View Disclosures" button

**Downloads:**
- "Download Flyer" button (if enabled)
  - Shows PDF icon
  - File size (e.g., 2.3 MB)
  - Last updated date

**CTA Block:**
- "Request a Showing" button → routes back to intake or mailto agent
- "Ask a Question" button → mailto agent

**Footer:**
- Brokerage info
- MLS/IDX attribution placeholder
- Privacy policy link
- Powered by Real Estate Genie (small, discreet)

**Agent Controls (in Open House Settings):**
- Toggle: Enable Property Details Page (default ON)
- Toggle: Enable PDF download (default OFF until PDF uploaded, then ON)
- Toggle: Show Price (optional)

**Implementation:**
- `app/oh/[eventId]/details/page.tsx` - Property details page
- Fetch event + fact sheet + agent branding
- Apply theme color
- Conditional rendering based on toggles

---

## 🚀 Phase 5: Polish & Advanced Features (Days 14-16)

### 5.1 Feature Flag System

**Navigation Logic:**
- Read agent's feature flags from database
- Show/hide nav items based on enabled features:
  - Dashboard (always visible)
  - Open Houses (always visible if `open_house_mvp`)
  - Leads (always visible if `open_house_mvp`)
  - Marketing (only if `marketing_packs`)
  - Integrations (always visible)
  - Audit Log (always visible)
  - Settings (always visible)

**Deep Link Protection:**
- Middleware checks feature flags for protected routes
- If feature disabled:
  - Redirect to `/app/not-enabled` page
  - Show friendly message: "This feature is not enabled for your account. Contact support to enable."
  - Link back to dashboard

**Admin UI (Optional):**
- Super admin can toggle flags for agents
- Agent settings page shows "Request Feature" button

**Implementation:**
- `src/middleware.ts` - Feature flag checks
- `app/app/not-enabled/page.tsx` - Not enabled page
- `src/lib/feature-flags.ts` - Helper functions

### 5.2 Team/Workspace Support

**Features:**
- Agents can create teams
- Invite team members (via email)
- Shared open houses (team members can view/edit)
- Role-based permissions:
  - Owner: Full access, billing, team management
  - Admin: Create/edit events, view all leads
  - Member: View assigned events, view own leads

**Implementation:**
- `app/app/team/page.tsx` - Team management page
- `app/app/team/invite/page.tsx` - Invite members
- `app/api/team/invite/route.ts` - Send invitation
- Row-level security policies for team access

### 5.3 Real-time Updates

**Supabase Realtime Subscriptions:**
- Dashboard: Subscribe to `lead_submissions` for new leads
- Open House Detail: Subscribe to `lead_submissions` filtered by event_id
- Toast notifications for new leads (during open house)

**Implementation:**
- `src/lib/realtime/subscriptions.ts` - Realtime helpers
- `app/app/dashboard/use-realtime-leads.tsx` - Custom hook
- Toast library (e.g., sonner, react-hot-toast)

### 5.4 Testing & Monitoring

**Integration Testing:**
- "Test GHL" button: Sends dummy contact to GHL, verifies response
- "Test n8n" button: Sends sample webhook, displays response
- Visual indicators (green ✅, red ❌, yellow ⚠️)

**Webhook Debugging:**
- Webhook log shows last 10 deliveries
- Payload preview (JSON viewer)
- Response status code + body
- Retry button for failed deliveries

**Error Logging:**
- Log all integration errors to `integrations.last_error`
- Log webhook failures to `webhook_log` table
- Optional: Integrate Sentry for error tracking

**Implementation:**
- `app/api/integrations/test/route.ts` - Test endpoints
- `app/app/integrations/webhook-log/page.tsx` - Webhook log UI
- Error boundary components

### 5.5 Mobile Responsiveness

**Goals:**
- All pages work on mobile (320px+)
- Touch-friendly buttons (min 44px)
- Optimized forms for mobile input
- QR scanning experience (camera access if building native app)

**Key Pages:**
- Attendee welcome: Mobile-first design
- Chat intake: Optimized for thumb typing
- Dashboard: Responsive grid
- Open house detail: Collapsible sections

**Testing:**
- Test on iPhone, Android devices
- Use responsive design mode in browser

**Implementation:**
- Tailwind responsive utilities (sm:, md:, lg:)
- Mobile navigation (hamburger menu if needed)
- Touch event handlers

---

## 🎯 Technology Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **UI Library:** React 19
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (Radix UI primitives)
- **Forms:** React Hook Form + Zod validation
- **State:** React Context + hooks (or Zustand for complex state)
- **Animations:** Framer Motion or CSS transitions

### Backend
- **API:** Next.js API routes (serverless)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (OAuth, Magic Link, MFA)
- **Storage:** Supabase Storage (flyer PDFs, headshots)
- **Realtime:** Supabase Realtime (websockets)

### Integrations
- **GoHighLevel:** OAuth 2.0, REST API v2
- **n8n:** Webhooks, custom event dispatcher
- **Future:** IDX Broker, Stripe (billing)

### Deployment
- **Hosting:** Vercel
- **CDN:** Vercel Edge Network
- **Domain:** Custom domain + SSL
- **Environment:** Preview + Production

### Monitoring
- **Analytics:** Vercel Analytics (optional: Posthog, Mixpanel)
- **Error Tracking:** Sentry (optional)
- **Logging:** Supabase logs + custom logging

---

## 🔐 Security & Compliance

### Authentication
- Supabase Auth with Row-Level Security (RLS)
- Multi-factor authentication (TOTP)
- OAuth with Google, Facebook, LinkedIn
- Magic link email authentication

### Data Protection
- RLS policies on all tables (agent can only see own data)
- Encrypted OAuth tokens (AES-256)
- Secure webhook signatures (HMAC-SHA256)
- Rate limiting on public endpoints (Vercel Edge Middleware)

### Compliance
- **Consent Management:**
  - Versioned consent text
  - Audit trail for all consents
  - STOP keyword support for SMS

- **GDPR/CCPA:**
  - Data export (CSV)
  - Data deletion (future)
  - Privacy policy + terms of service

- **Real Estate Compliance:**
  - License # display (state requirements)
  - MLS/IDX attribution
  - Fair housing language guardrails

### Audit Logging
- All critical actions logged:
  - Event created/updated
  - Lead submitted
  - Consent captured
  - Integration connected
  - Data exported
- Retention: 2 years (configurable)

---

## 📦 Deliverables

### MVP (Weeks 1-3)
- ✅ Professional UI design system
- ✅ Feature flags infrastructure
- ✅ Enhanced agent branding
- ✅ Multi-step open house wizard
- ✅ Branded attendee experience (welcome → chat intake → thank you → property details)
- ✅ GHL integration (OAuth + lead sync)
- ✅ n8n webhook integration
- ✅ Enhanced dashboard with stats
- ✅ Lead management with filters
- ✅ Audit logging

### Phase 2 (Weeks 4-6)
- ✅ Team/workspace support
- ✅ Real-time updates
- ✅ Advanced integrations (IDX Broker)
- ✅ Marketing packs (templated content generation)
- ✅ Property Q&A (AI-powered, fact sheet constrained)
- ✅ Mobile app (React Native or PWA)

### Phase 3 (Weeks 7-10)
- ✅ Billing & subscriptions (Stripe)
- ✅ Broker/agency admin portal
- ✅ Advanced analytics & reporting
- ✅ Document management (e-sign)
- ✅ Vendor directory & scheduling
- ✅ Transaction OS features

---

## 📅 Estimated Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 1: Foundation** | 2 days | Design system, database schema |
| **Phase 2: Integrations** | 3 days | GHL OAuth, n8n webhooks, API clients |
| **Phase 3: Agent Dashboard** | 5 days | Dashboard, branding, wizard, leads, audit log |
| **Phase 4: Attendee Experience** | 3 days | Welcome, chat intake, thank you, property details |
| **Phase 5: Polish** | 3 days | Feature flags, realtime, mobile, testing |
| **Total MVP** | **16 days** | Full-featured SaaS platform |

---

## 🚀 Next Steps

1. **Review & Approve Plan** - Confirm scope and prioritization
2. **Set Up Development Environment** - Clone repo, install dependencies
3. **Start Phase 1** - Install shadcn/ui, create design system, update database schema
4. **Iterate** - Build, test, get feedback, refine

---

## 📞 Support & Questions

For questions during implementation:
- Review wireframe documentation
- Check Supabase docs for database/auth
- Check GHL API docs for integration
- Check n8n docs for webhooks

---

**Last Updated:** December 9, 2025
**Project:** Real Estate Open House AI App
**Version:** 1.0
