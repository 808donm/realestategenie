# Real Estate Genie -- Complete Feature List

> Last updated: April 2, 2026

---

## 1. Dashboard

- **Needs Attention** -- Urgent follow-ups (leads not contacted in 3+ days with heat score >= 50)
- **Hoku AI Assistant** -- Floating copilot on every page, conversational task execution, 24-hour session persistence
- **Quick Actions** -- 7-button grid (New Open House, View Leads, Pipeline, MLS Search, Reports, Calculators, Tasks) + floating action bar
- **AI Daily Briefing** -- Numbered priority list from urgent follow-ups, hot leads, today's events, new leads
- **Pipeline Stats** -- Count by stage, total leads, hot leads
- **Tasks Widget** -- Overdue/Today/Upcoming with quick-complete checkboxes
- **Upcoming Events** -- Next 5 events from all connected calendars, color-coded by source
- **Active Listings** -- Total active, average DOM, stale listings (21+ DOM)
- **One-Tap Contact** -- Hot leads (70+) with direct Call/Text/Email links
- **Recent Activity Feed** -- Real-time log of leads, open houses, integrations, webhooks
- **Sync Health** -- Google Calendar, Outlook, CRM connection status

---

## 2. Calendar

- Unified multi-source view (Google Calendar, Outlook/Microsoft, CRM, Local)
- Month, Week, Day views with navigation
- Source filtering (toggle visibility per calendar)
- Event CRUD with title, description, location, date/time, all-day, attendees
- Two-way sync with conflict resolution
- Manual sync button

---

## 3. Pipeline

- Visual Kanban board with 11 stages (New Lead through Review Request)
- Drag-and-drop cards between stages
- Deal cards: contact name, value, status, creation date
- Lead Detail Modal: notes history, conversation history, actions
- CRM sync with pipeline stage mapping
- Local pipeline fallback (no CRM needed)

---

## 4. Tasks

- Tabs: All, Overdue, Today, Upcoming, Completed
- Priority: Urgent, High, Medium, Low (color-coded)
- Types: General, Follow-Up, Call, Email, Meeting, Showing, Document, Closing
- Due date/time with recurrence (Daily, Weekly, Bi-weekly, Monthly, Quarterly)
- Entity linking: Lead, Contact, Open House, Transaction
- Assignment to self or team member
- Bulk operations: complete, snooze, delete
- Export to CSV or PDF

---

## 5. Leads

- Auto-capture from open house QR check-ins, Zillow webhooks, social channels
- Dashboard charts: by source, by event, heat score distribution, pipeline breakdown, over time, buyer readiness
- Lead list tabs: Hot (80+), Warm (50-79), Cold (<50), DNC
- **Heat Score (0-100)**: Contact info (30pts), representation (20pts), agent reach-out (15pts), timeline (20pts), financing (15pts), specificity (10pts)
- Multiple visits to same property = boosted to 100
- Pipeline stages: 11 stages from New Lead to Review Request
- Action buttons: Call, Text, Email, Add Follow-Up
- Export to PDF/XLSX
- CRM sync with automatic contact creation and opportunity tracking

---

## 6. Contacts

- CRM contacts with bidirectional sync
- Alphabetically grouped, searchable
- Fields: name, email, phone, address, tags
- Actions: Call, Text, Email, Add Follow-Up
- Bulk email/SMS to multiple contacts
- Add Contact form (syncs to CRM)
- Contact Detail Page with history, notes, conversations
- File attachments
- Export to PDF/XLSX

---

## 7. Open Houses

### Creating an Open House
- Import from MLS by MLS# or property address (auto-fills address, beds, baths, sqft, price, description, key features, photos)
- Set start/end date and time
- Save as draft, then publish when ready

### Flyer Templates
- Modern, Modern Blue, Elegant Warm, Property Showcase
- Custom color swatches, image upload slots (up to 3 photos)
- Branded PDF: agent name, license#, phone, headshot, company logo, property photos, map, QR code

### QR Check-In Flow
1. Agent prints flyer, displays at property entrance
2. Visitors scan QR code (secure token, 72-hour expiration)
3. Registration form captures: name, email, phone, consent, representation, timeline, financing, neighborhoods, must-haves
4. Lead auto-scored (0-100), enters pipeline, syncs to CRM

### Attendees & Scorecard
- Attendee list with CSV export
- Scorecard: sign-ins, contacted within 5 min %, represented %, looking for agent %, overall performance score
- Contact tracking with timestamps

### OH Sync
- Two-way sync with MLS (pull upcoming, push local)
- Calendar sync (Google, Outlook)
- Duplicate prevention via MLS key tracking

---

## 8. MLS (6 Tabs)

### Tab 1: Search & Listings
- Search by zip code, city, address, building/condo name
- All statuses: Active, Pending, Closed, Expired, Withdrawn, Canceled
- Filters: property type, price range, beds/baths, DOM, 27 feature badges, rental toggle
- Color-coded badges: New (<7 days), Back on Market, Price Down, Price Up
- My Listings sub-tab
- AI Description Generator (multiple tones)
- AI Social Media Generator (Instagram, Facebook, LinkedIn, TikTok)

### Tab 2: Market Watch
- Map view (Google Maps with color-coded markers by status, shaped by property type)
- Hot Sheet view (sortable spreadsheet)
- Status filters + timeframe (24h, 7d, 30d, 90d)
- TMK/zip code search
- Geocoding fallback, TMK resolution

### Tab 3: CMA (Comparative Market Analysis)
- Full CMA Report rendered inline with adjustment engine
- Subject property input with property type filtering (SFR, Condo, Townhouse)
- Per-comp adjustment cards (sqft, beds, baths, lot, age, garage)
- Pricing summary with recommended price
- Fallback to RentCast/Realie when MLS has limited comps
- Save and print reports

### Tab 4: Lead Matches
- Auto-matches pipeline leads to active MLS listings
- Scoring: location (40pts), must-haves (30pts), timeline (15pts), financing (15pts)
- Top 5 matches per lead with reasons
- Status tracking (new/sent/viewed/dismissed)

### Tab 5: OH Sync
- Pull MLS open houses as draft events
- Push local events to calendar
- Sync tracking and status

### Tab 6: Investment
- Multi-unit property analysis with per-unit rent breakdown
- Auto-fills BRRRR and Flip analyzers

---

## 8b. Market Analytics

County-level market statistics dashboard accessible from the sidebar (under Deals) and as a tab in the MLS page.

### Overview Cards
- **Median Sale Price** (all types), **SFR Median** (Single Family), **Condo/TH Median** (Condo + Townhouse)
- **Price per Sq Ft**, **Median DOM**
- **YoY Price Change**: Compares current month county median to 12 months ago. Green for appreciation, red for decline.
- **Sales Momentum**: Compares total listings in the last 6 months to the prior 6 months. Shows whether the market is accelerating or decelerating.
- **MLS Active Listings** and **MLS Closed (30 days)** from Trestle

### Sales Price by ZIP Code (Interactive Table)
Sortable table with every Honolulu County ZIP code showing: median price, SFR median (green), Condo/TH median (blue), $/sqft, total listings, median DOM, and median rent. Click any ZIP for a detailed breakdown.

### Grouped Bar Chart -- SFR vs Condo/Townhouse by ZIP
Horizontal grouped bars for each ZIP code with red bars for SFR median and blue bars for Condo/Townhouse median. Sorted by SFR price descending (most expensive ZIP first). Legend at top.

### Sale Volume by Cities (Recharts Bar Chart)
Vertical bar chart showing total listings per city in the county (Hauula, Waialua, Wahiawa, Pearl City, Waianae, Kaneohe, Kapolei, Waipahu, Honolulu), sorted ascending.

### Fair Market Rents by Dwelling Size (Recharts Bar Chart)
Vertical bar chart showing HUD Section 8 Fair Market Rents by bedroom count (Efficiency, 1BR, 2BR, 3BR, 4BR).

### Median Rent by ZIP Code (Horizontal Bar Chart)
Rental medians per ZIP sorted by rent descending.

### Data Sources
RentCast market stats (per ZIP with dataByPropertyType breakdown), Trestle MLS (active/closed counts), HUD (fair market rents). Results cached 24 hours.

---

## 9. Property Intel

### Property Search (3 methods)
- By Address, By Zip Code, By Lat/Lng + Radius
- Filters: property type, beds/baths, year built, sqft, lot size, AVM, sale amount, assessed value, absentee toggle

### Property Detail Modal
- **Tabs**: Opportunity Score, Overview, Building, Financial, Sales History, Comps, Ownership, Neighborhood, Market Stats, Federal/GIS
- **AVM Reliability Check**: >30% difference from county assessment = suppressed, county value shown
- **Property-type-specific market stats**: Condo shows Condo medians, SFR shows SFR medians
- **County Deed Owner**: Green badge from Honolulu OWNINFO, unit-specific for condos
- **Condo Unit Filtering**: Sales history and ownership filtered to specific unit
- **Report Viewer Dropdown**: View Property, Buyer, Seller, Investor, or CMA report in-browser
- Download PDF report, shareable link (30-day expiry)

### Prospecting (6 search types)
1. **Absentee Owners** -- Owners not living at property
2. **High Equity** -- AVM minus mortgage, sorted by equity
3. **Pre-Foreclosure/Distressed** -- Underwater, high LTV, assessment drops
4. **Just Sold Farming** -- Recent closed sales + neighboring homes for postcards
5. **Investor Portfolios** -- Multi-property owners grouped by name
6. **DOM Prospecting** -- Stale/expired/withdrawn with tiered alerting (Red/Orange/Charcoal/Green)
- AI prospect analysis with scoring, outreach drafts (letters, emails, SMS, talking points)
- CSV/PDF export

---

## 10. Reports -- 6 Report Types

All reports render in-browser with the same quality as PDF exports. Each has Print, Download PDF, and Close buttons.

### Property Report
Cover page, AVM range bar, value cards, property/building details, MLS listing, tax assessment, mortgage estimate, equity bar, sales history, comps table, market type indicator, hazards, demographics, photo gallery

### Buyer Report
Personal note, price/AVM overview, mortgage payment estimate, property details, photos, market trends, neighborhood demographics (4-geo comparison tables), age/income bar charts, walkability scores, hazards, comps

### Seller Report
Personal note, AVM + CMA valuation, CMA range, property facts, equity breakdown with visual bar, market trends, sales history, comp adjustments, pricing summary with recommended price

### Investor Report
Investment verdict (Strong Buy/Good/Moderate/Weak/Pass), rental income analysis (AVM, GRM, 1% rule, vacancy, HUD Fair Market Rents), return metrics (cap rate, cash-on-cash, DSCR), monthly cash flow breakdown, 3 financing scenario comparison (Conventional/Investor/Cash), tax benefits (27.5yr depreciation), exit strategy projections (5/10/15yr), risk assessment, market overview

### CMA Report
AVM + CMA valuation, property facts, comp stats by status (Active/Pending/Closed), comp table, per-comp adjustment cards with dollar adjustments, pricing summary with recommended price

### Neighborhood Report
Cover map, housing comparison table (ZIP/County/State/USA), market trends, education/age/income/occupation bar charts, commute distribution, schools, walkability, lifestyle narrative, amenities

### Shared Report Components
ReportHeader, ValueCard, ReportRow, TwoColumnGrid, MarketTypeIndicator, EquityBar, AvmRangeBar, HorizontalBarChart, ComparisonTable, PhotoGallery, ReportFooter

---

## 11. Neighborhood Profiles

- AI-powered generation (GPT-4) with Fair Housing compliance check
- MLS import: search by MLS# or address to auto-fill fields
- Sections: Lifestyle & Vibe, Location Intelligence, Market Pulse, Community Resources, Amenities
- Census data enrichment at 4 geographic levels (ZIP/County/State/USA)
- In-browser report viewer with bar charts and comparison tables
- Export: multi-page PDF (10-12 pages) and Word/DOCX
- Schools cached 1 year, other data 30-day TTL

---

## 12. Calculators / Analyzers (12 tools)

### Transaction Calculators
1. **Mortgage Calculator** -- PITI, PMI, HOA, amortization schedule, Excel export
2. **Buyer Cash-to-Close** -- Down payment, closing costs, prepaids, escrow, credits
3. **Commission Split** -- Brokerage splits, caps, team overrides, split presets
4. **Seller Net Sheet** -- Proceeds after commissions, costs, payoff, concessions

### Investment Analyzers
5. **Investment Property** -- ROI, cap rate, IRR, cash-on-cash, 30-year projections, verdict
6. **Compare Properties** -- Side-by-side ranked by cap rate/CoC/IRR/ROI
7. **Rental Property** -- NOI, cap rate, CoC, DSCR, GRM, cash flow, equity projection
8. **STR Analyzer** -- Airbnb/VRBO, Hawaii GET + TAT taxes, occupancy, revenue projections
9. **Wholesale MAO** -- Maximum Allowable Offer, 70% Rule, investor margin
10. **House Flip** -- ARV, 70% Rule, costs, profit, ROI, annualized ROI
11. **BRRRR Calculator** -- Buy/Renovate/Refinance/Rent, equity capture, infinite returns
12. **1031 Exchange** -- IRS 45/180-day tracking, tax savings, depreciation recapture

All calculators: MLS auto-import, Excel/PDF export, branded reports, email sharing, save/load

---

## 13. Seller Opportunity Map

- Interactive Google Map with color-coded markers by motivation score
- Search by zip code, lat/lng + radius, TMK
- 12-dimension Seller Motivation Score (0-100): equity, ownership length, absentee, distress, portfolio, transfers, owner type, tax gap, market trend, tax trend, appreciation, HOA burden
- Filters: min score, absentee-only, min ownership years, min equity %, property type
- Property Detail Modal with Opportunity Score tab first
- AI outreach: letters, emails, SMS, talking points
- Saved searches with 7-day cache
- Heat map and ZIP boundary overlays
- TMK parcel boundary overlay (Hawaii)
- DOM Prospecting sub-page with monitoring and alerts

---

## 14. Farm & Watchdog

- Farm areas by zip code, radius, or TMK prefix
- Property filters: price range, bedrooms, types, statuses
- Live MLS search with sortable results
- Watchdog rules: DOM threshold, price drop monitoring, status change tracking
- Multi-channel notifications: push, email, SMS
- Alert management: unread/read/archived
- Cron-based periodic checking

---

## 15. Agency Dashboard (Broker/Admin)

### Tab 1: Overview
Total agents, active leads, hot leads, open houses, closings MTD/YTD, pipeline value, 6-month trend table, alerts (retention risk, aging leads)

### Tab 2: Agent Performance
Sortable table: leads, hot leads, OHs, pipeline, closings, volume, speed-to-lead, conversion%, MLS searches, reports generated, risk status

### Tab 3: Lead Performance
Lead funnel visualization, source bar chart, speed-to-lead leaderboard, lead aging warnings (3/7/14 days)

### Tab 4: Open House Performance
Per-agent events, check-ins, avg/OH, conversion rate

### Tab 5: Financial
Commission by agent, volume, revenue trend, pipeline value, totals

### Tab 6: Activity & Risk
MLS searches, reports generated, last active, retention risk flags (40%+ activity drop)

---

## 16. Analytics Reports

All reports support PDF/Excel export, print-friendly formatting, and Recharts visualizations.

### Market Statistics
- **Oahu Annual Resales** -- 40 years of residential sales data with line/bar/area charts, median prices, YoY trends
- **Oahu Monthly Report** -- Single-family and condo sales, median prices, DOM, pending inventory, YoY comparisons
- **Maui Monthly Report** -- SF median, condo median, 12-month trends, affordability index
- **Hawaii Island Monthly** -- SF, condo, and land medians, DOM, new vs sold with YoY
- **Kauai Monthly** -- SF, condo, and land medians
- **Statewide Comparison** -- Official Hawaii Realtors stats across all four counties
- **York & Adams Counties, PA** -- RAYAC monthly data with school district breakdowns

### Solo Agent Reports
- **Lead Source ROI** -- Conversion rates and cost-per-closing by lead source (Open House, Zillow, Google, Facebook, etc.). Shows which sources produce the most closings per lead invested.
- **Pipeline Velocity** -- Average days per pipeline stage with bottleneck identification. Highlights "stuck deals" sitting at 2x or more the average duration for their stage.
- **Tax & Savings Reserve** -- Gross commission vs. recommended tax and expense reserves. Helps agents plan for quarterly tax payments.
- **Speed-to-Lead Audit** -- Average response time to new leads (in minutes). Breaks down by hour to show when leads arrive and how quickly the agent responds. Tracks under 5 min, under 15 min, under 1 hour, and over 1 hour.

### Team Reports
- **Agent Leaderboard** -- Per-agent metrics: closings, calls, SMS, showings booked, total volume, commission earned. Includes radar chart for visual performance comparison.
- **Lead Assignment Fairness** -- Leads received, contacted, and converted per team member with average response time. Ensures equitable lead distribution.
- **Team Commission Split Tracker** -- House vs. agent commission portions per deal with instant calculations. Configurable split percentages.
- **Listing Inventory Health** -- Active listings by agent with DOM tracking. Price reduction alerts flag listings over 21 DOM that may need attention.

### Brokerage Reports
- **Company Dollar** -- Monthly revenue breakdown: gross revenue, agent splits, fees, operating expenses, and net company dollar. 12-month trend with YoY comparison.
- **Compliance & Audit Log** -- Document signatures, ID verifications, wire confirmations, and disclosure tracking from the audit log (90-day window).
- **Brokerage Market Share** -- Brokerage rank by zip code compared to competing brokerages. Shows market position relative to major brands.
- **Agent Retention Risk** -- AI flags agents with 40%+ activity drop over the last 30 days compared to their previous 30 days. Compares logins, leads, open houses, and searches. Enables proactive coaching.

### Office Admin
- **Pending Document Checklist** -- Under-contract deals missing required signatures, forms, or disclosures.

### Agency Dashboard (Broker/Admin)
The Agency Dashboard (Section 15) provides real-time aggregate reporting across all agents with 6 tabs: Overview, Agent Performance, Lead Performance, Open House Performance, Financial, and Activity & Risk. See Section 15 for details.

---

## 17. CRM Integration

### Contact Management
- Bidirectional contact sync
- Search by name, email, phone
- Contact detail with notes, conversations, activity history
- Tags and custom fields
- File attachments to contacts

### Pipeline & Opportunities
- Pipeline listing and selection
- Stage mapping for new leads and contacted leads
- Opportunity creation with monetary value
- Stage advancement tracking

### Messaging
- **SMS**: Send via CRM conversations API
- **Email**: Dual-channel (CRM-first, Resend fallback)
- **Bulk Messaging**: Send to multiple contacts
- **Message Templates**: Predefined templates (intro, showing, check-in, etc.)

### E-Signature / Document Signing
- Send contracts and documents for e-signature via CRM
- Template-based or custom document uploads
- Signer roles: tenant, landlord, custom
- Status tracking: draft, pending, signed, declined, expired

### Workflows & Automations
- n8n webhook integration with 6+ event types
- HMAC-SHA256 signature verification
- Webhook delivery logs with retry logic
- CRM workflow triggers on lead submission, stage advancement, open house events
- SMS auto-reply workflows (flyer request handling)

### Funnels & Forms
- Open house registration forms (QR-based)
- Custom qualification questions
- Lead capture with auto-scoring
- CRM custom objects (OpenHouse, Registration)
- Zillow/Bridge Interactive webhook for external lead sources

### Auto-Response
- AI-powered 24/7 SMS and email auto-responses
- After-hours-only mode with business hours
- Max auto-replies per contact (configurable)
- Escalation after N replies
- Custom greeting message
- Sentiment and intent analysis

### Escalation Rules
- Hot Lead Alert (heat score > 80)
- High Buyer Intent (keyword matching)
- Seller Intent (keyword matching)
- Frustrated Contact (negative sentiment)
- No Response (48h timeout)
- Multiple Open House Visits (engagement signal)
- Actions: notify agent, escalate to agent, create task

---

## 18. Social Channels

- Facebook Messenger
- Instagram DMs
- LinkedIn Messaging
- Google Business Messages
- WhatsApp Business API
- Unified message sending across platforms
- Inbound message routing to AI assistant

---

## 19. Integrations

### Primary
- **CRM**: Contacts, pipeline, email/SMS, e-signature, workflows, automations (19 OAuth scopes)
- **Trestle (HiCentral MLS)**: Listings, property data, comps, market watch, OH sync (OAuth2/Basic Auth)

### Calendar (Two-Way Sync)
- Google Calendar (OAuth)
- Microsoft/Outlook Calendar (OAuth)

### Webhooks
- n8n integration with 6+ event types
- HMAC verification, delivery logs, retry logic

### Data Providers
- **Realie**: AVM, equity, liens, deed transfers, sales history
- **RentCast**: Property records, rental AVM, market stats, comps, owner info
- **Honolulu County OWNINFO**: Current deed owner (unit-specific for condos)
- **Hawaii State GIS**: Flood/tsunami/fire zones, school boundaries, TMK parcels, fire stations, police stations, parks
- **FEMA NRI**: 12+ hazard risk ratings
- **FBI CDE**: Crime statistics by county
- **Census ACS**: Detailed demographics at 4 levels (education, income, age, occupation, commute)
- **NCES**: Schools (enrollment, student-teacher ratio, free lunch %, Title I)
- **FRED/BLS/HUD**: Economic data, employment, fair market rents
- **Google Maps/Geocoding**: Maps, geocoding, static map images

### Admin-Only
- Stripe (payments), PayPal (payments)

---

## 20. Team Management

- Usage overview: Agents, Assistants, Admins, Offices with progress bars
- Seat limit warnings with upgrade prompts
- Invite member (by email), create member (direct)
- Change role, assign office, remove member
- Account bootstrap on first visit

---

## 21. Billing

- Plans: Starter/Free, Brokerage Growth
- Current subscription: plan, status, price, limits, billing dates
- Summary: total paid, unpaid invoices, next payment
- Invoices with status badges
- Payment history
- Plan upgrade/change
- Stripe and PayPal support

---

## 22. Settings

- **Profile**: Name, email, license, agency, phone, locations, headshot, logo, timezone, landing page
- **Auto-Response**: AI SMS/email auto-responses with business hours and escalation
- **Escalation Rules**: Intent/sentiment-based lead escalation with configurable triggers
- **Security**: MFA (authenticator app), password change, active sessions

---

## 23. Showing Scheduler

- Public booking page for client self-scheduling
- Calendar integration for availability
- Dual entry: calendar event + follow-up task
- Contact linking
- Status tracking

---

## 24. Hoku AI Copilot (In-App)

Hoku is the AI assistant inside the Real Estate Genie app, available on every page via a floating button in the bottom-right corner.

- **24 action types**: 8 proactive (briefing-triggered) + 16 quick actions (agent-initiated)
- **Comprehensive knowledge base**: Covers all 20+ app pages with page-specific context. When the agent is viewing a property, Hoku knows the address, AVM, owner, comps, hazards, and market stats.
- **Proactive suggestions**: Follow up hot lead, open house reminder, pipeline stalled, welcome new lead, suggest open house, DOM prospects
- **Draft generation**: Emails and SMS for leads based on heat score and property context
- **Session persistence**: 24-hour TTL with message history (max 20 messages)
- **Actions**: Search MLS, property lookup, generate reports, run calculators, create tasks, advance pipeline, create open houses, search seller map, create farm watchdogs

---

## 25. Hoku Web Assistant (Public Website)

Hoku Web Assistant is an embeddable AI chat widget that agents add to their websites. It pre-qualifies visitors, captures leads, searches the MLS, and creates contacts in the CRM.

### Setup
Agents go to **Integrations > Hoku Web Assistant** and copy their embed code:
```html
<script src="https://realestategenie.app/api/web-assistant/embed?agentId=AGENT_ID"></script>
```
This adds a floating blue chat button to their website. Clicking it opens the Hoku chat in an iframe. Agents can also share a direct link: `realestategenie.app/chat/AGENT_ID`.

### Buyer Flow
1. Hoku greets the visitor: "Aloha! I'm Hoku, [Agent Name]'s assistant. Are you interested in buying or selling?"
2. Visitor says "buying" -- Hoku asks if they're working with an agent
3. If no agent, asks if they'd like the agent to reach out
4. Captures: name, email, phone
5. Qualifies: timeline (0-3mo, 3-6mo, 6+, browsing), pre-approval status, neighborhoods, must-have features
6. Offers to search for properties -- searches via the agent's **Trestle MLS connection** (same as App Hoku) or **IDX Broker** as fallback
7. Emails matching properties to the visitor with photos, price, beds/baths, and agent contact info
8. Creates a scored lead in the pipeline and a CRM contact with full conversation in the notes

### Seller Flow
1. Visitor says "selling" -- Hoku asks if they're working with an agent
2. If no agent, asks for the property address
3. Looks up the property in **RentCast and Realie** -- retrieves AVM, beds, baths, sqft, year built, lot size
4. Shares the property info with the visitor: "Here's what I found: 3 bed, 2 bath, 1,660 sqft, estimated value $1,472,000"
5. Captures: name, email, phone
6. Creates a scored lead with property data in the pipeline and CRM

### Lead Creation
- Lead inserted into `lead_submissions` with heat score, pipeline stage "new_lead", and source "Website Chat"
- CRM contact created with tags ["Website Chat", "Hoku Web Assistant"]
- CRM opportunity created in agent's pipeline as new lead (labeled "Buyer" or "Seller")
- Full conversation deposited in CRM contact notes
- Seller leads include property data (AVM, beds, baths, sqft) in the lead payload
- Lead appears on agent's Dashboard as "Needs Attention"

### Agent Personalization
- Uses agent's first name throughout ("Aloha! I'm Hoku, Donald's assistant")
- Hawaii agents get "Aloha" greeting and "Mahalo" farewell (detected from locations_served)
- Agent headshot, brokerage name, and logo shown on the chat landing page
- "Powered by Real Estate Genie" in footer

### MLS Search
- Tries the agent's **Trestle MLS** connection first (same integration as the app)
- Falls back to **IDX Broker** if configured (agent enters API key on Integrations page)
- Returns up to 6 matching Active listings with photos
- Emails results as a branded HTML email with agent contact info

---

## 26. Activity Tracking

Agent actions are logged to the `agent_activity_log` table for agency-level reporting. Logging is fire-and-forget (non-blocking) and does not impact the user's workflow.

**Actions tracked:**
- MLS searches performed (with query and result count)
- Reports generated (with address and report type)
- CMA generated (with address and comp count)
- Lead captures (from web assistant and open houses)

**Used by:**
- Agency Dashboard (per-agent activity metrics)
- Retention risk detection (40%+ activity drop flags agent as "At Risk")

---

## 27. Data Accuracy Features

These features ensure the data shown to agents is accurate and relevant, especially for condos and Hawaii-specific properties.

- **AVM Reliability Check**: Compares the automated valuation to county assessment and recent sale price (within 2 years). If the AVM differs by more than 30% from either reference, it is suppressed and the county assessment is shown instead with an amber warning. All downstream calculations (equity, LTV) use the best available value.

- **AVM Accuracy**: All API call sites now pass bedrooms, bathrooms, square footage, and property type to RentCast's AVM endpoint. This ensures comps match the subject property instead of RentCast guessing the attributes. Default comp count increased from 15 to 20.

- **Property-Type-Specific Market Stats**: When viewing a condo, the headline market stats show the Condo median price (e.g., $360K) instead of the aggregate across all types ($399K which includes $1.7M single-family homes). Same for SFR, Townhouse, Multi-Family, and Land.

- **Condo Unit Filtering**: Three layers of unit-specific filtering for condos:
  - **Ownership (OWNINFO)**: Queries by exact 12-digit parid (includes unit suffix) first, returns only that unit's owner instead of all building owners
  - **Sales History (MLS)**: Matches unit number in UnparsedAddress when the UnitNumber field is empty, separating unit-specific sales from building sales
  - **Property Data (RentCast/Realie)**: Strips unit number from address for lookup (providers don't have per-unit data), uses building-level data
  - **Parcels (ArcGIS)**: Strips condo unit suffix from TMK (parcels are land-level, not unit-level)

- **Address Search**: Searches both expanded and abbreviated street suffixes. "3849 Manoa Road" searches for "manoa road", "manoa rd", and just "manoa" in the StreetName field to match however the MLS stores it.

- **CMA Property Type Filtering**: HiCentral MLS uses PropertyType="Residential" for SFR, Condo, and Townhouse. The CMA engine filters by PropertySubType server-side after fetching results, so selecting "Single Family" excludes condos and townhouses from comps.

- **Condo Address Handling**: MLS stores condo addresses like "1315 Kalakaua Avenue 1110" (unit number appended without prefix). The app strips the unit for RentCast/Realie lookups (they can't parse raw unit numbers) while keeping it for display and MLS sales history matching.

---

## Platform

- **Stack**: Next.js 16 (App Router) + React 19 + TypeScript + TailwindCSS 4
- **Database**: Supabase (PostgreSQL) with Row Level Security on all tables
- **Auth**: Supabase Auth (JWT, email/password, MFA with authenticator app)
- **Hosting**: Vercel (serverless functions, preview deployments, cron jobs)
- **Mobile**: Capacitor 8 (iOS/Android wrapper)
- **AI**: Vercel AI Gateway + Anthropic Claude + OpenAI GPT-4
- **4 User Roles**: Agent, Team Lead, Admin (Account), Admin (Platform)
- **Bootstrap Wizard**: Guided setup for new users on first login
- **9 Data Sources**: MLS (Trestle), Realie, RentCast, Honolulu County OWNINFO, Hawaii State GIS, FEMA NRI, FBI CDE, Census ACS (4 geographic levels), NCES/FRED/BLS/HUD
- **White-Label Ready**: CRM provider name never shown to end users (nameless integration)

> Last updated: April 3, 2026
