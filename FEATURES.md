# Real Estate Genie -- Complete Feature List

> Last updated: April 10, 2026

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
- **Sync Health** -- Calendar and CRM connection status

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

- Auto-capture from open house QR check-ins, third-party webhooks, social channels
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
- Calendar sync
- Duplicate prevention via MLS key tracking

---

## 8. MLS (9 Tabs)

### Tab 1: Search & Listings
- Search by zip code, city, address, building/condo name, neighborhood/subdivision
- All statuses: Active, Pending, Closed, Expired, Withdrawn, Canceled
- Filters: property type, price range, beds/baths, DOM, 27 feature badges, rental toggle, neighborhood/subdivision name
- Color-coded badges: New (<7 days), Back on Market, Price Down, Price Up
- My Listings sub-tab
- AI Description Generator (multiple tones)
- AI Social Media Generator (Instagram, Facebook, LinkedIn, TikTok)

### Tab 2: Market Monitor
- Map view with color-coded markers by status, shaped by property type
- ZIP code boundary overlay
- Hot Sheet view (sortable spreadsheet) with Neighborhood and Land Title columns
- Map popup cards show neighborhood and ownership type
- Status filters + timeframe (24h, 7d, 30d, 90d)
- TMK/zip code search
- Geocoding fallback, TMK resolution

### Tab 3: Market Snapshot
- Real-time market statistics computed from MLS data
- Market Temperature gauge (buyer's vs seller's market)
- Quick Stats cards: Closed Sales, Pending, Active, Months of Inventory, DOM, Sale-to-List Ratio (6 metrics with 90-day trend arrows)
- 12-month bar charts for Average Sales Price and Sales Activity
- County selector filtering
- Cached 24 hours

### Tab 4: Market Analytics
County-level market statistics dashboard also accessible from the sidebar (under Deals).

- **Overview Cards**: Median Sale Price (all types), SFR Median, Condo/TH Median, $/Sqft, DOM, YoY Price Change, Sales Momentum (6mo vs prior 6mo), MLS Active, MLS Closed (30d)
- **Sales Price by ZIP Code**: Interactive sortable table with median price, SFR median, Condo/TH median, $/sqft, listings, DOM, rent per ZIP
- **Grouped Bar Chart**: SFR vs Condo/Townhouse median by ZIP, sorted by SFR price descending
- **Sale Volume by Cities**: Vertical bar chart of total listings per city, sorted ascending
- **Fair Market Rents**: HUD Section 8 rents by bedroom count (Efficiency through 4BR)
- **Median Rent by ZIP**: Rental medians per ZIP sorted descending
- Data cached 24 hours

### Tab 5: CMA (Comparative Market Analysis)
- Full CMA Report rendered inline with adjustment engine
- Subject property input with property type filtering (SFR, Condo, Townhouse)
- Per-comp adjustment cards (sqft, beds, baths, lot, age, garage)
- Pricing summary with recommended price
- Fallback data sources when MLS has limited comps
- Save and print reports

### Tab 6: Lead Matches
- Auto-matches pipeline leads to active MLS listings
- Scoring: location (40pts), must-haves (30pts), timeline (15pts), financing (15pts)
- Top 5 matches per lead with reasons
- Status tracking (new/sent/viewed/dismissed)
- Future: checkbox selection and "Send to Lead" via email (planned)

### Tab 7: OH Sync
- Pull MLS open houses as draft events
- Push local events to calendar
- Sync tracking and status

### Tab 8: Investment
- Multi-unit property analysis with per-unit rent breakdown
- Auto-fills BRRRR and Flip analyzers

### Tab 9: Hazard Map
- Map view with color-coded hazard zone polygon overlays
- Toggle layers: FEMA Flood Zones, Tsunami Evacuation Zones, Sea Level Rise
- Auto-detects Hawaii vs mainland for appropriate layers
- Address/ZIP search to center the map
- Deep link from Property Detail Modal

---

## 9. Property Intel

### Property Search (3 methods)
- By Address, By Zip Code, By Lat/Lng + Radius
- Filters: property type, beds/baths, year built, sqft, lot size, AVM, sale amount, assessed value, absentee toggle

### Property Detail Modal
- **Tabs**: Opportunity Score, Overview, Building, Financial, AVM, Sales History, Listing History, Comps, Ownership, Neighborhood, Market Stats, Area Intel
- **Building tab**: Full property features (construction type, condition, garage/carport details, deck/patio/porch areas, pool, fireplace, basement, HOA, utilities, lot dimensions, zoning, legal description)
- **Financial tab**: Home Equity Analysis with Genie AVM, mortgage status (Free & Clear indicator), current mortgage details, mortgage history with open/closed status and borrower names, foreclosure history with auction details, FMR rent estimates, assessment history
- **Sales History**: Full deed history with buyer/seller names, document types, arms length badges, down payment, LTV per transaction
- **Comps tab**: Owner names, lender, absentee/cash/corporate flags per comparable
- **Ownership tab**: Owner with ownership length, prior owner, 20+ lead flags (absentee, high equity, investor, free & clear, cash buyer, inherited, pre-foreclosure, etc.), investor portfolio (total properties, portfolio value, equity), skip trace (manual button - phone, email, social, demographics)
- **AVM Comparison**: Side-by-side Genie AVM, Comps AVM, Property AVM, and external AVM
- **List Price**: Displayed below address in modal header when opened from MLS
- **Property-type-specific market stats**: Condo shows Condo medians, SFR shows SFR medians
- **County Deed Owner**: Green badge from county records, unit-specific for condos
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

### Bird Dog Automated Prospecting
Automated off-market lead hunting that searches for properties matching agent criteria on a schedule.

- **Create searches** via UI form or Hoku ("Bird dog absentee owners in 96825 with high equity")
- **Lead filters**: Absentee Owner, High Equity, Vacant, Pre-Foreclosure, Foreclosure, Investor, Tax Delinquent, property type, min equity %, ZIP code
- **Combined filters**: Any combination (e.g., absentee + high equity + long ownership)
- **Scheduling**: Daily, weekly, or monthly automated searches
- **Delta detection**: Only alerts on NEW leads not previously found (zero-cost ID scanning)
- **Lead scoring**: Color-coded by seller motivation
  - HOT (red): Most likely to sell -- inherited, pre-foreclosure, death transfer, tax lien, vacant+absentee, foreclosure
  - WARM (orange): Moderately likely -- out-of-state absentee + equity, free & clear, long-term owner
  - COLD/NURTURE (gray): Not likely right now -- monitoring, no urgency signals
- **Hot Sheet Export**: Color-coded XLSX spreadsheet with 3 tabs (Summary, Hot Sheet with full property/owner data, Contacts with skip trace data)
- **Skip Trace**: Manual button per lead to find phone, email, social profiles
- **Investor Portfolio**: Shows total properties owned, portfolio value, equity when owner is an investor
- **Hoku integration**: Create, run, and view Bird Dog searches via conversational AI
- **Cron automation**: Daily searches run with daily briefing, weekly/monthly run with prospect refresh

### Market Monitor
Automated MLS alert system for buyer and seller clients with daily scanning and diff detection.

- **Client Profiles**: Create profiles with client name, contact info, search criteria (ZIP, beds, baths, price range, property type), and notification preferences
- **5 Alert Types**: New Listing, Price Drop, Back on Market, Expired/Withdrawn, Pending
- **3 Notification Channels**: Email, SMS, CRM
- **Daily Scanning**: Automated MLS scans with diff detection -- only alerts on changes since the last scan
- **On-Demand Scans**: "Run Now" button triggers an immediate scan for any profile
- **Alert History Dashboard**: View all past alerts per profile with timestamps and details

### Email Blast Agent
Neighborhood email marketing to CRM contacts with automated MLS-driven content.

- **MLS-Powered Content**: Search MLS by subdivision/neighborhood for recent activity
- **Configurable Statuses**: Active, Closed, Price Change, Pending, Expired
- **Branded HTML Email**: Listing cards with photos, MLS links, and agent branding
- **CRM Contact List Builder**: Search and select recipients from CRM contacts
- **Scheduling**: Weekly, bi-weekly, monthly, or manual send
- **Neighborhood Focus**: Target specific subdivisions for farming campaigns

### Broker's Open Email Blast
Agent-to-agent listing marketing for promoting current inventory.

- **Active Listing Showcase**: Sends agent's current active MLS listings to other agents
- **Branded HTML Email**: Listing cards with photos and property details
- **Agent Recipients**: Sends to CRM contacts tagged "MLS Agent"
- **One-Click Send**: Select listings and blast to agent network

---

## 10. Reports -- 6 Report Types

All reports render in-browser with the same quality as PDF exports. Each has Print, Download PDF, and Close buttons.

### Property Report
Cover page with map and hero photo, AVM range bar, value cards (AVM, last sale, equity, LTV), rental estimate, property details, building details, MLS listing with description, interior features (plumbing, fireplace, attic, structure), exterior features (pool, deck, patio, porch, condition), legal description (zoning, census tract, subdivision), multi-year tax history comparison table (5-year land/improvement/total/tax), deed/transaction details (buyer/seller, vesting, title company, doc numbers, transfer tax), mortgage & equity with visual bar, mortgage payment estimate, sales history table, ownership details, comparable sales table with match scores, area market statistics with market type indicator and MoM trend arrows, hazard & environmental zones, neighborhood & economic context, neighborhood comparison table (ZIP vs County vs State), schools (up to 6 with grades, enrollment, student-teacher ratio, overall grade), livability index with category score bars, walkability score, photo gallery

### Buyer Report
Cover page with hero photo and agent branding, personal note, listing status badge, price/AVM value cards with range bar, basic facts (beds/baths/sqft/lot), property information, building details, interior features, exterior features, MLS description, location details (subdivision, zoning, flood zone), photo gallery (up to 12), mortgage payment estimate with PITI breakdown, market trends with market type indicator and MoM arrows, neighborhood section (housing facts 4-geo comparison, people facts, age distribution bar chart, income brackets bar chart), walkability score, environmental hazard zones, comparable sales table. Generated from MLS listing data.

### Seller Report
Cover page with property map and agent branding, AI-generated Property Analysis narrative (Fair Housing compliant), valuation summary cards (AVM, CMA value, last sale, equity), AVM range bar, CMA range bar, property facts, building details, interior/exterior features, legal description (parcel, zoning, census tract, legal text), owner facts, multi-year tax history table, estimated equity section with visual equity bar (property value vs loan balance) and appreciation timeline, photo gallery (up to 16), market trends with market type indicator, dual-axis Listings and Days on Market bar chart, Market by Property Type split cards (Single Family vs Condo/Townhouse), median sale price trend line chart, County Market Overview with YoY and Sales Momentum badges on primary metric cards, ZIP comparison table with subject property ZIP highlighted, Median Sale Price by ZIP horizontal bar chart (SFR vs Condo/Townhouse), Oahu 20-year trend charts (median price, average price, sales volume) split by property type, sales history table, comparable sales with CMA adjustments (address, status, price, adjusted price), pricing strategy table (for sale/closed/distressed/expired with low/median/high), CMA pricing summary with recommended price in gold box, environmental hazard zones. Generated from property data (public records) via property search and HTML-to-PDF rendering.

### Investor Report
Investment verdict (Strong Buy/Good/Moderate/Weak/Pass), rental income analysis (AVM, GRM, 1% rule, vacancy, HUD Fair Market Rents), return metrics (cap rate, cash-on-cash, DSCR), monthly cash flow breakdown, 3 financing scenario comparison (Conventional/Investor/Cash), tax benefits (27.5yr depreciation), exit strategy projections (5/10/15yr), risk assessment, market overview

### CMA Report
AVM + CMA valuation, property facts, comp stats by status (Active/Pending/Closed), comp table, per-comp adjustment cards with dollar adjustments, pricing summary with recommended price

### Neighborhood Report
Cover page with neighborhood map, housing facts comparison table (ZIP/County/State/USA with median value, income, population, age, own/rent split), market trends with market type indicator and MoM arrows (median price, inventory, DOM, sold-to-list, median estimated value), sold home stats bar charts (price range, price/sqft, home size, home age, bedroom count distributions), people facts comparison table (population, density, pop change, median age), education levels bar charts, age distribution bar charts, household income brackets bar chart, occupational categories bar chart, households with children breakdown, transportation modes (how people get to work), economy comparison table with commute data, commute time distribution, quality of life facts (elevation, rainfall, temperature, superfund/brownfield sites), schools table (up to 15 with type, grades, enrollment, student-teacher ratio), walkability score, lifestyle & vibe narrative, location intelligence, local amenities (parks, shopping, dining), nearby neighborhoods grid (median value, homes, population)

### Shared Report Components
ReportHeader, ValueCard, ReportRow, TwoColumnGrid, MarketTypeIndicator, EquityBar, AvmRangeBar, HorizontalBarChart, ComparisonTable, PhotoGallery, ReportFooter

### Market-Based Report Routing
- Admin-managed report-to-MLS assignment system
- Reports filtered by agent's MLS connection -- agents only see reports relevant to their market
- Admin console for managing report visibility per MLS

---

## 11. Neighborhood Profiles

- AI-powered generation with Fair Housing compliance check
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
8. **STR Analyzer** -- Short-term rental with Hawaii GET + TAT taxes, occupancy, revenue projections
9. **Wholesale MAO** -- Maximum Allowable Offer, 70% Rule, investor margin
10. **House Flip** -- ARV, 70% Rule, costs, profit, ROI, annualized ROI
11. **BRRRR Calculator** -- Buy/Renovate/Refinance/Rent, equity capture, infinite returns
12. **1031 Exchange** -- IRS 45/180-day tracking, tax savings, depreciation recapture

All calculators: MLS auto-import, Excel/PDF export, branded reports, email sharing, save/load

---

## 13. Seller Opportunity Map

- Interactive map with color-coded markers by motivation score
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

All reports support PDF/Excel export, print-friendly formatting, and chart visualizations.

### Market Statistics
Monthly statistics include data through March 2026.

- **Oahu Annual Resales** -- 40 years of residential sales data with line/bar/area charts, median prices, YoY trends
- **Oahu Monthly Report** -- Single-family and condo sales, median prices, DOM, pending inventory, YoY comparisons
- **Maui Monthly Report** -- SF median, condo median, 12-month trends, affordability index
- **Hawaii Island Monthly** -- SF, condo, and land medians, DOM, new vs sold with YoY
- **Kauai Monthly** -- SF, condo, and land medians
- **Statewide Comparison** -- Official Hawaii Realtors stats across all four counties
- **York & Adams Counties, PA** -- Monthly data with school district breakdowns

### MLS Agent Leaderboard
- Market-wide agent rankings from MLS closed transactions
- Configurable period (3-24 months) and property type filter
- Mode selection: listing agent, buyer agent, or both
- Top agents table with sales count, volume, average price, average DOM, email, phone
- Top offices tab with agent counts per office
- Excel export (3 sheets: agents, offices, summary)
- Export to CRM with rank tier tags (Top 10/25/50/100)

### Solo Agent Reports
- **Lead Source ROI** -- Conversion rates and cost-per-closing by lead source
- **Pipeline Velocity** -- Average days per pipeline stage with bottleneck identification
- **Tax & Savings Reserve** -- Gross commission vs. recommended tax and expense reserves
- **Speed-to-Lead Audit** -- Average response time to new leads with hourly breakdown

### Team Reports
- **Agent Leaderboard** -- Per-agent metrics: closings, calls, SMS, showings booked, total volume, commission earned
- **Lead Assignment Fairness** -- Leads received, contacted, and converted per team member
- **Team Commission Split Tracker** -- House vs. agent commission portions per deal
- **Listing Inventory Health** -- Active listings by agent with DOM tracking

### Brokerage Reports
- **Company Dollar** -- Monthly revenue breakdown: gross revenue, agent splits, fees, operating expenses, and net company dollar
- **Compliance & Audit Log** -- Document signatures, ID verifications, wire confirmations, and disclosure tracking
- **Brokerage Market Share** -- Brokerage rank by zip code compared to competing brokerages
- **Agent Retention Risk** -- AI flags agents with 40%+ activity drop

### Office Admin
- **Pending Document Checklist** -- Under-contract deals missing required signatures, forms, or disclosures

### Agency Dashboard (Broker/Admin)
The Agency Dashboard (Section 15) provides real-time aggregate reporting across all agents with 6 tabs. See Section 15 for details.

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
- **Email**: Dual-channel (CRM-first, transactional fallback)
- **Bulk Messaging**: Send to multiple contacts
- **Message Templates**: Predefined templates (intro, showing, check-in, etc.)

### E-Signature / Document Signing
- Send contracts and documents for e-signature via CRM
- Template-based or custom document uploads
- Signer roles: tenant, landlord, custom
- Status tracking: draft, pending, signed, declined, expired

### Workflows & Automations
- Webhook integration with 6+ event types
- HMAC-SHA256 signature verification
- Webhook delivery logs with retry logic
- CRM workflow triggers on lead submission, stage advancement, open house events
- SMS auto-reply workflows (flyer request handling)

### Funnels & Forms
- Open house registration forms (QR-based)
- Custom qualification questions
- Lead capture with auto-scoring
- CRM custom objects (OpenHouse, Registration)
- Third-party webhook support for external lead sources

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
- **CRM**: Contacts, pipeline, email/SMS, e-signature, workflows, automations
- **MLS**: Listings, property data, comps, market watch, OH sync

### Calendar (Two-Way Sync)
- Google Calendar
- Microsoft/Outlook Calendar

### Webhooks
- Automation webhook integration with 6+ event types
- HMAC verification, delivery logs, retry logic

### Data Providers
- **Property Data API**: AVM, equity, liens, deed transfers, sales history, owner info, skip trace, investor portfolios, property boundaries, comps with boost parameters
- **County Records**: Current deed owner (unit-specific for condos)
- **State GIS**: Flood/tsunami/fire zones, school boundaries, TMK parcels
- **FEMA NRI**: 12+ hazard risk ratings
- **FBI CDE**: Crime statistics by county
- **Census ACS**: Detailed demographics at 4 levels (education, income, age, occupation, commute)
- **NCES**: Schools (enrollment, student-teacher ratio, free lunch %, Title I)
- **Federal Economic Data**: Mortgage rates, employment, fair market rents
- **Maps/Geocoding**: Maps, geocoding, static map images

### Admin-Only
- Payment processing (credit card and alternative methods)

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
- Multiple payment methods supported

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
- **TMK search**: "Find me SFR 3/2 in TMK 1-2-9" -- maps TMK to ZIP, searches MLS, navigates to results
- **MLS search navigation**: Navigates to MLS Search page with pre-filled filters and auto-search
- **Property type filtering**: Single Family, Condo, Townhouse, Land
- **Beds/baths parameters**: Supported in search commands

---

## 25. Hoku Web Assistant (Public Website)

Hoku Web Assistant is an embeddable AI chat widget that agents add to their websites. It pre-qualifies visitors, captures leads, searches the MLS, and creates contacts in the CRM.

### Setup
Agents go to **Integrations > Hoku Web Assistant** and copy their embed code. This adds a floating blue chat button to their website. Agents can also share a direct link.

### Buyer Flow
1. Hoku greets the visitor using the agent's name
2. Visitor says "buying" -- Hoku asks if they're working with an agent
3. If no agent, asks if they'd like the agent to reach out
4. Captures: name, email, phone
5. Qualifies: timeline, pre-approval status, neighborhoods, must-have features
6. Offers to search for properties via the agent's MLS connection
7. Emails matching properties to the visitor with photos, price, beds/baths, and agent contact info
8. Creates a scored lead in the pipeline and a CRM contact with full conversation in the notes

### Seller Flow
1. Visitor says "selling" -- Hoku asks if they're working with an agent
2. If no agent, asks for the property address
3. Looks up the property -- retrieves AVM, beds, baths, sqft, year built, lot size
4. Shares the property info with the visitor
5. Captures: name, email, phone
6. Creates a scored lead with property data in the pipeline and CRM

### Lead Creation
- Lead inserted with heat score, pipeline stage "new_lead", and source "Website Chat"
- CRM contact created with tags
- CRM opportunity created in agent's pipeline
- Full conversation deposited in CRM contact notes
- Seller leads include property data in the lead payload
- Lead appears on agent's Dashboard as "Needs Attention"

### Agent Personalization
- Uses agent's first name throughout
- Hawaii agents get "Aloha" greeting and "Mahalo" farewell (detected from locations_served)
- Agent headshot, brokerage name, and logo shown on the chat landing page
- "Powered by Real Estate Genie" in footer

### MLS Search
- Uses the agent's MLS connection
- Returns up to 6 matching Active listings with photos
- Emails results as a branded HTML email with agent contact info

---

## 26. Activity Tracking

Agent actions are logged for agency-level reporting. Logging is fire-and-forget (non-blocking) and does not impact the user's workflow.

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

- **Genie AVM (Proprietary Valuation)**: Dynamic ensemble valuation model with four sources: list price (30-40%), MLS closed comps (20-45%), Property AVM (15% cross-check), and county assessment trend (15-25%). Luxury properties ($2M+) get 40% list price weight since comps are sparse at high price points. Feature-based comp adjustments for pool, garage, condition, outdoor space, and fireplace. Comp quality filters: minimum correlation (0.3), max adjustment cap (35%), outlier removal, and up to 20 comps. Condo-specific tuning with increased sqft weight and reduced bed/bath adjustments. List-to-sale ratio calibration adjusts list price input based on area-specific sale patterns. Hawaii-specific adjustments for leasehold discount (25-35%), flood zone discount (3-5%), and high HOA impact.

- **AVM Caching (4 strategies)**: (1) Sale outcome tracking records AVM predictions vs actual sale prices for accuracy measurement. (2) Historical comp cache builds a richer comp pool over time from every closed sale encountered (both from Comps tab and MLS Search). (3) List-to-sale ratio cache tracks how list prices compare to actual sales by ZIP/subdivision for list price weight calibration. (4) AVM result caching with 7-day TTL. Cached comps supplement live MLS results when fewer than requested.

- **AVM Statistics Dashboard**: Admin console page showing real-time AVM accuracy metrics: median/mean error, within-10%/15%/20% rates, accuracy by ZIP code, property type, and confidence level. Comp cache health. Recent predictions table with per-property error. Silently tracks every AVM prediction for app-wide reporting.

- **Source Branding**: All data sources display as "Real Estate Genie" or "Public Records" -- no provider names shown to agents.

- **Property-Type-Specific Market Stats**: When viewing a condo, the headline market stats show the Condo median price instead of the aggregate across all types. Same for SFR, Townhouse, Multi-Family, and Land.

- **PropertyType Mapping**: MLS uses PropertyType="Residential" with PropertySubType for specific types. All search routes map correctly.

- **Condo Unit Filtering**: Three layers of unit-specific filtering for condos (ownership, sales history, property data, parcels).

- **Address Search**: Searches both expanded and abbreviated street suffixes for flexible matching.

- **CMA Property Type Filtering**: Filters by PropertySubType server-side after fetching results.

- **Middle School Fix**: Hawaii GIS uses correct field names for intermediate/middle school zones.

- **Market Stats Caching**: Market stats cached with monthly refresh.

---

## Platform

- **Stack**: Next.js (App Router) + React + TypeScript + TailwindCSS
- **Database**: PostgreSQL with Row Level Security on all tables
- **Auth**: JWT-based authentication (email/password, MFA with authenticator app)
- **Hosting**: Serverless deployment with preview deployments and cron jobs
- **Mobile**: Native iOS/Android wrapper
- **AI**: Multi-model AI integration for copilot, analysis, and content generation
- **4 User Roles**: Agent, Team Lead, Admin (Account), Admin (Platform)
- **Bootstrap Wizard**: Guided setup for new users on first login
- **Multiple Data Sources**: MLS, property records, county records, state GIS, federal data (FEMA, FBI, Census, NCES, HUD)
- **White-Label Ready**: No provider names shown to end users

> Last updated: April 10, 2026
