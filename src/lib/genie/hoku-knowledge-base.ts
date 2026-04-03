/**
 * Hoku Knowledge Base
 *
 * Comprehensive knowledge about every feature in Real Estate Genie.
 * Injected into Hoku's system prompt so she can explain features,
 * guide agents through workflows, and provide context-aware help.
 */

// ── Page-specific context injected when agent is on that page ──

export const PAGE_CONTEXT: Record<string, string> = {
  // Dashboard
  dashboard: `The agent is on their DASHBOARD -- their command center. Sections include:
- **Needs Attention**: Urgent follow-ups (leads not contacted in 3+ days with heat score >= 50), shown in amber
- **Hoku Assistant**: That's you! Floating AI copilot button for conversational task execution
- **Hoku Quick Actions**: 7-button grid (New Open House, View Leads, Pipeline, MLS Search, Reports, Calculators, Tasks) + floating action bar
- **AI Daily Briefing**: Numbered priority list (1-3 items) generated from urgent follow-ups, hot leads, today's events, new leads this week
- **Pipeline Stats**: Count by stage breakdown, total leads, hot leads count
- **Tasks Widget**: Overdue/Today/Upcoming tasks (3 per section) with quick-complete checkboxes
- **Upcoming Events**: Next 5 events from all connected calendars (Google, Outlook, CRM) with source color-coding
- **Active Listings**: Total active listings, average DOM, stale listings (21+ DOM) with warning
- **One-Tap Contact Actions**: Hot leads (70+ score) with direct Call/Text/Email links
- **Recent Activity Feed**: Real-time log of leads, open houses, integrations, webhooks with heat score badges
- **Sync Health**: Integration status indicators for Google Calendar, Outlook, CRM
Help the agent understand their daily priorities and offer to take action on briefing items.`,

  // Calendar
  calendar: `The agent is on the CALENDAR page. This is a unified, multi-source calendar view.
- **Views**: Month, Week, Day with navigation arrows
- **Sources** (color-coded): Google Calendar (blue), Outlook/Microsoft (green), CRM (purple), Local (gray)
- **Source Filtering**: Toggle visibility per calendar source
- **Event Operations**: Create, edit, delete events with title, description, location, date/time, all-day toggle, attendee management
- **Two-Way Sync**: Changes sync bidirectionally with connected calendars. CRM booked meetings (online booking page) always take precedence.
- **Manual Sync Button**: Force full sync across all connected sources
- **Integration Setup**: Connect Google Calendar (OAuth), Outlook (OAuth), CRM (API key + Location ID)
Help the agent manage their schedule, sync calendars, and create events.`,

  // Pipeline
  pipeline: `The agent is on the PIPELINE page. This is a visual Kanban-style board for managing deal flow.
- **11 Pipeline Stages**: New Lead -> Initial Contact -> Qualification -> Initial Consultation -> Property Search/Listing Prep -> Open Houses & Tours -> Offer & Negotiation -> Under Contract/Escrow -> Closing Coordination -> Closed & Follow-up -> Review Request
- Each stage has a unique color and shows: lead count, total pipeline value, individual opportunity cards
- **Drag-and-drop** cards between stages to update status
- **Card Details**: Lead/opportunity name, contact name, monetary value, status, creation date
- **Lead Detail Modal**: Full info, notes history, conversation history, action buttons (email draft, create task, advance stage, mark as lost)
- **CRM Sync**: If CRM connected, pipeline maps to CRM pipeline stages. Leads auto-advance when emails/SMS sent.
- **Local Pipeline**: Available for agents without CRM connection
- **Pipeline Selection**: Dropdown to switch between multiple pipelines
Help the agent manage their deal flow and advance opportunities through stages.`,

  // Tasks
  tasks: `The agent is on the TASKS page. Full task management system.
- **Tabs**: All / Overdue / Today / Upcoming / Completed
- **Task Fields**: Title, description, priority (Urgent/High/Medium/Low with color dots), due date/time, type (General/Follow-Up/Call/Email/Meeting/Showing/Document/Closing), status, recurrence (Daily/Weekly/Bi-weekly/Monthly/Quarterly)
- **Entity Linking**: Link tasks to a Lead, Contact, Open House, or Transaction
- **Assignment**: Assign to self or team member
- **Actions**: Mark complete, snooze (tomorrow/next week/2 weeks/custom), edit, delete
- **Quick Contact**: Call/Text/Email icons if linked entity has contact info
- **Bulk Operations**: Multi-select for bulk complete, snooze, or delete
- **Export**: CSV or PDF with columns (Title, Priority, Status, Due Date, Type, Linked To, Assigned To, Recurring)
- **Recurring Tasks**: Auto-creates new instances on recurrence date (iCalendar RRULE format)
Help the agent manage tasks, set priorities, and stay on top of follow-ups.`,

  // Contacts
  contacts: `The agent is on the CONTACTS page. These are CRM contacts synced from your CRM (different from Leads which are auto-captured from open houses).
- **Contact List**: Alphabetically grouped, searchable (debounced), with bulk selection
- **Contact Fields**: Name, email, phone, address, tags (displayed as badges)
- **Actions**: Call/Text/Email buttons, Add Follow-Up
- **Bulk Operations**: Select multiple contacts for bulk email or SMS
- **Add Contact**: Manual form (first/last name, email, phone, address) -- syncs to CRM
- **Export**: PDF or XLSX (Name, Email, Phone, City, Tags)
- **CRM Sync**: Bidirectional sync with CRM. Requires CRM OAuth connection.
- **Contact Detail Page**: Full details, history, notes from CRM, attached files
NOTE: Leads = auto-captured from open house check-ins (scored 0-100). Contacts = CRM-synced professional contacts from CRM.
Help the agent manage contacts, sync with CRM, and draft communications.`,

  // Leads
  leads: `The agent is on the LEADS page. Leads are automatically captured from open house QR check-ins and webhooks.

**Dashboard Charts**: Leads by source, by event, heat score distribution, pipeline stage breakdown, leads over time, buyer readiness

**Lead List (Tabbed)**: Hot / Warm / Cold / DNC tabs
- Each lead shows: Name, Contact buttons (Call/Text/Email), Property, Heat Score, Timeline, Date
- Click lead name to generate neighborhood profile
- Add Follow-Up button on each lead
- Export to PDF/XLSX

**Heat Score (0-100)**: Auto-calculated at check-in:
- Contact info (30pts): email + phone + consent
- Representation (20pts): not represented = highest
- Agent reach out opt-in (15pts)
- Timeline (20pts): 0-3 months = highest
- Financing (15pts): pre-approved/cash = highest
- Specificity (10pts): neighborhoods + must-haves mentioned
- Multiple visits to same property = boosted to 100 (RED HOT)

**Classifications**: Hot (80+) red, Warm (50-79) orange, Cold (<50) blue, DNC gray (already has agent)

**Pipeline Stages**: New Lead -> Initial Contact -> Qualification -> Consultation -> Property Search -> Tours -> Offer -> Under Contract -> Closing -> Closed -> Review

**Lead Matches**: Automatically matches active MLS listings to each lead's criteria
- Scores 0-100: location (40pts) + must-haves (30pts) + timeline urgency (15pts) + financing readiness (15pts)
- Top 5 matches per lead with reasons, saved with status tracking (new/sent/viewed/dismissed)

Help the agent prioritize leads, view matched properties, draft communications, and understand heat scores.`,

  // MLS Listings
  "mls-listings": `The agent is on the MLS page. This has 6 tabs powered by HiCentral MLS (Trestle).

**Tab 1 - Search & Listings**:
- Search by zip code, city, address, or building/condo name
- Filters: Status (Active/Pending/Closed/Expired/Withdrawn/Canceled), property type, price range, beds/baths, DOM, 27 feature badges, rental toggle
- Listing cards with photo, price, beds/baths/sqft, DOM, listing agent
- Color-coded badges: blue "New" (< 7 days), purple "Back on Market", green "Price Down", red "Price Up"
- Click listing to open full Property Detail Modal
- **My Listings** sub-tab: Agent's own active listings with MLS sync status
- **AI Description Generator**: Creates 3-5 tone variants (Professional/Casual/Luxury/Family)
- **AI Social Media Generator**: Platform-specific content (Instagram/Facebook/LinkedIn/TikTok) with captions, hashtags, video scripts

**Tab 2 - Market Watch**: Map + Hot Sheet for market monitoring (see market-watch context)

**Tab 3 - CMA**: Comparative Market Analysis with MLS comps, RentCast/Realie fallback, correlation scoring, suggested price range

**Tab 4 - Lead Matches**: Auto-matches pipeline leads to active MLS listings (scored 0-100)

**Tab 5 - OH Sync**: Two-way open house sync between MLS and local database

**Tab 6 - Investment**: Multi-unit property analysis with per-unit rent breakdown, auto-fills BRRRR and Flip analyzers

Help the agent search listings, run comps, match leads, and analyze investments.`,

  // Property Data / Prospecting
  "property-data": `The agent is on the PROPERTY INTEL page. This has 2 tabs: Property Search and Prospecting.

**Tab 1 - Property Search** (3 search modes):
1. **By Address**: Single address search with autocomplete
2. **By Zip Code**: Returns all properties in a zip code
3. **By Lat/Lng + Radius**: Latitude, longitude, and radius in miles
- Filters: property type, beds/baths, year built, sqft, lot size, AVM value, sale amount, assessed value, absentee toggle, sale date range
- Results show in Property Detail Modal with tabs:
  - **Opportunity Score** (first tab when seller data present): scoring breakdown, AI outreach suggestions
  - **Overview**: Address, beds/baths/sqft, year built, property type, lot size, owner info
  - **Building**: Construction, rooms, parking, utilities, interior features
  - **Financial**: AVM (with reliability check), assessment, tax, mortgage, equity, LTV, rental AVM, cap rate
  - **Sales History**: Historical transactions with dates, amounts, buyer/seller, deed type
  - **Comps**: Comparable sales with correlation scoring
  - **Ownership**: Deed owner (county OWNINFO with green badge), co-owners, corporate/trust, absentee, mailing address
  - **Neighborhood**: Demographics, schools, crime, POI, walk score
  - **Market Stats**: Median price, avg DOM, active listings, price/sqft, median rent
  - **Federal/GIS**: School zones (elementary/middle/high attendance boundaries), hazards (FEMA NRI), flood/tsunami/fire zones, opportunity zones
- **AVM Reliability**: Compared to county assessment and recent sale. If >30% difference, suppressed -- county assessment shown instead
- Download professional multi-page PDF report (cover page with map, value snapshot, AVM range bar, equity visual, photo gallery, comps table, market type indicator, hazards, demographics) or generate shareable link (expires 30 days)

**Tab 2 - Prospecting** (6 search types): See prospecting context.

Help the agent search properties, understand data, run reports/calculators, and prospect for sellers.`,

  // Prospecting
  prospecting: `The agent is on the PROSPECTING page. This has 6 specialized search tools for finding potential clients:

1. **Absentee Owners** — Finds property owners who do NOT live at the property.
   - These are often investors, landlords, or people who inherited property and live elsewhere.
   - WHY PROSPECT THESE: Absentee owners are more likely to sell because they don't have emotional attachment to the property. They may be tired of managing a rental, dealing with tenants, or paying taxes on a property they don't use.
   - HOW TO SEARCH: Enter a zip code, optionally filter by years owned (longer = more likely to sell), beds/baths, and property type.
   - BEST APPROACH: Look for absentee owners with 15+ years of ownership and out-of-state mailing addresses — these are the strongest prospects.

2. **High Equity** — Finds owners with significant equity (property value minus mortgage balance).
   - WHY PROSPECT THESE: Owners with high equity have the financial flexibility to sell. They're not underwater and can walk away with a significant profit. Combined with other signals (absentee, long ownership), high equity owners are prime listing candidates.
   - HOW TO SEARCH: Enter a zip code. Results are sorted by equity amount. Filter by minimum equity percentage.
   - BEST APPROACH: Focus on owners with 70%+ equity and long ownership — they've built wealth and may be ready to cash out.

3. **Pre-Foreclosure** — Finds properties in the foreclosure process.
   - WHY PROSPECT THESE: Owners facing foreclosure are highly motivated to sell quickly. They need an agent who can help them sell before the bank forecloses, which would devastate their credit.
   - HOW TO SEARCH: Enter a zip code. Results show properties with active foreclosure filings, default amounts, and auction dates.
   - BEST APPROACH: Be sensitive — these owners are in distress. Position yourself as someone who can help them avoid foreclosure by selling quickly. Time is critical.

4. **Just Sold (Farming)** — Finds homes that sold in the last 6 months, then shows ALL neighboring homes within a half-mile radius so the agent can send postcards.
   - WHY THIS WORKS: When a home sells in a neighborhood, the neighbors often don't know the current value of THEIR home. A postcard saying "Your neighbor's home at 123 Main St just sold for $850,000 — do you know what YOUR home is worth?" is one of the most effective prospecting strategies in real estate. It creates urgency and curiosity.
   - HOW TO SEARCH: Enter a zip code to find recent closed sales (last 6 months). Click on a sold property to see all homes within a half-mile radius. These are your postcard recipients.
   - WHAT TO SEND: "Just Sold" postcards to neighbors with the sale price, a free home valuation offer, and the agent's contact info. Many neighbors will be surprised by the value and consider selling.
   - BEST APPROACH: Target neighborhoods where sale prices are strong — neighbors will be motivated by high values. Send postcards within 1-2 weeks of the sale closing while it's still fresh news. Follow up with a second mailer 30 days later.
   - KEY INSIGHT: This is NOT about contacting the new homeowner — it's about reaching the NEIGHBORS of the sold home who may now be curious about their own property value.

5. **Investor Portfolios** — Finds owners who own multiple properties.
   - WHY PROSPECT THESE: Multi-property owners are active in real estate and may be looking to buy, sell, or exchange properties. They understand the market and make decisions based on numbers, not emotions.
   - HOW TO SEARCH: Enter a zip code. Filter by minimum number of properties owned.
   - BEST APPROACH: Approach with investment-focused messaging — cap rates, market trends, 1031 exchanges. These owners speak the language of ROI.

6. **DOM Prospecting** — Finds stale, expired, and withdrawn listings.
   - WHY PROSPECT THESE: Expired and withdrawn listings are sellers whose property didn't sell with their previous agent. They may be frustrated and open to switching agents.
   - HOW TO SEARCH: Enter zip codes. Results show three tiers:
     - GREEN (Expired/Withdrawn): Fair game for outreach — listing contract ended
     - RED/ORANGE (Active over DOM threshold): MONITOR ONLY — do NOT solicit, it's unethical to contact sellers with active listings
     - CHARCOAL (Just over threshold): Watch for expiration
   - BEST APPROACH: For expired listings, lead with a fresh marketing strategy. Explain what you would do differently. For active stale listings, add to your monitor list and wait for expiration.

GENERAL TIPS:
- All searches return scored property cards ranked by likelihood to sell
- Click any property card to see full details, motivation factors, and AI analysis
- Use the "time at residence" filter to find long-term owners (20+ years = strongest prospects)
- Results can be exported or saved for follow-up
- Hoku (that's me!) can run any of these searches for you — just tell me which one and the zip code.`,

  // Seller Map
  "seller-map": `The agent is on the SELLER MAP. Interactive map-based prospecting tool with predictive seller scoring.

**Search Methods**: By zip code, by lat/lng + radius (up to 50 miles), by TMK (Hawaii parcel ID)
**Map Features**: Google Maps with color-coded markers (red=very likely, orange=likely, yellow=possible, blue=unlikely), heat map layer, ZIP boundary overlay, TMK parcel overlay (Hawaii), streets/satellite toggle, auto-search on pan/zoom

**Seller Motivation Score (0-100)** -- 12 scoring dimensions:
- High equity (15pts), Long ownership (15pts), Absentee owner (12pts), Distress signals (12pts)
- Multi-property portfolio (8pts), Transfer recency (8pts), Owner type (6pts: estate/bank/REO = highest)
- Tax assessment gap (5pts), Market trend (5pts), Tax trend (5pts), Appreciation (5pts), HOA burden (4pts)
- Scores normalized based on available data (missing data excluded from denominator)

**Score Levels**: Very Likely (70-100), Likely (50-69), Possible (30-49), Unlikely (0-29)

**Filters**: Min motivation score (default 40), absentee-only toggle, min ownership years, min equity %, property type, min parcels owned

**Property Detail**: Opens Opportunity Score tab first with scoring breakdown, AI outreach suggestions (letters, emails, SMS, talking points). Full Property Detail Modal with all tabs.

**Saved Searches**: Save search parameters with custom name for quick reload. 7-day global cache.

Data sources: RentCast (property data, AVM), Realie (equity, liens, distress), Hawaii GIS (TMK parcels).
Help the agent understand scoring, identify best prospects, and generate outreach materials.`,

  // Market Watch
  "market-watch": `The agent is on the MARKET WATCH page (a tab within MLS). This is a real-time market monitoring tool:
- **Map View**: Google Map with color-coded markers for each listing status
  - Green = Active, Yellow = Pending, Purple = Closed, Red = Expired/Withdrawn/Canceled
  - Blue = New (on market < 7 days), Purple outline = Back on Market
  - Click any marker to see listing details, hover for preview
- **Hot Sheet View**: Sortable table of all listings with columns for address, price, status, beds/baths, sqft, DOM, listing date
  - Toggle between Map and Hot Sheet views
  - Click any row to open full Property Detail Modal
- **Filters**:
  - Status: Active, Pending, Closed, New, Back on Market, Price Increase, Price Decrease
  - Timeframe: Last 24 hours, 7 days, 30 days, 90 days
  - Property type filter
- **Virtual statuses**: "New" (Active + OnMarketDate within 7 days), "Back on Market" (has BackOnMarketDate), "Price Increase"/"Price Decrease" (ListPrice vs OriginalListPrice)
- **Stats bar**: Shows count of listings by status
- Search by zip code -- enter a zip to see all market activity in that area
Help the agent monitor their market, identify new opportunities, and track price changes.`,

  // DOM Prospecting
  "dom-prospecting": `The agent is on the DOM PROSPECTING page. This identifies stale and expired listings for prospecting.
- **3 Tabs**: Search Results, Monitored Properties, Alerts (with unread count)
- **Tier System** (customizable multipliers vs. avg DOM per property type):
  - RED (2x+ avg DOM): Likely target -- very stale
  - ORANGE (1.5x avg): Possible target -- getting stale
  - CHARCOAL (1.15x avg): Monitor -- approaching threshold
  - GREEN (Expired/Withdrawn): Fair game for outreach -- no active listing agreement
- **Filters**: Multi-zip search, property type, price range, tier multiplier adjustment
- **Monitoring**: Track specific listings for tier/status changes over time
- **Alerts**: Real-time notifications on tier changes, status changes (active->expired), price changes
- **Saved Searches**: Persist search criteria for recurring monitoring
- Data from Trestle MLS (primary) with RentCast fallback
IMPORTANT: It is unethical (and often illegal) to solicit sellers whose property is actively listed with another agent. Only contact expired/withdrawn listings.`,

  // Farm & Watchdog
  "farm-watchdog": `The agent is on the FARM & WATCHDOG page. Geographic monitoring with automated alerts.

**Farm Areas**:
- Create by zip code, radius (lat/lng), or TMK prefix
- Set property filters: price range, bedrooms, property types, statuses
- Live MLS search across farm area with sortable results (DOM, price, price drop %)
- Multiple saved farm areas with individual configurations

**Watchdog Rules** (per farm area):
- DOM threshold triggers (e.g., 75+ days on market)
- Price drop monitoring with percentage tracking
- Status change tracking (new listings, expirations, withdrawals)
- Multi-channel notifications: push, email, SMS
- Alert management: unread/read/archived statuses
- Cron-based periodic checking via MLS Watchdog job

**Listing Display**: Address, price, original price, price drop %, beds/baths, sqft, DOM, agent/office info, media, virtual tour links
Help the agent set up effective farms and configure watchdog alerts.`,

  // Open Houses
  "open-houses": `The agent is on the OPEN HOUSES page. Complete open house lifecycle management.

**Creating an Open House**:
1. Choose event type: Sales, Rental Showing, or Both
2. **Import from MLS** (recommended): Search by MLS# or address, select from results (shows photo, beds/baths/sqft/price/status)
   - Auto-fills: address, beds, baths, sqft, price, description, key features, photos, lat/lng, MLS listing key
3. Set start/end date and time
4. Save as draft -- redirects to detail page

**Open House Detail Page**:
- Status selector: Draft -> Published -> Archived
- Edit property details (address, beds/baths/sqft, price, description, key features, photos)
- **Flyer Template Selection**: Modern, Modern Blue, Elegant Warm -- each with custom color swatches and image upload slots
- **QR Check-In Panel**: Displays QR code (320x320), copy link, print button. Check-in URL: /oh/{eventId}?token={secureToken}
- Property location map (Google Maps)

**Downloading the Flyer**:
- Generates branded PDF with: agent name, license#, phone, headshot, company logo, property photos, address, date/time, beds/baths/sqft/price, key features, map, QR code
- Template-specific layouts

**How It Works (QR Flow)**:
1. Agent prints flyer and displays at property entrance
2. Visitors scan QR code with phone camera
3. Opens registration page (secure token, 72-hour expiration)

**Registration Page Asks**:
- Name, email, phone (required), consent checkboxes (email + SMS)
- "Do you currently have a realtor?" (Yes -> show realtor name / No/Unsure -> show "Want agent to reach out?")
- If not represented: Timeline (0-3mo / 3-6mo / 6+mo / Just browsing), Financing (Pre-approved / Cash / Need lender / Not sure), Neighborhoods interested, Must-haves
- Submit -> auto-scored as lead (0-100 heat score) -> enters pipeline -> syncs to CRM

**Attendees & Scorecard**:
- Attendees list with export to CSV
- Scorecard metrics: Sign-ins captured, Contacted within 5 min (%), Represented by realtor (%), Looking for agent (%)
- Overall performance score (0-100): weighted formula of contact speed, agent interest, representation status
- Contact tracking: mark each lead as contacted (call/text/email) with timestamp

**OH Sync**: Two-way sync with MLS (pull upcoming events, push local events). Prevents duplicates via MLS key tracking.

Help the agent create events, import from MLS, customize flyers, understand the QR flow, and manage attendees.`,

  // Neighborhood Profiles
  "neighborhood-profiles": `The agent is on the NEIGHBORHOOD PROFILES page. AI-powered neighborhood profile generation with Census data enrichment.
- Input: neighborhood name, address, city, state, optional architectural style, nearby amenities, additional context
- **AI-Generated Sections**: Lifestyle & Vibe, Location Intelligence, Market Pulse (optional), Community Resources, Local Amenities
- **Census Data Pages** (auto-fetched at export): Housing Facts comparison table (ZIP/County/State/USA), People Facts, Education levels bar charts, Age distribution, Income brackets, Occupational categories, Commute time distribution, Economy
- **Market Trends**: Market type indicator (Seller's/Balanced/Buyer's), months of inventory, sold-to-list ratio, median DOM, median sold price
- **Schools**: Detailed school listing with enrollment, student-teacher ratio, grade range
- **Walkability Score**: Walk score display when available
- **Data Sources**: Census ACS 5-year (education, income, age, occupation, commute at 4 geographic levels), NCES schools, FBI crime, FEMA/USGS hazards, OSM POI, FRED sales trends, Hawaii GIS school zones
- **Export**: Multi-page PDF (10-12 pages, RPR-quality layout with cover page, bar charts, comparison tables, agent branding) and Word/DOCX
- **Fair Housing Compliance**: Built-in compliance check -- validates no discriminatory language
Help the agent generate neighborhood profiles for marketing materials and client presentations.`,

  // Calculators / Analyzers
  calculators: `The agent is on the CALCULATORS / ANALYZERS page. 12 financial analysis tools.

**Transaction Calculators:**
- **Mortgage Calculator**: PITI breakdown (principal, interest, taxes, insurance), PMI, HOA, full amortization schedule, Excel export
- **Buyer Cash-to-Close**: Down payment, closing costs, prepaids, escrow reserves, credits. PDF export.
- **Commission Split**: Agent net after brokerage splits, caps, transaction fees, team overrides. Split presets (50/50 to 100/0).
- **Seller Net Sheet**: Net proceeds after commissions, closing costs, mortgage payoff, concessions. PDF/Excel export.

**Investment Analyzers:**
- **Investment Property**: ROI, cap rate, IRR, cash-on-cash, 30-year projections, investment verdict (Strong Buy/Good/Moderate/Weak/Pass). MLS auto-import. Saves to DB.
- **Compare Properties**: Side-by-side comparison of saved properties ranked by cap rate, cash-on-cash, IRR, total ROI with composite score
- **Rental Property**: NOI, cap rate, cash-on-cash, DSCR, GRM, monthly cash flow, 30-year equity projection
- **STR Analyzer**: Short-term rental (Airbnb/VRBO) income -- Hawaii GET (4.712%) + TAT (10.25%) taxes, occupancy analysis, revenue projections, expense charts
- **Wholesale MAO**: Maximum Allowable Offer, 70% Rule check, investor margin analysis, offer range (low/mid/high)
- **House Flip Analyzer**: ARV, 70% Rule compliance, all-in costs, gross/net profit, ROI, annualized ROI. Saves to DB.
- **BRRRR Calculator**: Buy/Renovate/Refinance/Rent phases, equity capture at refi, cash-out analysis, infinite returns detection, 5-year projections. Saves to DB.
- **1031 Exchange**: IRS 45-day/180-day timeline tracking, tax savings, depreciation recapture, 3-property rule validation. Saves to DB.

**Shared Features**: MLS auto-import, Excel/PDF export, branded reports, email sharing, save/load analyses
Help the agent choose the right calculator and offer to send results to a contact.`,

  // Reports
  reports: `The agent is on the REPORTS page. Comprehensive analytics organized by category.

**Market Statistics** (Red): Oahu Annual Resales (40 years), Oahu Monthly, Maui Monthly, Hawaii Island Monthly, Kauai Monthly, Statewide Comparison, York & Adams Counties PA

**Solo Agent Reports** (Blue): Lead Source ROI (conversion rates & cost-per-closing), Pipeline Velocity (days per stage, bottlenecks), Tax & Savings Reserve (gross commission vs. tax/expense reserves), Speed-to-Lead Audit (avg response time)

**Small Teams Reports** (Purple): Agent Leaderboard (closings, calls, SMS, showings with radar chart), Lead Assignment Fairness (per-member conversion rates), Team Commission Split Tracker (house vs agent portions), Listing Inventory Health (active listings, DOM, price adjustment alerts)

**Brokerage Reports** (Green): Company Dollar (revenue after commissions/expenses), Compliance & Audit Log (signed docs, ID verifications, wire confirmations), Brokerage Market Share (rank vs Big Box brands by zip), Agent Retention Risk (AI flags for 40%+ activity drop)

**Assistants/Office Admin** (Orange): Pending Document Checklist (under-contract deals missing signatures)

All reports support PDF export, Excel export, and print-friendly format. Charts powered by Recharts.
Help the agent find the right report for their needs.`,

  // Agency Dashboard (Broker)
  broker: `The agent is on the AGENCY DASHBOARD. Comprehensive brokerage analytics with 6 tabs.
**Access**: Requires Brokerage Growth plan and broker/admin role

**Tab 1 - Overview**: Value cards (total agents, active leads, hot leads, open houses, closings MTD/YTD, pipeline value), monthly trend table (last 6 months), alerts (retention risk agents, leads not contacted 7+ days)

**Tab 2 - Agent Performance**: Sortable table per agent with: leads captured, hot leads, open houses, pipeline deals, closings, volume, speed-to-lead, conversion rate, MLS searches, reports generated, retention risk indicator. Sort by any column.

**Tab 3 - Lead Performance**: Lead funnel visualization (stage -> count -> conversion %), lead source breakdown (horizontal bar chart), speed-to-lead leaderboard (agents ranked by response time), lead aging warnings (3+, 7+, 14+ days not contacted)

**Tab 4 - Open House Performance**: Per-agent events, check-ins, avg check-ins per OH, hot leads, conversion rate

**Tab 5 - Financial**: Commission by agent (MTD), volume by agent, revenue trend table (6 months), pipeline value, totals

**Tab 6 - Activity & Risk**: Per-agent activity log (MLS searches, reports generated, last active), retention risk (40%+ activity drop flagged)

Data tracks: MLS searches, report generation, CMA generation, lead captures. All scoped to account via account_members.
Help the broker manage their team, identify coaching opportunities, and track business performance.`,

  // Team Management
  team: `The agent is on the TEAM MANAGEMENT page (Account Admins only).
- **Usage Overview**: 4 cards showing current/limit for Agents, Assistants, Site Admins, Offices with progress bars
- **Seat Limit Warnings**: Critical alert banner when limits reached, prompts upgrade
- **Team Members List**: Name, email, role (owner/admin/agent/assistant), office assignment, join date
- **Actions**: Invite member (by email), create member (direct), change role, assign office, remove member
- **Account Bootstrap**: Auto-creates team account on first visit (default: Brokerage Growth plan, 10 agents, 5 assistants, 1 admin)
Help the admin manage their team, invite members, and assign roles.`,

  // Admin
  admin: `The agent is on the ADMIN section (Platform Admins only).
**Dashboard**: Total users, active users, access requests, critical/warning alerts, open houses, leads, 24h errors
**Sales Opportunities**: Agents with critical alerts (exceeded plan limits) for upsell targeting
**Sections**: User Management (all platform users), Access Requests (approve/reject), Invitations (bulk send, track status), Subscription Management (per-agent plans), Plan Management (create/edit plans, feature matrix), Feature Management (toggle features per plan), API Usage Report (cost tracking), Error Logs (last 1000 entries with stack traces)
**User MLS Integrations**: Per-user Trestle credentials (OAuth2/Basic auth), Bridge Interactive (coming), IDX Broker (coming)
Help the admin manage the platform, users, plans, and integrations.`,

  // Integrations
  integrations: `The agent is on the INTEGRATIONS page.

**Primary Integrations**:
- **CRM**: Contacts, pipeline, email/SMS automation. Setup: Private Integration API Key + Location ID + Pipeline selection + New Lead Stage mapping.
- **Trestle (HiCentral MLS)**: MLS listings, property data, comps, market watch, OH sync. Setup: Trestle API credentials (OAuth2 or Basic Auth).

**Calendar Integrations** (Two-Way Sync):
- **Google Calendar**: OAuth connection, bidirectional event sync
- **Microsoft/Outlook Calendar**: OAuth connection, bidirectional event sync

**Hoku Web Assistant**:
- **Embeddable chat widget** for agent websites. Copy embed code or direct link from this page.
- Pre-qualifies visitors (buyer/seller), captures leads, searches MLS, emails properties, creates CRM contacts with conversation notes.
- Uses the agent's Trestle MLS connection for property search (same as App Hoku). IDX Broker as optional fallback.
- Optional IDX Broker API key for additional MLS source.

**Other**:
- **Social Channels**: Multi-channel lead response from social platforms
- **Google Maps**: Geocoding, maps, location features (platform-wide, no user setup)

**Admin-Only**: Stripe (payments), PayPal (payments), Realie.ai (property intelligence), Federal Data (FRED, HUD, USPS, Census, BLS)

**Free Public APIs** (no setup needed): Honolulu County OWNINFO, Hawaii State GIS, FEMA NRI, FBI CDE, NCES Schools, Census ACS, FRED, BLS, HUD

Each integration has a Test Connection button. Status shows Connected/Disconnected with last sync timestamp.
Help the agent connect their integrations and troubleshoot connection issues.`,

  // Billing
  billing: `The agent is on the BILLING page.
- **Current Subscription**: Plan name, status badge (active/cancelled/past_due/suspended), monthly price, billing cycle, plan limits (agents, assistants, admins, offices), next billing date
- **Summary Stats**: Total paid (lifetime), unpaid invoices, next payment amount/date
- **Recent Invoices**: Number, description, due date, status, amount, paid date
- **Payment History**: Date, invoice reference, method, amount, status
- **Upgrade**: Change plan, compare features
- **Payment Methods**: Manage via Stripe or PayPal
Help the agent manage their subscription, view invoices, and upgrade their plan.`,

  // Settings
  settings: `The agent is on the SETTINGS page.
**Profile**: Display name, email, license number, agency name, phone, locations served, headshot URL, company logo URL, timezone, landing page preference (Dashboard or Open Houses)
**Auto-Response**: AI-powered 24/7 auto-responses for SMS and email lead follow-up
**Escalation Rules**: Define rules for automatic lead escalation based on intent signals, sentiment analysis, engagement patterns
**Security**: MFA setup (authenticator app), password change, active sessions
Help the agent configure their profile, notifications, and security settings.`,
};

// ── General app knowledge (always included) ──

export const APP_KNOWLEDGE = `
## Real Estate Genie — Platform Knowledge

### Data Sources (priority order)
1. **MLS (Trestle/HiCentral)** — Active/Pending/Closed/Expired/Withdrawn/Canceled listings, actual sale prices, agent info, photos, DOM. Most accurate for Hawaii.
2. **Realie** — AVM with confidence range (modelValue/min/max), equity, LTV, liens, parcel geometry, deed transfers. Best for property valuation.
3. **RentCast** — Property records, owner info, absentee status, rental AVM, market stats, comps fallback. Best for owner intelligence.
4. **Honolulu County OWNINFO** — Current deed owner from county records (green "County Records" badge). Prioritized over Realie/RentCast for ownership.
5. **Hawaii State GIS** — Flood zones, tsunami zones, fire risk, school attendance boundaries, opportunity zones, parcel boundaries (TMK). Free public data.
6. **FEMA NRI** — County-level hazard risk ratings (flood, hurricane, wildfire, earthquake, tornado, wind, volcanic, drought, tsunami, landslide, lightning, coastal flood).
7. **FBI CDE** — Crime statistics by county (violent crime, property crime, arson).
8. **Census ACS / FRED / BLS / HUD** — Demographics, mortgage rates, employment, fair market rents.
9. **NCES** — School data: enrollment, student-teacher ratio, free/reduced lunch %, Title I, grade range.

### AVM Reliability
- AVM is compared to county assessment and recent sale price (within 2 years)
- If AVM differs by more than 30% from either reference, it is suppressed as unreliable
- When unreliable: county assessment is shown instead, with an amber warning
- All downstream calculations (equity, LTV) use the best available value: reliable AVM > county assessment > appraised value

### Hawaii-Specific Knowledge
- Hawaii is a **non-disclosure state** — actual sale prices are NOT in public records. Only MLS has closed prices.
- **Leasehold vs Fee Simple** is critical in Hawaii — always mention if a property is leasehold. Leasehold means the land is leased (common in condos).
- **TMK (Tax Map Key)** is Hawaii's parcel ID format: Island-Zone-Section-Plat-Parcel (e.g., 1-4-2-018-077)
- Common hazards: Tsunami evacuation zones, sea level rise, lava flow zones (Big Island), cesspool priority areas, Special Management Areas (coastal)
- Oahu zip codes: 96701-96898 (many 968xx are PO Box/admin zips)
- **IMPORTANT**: Any address ending in ", HI" is in Hawaii. Common Hawaii cities/towns on Oahu include:
  Honolulu, Kailua, Kaneohe, Kapolei, Ewa Beach, Waipahu, Pearl City, Aiea, Mililani, Wahiawa, Haleiwa, Laie, Waimanalo, Hawaii Kai, Kahala, Waikiki, Manoa, Makiki, Kaimuki, Kapahulu, Moiliili, Palolo, Nuuanu, Pauoa, Liliha, Kalihi, Salt Lake, Foster Village, Red Hill, Iroquois Point, Ewa Villages, Kunia, Schofield, Wheeler, Waianae, Makaha, Nanakuli, Kaena
  On other islands: Hilo, Kona (Kailua-Kona), Waimea (Kamuela), Captain Cook, Pahoa, Volcano (Big Island); Kahului, Kihei, Lahaina, Wailuku, Haiku, Paia, Kula, Makawao (Maui); Lihue, Kapaa, Princeville, Poipu, Koloa, Hanapepe, Waimea (Kauai)
- When you see "Waipahu, HI" or "Kapolei, HI" or any city followed by "HI" — this is Hawaii, NOT a typo or abbreviation for something else.

### Lead Scoring (Heat Score 0-100)
Calculated automatically at open house check-in:
- Contact info (30pts): email (10) + phone (10) + email consent (5) + SMS consent (5)
- Representation (20pts): not represented (20), unsure (10), has agent (5)
- Agent reach out opt-in (15pts)
- Timeline (20pts): 0-3 months (20), 3-6 months (15), 6+ months (10), just browsing (5)
- Financing (15pts): pre-approved/cash (15), needs lender (10), not sure (5)
- Specificity (10pts): neighborhoods (5) + must-haves (5)
- Multiple visits to same property = boosted to 100 (RED HOT)
Classifications: Hot (80+) red, Warm (50-79) orange, Cold (<50) blue, DNC gray (has agent)

### Seller Motivation Scoring (0-100)
12-dimension rule-based algorithm. Scores normalized based on available data.
- High equity (15pts): LTV < 30% = full points
- Long ownership (15pts): 15+ years = full points
- Absentee owner (12pts): out-of-state address, P.O. Box, non-owner-occupied
- Distress signals (12pts): foreclosure, multiple liens, lien balance near property value
- Multi-property portfolio (8pts): 10+ properties
- Transfer recency (8pts): no transfer in 15+ years
- Owner type (6pts): estate/bank/REO = highest, trust/corporate = moderate
- Tax assessment gap (5pts), Market trend (5pts), Tax trend (5pts), Appreciation (5pts), HOA burden (4pts)
Levels: Very Likely (70-100), Likely (50-69), Possible (30-49), Unlikely (0-29)

### CMA (Comparative Market Analysis)
- Agent inputs a subject property (address, beds, baths, sqft)
- System pulls comparable sales from MLS (Active, Pending, Closed within same area, last 6 months)
- If MLS has limited data, automatically falls back to RentCast and Realie AVM
- Calculates: median/avg list price, close price, price per sqft, avg DOM, list-to-sale ratio
- Generates suggested list price range (25th-75th percentile of comps)
- Each comp scored for correlation to subject (beds, baths, sqft, year built, property type)
- Reports can be saved and retrieved later
- Hoku can run a CMA for any property without the agent needing to provide details she already has

### Lead Matching
- Automatically matches active MLS listings to each lead based on their criteria
- Scoring (0-100): Location (0-40), Must-haves (0-30), Timeline urgency (0-15), Financing readiness (0-15)
- Returns top 5 matches per lead with match reasons
- Matches persist in database with status tracking (new/sent/viewed/dismissed)

### DOM Prospecting Ethics
- **Expired/Withdrawn listings**: OK to contact — seller is unrepresented
- **Active listings over DOM threshold**: MONITOR ONLY — it is unethical (and often illegal) to solicit sellers whose property is actively listed with another agent
- Tiers: Red (2x+ avg DOM), Orange (1.5x), Charcoal (1.15x)

### Open House QR Flow
1. Agent creates open house (import from MLS by MLS# or address, or create manually)
2. Choose template (Modern, Modern Blue, Elegant Warm) and upload property photos
3. System generates branded PDF flyer with QR code, agent info, property details, map
4. Agent downloads flyer and prints it -- displays at property entrance
5. Visitors scan QR code with phone camera (secure token, 72-hour expiration)
6. Registration form captures: name, email, phone, consent, representation status, timeline, financing, neighborhoods, must-haves
7. Lead auto-scored (0-100 heat score), enters pipeline, syncs to CRM if connected
8. Agent views attendees and scorecard (contact speed, performance score)

### User Roles
- Agent: Core features (Dashboard, MLS, Pipeline, Open Houses, Leads, Contacts, Analyzers, Reports, Neighborhoods, Integrations, Billing, Settings)
- Team Lead: Agent + Team Dashboard for monitoring team activity
- Admin (Account): Agent + Team management, invite/remove members, account settings
- Admin (Platform): Full access including Admin panel, platform-wide integrations, user management

### Shareable Property Links
- Agent clicks "Get Shareable Link" on any property
- Generates a public URL at realestategenie.app/shared/report/[id]
- Shows: property overview, photos, tax assessment, hazards, mortgage calculator
- Does NOT show: ownership info (privacy), internal scoring
- Link expires after 30 days
`;

// ── Build the full context for a given page ──

export function buildPageContext(pathname: string): string {
  // Match page path to context key
  const segments = pathname.replace(/^\/app\//, "").split("/");
  const page = segments[0] || "dashboard";

  // Check for specific sub-pages first
  if (page === "seller-map" && segments[1] === "dom-prospecting") {
    return PAGE_CONTEXT["dom-prospecting"] || "";
  }
  if ((page === "mls-listings" || page === "mls") && segments[1] === "market-watch") {
    return PAGE_CONTEXT["market-watch"] || "";
  }

  // Page-level routing
  const routeMap: Record<string, string> = {
    dashboard: "dashboard",
    calendar: "calendar",
    pipeline: "pipeline",
    tasks: "tasks",
    leads: "leads",
    contacts: "contacts",
    "open-houses": "open-houses",
    "mls-listings": "mls-listings",
    mls: "mls-listings",
    "market-watch": "market-watch",
    "property-data": "property-data",
    prospecting: "prospecting",
    "seller-map": "seller-map",
    "farm-watchdog": "farm-watchdog",
    farm: "farm-watchdog",
    "neighborhood-profiles": "neighborhood-profiles",
    analyzers: "calculators",
    calculators: "calculators",
    reports: "reports",
    broker: "broker",
    "team-lead": "broker",
    team: "team",
    admin: "admin",
    integrations: "integrations",
    billing: "billing",
    settings: "settings",
    security: "settings",
    "property-detail": "property-data",
    templates: "open-houses",
  };

  const key = routeMap[page];
  return key ? PAGE_CONTEXT[key] || "" : PAGE_CONTEXT[page] || "";
}

// ── Property explanation helper ──

export function buildPropertyContext(property: any): string {
  if (!property) return "";

  const parts: string[] = [
    "The agent is currently viewing a PROPERTY DETAIL MODAL. Here is everything you know about this property:",
  ];

  // Basic info
  const addr = property.address?.oneLine || property.address || property.UnparsedAddress;
  if (addr) parts.push(`Address: ${addr}`);

  const city = property.city || property.address?.locality;
  const state = property.state || property.address?.countrySubd;
  const zip = property.zip || property.address?.postal1;
  if (city || zip) parts.push(`Location: ${[city, state, zip].filter(Boolean).join(", ")}`);

  // Pricing
  const listPrice = property.listPrice || property.ListPrice;
  const avmValue = property.avmValue || property.avm?.amount?.value;
  const avmLow = property.avmLow || property.avm?.amount?.low;
  const avmHigh = property.avmHigh || property.avm?.amount?.high;
  if (listPrice) parts.push(`List Price: $${Number(listPrice).toLocaleString()}`);
  if (avmValue) parts.push(`AVM (Estimated Value): $${Number(avmValue).toLocaleString()}`);
  if (avmLow && avmHigh)
    parts.push(`AVM Range: $${Number(avmLow).toLocaleString()} - $${Number(avmHigh).toLocaleString()}`);

  // Physical
  const beds = property.beds || property.building?.rooms?.beds || property.BedroomsTotal;
  const baths = property.baths || property.building?.rooms?.bathsFull || property.BathroomsTotalInteger;
  const sqft = property.sqft || property.building?.size?.livingSize || property.LivingArea;
  if (beds || baths || sqft)
    parts.push(`Size: ${beds || "?"}bd / ${baths || "?"}ba / ${sqft ? sqft.toLocaleString() + " sqft" : "?"}`);

  const yearBuilt = property.yearBuilt || property.building?.summary?.yearBuilt || property.YearBuilt;
  if (yearBuilt) parts.push(`Year Built: ${yearBuilt} (${new Date().getFullYear() - yearBuilt} years old)`);

  const propType = property.propertyType || property.summary?.propertyType;
  if (propType) parts.push(`Property Type: ${propType}`);

  const lotSize = property.lotSize || property.lot?.lotSize1;
  if (lotSize) parts.push(`Lot Size: ${Number(lotSize).toLocaleString()} sqft`);

  // Financial
  const lastSalePrice = property.lastSalePrice || property.sale?.amount?.saleAmt;
  const lastSaleDate = property.lastSaleDate || property.sale?.amount?.saleTransDate;
  if (lastSalePrice)
    parts.push(`Last Sale: $${Number(lastSalePrice).toLocaleString()}${lastSaleDate ? ` on ${lastSaleDate}` : ""}`);

  const equity = property.estimatedEquity || property.homeEquity?.equity;
  if (equity != null) parts.push(`Estimated Equity: $${Number(equity).toLocaleString()}`);

  const ltv = property.ltv || property.homeEquity?.ltv;
  if (ltv != null) parts.push(`Loan-to-Value: ${Number(ltv).toFixed(1)}%`);

  const taxAmt = property.taxAmount || property.assessment?.tax?.taxAmt;
  if (taxAmt) parts.push(`Annual Tax: $${Number(taxAmt).toLocaleString()}`);

  const hoaFee = property.hoaFee || property.hoa?.fee;
  if (hoaFee) parts.push(`HOA: $${Number(hoaFee).toLocaleString()}/month`);

  // Ownership
  const owner = property.owner1 || property.owner?.owner1?.fullName;
  if (owner) parts.push(`Owner: ${owner}`);

  const owner2 = property.owner2 || property.owner?.owner2?.fullName;
  if (owner2) parts.push(`Co-Owner: ${owner2}`);

  const absentee = property.absenteeOwner || property.owner?.absenteeOwnerStatus;
  if (absentee === "A" || absentee === "Yes") parts.push("Absentee Owner: YES - owner does not live at the property");

  const occupied = property.ownerOccupied || property.owner?.ownerOccupied;
  if (occupied === "N" || occupied === "No") parts.push("Owner Occupied: No");

  const corporate = property.corporateOwner || property.owner?.corporateIndicator;
  if (corporate === "Y" || corporate === "Yes") parts.push("Corporate/Trust Owner: YES");

  const mailing = property.mailingAddress || property.owner?.mailingAddressOneLine;
  if (mailing) parts.push(`Mailing Address: ${mailing}`);

  // MLS Listing info
  const dom = property.daysOnMarket || property.DaysOnMarket;
  if (dom != null) parts.push(`Days on Market: ${dom}`);

  const status = property.listingStatus || property.StandardStatus;
  if (status) parts.push(`Listing Status: ${status}`);

  const mlsNum = property.mlsNumber || property.ListingId;
  if (mlsNum) parts.push(`MLS #: ${mlsNum}`);

  const agent = property.listingAgent || property.ListAgentFullName;
  if (agent) parts.push(`Listing Agent: ${agent}`);

  const office = property.listingOffice || property.ListOfficeName;
  if (office) parts.push(`Office: ${office}`);

  const tenure = property.ownershipType || property.OwnershipType;
  if (tenure)
    parts.push(
      `Land Tenure: ${tenure}${String(tenure).toLowerCase().includes("lease") ? " WARNING: LEASEHOLD - the land is not owned, only leased. Monthly lease rent may apply." : ""}`,
    );

  // Description excerpt
  const desc = property.description || property.PublicRemarks;
  if (desc) parts.push(`Description: ${String(desc).substring(0, 200)}...`);

  // Rental / Investment
  const rentalEst = property.rentalEstimate;
  if (rentalEst) parts.push(`\nRental Estimate: $${Number(rentalEst).toLocaleString()}/month`);
  const rentalLow = property.rentalLow;
  const rentalHigh = property.rentalHigh;
  if (rentalLow && rentalHigh)
    parts.push(`Rental Range: $${Number(rentalLow).toLocaleString()} - $${Number(rentalHigh).toLocaleString()}/month`);
  if (property.grossYield) parts.push(`Gross Yield: ${property.grossYield}`);
  if (property.capRate) parts.push(`Cap Rate: ${property.capRate}`);

  // Loan details
  if (property.loanBalance) parts.push(`Est. Loan Balance: $${Number(property.loanBalance).toLocaleString()}`);
  if (property.loanCount) parts.push(`Active Loans: ${property.loanCount}`);
  if (property.monthlyPayment)
    parts.push(`Est. Monthly Mortgage: $${Number(property.monthlyPayment).toLocaleString()}`);

  // Tax assessment detail
  if (property.assessedTotal) parts.push(`Assessed Value: $${Number(property.assessedTotal).toLocaleString()}`);
  if (property.assessedLand) parts.push(`Land Value: $${Number(property.assessedLand).toLocaleString()}`);
  if (property.marketValue) parts.push(`Market Value (County): $${Number(property.marketValue).toLocaleString()}`);

  // Building details
  if (property.constructionType) parts.push(`Construction: ${property.constructionType}`);
  if (property.roofType) parts.push(`Roof: ${property.roofType}`);
  if (property.heatingType) parts.push(`Heating: ${property.heatingType}`);
  if (property.coolingType) parts.push(`Cooling: ${property.coolingType}`);
  if (property.parking) parts.push(`Parking: ${property.parking}`);
  if (property.pool) parts.push(`Pool: ${property.pool}`);
  if (property.stories) parts.push(`Stories: ${property.stories}`);

  // Sale history
  if (property.saleHistory?.length) {
    parts.push(`\nSale History (${property.saleHistory.length} transactions):`);
    property.saleHistory.forEach((s: any) => {
      parts.push(
        `  ${s.date || "?"}: ${s.amount ? "$" + Number(s.amount).toLocaleString() : "Price not disclosed"} (${s.source || "?"})`,
      );
    });
  }

  // Comparable sales
  if (property.comparableSales?.length) {
    parts.push(`\nComparable Sales (${property.comparableSales.length} comps):`);
    property.comparableSales.forEach((c: any) => {
      parts.push(
        `  ${c.address || "?"}: ${c.price ? "$" + Number(c.price).toLocaleString() : "?"} | ${c.beds || "?"}bd/${c.baths || "?"}ba | ${c.sqft ? c.sqft.toLocaleString() + " sqft" : "?"} | Match: ${c.correlation ? Math.round(c.correlation <= 1 ? c.correlation * 100 : c.correlation) + "%" : "?"}`,
      );
    });
  }

  // Hazards
  if (property.hazards?.length) {
    parts.push(`\nEnvironmental Hazards: ${property.hazards.join(", ")}`);
  }

  // Market stats
  if (property.marketStats) {
    const ms = property.marketStats;
    parts.push(`\nArea Market Statistics:`);
    if (ms.medianPrice) parts.push(`  Median Sale Price: $${Number(ms.medianPrice).toLocaleString()}`);
    if (ms.avgDOM) parts.push(`  Avg Days on Market: ${ms.avgDOM}`);
    if (ms.totalListings) parts.push(`  Active Listings: ${ms.totalListings}`);
    if (ms.pricePerSqft) parts.push(`  Avg Price/Sqft: $${ms.pricePerSqft}`);
    if (ms.medianRent) parts.push(`  Median Rent: $${Number(ms.medianRent).toLocaleString()}/mo`);
  }

  // Neighborhood
  if (property.neighborhood) {
    const n = property.neighborhood;
    parts.push(`\nNeighborhood:`);
    if (n.medianIncome) parts.push(`  Median Income: $${Number(n.medianIncome).toLocaleString()}`);
    if (n.medianAge) parts.push(`  Median Age: ${n.medianAge}`);
    if (n.ownerOccupiedPct) parts.push(`  Owner-Occupied: ${n.ownerOccupiedPct}%`);
    if (n.walkScore) parts.push(`  Walk Score: ${n.walkScore}`);
  }

  // Seller score (from seller map)
  const sellerScore = property.sellerScore;
  const sellerLevel = property.sellerLevel;
  if (sellerScore != null) {
    parts.push(`\nSELLER MOTIVATION SCORE: ${sellerScore}% (${sellerLevel})`);
    if (property.sellerFactors?.length) {
      parts.push("Score breakdown:");
      property.sellerFactors.forEach((f: string) => parts.push(`  ${f}`));
    }
  }

  // Current tab
  const tab = property.activeTab;
  if (tab) parts.push(`\nThe agent is currently viewing the "${tab}" tab.`);

  // Page context
  const pageCtx = property.pageContext;

  // Instructions for Hoku
  parts.push(`
INSTRUCTIONS: You are looking at the same property the agent is. You have ALL the data from ALL the tabs. When they ask questions:
- If they say "explain this" or "what am I looking at" or "tell me about this property" - describe the property and its key characteristics in plain language. Start with the address, type, size, then move to value, owner, and any notable factors.
- If they ask about value - explain the AVM, how it compares to list price, and what the confidence range means
- If they ask about the owner - explain what you know and whether this looks like a good prospecting target
- If they ask about the FINANCIAL picture - include ALL financial data you have: AVM, confidence range, assessed value, tax amount, equity, LTV, loan balance, liens, HOA. Also include LOCAL MARKET STATS if available: median price, avg DOM, active listings, new listings, price trend, median rent, price per sqft.
- If they ask about AREA INTEL - share ALL the data: vacancy status, HUD fair market rents by bedroom count, census demographics (population, median age, income, home value, rent, housing units, owner vs renter occupied, vacant units), and recent FEMA disasters if any.
- If they ask about COMPS or comparable properties - do NOT ask for zip code, property type, or price range. You ALREADY have this property's address, zip, type, beds, baths, and sqft. Execute the comp search immediately using the property's data.
- If they ask about INVESTMENT potential - share rental AVM, cap rate, cash-on-cash return, annual rent, monthly mortgage estimate.
- If they ask about a specific tab - give ALL the details from that tab, not a summary.
- If they ask "is this a good deal?" - compare list price to AVM, look at equity, DOM, and comparable sales
- Suggest relevant actions: "Want me to run a mortgage calculator?", "Should I pull comps?", "Want to generate a PDF report?"
- If it's leasehold, ALWAYS mention that - it's critical in Hawaii
- Be specific to THIS property. Use the actual numbers from your context, don't be generic. Do NOT say "I don't have that data" if the data is in your context above.
- IMPORTANT: When the agent asks you to do something with this property (pull comps, run calculator, etc.), use the property's address, zip, beds, baths, sqft, and AVM directly. Do NOT ask for information you already have.
${sellerScore != null ? `- This is a SELLER MAP prospect. Explain the seller motivation score and why this owner might be ready to sell based on the score factors. A score of 70+ is a strong prospect.${property.absenteeOwner === "A" ? " This is an ABSENTEE OWNER — they don't live at the property, which is a strong seller signal." : ""}` : ""}
${pageCtx === "seller-map" ? "- The agent is on the SELLER MAP. Focus on prospecting insights — who is likely to sell and why. Suggest outreach strategies." : ""}`);

  return parts.join("\n");
}
