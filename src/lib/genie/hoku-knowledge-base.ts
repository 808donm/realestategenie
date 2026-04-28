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
  pipeline: `The agent is on the PIPELINE page. Visual Kanban-style board for managing deal flow from initial lead to closing.

### How do I open the Pipeline?
1. Sidebar → click **Pipeline**.

### How do I move a deal between stages?
1. Click and hold the deal card.
2. Drag to the target stage column.
3. Release.

### How do I view a deal's details?
1. Click (don't drag) the deal card.
2. The detail modal opens with contact info, notes, conversation history, and action buttons.

### How do I draft an email to a deal contact?
1. Open the deal modal.
2. Click **Email** action button.
3. Pick a template or start fresh.
4. Edit subject and body, click **Send**.

### How do I advance a deal to the next stage?
1. Open the deal modal.
2. Click **Next Stage** in the top-right.
3. (Or drag the card on the board.)

### How do I mark a deal as lost?
1. Open the deal modal.
2. Click **⋯** → **Mark as Lost**.
3. Pick loss reason and confirm.

### How do I switch between multiple pipelines?
1. Click the **Pipeline** dropdown at the top of the board.
2. Select Listings, Buyers, Investors, or any custom pipeline.

**11 default stages**: New Lead · Initial Contact · Qualification · Initial Consultation · Property Search/Listing Prep · Open Houses & Tours · Offer & Negotiation · Under Contract/Escrow · Closing Coordination · Closed & Follow-up · Review Request

CRM sync: when connected, pipeline stages map to CRM stages and auto-advance on email/SMS. Local pipeline is available for agents without CRM.

**Hoku-equivalent queries**:
- "Move [deal] to Offer & Negotiation"
- "Show me deals in Under Contract"
- "What's in stage 7 of my Buyers pipeline?"
- "Mark [deal] as lost — reason: timing"`,

  // Tasks
  tasks: `The agent is on the TASKS page. Full task management with priorities, due dates, types, recurrence, and entity linking.

### How do I open Tasks?
1. Sidebar → click **Tasks**.

### How do I create a task?
1. Click **+ New Task**.
2. Enter Title (required).
3. (Optional) Description, Priority (Urgent/High/Medium/Low), due date/time, Type (General/Follow-Up/Call/Email/Meeting/Showing/Document/Closing), Recurrence (Daily/Weekly/Bi-weekly/Monthly/Quarterly).
4. (Optional) Link to Lead, Contact, Open House, or Transaction.
5. Click **Save**.

### How do I see overdue or upcoming tasks?
1. Click a tab: **All**, **Overdue**, **Today**, **Upcoming**, **Completed**.

### How do I mark a task complete?
1. Click the checkbox on the row.

### How do I snooze a task?
1. Click **Snooze** icon on the row.
2. Choose Tomorrow / Next Week / 2 Weeks / Custom.

### How do I bulk-complete or bulk-delete?
1. Check multiple task rows.
2. Use the bulk-action bar that appears (Complete / Snooze / Delete).

### How do I export tasks?
1. Set the tab filter.
2. Click **Export** in the top-right.
3. Choose CSV or PDF.

Recurring tasks auto-create new instances on the recurrence date (iCalendar RRULE format).

**Hoku-equivalent queries**:
- "Add a task to call [contact] tomorrow at 10am"
- "What's overdue?"
- "Snooze [task] for a week"
- "Complete all tasks linked to [deal]"
- "Show me today's tasks"`,

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
  leads: `The agent is on the LEADS page. Manages prospects from open house QR check-ins, lead-source webhooks, and other intake channels.

### How do I open the Leads page?
1. Sidebar → click **Leads**.

### How do I view Hot, Warm, Cold, or DNC leads?
1. Open Leads.
2. Click the appropriate tab: **Hot** (80+), **Warm** (50-79), **Cold** (<50), **DNC** (already has an agent).

### How do I contact a lead from the list?
1. Find the lead row.
2. Click Phone / Message / Email icon.
3. Activity logs to the lead's history automatically.

### How do I view a lead's full detail?
1. Click the lead's name.
2. The detail panel shows contact info, source, heat score breakdown, property of interest, timeline, financing, neighborhoods, must-haves, conversation history.

### How do I export the lead list?
1. Set the tab filter.
2. Click **Export** in the top-right.
3. Choose **PDF** or **XLSX**.

### How do I read the analytics charts?
The top of the page shows: Leads by Source, Leads by Event, Heat Score Distribution, Pipeline Stage Breakdown, Leads Over Time (weekly), Buyer Readiness.

**Heat scoring** (auto-applied at check-in, 0-100):
- Contact Info (30 pts) — Email/Phone/Consents
- Representation (20 pts) — No agent = highest
- Agent Reach Out (15 pts) — Opted-in
- Timeline (20 pts) — 0-3mo = highest
- Financing (15 pts) — Pre-approved/Cash = highest
- Specificity (10 pts) — Neighborhoods + Must-haves
- Multiple visits to same property → 100 (RED HOT)

DNC: leads who said they have a realtor — do not solicit.

Lead Matches: auto-matches active MLS listings to each lead's criteria. Top 5 matches per lead, scored 0-100 (location 40 + must-haves 30 + timeline 15 + financing 15).

**Hoku-equivalent queries**:
- "Show me my hot leads"
- "Who came to my open house yesterday?"
- "What's the heat score on [lead name]?"
- "Export this week's leads to PDF"
- "Show matched properties for [lead]"`,

  // MLS Listings
  "mls-listings": `The agent is on the MLS page. This has 9 tabs powered by the agent's connected MLS provider.

**Tab 1 - Search & Listings**: live MLS search across every status with 27+ filters, color-coded urgency badges, and per-listing AI tools.

### How do I open MLS Search?
1. In the left sidebar, click **MLS**.
2. The page opens on the **Search & Listings** tab by default.

### How do I search by address, ZIP, or city?
1. Open MLS Search.
2. In the **Search** field, type any of: street address, ZIP code, city name, or building/condo name.
3. Press Enter or click **Search**.

### How do I search by neighborhood / subdivision?
1. Open MLS Search.
2. In the **Filters** sidebar, find the **Neighborhood / Subdivision** field.
3. Type the neighborhood or subdivision name.
4. Click **Apply Filters**.

### How do I filter by listing status?
1. Open MLS Search.
2. In the **Status** filter, check Active / Pending / Closed / Expired / Withdrawn / Canceled.
3. Click **Apply Filters**.

### How do I filter by property type, price, beds, or DOM?
1. Open MLS Search.
2. In the **Filters** sidebar, set Property Type, Price Range, min Beds/Baths, and minimum Days on Market.
3. Toggle **Rentals** on if you want rental listings included.
4. Click **Apply Filters**.

### How do I open a listing's full detail?
1. Click a listing card.
2. The Property Detail Modal opens with tabs: Overview, Photos, AVM, Equity, Sales History, Comps, Hazards, Schools, Crime, Neighborhood, Owner, Reports, Hoku.
3. Close with the **X** or Esc.

**Listing-card badges** to surface to the agent: blue **New** (<7 days), purple **Back on Market**, green **Price Down**, red **Price Up**.

### How do I see only my own listings?
1. Open MLS Search.
2. Click the **My Listings** sub-tab.

### How do I generate an AI listing description?
1. Open My Listings or any listing modal.
2. Click **AI Description**.
3. Choose a tone: Professional, Conversational, Luxury, Quick & Punchy, or Detail-Heavy.
4. Click **Generate**.
5. Click **Regenerate** to try variants, **Copy** to use. Drafts are Fair Housing-checked.

### How do I generate AI social media content?
1. Open a listing modal.
2. Click **AI Social**.
3. Pick a platform: Instagram, Facebook, LinkedIn, or TikTok.
4. Click **Generate**.
5. Output includes caption, hashtags, and (for video) a script outline. **Copy** each section.

**Hoku-equivalent queries**:
- "Search MLS for 3-bed homes under [price] in [city]"
- "Show me Active listings on [street]"
- "Pull stale listings (DOM > 90) in [ZIP]"
- "Generate a Professional description for my listing on [street]"
- "Write an Instagram post for [MLS#]"

**Tab 2 - Market Monitor**: Map + Hot Sheet for market monitoring (see market-watch context)

**Tab 3 - Market Snapshot**: Real-time market statistics computed from MLS data. Market Temperature gauge (buyer's vs seller's market), Quick Stats (closed sales, pending, active, months of inventory, DOM, sale-to-list ratio) with 90-day trend arrows, and 12-month bar charts for average sales price and sales activity. County selector. Cached 24 hours.

**Tab 4 - Market Analytics**: County-level market statistics (see market-analytics context). Also accessible from the sidebar.

**Tab 5 - CMA**: Comparative Market Analysis with MLS comps, public-records/AVM fallback, correlation scoring, suggested price range, saved CMAs, and PDF report generation.

### How do I open the CMA tab?
1. Click **MLS** in the sidebar.
2. Click the **CMA** tab.

### How do I run a CMA from scratch?
1. Open the CMA tab.
2. Fill in the **Subject Property** form: Address, City, Postal Code, List Price, Beds, Baths, Living Area, Year Built, Property Type.
3. Click **Run CMA**.
4. Review comp counts, suggested price range, and the Comps table with correlation scores.

### How do I run a CMA for an existing MLS listing?
1. Open MLS Search and click a listing card to open its modal.
2. Click the **Comps** tab inside the modal.
3. Click **Run CMA**.
4. The form pre-fills from the listing — adjust if needed, then run.

### How do I adjust comp filters?
1. In CMA results, find the **Filters** panel above the Comps table.
2. Adjust comp window, distance radius, sqft band, status checkboxes.
3. Click **Re-run**.

### How do I save and generate a CMA Report?
1. Click **Save** in the top-right of CMA results to save with a name.
2. Saved CMAs appear at the top of the CMA tab for one-click reload.
3. Click **Generate Report** to produce a branded PDF (cover map, subject details, comp table with adjustments, suggested price range).

**Hoku-equivalent CMA queries**:
- "Run a CMA for [address]"
- "Closed comps within half a mile of [address]"
- "Suggested price for [address]"
- "Generate a CMA Report for [MLS#]"

**Tab 6 - Lead Matches**: Auto-matches pipeline leads to active MLS listings (scored 0-100)

**Tab 7 - OH Sync**: Two-way open house sync between MLS and local database

**Tab 8 - Investment**: Multi-unit property analysis with per-unit rent breakdown, auto-fills BRRRR and Flip analyzers

**Tab 9 - Hazard Map**: Shows flood zones (FEMA DFIRM) plus locale-specific hazards (Hawaii: tsunami evacuation zones, sea level rise exposure) as colored polygon overlays on Google Maps. Agents can toggle layers on/off and search by address or ZIP. Blue = flood zones, Cyan = tsunami, Teal = sea level rise. Hawaii uses State GIS data; other markets use FEMA NFHL. Deep link from Property Detail Modal.

Help the agent search listings, run comps, match leads, analyze investments, explore hazard zones, and review market statistics.`,

  // Property Data / Prospecting
  "property-data": `The agent is on the PROPERTY INTEL page. This has 2 tabs: Property Search and Prospecting.

### How do I open Property Intel?
1. In the left sidebar, click **Property Intel**.
2. The page opens on the **Property Search** tab.

### How do I look up a property by address?
1. Open Property Intel.
2. Select **By Address** mode.
3. Type the street address — autocomplete suggests matches.
4. Click the suggestion or press Enter.
5. The Property Detail Modal opens with all data tabs.

### How do I browse properties in a ZIP code?
1. Open Property Intel.
2. Select **By Zip Code** mode.
3. Type a 5-digit ZIP and click **Search**.
4. Apply filters in the sidebar to narrow.

### How do I search a radius around a point?
1. Open Property Intel.
2. Select **By Lat/Lng + Radius** mode.
3. Enter latitude, longitude, and radius (max 50 miles).
4. Click **Search**.

### How do I narrow results with filters?
1. After running a search, scroll to the **Filters** sidebar.
2. Adjust property type, beds/baths, year built, sqft, lot size, AVM value, sale amount, assessed value, absentee owner toggle, sale date range.
3. Click **Apply Filters**.

### How do I generate a Property Report PDF?
1. Open the Property Detail Modal for the subject.
2. Click the green **Property Report** button.
3. Wait 5-15 seconds for render.
4. Click **Download** or **Copy Share Link** (link expires after 30 days).

### How do I generate a Buyer Report PDF?
1. From MLS Search or Property Intel, open a listing's modal.
2. Click **Buyer Report**.
3. (Optional) Type a personal note to the buyer.
4. Click **Generate** and download or share.

### How do I generate a Seller Report PDF?
1. Sidebar → click **Seller Report**.
2. Type the seller's address in the search field and select the match.
3. Review the property summary card.
4. (Optional) Add a personal note.
5. (Optional) Pick a Template (Editor / Archive / Noir / Terracotta / Blueprint).
6. Click **Generate Seller Report PDF**.
7. Download or share.

**Hoku-equivalent queries**:
- "Look up [address]"
- "What's the AVM on [address]?"
- "Generate a Property Report for [address]"
- "Pull a Buyer Report on [MLS#]"
- "Generate a Seller Report for [address]"

---
**Tab 1 - Property Search** reference (3 search modes):
1. **By Address**: Single address search with autocomplete
2. **By Zip Code**: Returns all properties in a zip code
3. **By Lat/Lng + Radius**: Latitude, longitude, and radius in miles
- Filters: property type, beds/baths, year built, sqft, lot size, AVM value, sale amount, assessed value, absentee toggle, sale date range
- Results show in Property Detail Modal with tabs:
  - **Opportunity Score** (first tab when seller data present): scoring breakdown, AI outreach suggestions
  - **Overview**: Address, beds/baths/sqft, year built, property type, lot size, owner info
  - **Building**: Construction, rooms, parking, utilities, interior features
  - **Financial**: AVM (with reliability check), assessment, tax, mortgage, equity, LTV, rental AVM, cap rate
  - **Sales History**: Historical closed transactions with dates, amounts, buyer/seller, deed type
  - **Listing History**: All MLS listings for the property (Active, Pending, Closed, Expired, Withdrawn, Canceled) with color-coded status badges, price changes, DOM, listing/buyer agents
  - **Comps**: Comparable sales with correlation scoring
  - **Ownership**: Deed owner (county OWNINFO with green badge), co-owners, corporate/trust, absentee, mailing address
  - **Neighborhood**: Demographics, schools, crime, POI, walk score
  - **Market Stats**: Median price, avg DOM, active listings, price/sqft, median rent
  - **Federal/GIS**: School zones (elementary/middle/high attendance boundaries), hazards (FEMA NRI), flood/tsunami/fire zones, opportunity zones
- **AVM Reliability**: Compared to county assessment and recent sale. If >30% difference, suppressed -- county assessment shown instead
- Download professional multi-page PDF report or generate shareable link (expires 30 days). The Property Report includes:
  - Cover page with map and hero photo, branded with agent info
  - Value Snapshot: AVM, last sale, equity, LTV with AVM range bar and rental estimate
  - Property Details: type, beds/baths/sqft, lot size, parking, year built, land tenure
  - Interior Features: plumbing fixtures, fireplace, attic, interior structure
  - Exterior Features: pool, deck, patio, porch, building condition, fire sprinklers
  - Legal Description: zoning, census tract, subdivision, legal description text
  - Tax History: multi-year comparison table (up to 5 years of land, improvement, total assessed, tax amount)
  - Deed/Transaction Details: contract/recording dates, buyer/seller, vesting, title company, doc numbers, transfer tax
  - Mortgage & Equity: loan balance, original loan, lender, loan type, LTV, equity with visual bar
  - Mortgage Payment Estimate: estimated monthly payment with principal/interest/tax/HOA breakdown
  - Sales History: table with dates, amounts, buyer/seller names
  - Ownership: owner name, co-owner, occupancy status, absentee/corporate flags, mailing address
  - Comparable Sales: table with address, price, beds/baths, sqft, close date, match percentage
  - Area Market Statistics: market type indicator, months of inventory, sold-to-list ratio, avg DOM, median price, MoM trend indicators
  - Hazard & Environmental Zones: tsunami, lava flow, flood, sea level rise, cesspool, SMA, DHHL
  - Neighborhood & Economic Context: median income, home value, age, population density, unemployment, poverty, own/rent split
  - Neighborhood Comparison: side-by-side table comparing ZIP vs County vs State metrics
  - Schools: up to 6 nearby schools with level, grades, enrollment, student-teacher ratio, overall grade
  - Livability & Walkability: livability index score with category breakdowns (bars), walkability score
  - Photo Gallery: up to 6 MLS photos
- **Buyer Report PDF**: Generated from MLS listing data. Includes cover page, personal note, listing status badge, price/AVM cards with range bar, basic facts, property details, building details, interior/exterior features, MLS description, location details, photo gallery (up to 12), mortgage payment estimate with PITI breakdown, market trends with MoM arrows, neighborhood demographics (4-geo comparison tables for housing and people), age distribution and income bracket bar charts, walkability score, hazards, comparable sales. Designed for buyer clients evaluating a listed property.
- **Seller Report PDF**: Generated from REAPI/public records data. Includes cover page, personal note, valuation cards (AVM + CMA + equity), AVM and CMA range bars, property facts, building details, legal description (parcel, zoning, census tract), owner facts, multi-year tax history table, equity section with visual bar, photo gallery, market trends, sales history, comparable sales with CMA adjustments, pricing strategy table (for sale/closed/distressed/expired), CMA pricing summary with recommended price. Designed for seller clients considering listing their property.

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

7. **Bird Dog Automated Prospecting** — Automated off-market lead hunting on a schedule.
   - HOW IT WORKS: Agent sets criteria (ZIP, lead flags, property type, equity %) and a schedule (daily/weekly/monthly). Bird Dog automatically searches for matching properties and alerts on NEW leads.
   - LEAD SCORING: HOT (red) = most likely to sell (inherited, pre-foreclosure, death, tax lien, vacant+absentee). WARM (orange) = moderately likely (out-of-state absentee + equity, free & clear). COLD (gray) = nurture/monitor.
   - HOKU CAN: Create a Bird Dog search from natural language: "Bird dog absentee owners in [ZIP] with high equity, run weekly". Use action create_bird_dog with params: zip, absentee, highEquity, vacant, foreclosure, investor, taxDelinquent, propertyType, equityMin, name, schedule.
   - HOKU CAN: Run a Bird Dog search immediately with run_bird_dog action and searchId param.
   - HOKU CAN: Navigate to Bird Dog results with bird_dog_results action.
   - HOT SHEET: Agent can export a color-coded XLSX spreadsheet with all lead data, owner info, equity, and skip trace contacts.
   - SKIP TRACE: Manual button per lead to find phone numbers, emails, and social profiles for the property owner.
   - BEST APPROACH: Help agents set up targeted searches combining multiple criteria for highest quality leads.

8. **Market Monitor** -- Automated MLS alerts for your clients.
   - HOW IT WORKS: Agent creates a monitoring profile for each buyer/seller client with search criteria and notification preferences. Market Monitor scans the MLS daily and sends alerts directly to the client for new listings, price drops, back-on-market, expired/withdrawn, and pending status changes.
   - ALERT TYPES: New Listing, Price Drop, Back on Market, Expired/Withdrawn, Pending.
   - CHANNELS: Email (branded HTML with property photos), SMS (short text), CRM (via conversations API).
   - HOKU CAN: Create a monitor profile, navigate to Market Monitor page.

GENERAL TIPS:
- All searches return scored property cards ranked by likelihood to sell
- Click any property card to see full details, motivation factors, and AI analysis
- Use the "time at residence" filter to find long-term owners (20+ years = strongest prospects)
- Results can be exported or saved for follow-up
- Hoku (that's me!) can run any of these searches for you — just tell me which one and the zip code.`,

  // Seller Report
  "seller-report": `The agent is on the SELLER REPORT page. This page lets agents search a property by address, review public records data, and generate a professional Seller Report PDF.

### How do I open the Seller Report page?
1. In the left sidebar, click **Seller Report** (under Reports / Property Intel).
2. The page opens with the address search bar at the top.

### How do I generate a Seller Report?
1. Open the Seller Report page.
2. In the **Search** field, type the seller's property address. Autocomplete suggests matches.
3. Click the matching suggestion or press Enter.
4. Review the **Property Summary** card that appears: AVM, last sale, assessed value, owner info, property facts.
5. (Optional) Type a personal note to the seller in the **Personal Note** field.
6. (Optional) Pick a visual template under **Template**: The Editor (default classic navy + gold), The Archive (minimal), Noir (luxury dark), Terracotta (warm), or Blueprint (corporate data).
7. Click **Generate Seller Report PDF**.
8. Wait 10-30 seconds for render (depends on photos and chart count).
9. Click **Download** to save, or **Copy Share Link** for a 30-day public URL.

### How do I share the Seller Report with the seller?
1. After generating, click **Copy Share Link** in the result panel.
2. Paste the link into an email, SMS, or your CRM message to the seller.
3. The link works for 30 days without requiring the seller to log in.
4. Each visit is logged so you can see whether the seller opened the report.

### How do I switch templates after generating?
1. After the report renders, change the **Template** selector at the top.
2. Click **Generate** again — a fresh PDF renders with the new visual style.
3. The data is identical across templates; only colors, fonts, cover layout, page numbering, and footer copy change.

**Hoku-equivalent queries**:
- "Generate a Seller Report for [address]"
- "Run a Seller Report on [address] using the Noir template"
- "Send the Seller Report for [address] to my client" (creates a share link)

**Seller Report PDF (13-page RPR-equivalent, rebuild in progress):**
1. Cover — hero photo, address overlay, listing status pill, agent card (headshot, license, contact, brokerage)
2. Valuation — Genie AVM™ primary card with confidence stars, month/12-mo deltas, range bar, tax & assessment strip
3. Property Facts — 3-column table (Public / Listing / Agent Refinements)
4. Interior & Exterior Features — listing-side vs public-records split
5. Legal · Owner · Hazards — parcel/zoning/subdivision, owner facts, Hawaii-specific hazards (Flood, Tsunami Evac, Sea Level Rise, Cesspool Priority), sales history
6. Property Photos — listing gallery
7. Market Trends — 4 KPIs with MoM, 5-point market-type gauge, ZIP/County/State/USA value history chart
8. Active Listings — 5-year list-price trend
9. Sold Listings — 5-year sold-price trend + 12-month sales vs listings grouped bars
10. Dual Trends — Median Sold Price vs Sold Listings and Median List Price vs Active Listings (dual-axis, 24 months)
11. Market Activity — 4-column New/Closed/Distressed/Expired summary with area comp map
12. Pricing Strategy & Refined Value — comparable groups, 90-day sold comparison, CMA summary, Refined Value breakdown
13. About — Real Estate Genie description, data sources, agent closing card, Equal Housing glyph

Pages 1-6, 12, and 13 render real data. Pages 7-11 (market pages) currently show "Section in progress" notices pending new market-data endpoints. Every page is agent-branded. No RPR branding; footer reads "Report produced by Real Estate Genie · © Hulia'u Software, Inc."

**5 visual templates** (agent picks per report via data.theme):
- **The Editor** (default) — classic navy + gold + bone; Playfair Display display; trust and gravitas.
- **The Archive** — modern minimal Swiss grid; Inter + JetBrains Mono; bold oversized numerals.
- **Noir** — luxury dark; Cormorant Garamond on black with champagne accents; Sotheby's-adjacent.
- **Terracotta** — warm clay + cream; Fraunces rounded serif; boutique lifestyle.
- **Blueprint** — corporate data; IBM Plex + cobalt blue with grid accents; data-forward teams.

Each template controls colors, fonts, cover layout, page-number format, and footer copy. Same 13-page structure regardless of theme.

**Use case:** Generate Seller Reports for prospecting (absentee owners, high equity homeowners) or listing presentations. The data comes from public records, not MLS.

Help the agent search properties and generate Seller Reports for prospecting and listing presentations.`,

  // Seller Map
  "seller-map": `The agent is on the SELLER MAP. Interactive map-based prospecting tool with predictive seller scoring.

### How do I open the Seller Map?
1. Sidebar → click **Opportunities** to expand.
2. Click **Seller Map**.

### How do I search by ZIP code?
1. Open Seller Map.
2. Select **ZIP** mode in the search bar.
3. Type the 5-digit ZIP and press Enter.

### How do I search by lat/lng + radius?
1. Select **Radius** mode.
2. Enter latitude, longitude, radius in miles (max 50).
3. Press Enter.

### How do I search by parcel ID?
1. Select **Parcel** mode (TMK in Hawaii, APN elsewhere).
2. Type the parcel number with or without dashes.
3. Press Enter.

### How do I narrow with filters?
1. Open the **Filters** panel on the left.
2. Adjust Min Motivation Score (default 40), Absentee Only toggle, Min Ownership Years, Min Equity %, Property Type, Min Parcels Owned.
3. Filters apply live.

### How do I view a property's full detail and outreach options?
1. Click any marker on the map.
2. The Property Detail Modal opens with **Opportunity Score** tab first.
3. The tab shows scoring breakdown across 12 dimensions plus AI-generated outreach suggestions.
4. Click **Letter / Email / SMS / Talking Points** to generate a tailored draft.

### How do I toggle the heat map or boundary overlays?
1. Open the **Layers** panel (top-right of the map).
2. Toggle Heat Map, ZIP Boundaries, Parcel Boundaries (where supported), or Satellite.

### How do I save the current search?
1. Set up filters and search area.
2. Click **Save Search** in the top-right.
3. Name it and click **Save**. Cached globally for 7 days.

### How do I load a saved search?
1. Click **Saved Searches** in the top-right.
2. Click the entry to reload filters and area.

**Marker colors**: Red = Very Likely (70-100), Orange = Likely (50-69), Yellow = Possible (30-49), Blue = Unlikely (0-29)

**Seller Motivation Score (0-100)** — 12 dimensions:
- High equity (15) · Long ownership (15) · Absentee (12) · Distress (12)
- Multi-property portfolio (8) · Transfer recency (8) · Owner type (6: estate/bank/REO highest)
- Tax assessment gap (5) · Market trend (5) · Tax trend (5) · Appreciation (5) · HOA burden (4)

**Hoku-equivalent queries**:
- "Open the Seller Map for [ZIP]"
- "Find absentee owners with 70%+ equity in [ZIP]"
- "Save this search as [name]"
- "Show me my saved searches"
- "Generate an outreach letter for [address]"`,

  // Market Monitor
  "market-watch": `The agent is on the MARKET MONITOR page (a tab within MLS). This is a real-time market monitoring tool:
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
  "dom-prospecting": `The agent is on the DOM PROSPECTING page. Identifies stale and expired listings for prospecting.

### How do I run a DOM Prospecting search?
1. Sidebar → **Property Intel** → click **Prospecting** tab → click **DOM Prospecting**.
2. Type one or more ZIPs.
3. (Optional) Adjust the tier multiplier vs market-average DOM (default 2.0x for Red).
4. Click **Run Search**.
5. Results appear tiered (Red / Orange / Charcoal / Green).

### How do I monitor a specific listing over time?
1. Run a DOM Prospecting search.
2. Click a listing card.
3. Click **Monitor** to add it to your monitored list.
4. View monitored listings on the **Monitored Properties** sub-tab.

### How do I view DOM alerts?
1. On the DOM Prospecting page, click the **Alerts** sub-tab (with unread count badge).
2. Each alert shows tier change, status change (active → expired), or price change.

### How do I save a DOM search?
1. Run the search you want to save.
2. Click **Save Search** in the top-right.
3. Name it. Reload it from **Saved Searches** later.

**Tier system** (customizable multipliers vs market-average DOM):
- RED (2x+ avg DOM) — likely target, very stale
- ORANGE (1.5x avg) — possible target, getting stale
- CHARCOAL (1.15x avg) — approaching threshold, monitor
- GREEN (Expired/Withdrawn) — fair game for outreach, no active listing agreement

Data from MLS (primary) with public-records provider as fallback.

**IMPORTANT**: It is unethical (and often illegal) to solicit sellers whose property is actively listed with another agent. Only contact properties in the GREEN tier (expired/withdrawn).

**Hoku-equivalent queries**:
- "Show me stale listings in [ZIP] with DOM > 90"
- "Find expired listings in [ZIP]"
- "Monitor [address] for tier changes"
- "What new DOM alerts do I have?"`,

  // Farm & Watchdog
  "farm-watchdog": `The agent is on the FARM & WATCHDOG page. Geographic monitoring with automated alerts.

### How do I open Farm & Watchdog?
1. Sidebar → click **Opportunities** to expand.
2. Click **Farm & Watchdog**.

### How do I create a farm area?
1. Click **+ Create Farm Area** in the top-right.
2. Define the area: ZIP (one or more), Radius (lat/lng + miles), or Parcel Prefix (TMK in Hawaii, APN elsewhere).
3. Set property filters: price range, bedrooms, property types, listing statuses.
4. Name the farm.
5. Click **Save**.

### How do I view live listings in my farm?
1. Click the farm card.
2. The detail page shows live MLS listings matching criteria.
3. Sort by Days on Market, Price asc/desc, or Price Drop %.
4. Click any listing card to open Property Detail Modal.

### How do I add a Watchdog alert rule?
1. Open the farm's detail page.
2. Click the **Watchdog** tab.
3. Click **+ Add Rule**.
4. Choose rule type: DOM Threshold (e.g., 75+ days), Price Drop Monitoring (optional % threshold), or Status Changes (new/expired/withdrawn).
5. Pick notification channels: Push, Email, SMS (any combination).
6. Click **Save Rule**.

### How do I view and manage alerts?
1. Open the farm's detail page.
2. Click the **Alerts** tab.
3. Each alert shows timestamp, triggering rule, listing details, link to the property.
4. Filter by status badge: Unread / Read / Archived.
5. Click a row to mark read; click the archive icon to archive.

### How do I edit or pause a farm?
1. Open the farm's detail page.
2. Click **Edit** to change criteria, or toggle **Active** off to pause.

### How do I delete a farm?
1. Open the detail page.
2. Click **⋯** → **Delete** → confirm.

A background MLS Watchdog cron periodically scans monitored areas and generates alerts. No manual triggering required after rules are saved.

**Hoku-equivalent queries**:
- "Create a farm area for [ZIP] focused on 3-bed homes under [price]"
- "Show me listings in my [farm name] farm with price drops"
- "Alert me when listings in [ZIP] exceed 90 days on market"
- "Pause my [farm name] farm"
- "What new alerts do I have today?"`,

  // Bird Dog Prospecting
  "bird-dog": `The agent is on the BIRD DOG PROSPECTING page. Automated off-market lead hunting that runs on schedule and only alerts on NEW leads.

### How do I open Bird Dog?
1. Sidebar → click **Opportunities** to expand.
2. Click **Bird Dog**.

### How do I create a Bird Dog search?
1. Open Bird Dog.
2. Click **+ New Search**.
3. Enter a ZIP code (or list).
4. Check filters: Absentee Owner, High Equity, Vacant, Pre-Foreclosure, Investor, Tax Delinquent.
5. (Optional) Set Min Equity %, Min Years Owned, Property Type.
6. Pick schedule: Daily, Weekly, or Monthly.
7. Name the search.
8. Click **Create Search**.

HOKU CAN: Create Bird Dog searches from natural language using action create_bird_dog with params: zip, absentee, highEquity, vacant, foreclosure, investor, taxDelinquent, propertyType, equityMin, name, schedule.

### How do I run a search now?
1. Open Bird Dog.
2. Click **Run Now** on the search card.
3. New leads appear within 1-3 minutes.

### How do I view leads from a search?
1. Click the search card to open its detail page.
2. Each row shows owner name, address, equity, years owned, lead-score color, and trigger reasons.

### How do I skip-trace a lead?
1. Click a lead row.
2. Click **Skip Trace** in the detail panel.
3. Confirm the credit charge.
4. Phone, email, and social profiles appear within 5-30 seconds.

### How do I export the Hot Sheet?
1. Open a Bird Dog search.
2. Click **Export Hot Sheet** → **XLSX**.
3. The download is color-coded (HOT red / WARM orange / COLD gray) with full property, owner, and skip-traced contact data.

### How do I star a lead?
1. Click the **★** icon on any lead row.
2. View starred leads under the **Starred** tab on the search detail page.

### How do I edit or pause a search?
1. Open the search detail page.
2. Click **Edit** to change criteria, or toggle **Active** off to pause.

**Lead-scoring tiers**:
- HOT (red): Inherited, pre-foreclosure, death transfer, tax lien, vacant+absentee, foreclosure, deed in lieu
- WARM (orange): Out-of-state absentee + high equity + long ownership, free & clear, absentee + equity > 40%
- COLD (gray): Monitoring — no urgency signals detected

**Hoku-equivalent queries**:
- "Bird dog absentee owners in [ZIP] with high equity, run weekly"
- "Run [search name] now"
- "What new Bird Dog leads came in this week?"
- "Skip trace [owner name]"
- "Export the Hot Sheet for [search name]"

Suggest to agents: combine criteria for highest quality (e.g., absentee + high equity + long ownership = prime seller prospects).`,

  // Market Monitor
  "market-monitor": `The agent is on the MARKET MONITOR page. Automated MLS alerts for buyer and seller clients.

### How do I open Market Monitor?
1. Sidebar → click **Opportunities** to expand.
2. Click **Market Monitor**.

### How do I create a new client profile?
1. Open Market Monitor.
2. Click **+ New Profile** in the top-right.
3. Enter client info (name, email, phone — at least one channel required).
4. Set search criteria: ZIP, beds, baths, price range, property type.
5. Pick notification channels: Email, SMS, or CRM.
6. Pick alert types: New Listing, Price Drop, Back on Market, Expired/Withdrawn, Pending.
7. Click **Save Profile**.

### How do I edit an existing profile?
1. Open Market Monitor.
2. Click the profile card.
3. Click **Edit** in the top-right.
4. Adjust fields and click **Save**.

### How do I pause monitoring for a client?
1. Open the profile.
2. Toggle **Active** off (or click **Pause**).

### How do I trigger an immediate scan?
1. Open the profile.
2. Click **Run Now** in the top-right.
3. Check Alert History after 1-2 minutes.

### How do I view alert history?
1. Open the profile.
2. Click the **Alerts** tab.
3. Each row shows timestamp, alert type, listing, and per-channel delivery status (email opened, SMS delivered, CRM thread created).

### How do I delete a profile?
1. Open the profile.
2. Click **⋯** → **Delete** → confirm.
3. Past alert history is retained; the profile is deactivated.

**Alert types** (recap for Hoku to recommend by client type):
- BUYER clients: New Listing, Price Drop, Back on Market
- SELLER clients: Pending, Expired/Withdrawn

**Notification channels**:
- Email: branded HTML with photos and details
- SMS: short text with key info and link
- CRM: creates a conversation in the agent's CRM

**Hoku-equivalent queries**:
- "Set up a Market Monitor for [client] in [ZIP]"
- "Pause Market Monitor for [client]"
- "Run [client]'s Market Monitor now"
- "What alerts has [client] received this week?"
- "Create a buyer monitor for [client] in [ZIP] for 3-bed homes under [price]"`,

  // VA Assumable Loan Search
  "assumable-va": `The agent is on the VA ASSUMABLE LOAN SEARCH page. This is a flagship buyer-side search that finds active listings where a buyer can assume the seller's existing VA mortgage — inheriting the original locked-in 2-4% rate from the 2020-2022 origination boom while market rates sit at 6-7%.

**Four search modes** (one at a time):
- **City** — case-insensitive substring on City field
- **Neighborhood** — substring on SubdivisionName
- **ZIP Code** — startswith match on PostalCode (full 5-digit or first 3 digits)
- **TMK / Parcel** — substring on ParcelNumber. Accepts dashed and undashed forms. Called TMK in Hawaii, APN in most other states.

**How the search works** (3-tier confidence):
1. **Tier 1 — Explicit MLS Tags**: ListingTerms includes both 'Assumable' AND 'VA'. Highest precision, lowest recall.
2. **Tier 2 — Mentioned in Remarks**: Public remarks contain phrases like "VA Assumable @2.75%", "Assume our VA loan", "Assumable VA mortgage". Where most real inventory shows up.
3. **Tier 3 — Assumable, Loan Type Unclear**: ListingTerms includes 'Assumable' but no VA mention. Could be VA, FHA, or conventional.

**Rate extraction**: When public remarks include a percentage near the assumable mention, the system extracts it (e.g., "VA Assumable @2.75%!" → "2.75%") and computes monthly savings vs current market rate using 80% LTV / 30-year math. Result cards show the rate badge plus "$X,XXX/mo savings vs 6.5% market".

**Step-by-step instructions Hoku should give when asked "How do I search VA-assumable homes by [mode]?"**:

CITY:
1. Open VA Assumable page (Sidebar → Opportunities → VA Assumable, or /app/mls/assumable-va)
2. Click the **City** tab (selected by default)
3. Type the city name in the **City** field
4. Optionally set Min Beds, Min/Max Price
5. Click **Search VA Assumable**

NEIGHBORHOOD:
1. Open VA Assumable page
2. Click the **Neighborhood** tab
3. Type the neighborhood / subdivision name
4. Optionally narrow with Min Beds and price filters
5. Click **Search VA Assumable**
6. If neighborhood search returns nothing, fall back to City or ZIP — subdivision tagging by listing agents is inconsistent.

ZIP CODE:
1. Open VA Assumable page
2. Click the **ZIP Code** tab
3. Type the 5-digit ZIP — partial ZIPs (first 3 digits) are accepted via startswith match
4. Optionally narrow with Min Beds and price filters
5. Click **Search VA Assumable**

TMK / PARCEL:
1. Open VA Assumable page
2. Click the **TMK / Parcel** tab
3. Type the parcel number with or without dashes
4. Click **Search VA Assumable**
5. Best for confirming whether a known property is VA-assumable. Single-property results are typical.

**Adjusting savings comparison**: At the bottom of the search form there's a "Compare savings against market rate of X%" field (default 6.5%). Edit it to reflect the buyer's actual rate quote — savings on every result card recompute automatically without re-running the search.

**Caveats Hoku should mention to agents**:
- VA loan assumption requires lender approval (typically 60-90 days)
- VA-eligible buyers (military, veterans) preserve the seller's VA entitlement; non-VA buyers consume it
- Funding fee on assumption is 0.5% — vs 2.15-3.3% on fresh origination
- Rate extracted from remarks is agent-stated, not verified — confirm with listing agent
- 80% LTV assumption is approximate; actual assumed balance varies and isn't published in MLS

**Hoku queries that should route here or run this search inline**:
- "Find VA assumable homes in [city]" → city search
- "Show me homes in [neighborhood] my military buyer can assume" → neighborhood search
- "Assumable VA listings in [ZIP] with 3+ beds" → ZIP search + minBeds=3
- "Look up parcel [number] for VA assumable" → TMK / parcel search
- "How do I search VA assumable by neighborhood?" → walk through the 5-step neighborhood instructions above`,

  // Open Houses
  "open-houses": `The agent is on the OPEN HOUSES page. Complete open house lifecycle management with QR-code-based lead capture.

### How do I open the Open Houses page?
1. Sidebar → click **Open Houses**.

### How do I create an open house from MLS?
1. Open the Open Houses page.
2. Click **Create Open House**.
3. Choose Event Type: Sales, Rental Showing, or Both.
4. In **Import from MLS**, search by MLS Number or address.
5. Click the matching listing — fields auto-fill (address, beds/baths/sqft, price, description, key features, photos, location).
6. Set Start and End Date/Time.
7. Click **Save**. Created as Draft.

### How do I create an open house manually?
1. Open the page and click **Create Open House**.
2. Choose Event Type.
3. Click **Skip Import** (or scroll past the MLS import).
4. Manually enter property details and upload photos.
5. Set date/time and **Save**.

### How do I pick a flyer template?
1. Open the event detail page.
2. Scroll to **Flyer Template** section.
3. Click one: Modern, Modern Blue, Elegant Warm.

### How do I upload photos to the flyer?
1. On the event detail page, scroll to **Photos**.
2. Click each image slot (Primary / Secondary / Tertiary depending on template).
3. Choose JPEG, PNG, or WebP under 5 MB.

### How do I download the flyer PDF?
1. On the event detail page, click **Download Flyer**.
2. Wait 5-10 seconds for render.
3. Save the PDF (includes agent branding, photos, address, date/time, key features, map, QR check-in code).

### How do I publish so guests can check in?
1. On the event detail page, find the **Status** selector at the top.
2. Change Draft → **Published**.
3. The QR check-in URL is now live.

### How do I view check-ins after the event?
1. Open the event detail page.
2. Click the **Attendees** tab.
3. Each row: name, email, phone, sign-in time, representation status, timeline, financing.
4. Click **Export to CSV** to download.

### How do I view performance metrics?
1. On the event detail page, click the **Scorecard** tab.
2. View sign-ins captured, contacted-within-5-min %, represented-by-realtor %, looking-for-agent %.
3. Overall performance score (0-100) combines them.

### Mark a lead as contacted
1. From Attendees tab, click the contact icon on a row.
2. Choose Call / Text / Email.
3. Timestamp records automatically; counts toward the contacted-within-5-min metric.

**QR check-in flow** (how it works for the guest):
1. Guest scans the printed flyer's QR code with their phone camera.
2. Secure registration page opens (token valid until event-end + 72 hours).
3. Guest fills name, email, phone, consent (email + SMS), representation, timeline, financing, neighborhoods, must-haves.
4. Submit → auto-scored 0-100 heat score → enters pipeline → syncs to CRM if connected.

**Hoku-equivalent queries**:
- "Create an open house for [MLS#] [day] [start time] to [end time]"
- "Show me attendees from [event name or address]"
- "What was the heat score on [guest name]?"
- "Download the flyer for [event]"
- "Mark [guest] as contacted via SMS"`,

  // Market Analytics
  "market-analytics": `The agent is on the MARKET ANALYTICS page. County-level market statistics dashboard.

### How do I open Market Analytics?
1. Sidebar → click **MLS**, then click the **Market Analytics** tab.
2. Or sidebar → **Deals** → **Market Analytics**.

### How do I read the overview cards?
Top of the page shows: Median Sale Price (all types), SFR Median, Condo/TH Median, $/Sqft, DOM, YoY Price Change, Sales Momentum (6mo vs prior 6mo), MLS Active, MLS Closed (30d).

### How do I drill into a ZIP?
1. Scroll to the **Sales Price by ZIP Code** table.
2. Click a ZIP row.
3. Detail panel shows that ZIP's median, SFR median, Condo/TH median, $/sqft, listings, DOM, median rent.

### How do I read the grouped bar chart?
The **Median Sale Price by ZIP** chart pairs SFR (red) and Condo/TH (blue) bars per ZIP, sorted by SFR price descending. Hover any bar to see the exact value.

### How do I switch counties?
Click the **County** dropdown at the top of the page and pick the county.

### How do I export the data?
Click **Export** in the top-right; choose **CSV** for the raw ZIP table or **PDF** for a branded report.

**Data sources**: MLS (active + closed), market-stats provider (volume momentum, YoY), HUD (Fair Market Rents). Cached 24 hours; refresh via page reload or **Refresh** button.

**Hoku-equivalent queries**:
- "What's the median price in [county]?"
- "Show me YoY price change for [county]"
- "Compare SFR vs Condo medians in [ZIP]"
- "Export market analytics for [county] as PDF"`,

  // Neighborhood Profiles
  "neighborhood-profiles": `The agent is on the NEIGHBORHOOD PROFILES page. AI-generated, branded neighborhood reports for buyer/seller presentations and marketing — assembles a 12-14 page PDF (or Word/DOCX) from Census, schools, hazards, crime, and market data.

### How do I open Neighborhood Profiles?
1. Sidebar → click **Neighborhoods** (or /app/neighborhoods).

### How do I generate a new profile?
1. Click **+ New Profile** in the top-right.
2. Enter the **Neighborhood Name** (e.g., [neighborhood]).
3. Enter the **Address** (any address inside the neighborhood — anchors maps and data).
4. Enter **City** and **State**.
5. (Optional) Add **Architectural Style**, **Nearby Amenities**, and **Additional Context**.
6. Click **Generate**.
7. Wait ~10-20 seconds for the AI sections to render.

### How do I review or edit the AI sections?
1. Open the generated profile.
2. Scroll through: **Lifestyle & Vibe**, **Location Intelligence**, **Market Pulse**, **Community Resources**, **Local Amenities**.
3. Click any section's **Edit** button to rewrite manually → **Save**.

### How do I export to PDF or Word?
1. Click **Export PDF** (12-14+ pages) or **Export Word** in the top-right.
2. File saves to downloads.

### How do I email a profile to a client?
1. Click **Send to Contact**.
2. Pick a CRM contact, edit the cover note, click **Send**.

**What the PDF includes**:
- Cover with neighborhood map and agent branding
- Housing Facts comparison (ZIP vs County vs State vs USA)
- Market Trends (Seller's/Balanced/Buyer's market, MoM/YoY arrows)
- Sold Home Stats (price ranges, $/sqft, sizes, ages, beds)
- People Facts, Education, Age, Income, Occupation, Households w/Children, Transportation, Economy, Quality of Life
- Schools (up to 15 with enrollment + student-teacher ratio)
- Walkability, AI Lifestyle/Location narratives, Local Amenities
- Up to 6 Nearby Neighborhoods

**Data sources**: Census ACS 5-year, NCES schools (1-year cache, refresh August 1), FBI CDE crime, FEMA NRI/USGS hazards, OSM POIs, FRED sales trends, state GIS school zones.

**Fair Housing**: Every profile runs a built-in compliance check before display; flagged language is rewritten by the AI.

**Hoku-equivalent queries**:
- "Generate a neighborhood profile for [neighborhood]"
- "Make a profile for [city]"
- "Export the [neighborhood] profile to PDF"
- "Send the [neighborhood] profile to [contact]"`,

  // Calculators / Analyzers
  calculators: `The agent is on the CALCULATORS / ANALYZERS page. 13 financial calculators for evaluating deals — investment property, BRRRR, flip, rental, STR, 1031, mortgage, net sheets, commission splits. Most support MLS auto-import and PDF/Excel export.

### How do I open the Analyzers?
1. Sidebar → click **Analyzers** (or /app/analyzers). Tile grid of all 13 calculators.

### How do I auto-import a property from MLS into any analyzer?
1. Open the calculator → click **Import from MLS**.
2. Search by address or MLS number → click the result.
3. Address, purchase price, taxes, beds/baths populate automatically.

### How do I export results?
1. After calculating, click **Export PDF** (branded), **Export Excel**, or **Email** to send to a CRM contact.

### How do I save an analysis?
1. Click **Save Analysis** → name it → pick a folder.
2. Re-open from the **Saved** tab on the Analyzers page.

### How do I run an Investment Property analysis?
1. Open **Investment Property**.
2. Enter purchase price, down payment, rate, term, monthly rent, operating expenses.
3. Click **Calculate**.
4. Review **ROI**, **Cap Rate**, **IRR**, **Cash-on-Cash**, 30-year projection, verdict (Strong Buy/Good/Moderate/Weak/Pass).
5. **Save Analysis** to enable Compare Properties.

### How do I compare investment properties?
1. Open **Compare Properties**.
2. Click each saved property to add (up to 5).
3. Review the side-by-side table sorted by Cap Rate, Cash-on-Cash, IRR, Total ROI, Composite Score.

### How do I run a Rental Property analysis?
1. Open **Rental Property** → enter purchase, financing, rent, expenses → **Calculate**.
2. Review **NOI**, **Cap Rate**, **Cash-on-Cash**, **DSCR**, **GRM**, monthly cash flow.

### How do I run a Short-Term Rental (STR) analysis?
1. Open **STR Analyzer** → enter nightly rate, occupancy %, cleaning fees, expenses → **Calculate**.
2. Locale taxes apply automatically (e.g., GET + TAT for Hawaii markets).
3. Review monthly/annual cash flow, expense chart, multi-year revenue projection.

### How do I run a House Flip analysis?
1. Open **House Flip Analyzer** → enter Purchase Price, ARV, Renovation Budget → **Calculate**.
2. Review **70% Rule** pass/fail, gross/net profit, ROI, annualized ROI. **Save Analysis** if needed.

### How do I run a Quick Flip score?
1. Open **Quick Flip Analyzer** → enter ARV, repair costs, target purchase.
2. Instantly see deal score, profit, ROI, 70% Rule pass/fail.

### How do I run a Wholesale MAO calculation?
1. Open **Wholesale MAO Calculator** → enter ARV, repair costs, wholesale fee → **Calculate**.
2. Review **MAO**, low/mid/high offer range, investor margin.

### How do I run a BRRRR analysis?
1. Open **BRRRR Calculator** → enter purchase, renovation, ARV, refi terms (LTV, rate, term), rent, expenses → **Calculate**.
2. Review whether the deal hits **infinite returns**, equity capture at refi, 5-year projection.

### How do I plan a 1031 Exchange?
1. Open **1031 Exchange Analyzer** → enter relinquished property (sale price, basis, depreciation recapture).
2. Add up to 3 candidate replacement properties → **Calculate**.
3. Review **45-day** and **180-day** deadlines, tax savings, 3-property rule validation.

### How do I run a Mortgage Calculator?
1. Open **Mortgage Calculator** → enter loan, rate, term, taxes, insurance.
2. (Optional) HOA and PMI → **Calculate**.
3. Review PITI breakdown and amortization. **Export Excel** for the schedule.

### How do I run a Seller Net Sheet?
1. Open **Seller Net Sheet** → enter sale price, mortgage payoff, commission rates, closing costs, concessions → **Calculate**.
2. **Export PDF** to share net proceeds with the seller.

### How do I run a Buyer Cash-to-Close?
1. Open **Buyer Cash-to-Close** → enter purchase, down payment %, closing costs, prepaids, escrow, credits → **Calculate**.
2. **Export PDF** to share with the buyer.

### How do I run a Commission Split calculation?
1. Open **Commission Split Calculator** → enter total commission and split (or pick a preset).
2. Add transaction fees, E&O, team overrides, YTD-toward-cap → **Calculate**.
3. Review estimated net commission. (Optional) **Save** as a preset.

**Hoku-equivalent queries**:
- "Run an investment analysis on [address]"
- "What's the cap rate on [address] at [rent]/month?"
- "Does this flip pass the 70% rule? ARV [value], rehab [value], purchase [value]"
- "Calculate net proceeds for [address] selling at [price]"
- "Calculate the mortgage on [price] at [rate]% over 30 years"`,

  // Reports
  reports: `The agent is on the REPORTS page. Comprehensive analytics organized by audience: market stats, solo agent, small teams, brokerage, admin checklists. PDF/Excel export.

### How do I open Reports?
1. Sidebar → click **Reports** (or /app/reports).

### How do I navigate the categories?
Reports are color-coded by audience:
1. **Market Statistics (Red)** — public market data tied to your MLS market.
2. **Solo Agent (Blue)** — your personal performance.
3. **Small Teams (Purple)** — team-wide metrics.
4. **Brokerage (Green)** — visible to brokers/admins only.
5. **Assistants & Office Admin (Orange)** — operational checklists.
6. **MLS Agent Leaderboard** — has its own dedicated page.

### How do I open a Market Statistics report?
1. Open Reports → **Market Statistics** group → click the tile for your market.
2. Use the date-range selector at the top.
3. Click **Export PDF** or **Export Excel**.

### How do I run a Solo Agent report?
1. Open Reports → **Solo Agent** group → pick one:
   - **Lead Source ROI** — conversion rate and cost-per-closing by source.
   - **Pipeline Velocity** — average days per pipeline stage; bottleneck flags.
   - **Tax & Savings Reserve** — gross commission vs recommended tax/expense reserves.
   - **Speed-to-Lead Audit** — avg response time to portal leads.
2. Set the date range → **Generate** → export.

### How do I run a Small Teams report?
1. Open Reports → **Small Teams** group → pick one:
   - **Agent Leaderboard** — closings, calls, SMS, showings (radar chart).
   - **Lead Assignment Fairness** — per-member lead count and conversion rate.
   - **Team Commission Split Tracker** — house vs agent portions.
   - **Listing Inventory Health** — active listings, DOM, price-adjustment alerts at 21+ DOM.
2. Set date range → **Generate**.

### How do I run a Brokerage report?
1. Open Reports → **Brokerage** group (brokers/admins only) → pick one:
   - **Company Dollar** — revenue after commissions and expenses.
   - **Compliance & Audit Log** — signed docs, ID verifications, wire confirmations.
   - **Brokerage Market Share** — rank by ZIP vs national brands.
   - **Agent Retention Risk** — AI flags agents with 40%+ activity drop over 30 days.
2. Set scope (whole brokerage / office / team) → **Generate**.

### How do I run the Pending Document Checklist?
1. Open Reports → **Assistants & Office Admin** group → **Pending Document Checklist**.
2. Review under-contract deals missing signatures/forms. Click any deal to jump to its file.

### How does report routing work?
Reports auto-filter to your MLS market. You only see market-statistics tiles for your connected MLS region.

**Hoku-equivalent queries**:
- "Show me my Lead Source ROI for last quarter"
- "What's my pipeline velocity?"
- "Show me the team leaderboard for [period]"
- "Generate the company dollar report"
- "Which agents are flagged for retention risk?"`,

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
**User MLS Integrations**: Per-agent or per-vendor MLS credentials (provider varies by region), with IDX Broker as optional fallback.
Help the admin manage the platform, users, plans, and integrations.`,

  // Integrations
  integrations: `The agent is on the INTEGRATIONS page.

**Primary Integrations**:
- **CRM**: Contacts, pipeline, email/SMS automation. Setup: Private Integration API Key + Location ID + Pipeline selection + New Lead Stage mapping.
- **MLS**: MLS listings, property data, comps, market monitor, OH sync. Setup: MLS credentials (varies by provider — OAuth2, Basic Auth, or vendor Bearer token).

**Calendar Integrations** (Two-Way Sync):
- **Google Calendar**: OAuth connection, bidirectional event sync
- **Microsoft/Outlook Calendar**: OAuth connection, bidirectional event sync

**Hoku Web Assistant**:
- **Embeddable chat widget** for agent websites. Copy embed code or direct link from this page.
- Pre-qualifies visitors (buyer/seller), captures leads, searches MLS, emails properties, creates CRM contacts with conversation notes.
- Uses the agent's MLS connection for property search (same as App Hoku). IDX Broker as optional fallback.
- Optional IDX Broker API key for additional MLS source.

**Other**:
- **Social Channels**: Multi-channel lead response from social platforms
- **Google Maps**: Geocoding, maps, location features (platform-wide, no user setup)

**Admin-Only**: Stripe (payments), PayPal (payments), Realie.ai (property intelligence), Federal Data (FRED, HUD, USPS, Census, BLS)

**Free Public APIs** (no setup needed): Honolulu County OWNINFO, Hawaii State GIS, FEMA NRI, FBI CDE, NCES Schools, Census ACS, FRED, BLS, HUD

Each integration has a Test Connection button. Status shows Connected/Disconnected with last sync timestamp.
Help the agent connect their integrations and troubleshoot connection issues.`,

  // Email Blast
  "mls-blast": `The agent is on the EMAIL BLAST page. Branded neighborhood email marketing — pulls active MLS listings for a subdivision/neighborhood and emails them to CRM contacts.

### How do I open Email Blast?
1. Sidebar → click **Email Blast** (or /app/email-blast).

### How do I create a new Email Blast?
1. Click **+ New Blast** in the top-right.
2. Enter a **Blast Name** (internal label).
3. Choose **Audience** — pick a CRM tag, list, or upload a recipient CSV.
4. Choose **Listing Source**:
   - **Subdivision/Neighborhood** — type a neighborhood name (e.g., [neighborhood]).
   - **My Listings** — only the agent's own active listings.
   - **Saved Search** — pick a saved MLS search.
5. (Optional) Set **Max Listings** (default 12).
6. Choose **Schedule** — Send Now, Schedule Once (date/time), or Recurring (weekly/biweekly/monthly).
7. Pick a **Template** (Modern, Classic, Minimal, etc.).
8. Click **Preview** to see the rendered email.
9. Click **Save** or **Send**.

### How do I send a blast right now?
1. Open the blast.
2. Click **Send Now** in the top-right.
3. Confirm the recipient count.

### How do I edit a blast?
1. Find the blast in the list.
2. Click the row → click **Edit**.
3. Make changes → **Save**.

### How do I pause a recurring blast?
1. Find the blast in the list.
2. Toggle the **Active** switch off (or click **Pause**).

### How do I see who received my last blast?
1. Click the blast row.
2. Click the **Sends** tab.
3. View per-recipient delivery, open, and click status.

### How do I create a Broker's Open blast (send my listings to other agents)?
1. Click **+ New Blast**.
2. **Audience** → select the **MLS Agent** tag (created automatically when exporting agents from the MLS Leaderboard).
3. **Listing Source** → **My Listings**.
4. **Template** → pick the Broker's Open template.
5. Schedule and send.

**Hoku-equivalent queries**:
- "Create an email blast for [neighborhood] listings"
- "Send my active listings to my [tag] contacts"
- "Schedule a weekly [neighborhood] blast"
- "Show me opens and clicks on my last blast"`,

  // MLS Agent Leaderboard
  "mls-leaderboard": `The agent is on the MLS AGENT LEADERBOARD page. Market-wide agent performance rankings based on closed MLS transactions.

### How do I open the MLS Agent Leaderboard?
1. Sidebar → click **Reports**.
2. Click **MLS Agent Leaderboard**.

### How do I generate a leaderboard?
1. Set **Time Period** (e.g., Last 30 days, Last Quarter, Last Year, Custom).
2. (Optional) Choose **Property Types** to include.
3. (Optional) Choose **Sides** (Listing Agent, Buyer Agent, or Both).
4. Click **Generate**.

### How do I sort?
1. Click any column header to sort: Closings, Volume, Average Price, Median DOM, List-to-Sale Ratio.
2. Click again to reverse direction.

### How do I view an individual agent's detail?
1. Click an agent row.
2. The detail panel shows closed listings, average prices, DOM, and contact info from MLS.

### How do I export to Excel?
1. Click **Export to Excel** in the top-right.
2. Includes every column plus full agent contact data.

### How do I push leaderboard agents to my CRM?
1. Click **Export to CRM** in the top-right.
2. Confirm. Each agent is created/updated as a CRM contact with the **"MLS Agent"** tag.
3. Use that tag in Email Blast or Broker's Open for branded outreach.

**Use cases**:
- Competitive analysis — see where you rank vs other agents in your market
- Recruiting (for brokers)
- Build a network of active agents for referrals and Broker's Open invitations
- Bulk-outreach foundation via the "MLS Agent" CRM tag

**Hoku-equivalent queries**:
- "Show me the top 20 agents in [county] this quarter"
- "Who closed the most volume in [ZIP] last year?"
- "Export the leaderboard for [county] to Excel"
- "Push leaderboard agents to my CRM"`,

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
1. **MLS** — Active/Pending/Closed/Expired/Withdrawn/Canceled listings, actual sale prices, agent info, photos, DOM. Provider varies by region (configured per agent or per vendor).
2. **Public-records / property data provider** — AVM with confidence range, equity, LTV, liens, parcel geometry, deed transfers. Best for property valuation.
3. **Rental data provider** — Property records, owner info, absentee status, rental AVM, market stats, comps fallback. Best for owner intelligence.
4. **County / state GIS** — Current deed owner from county records (green "County Records" badge), parcel boundaries, flood/hazard layers. Available for Hawaii (state GIS) and many mainland counties via FEMA NFHL. Prioritized over commercial providers for ownership.
5. **FEMA NRI** — County-level hazard risk ratings (flood, hurricane, wildfire, earthquake, tornado, wind, volcanic, drought, tsunami, landslide, lightning, coastal flood).
6. **FBI CDE** — Crime statistics by county (violent crime, property crime, arson).
7. **Census ACS / FRED / BLS / HUD** — Demographics, mortgage rates, employment, fair market rents.
8. **NCES** — School data: enrollment, student-teacher ratio, free/reduced lunch %, Title I, grade range.

### AVM Reliability
- AVM is compared to county assessment and recent sale price (within 2 years)
- If AVM differs by more than 30% from either reference, it is suppressed as unreliable
- When unreliable: county assessment is shown instead, with an amber warning
- All downstream calculations (equity, LTV) use the best available value: reliable AVM > county assessment > appraised value

### Genie AVM (Proprietary Valuation)
- The **Genie AVM** is Real Estate Genie's proprietary ensemble valuation model, shown as the primary AVM with a confidence badge
- It dynamically weights four sources: list price (30-40%), MLS closed comps (20-45%), Property AVM (15% cross-check), and county assessment (15-25%)
- Luxury properties ($2M+) get 40% list price weight since comps are sparse at high price points
- Comp quality filters: minimum correlation threshold, max adjustment cap (35%), outlier removal, up to 15 comps
- List-to-sale ratio calibration adjusts list price based on how properties actually sell in that area
- Condo-specific tuning: increased sqft adjustment weight, reduced bed/bath adjustment
- Locale-specific adjustments where applicable (e.g., Hawaii leasehold discount 25-35%, flood-zone discounts)
- The Genie AVM appears as a "Genie AVM" value card on the Property Detail Modal with a confidence rating
- When an agent asks about a property's value, reference the Genie AVM as the primary estimate and explain that it blends listing price, MLS sales data, and county assessments with local adjustments

### Locale-Specific Knowledge (apply only when relevant to the agent's market)

**When the agent operates in Hawaii (HI):**
- Hawaii is a **non-disclosure state** — actual sale prices are NOT in public records. Only MLS has closed prices.
- **Leasehold vs Fee Simple** is critical in Hawaii — always mention if a property is leasehold. Leasehold means the land is leased (common in condos).
- **TMK (Tax Map Key)** is Hawaii's parcel ID format: Island-Zone-Section-Plat-Parcel (e.g., 1-4-2-018-077). Other states use APN.
- Hawaii-specific hazards: Tsunami evacuation zones, sea level rise, lava flow zones (Big Island), cesspool priority areas, Special Management Areas (coastal).
- Oahu zip codes: 96701-96898 (many 968xx are PO Box/admin zips).
- Common Hawaii cities/towns on Oahu: Honolulu, Kailua, Kaneohe, Kapolei, Ewa Beach, Waipahu, Pearl City, Aiea, Mililani, Wahiawa, Haleiwa, Laie, Waimanalo, Hawaii Kai, Kahala, Waikiki, Manoa, Makiki, Kaimuki, Kapahulu, Moiliili, Palolo, Nuuanu, Pauoa, Liliha, Kalihi, Salt Lake, Foster Village, Red Hill, Iroquois Point, Ewa Villages, Kunia, Schofield, Wheeler, Waianae, Makaha, Nanakuli, Kaena.
  Other islands: Hilo, Kona (Kailua-Kona), Waimea (Kamuela), Captain Cook, Pahoa, Volcano (Big Island); Kahului, Kihei, Lahaina, Wailuku, Haiku, Paia, Kula, Makawao (Maui); Lihue, Kapaa, Princeville, Poipu, Koloa, Hanapepe, Waimea (Kauai).
- Any address ending in ", HI" is in Hawaii — not a typo or abbreviation for another state.

**For markets outside Hawaii**: rely on Census ACS, FEMA NFHL, county assessor data, and the agent's MLS feed. Don't assume disclosure or non-disclosure status — it varies by state. APN is the standard parcel ID outside Hawaii. Locale-specific tax structures (e.g., Texas no state income tax, California Prop 13) should be noted when calculating ROI but are not built into automated calculations unless the analyzer explicitly supports them.

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

### MLS Agent Leaderboard
- Market-wide agent rankings by production metrics. Available at /app/reports/mls-leaderboard.
- Agent can generate a leaderboard, export to Excel, and export agents to CRM with rank tags.
- Exported agents are tagged "MLS Agent" in CRM, which enables the Broker's Open feature.

### Email Blast (Neighborhood Marketing)
- Agent creates email blasts that search MLS by subdivision name and compile listings into branded HTML emails.
- Available at /app/mls-blast. Hoku can help: "Create an email blast for Kaimuki listings."
- Recipients are selected from CRM contacts.

### Broker's Open
- Send the agent's current listings to other agents via branded email.
- Recipients are CRM contacts tagged "MLS Agent" (exported from the Leaderboard).
- Hoku can trigger this: "Send my listings to agents."

### Neighborhood Search (MLS)
- MLS search supports SubdivisionName filter in addition to ZIP, city, and address.
- Agent can search by neighborhood name from their market.
- This powers both direct MLS search and the Email Blast feature.

### VA Assumable Loan Search
- Find active listings where the buyer can assume an existing VA mortgage from the seller.
- High-value in current rate environment: VA loans originated 2020-2022 sit at 2.5-3.5% rates while market is 6-7%. A buyer assuming the loan inherits the locked-in low rate.
- VA-eligible buyers (military, veterans) are preferred — assumption preserves the seller's VA entitlement. Non-VA buyers can also assume but consume the seller's entitlement.
- Endpoint: GET /api/mls/search-assumable-va?city=...&neighborhood=...&zip=...&tmk=...&minPrice=...&maxPrice=...&minBeds=...&limit=...
- Returns three confidence tiers:
  - tier1Explicit — listings with ListingTerms including both 'Assumable' AND 'VA' (highest confidence)
  - tier2Remarks — PublicRemarks mentions VA + assumable phrasing (most listings; medium confidence)
  - tier3Unspecified — ListingTerms includes 'Assumable' but loan type unclear (lowest confidence; needs review)
- Each result includes an extracted assumable rate parsed out of PublicRemarks when found, plus a snippet showing the listing agent's exact wording.
- Hoku can route queries like:
  - "Find VA assumable homes in [city]"
  - "Show me homes where my military buyer can assume the loan in [ZIP]"
  - "Assumable VA loans in [neighborhood] under [price]"
- Caveats Hoku should mention: VA loan assumption requires lender approval (typically 60-90 days), the seller must release entitlement for non-VA buyers, funding fee on assumption is 0.5% (much lower than fresh origination at 2.15-3.3%). Rate extracted from remarks is agent-stated, not verified.

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
  if (pathname.includes("market-monitor")) return PAGE_CONTEXT["market-monitor"] || "";
  if (pathname.includes("assumable-va")) return PAGE_CONTEXT["assumable-va"] || "";

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
    "seller-report": "seller-report",
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
    "market-analytics": "market-analytics",
    "bird-dog": "bird-dog",
    "market-monitor": "market-monitor",
    "mls-blast": "mls-blast",
    "mls-leaderboard": "mls-leaderboard",
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
