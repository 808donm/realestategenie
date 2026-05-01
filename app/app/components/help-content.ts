/**
 * Help content sections mapped by route path.
 *
 * Each section has an `id` used as the anchor target, a `title` for the
 * sidebar table-of-contents, and `content` with the markdown body.
 *
 * The `routes` array maps app routes to the section that should auto-scroll
 * into view when the help panel is opened.
 */

export interface HelpSection {
  id: string;
  title: string;
  content: string;
}

/** Map route path prefixes to help section IDs */
export const ROUTE_TO_SECTION: Record<string, string> = {
  "/app/dashboard": "dashboard",
  "/app/broker": "broker-dashboard",
  "/app/team-lead": "broker-dashboard",
  "/app/mls": "mls",
  "/app/property-data": "property-intel",
  "/app/seller-map": "seller-map",
  "/app/seller-report": "property-intel",
  "/app/pipeline": "pipeline",
  "/app/open-houses": "open-houses",
  "/app/leads": "leads",
  "/app/contacts": "contacts",
  "/app/analyzers": "analyzers",
  "/app/reports": "reports",
  "/app/neighborhood-profiles": "neighborhoods",
  "/app/integrations": "integrations",
  "/app/billing": "billing",
  "/app/settings": "settings",
  "/app/security": "security",
  "/app/team": "team-management",
  "/app/admin": "admin-guide",
  "/app/farm": "farm-watchdog",
  "/app/bird-dog": "property-intel",
  "/app/market-monitor": "market-monitor",
  "/app/mls-blast": "email-blast",
  "/app/reports/mls-leaderboard": "mls-leaderboard",
  "/app/calendar": "calendar",
  "/app/tasks": "tasks",
  "/app/prospecting": "property-intel",
  "/app/showing": "showing-scheduler",
};

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "getting-started",
    title: "1. Getting Started",
    content: `## 1. Getting Started

### 1.1 About The Real Estate Genie

The Real Estate Genie is a comprehensive SaaS platform designed for real estate agents, brokers, and teams. It provides tools for managing leads, analyzing investment properties, tracking deals through a visual pipeline, managing open houses, generating brokerage reports, and much more — all from a single, unified application.

The platform is available as a web application at realestategenie.app and as a mobile app for iOS and Android devices.

### 1.2 Creating Your Account

1. Navigate to **realestategenie.app/register** in your web browser.
2. Enter your full name, email address, and desired password.
3. Review and accept the End User License Agreement (EULA) and Terms of Service.
4. Click **Register** to create your account.
5. Check your email for a verification link and click it to confirm your account.
6. Sign in with your newly created credentials.

### 1.3 Signing In

1. Navigate to **realestategenie.app** and click **Sign In**.
2. Enter your registered email address and password.
3. If you have Multi-Factor Authentication (MFA) enabled, enter the verification code from your authenticator app.
4. You will be redirected to your Dashboard.

### 1.4 Setting Up Multi-Factor Authentication (MFA)

MFA adds an extra layer of security to your account. We strongly recommend enabling it.

1. Navigate to **Settings > Security** (or /app/security).
2. Click **Enable MFA**.
3. Scan the QR code with an authenticator app (such as Google Authenticator, Authy, or 1Password).
4. Enter the 6-digit verification code from your authenticator app to confirm setup.
5. Save your backup codes in a secure location in case you lose access to your authenticator.

### 1.5 Navigating the App

The main navigation menu provides access to all major sections of the application:

- **Dashboard** — Your home screen with key metrics and activity.
- **Broker Dashboard** — Advanced broker analytics (requires Brokerage Growth plan).
- **Team Dashboard** — Team activity overview (Team Leads only).
- **MLS** — Search and browse Multiple Listing Service data.
- **Pipeline** — Visual deal-flow management.
- **Open Houses** — Create and manage open house events.
- **Leads** — Manage and score incoming leads.
- **Contacts** — CRM contact management.
- **Analyzers** — 12 investment and financial analysis tools.
- **Reports** — Business reporting and analytics.
- **Neighborhoods** — Demographic and market data by neighborhood.
- **Integrations** — Connect third-party services.
- **Billing** — Manage your subscription and payments.
- **Settings** — Profile and account settings.
- **Team** — Team member management (Account Admins only).
- **Admin** — Platform administration (Platform Admins only).

### 1.6 Bootstrap Wizard

New users are greeted with a Bootstrap Wizard on their first sign-in. This guided setup walks you through essential configuration steps such as connecting integrations, setting up your profile, and familiarizing yourself with the key features of the platform.

### 1.7 User Roles

The Real Estate Genie supports several user roles, each with different levels of access:

| Role | Description |
|------|-------------|
| **Agent** | Standard user with access to all core features including Dashboard, MLS, Pipeline, Open Houses, Leads, Contacts, Analyzers, Reports, Neighborhoods, Integrations, Billing, and Settings. |
| **Team Lead** | All Agent permissions plus access to the Team Dashboard for monitoring team activity and performance. |
| **Admin (Account)** | All Agent permissions plus the ability to manage Team settings, invite and remove team members, and configure account-wide settings. |
| **Admin (Platform)** | Full platform access including the Admin panel, admin-only integrations (Stripe, PayPal, Realie.ai, Federal Data), and user management across the platform. |`,
  },
  {
    id: "dashboard",
    title: "2. Dashboard",
    content: `## 2. Dashboard

Command center for your day: needs attention, AI daily briefing, pipeline stats, tasks, upcoming events, active listings, hot-lead one-tap actions, and recent activity.

### How do I open the Dashboard?
1. Sidebar → click **Dashboard** (or /app — Dashboard is the default landing page unless you set Open Houses in Settings).

### How do I read the Needs Attention banner?
1. The amber banner at the top lists hot leads (heat score 50+) you haven't contacted in 3+ days.
2. Click any name to open the lead drawer and call/text/email.

### How do I get the AI Daily Briefing?
1. The Daily Briefing card auto-generates each morning — a numbered 1-3 item priority list (urgent follow-ups, hot lead count, today's open houses, new leads this week).
2. Click **Refresh** to regenerate on demand.

### How do I read the Pipeline Stats card?
1. The card shows a count-by-stage breakdown plus total leads and hot-lead count.
2. Click any stage to jump to that filter in the Pipeline page.

### How do I quick-complete a task from the Dashboard?
1. The **Tasks** widget shows three sections: **Overdue**, **Today**, **Upcoming** (3 each).
2. Click the checkbox next to any task to mark it done without leaving the page.
3. Click the task title to open the full task drawer.

### How do I see today's events?
1. The **Upcoming Events** card lists the next 5 events across all connected calendars (Google, Outlook, CRM, local).
2. Each event shows a colored dot for its source. Click to open the event details.

### How do I check my active listings?
1. The **Active Listings** card shows total active count, average DOM, and a warning section listing every listing with **21+ DOM** (stale).
2. Click any flagged address to jump to the property.

### How do I one-tap-contact a hot lead?
1. Scroll to **One-Tap Contact Actions**.
2. Each hot lead (heat score 70+) shows **Call**, **Text**, **Email** buttons.
3. Click **Call** to dial, **Text** to open the SMS composer (auto-logged to CRM), **Email** to compose (auto-logged).

### How do I use the Quick Actions grid?
1. The 7-button grid has: **New Open House**, **View Leads**, **Pipeline**, **MLS Search**, **Reports**, **Calculators**, **Tasks**.
2. Click any to navigate.

### How do I read the Recent Activity feed?
1. Real-time chronological feed of leads, open houses, integrations, webhooks.
2. Leads show **HOT/WARM/COLD** badges. Times are relative ("5m ago", "3d ago").
3. Click any row to open its source.

### How do I check Sync Health?
1. The **Sync Health** card shows connection status for each calendar/CRM integration with last-sync timestamp.
2. **Green** = connected, **amber** = warning, **red** = error.
3. Click any failing source to jump to Integrations and reconnect.

### How do I open Hoku from the Dashboard?
1. Click the floating **Hoku** button in the bottom-right corner (visible on every page).
2. Or press the keyboard shortcut shown on the button.

**Hoku-equivalent queries**:
- "What needs my attention today?"
- "Show me my hot leads"
- "Generate my daily briefing"
- "What's my pipeline value?"
- "Show me stale listings"`,
  },
  {
    id: "broker-dashboard",
    title: "3. Agency Dashboard",
    content: `## 3. Agency Dashboard

The Agency Dashboard provides comprehensive analytics for brokers and admins who manage multiple agents. It gives visibility into each agent's activities and aggregate brokerage performance.

**Access Requirement:** Requires the **Brokerage Growth** plan and a broker or admin role.

### 3.1 Overview Tab

At-a-glance metrics: Total Agents, Active Leads, Hot Leads, Open Houses, Closings (MTD/YTD), Pipeline Value. Below this, a 6-month trend table shows leads, closings, and revenue per month. Alerts highlight agents at retention risk and leads not contacted in 7+ days.

### 3.2 Agent Performance Tab

Sortable table with one row per agent showing: Leads Captured, Hot Leads, Open Houses, Pipeline Deals, Closings, Volume, Speed-to-Lead, Conversion Rate, MLS Searches, Reports Generated, and a Risk indicator. Click any column header to sort. Agents with 40%+ activity drops are flagged "AT RISK" in red.

### 3.3 Lead Performance Tab

- **Lead Funnel**: Visual breakdown by pipeline stage with conversion percentages
- **Leads by Source**: Horizontal bar chart showing which sources produce the most leads
- **Speed-to-Lead Leaderboard**: Agents ranked by average response time (fastest first)
- **Lead Aging**: Warnings for leads not contacted in 3+, 7+, and 14+ days

### 3.4 Open House Performance Tab

Per-agent breakdown: events held, total check-ins, average check-ins per open house, hot leads generated, and conversion rate.

### 3.5 Financial Tab

Commission by agent (MTD), total volume, estimated commission, pipeline deals. Revenue trend table showing closings and revenue by month. Totals at the bottom for Revenue MTD, Total Volume, and Pipeline Value.

### 3.6 Activity & Risk Tab

Per-agent activity metrics: MLS Searches performed, Reports Generated, Last Active date, and overall status (Active/Inactive/At Risk). Retention risk section highlights agents with significant activity drops.`,
  },
  {
    id: "calendar",
    title: "4. Calendar",
    content: `## 4. Calendar

Unified calendar across Google, Outlook/Microsoft, your CRM, and local app events. Two-way sync — changes in any source flow to the others.

### How do I open the Calendar?
1. Sidebar → click **Calendar** (or /app/calendar).

### What sources show on the Calendar?
- **Google Calendar** — blue dot. Connect via OAuth on the Integrations page.
- **Outlook/Microsoft** — green dot. Connect via OAuth on the Integrations page.
- **CRM Calendar** — purple dot. Connects automatically when CRM is connected.
- **Local** — gray dot. Events created in-app.

### How do I switch views?
1. At the top of the Calendar, click **Month**, **Week**, or **Day**.
2. Use the arrow buttons to move between periods.
3. Click **Today** to jump back to today.

### How do I create an event?
1. Click **Create Event** in the top-right (or click any empty slot on the grid).
2. Enter **Title**, **Description**, **Location**.
3. Set **Start** and **End** date/time, or toggle **All Day**.
4. Pick which **Calendar** to create the event in (Google, Outlook, CRM, or Local).
5. Add **Attendees** by email if needed.
6. Click **Save**.

### How do I edit or delete an event?
1. Click the event on the grid.
2. In the popover, click **Edit** to change details, or **Delete** to remove.
3. **Save** changes.

### How do I force a calendar sync?
1. Click **Sync** in the top-right.
2. The badge updates with the sync timestamp when complete.

### How do I show or hide a specific source?
1. In the **Sources** panel on the left, toggle the source on/off.
2. Events from hidden sources disappear from the grid (no data is deleted).

### How does conflict resolution work?
1. **App edits** win by default if the same event was modified in both places.
2. **CRM-booked meetings** (from online booking pages) always take precedence — they reflect a live customer-confirmed slot.

**Hoku-equivalent queries**:
- "Add a showing on [date] at [time] for [address]"
- "What's on my calendar this week?"
- "Show my open houses tomorrow"
- "Reschedule [event] to [new time]"`,
  },
  {
    id: "mls",
    title: "5. MLS",
    content: `## 5. MLS (Multiple Listing Service)

The MLS section provides 9 tabs for working with MLS data, powered by your MLS provider.

### 5.1 Prerequisites

Your account must have MLS credentials configured. This is set up by a platform administrator under **Integrations**. If you do not see MLS data, contact your administrator.

### 5.2 MLS Search (Tab 1)

The MLS Search tab lets you search live listings across every status (Active, Pending, Closed, Expired, Withdrawn, Canceled), filter by 27+ property features, and open each result in a full Property Detail Modal.

### How do I open MLS Search?

1. In the left sidebar, click **MLS**.
2. The page opens on the **Search & Listings** tab by default.

### How do I search by address, ZIP, or city?

1. Open MLS Search.
2. In the **Search** field at the top, type any of: a street address, a ZIP code, a city name, or a building/condo name.
3. Press Enter or click the **Search** button.
4. Listings matching your query appear in the results grid below.

### How do I search by neighborhood or subdivision?

1. Open MLS Search.
2. Scroll to the **Filters** sidebar (or click the filter icon on mobile).
3. Find the **Neighborhood / Subdivision** field.
4. Type the neighborhood or subdivision name as it appears in the MLS.
5. Click **Apply Filters**.

### How do I filter by listing status?

1. Open MLS Search.
2. In the **Status** filter, check the boxes for the statuses you want: **Active**, **Pending**, **Closed**, **Expired**, **Withdrawn**, **Canceled**.
3. Click **Apply Filters**.

### How do I filter by property type, price, beds, or DOM?

1. Open MLS Search.
2. In the **Filters** sidebar, set:
   - **Property Type**: Residential, Condominium, Townhouse, Land, Multi-Family, etc.
   - **Price Range**: drag the min and max sliders or type values
   - **Beds / Baths**: minimum counts
   - **Days on Market**: minimum DOM (useful for stale-listing prospecting)
3. Toggle **Rentals** if you want to include rental listings.
4. Click **Apply Filters**.

### How do I read the badges on a listing card?

Each card shows up to four colored badges to flag time-sensitive signals:
- **Blue: New** — on market less than 7 days
- **Purple: Back on Market** — was previously off-market and is active again
- **Green: Price Down** — most recent price change was a reduction
- **Red: Price Up** — most recent price change was an increase

### How do I open a listing's full detail?

1. Click anywhere on the listing card.
2. The **Property Detail Modal** opens with tabs: Overview, Photos, AVM, Equity, Sales History, Comps, Hazards, Schools, Crime, Neighborhood, Owner, Reports, Hoku.
3. Use the modal tabs to explore every available data source for that property.
4. Close the modal with the **X** in the top-right or the **Esc** key.

### How do I see only my own listings?

1. Open the MLS Search page.
2. Click the **My Listings** sub-tab next to **Search & Listings**.
3. The grid shows only listings where you are the listing agent, with an MLS sync status indicator on each card.

### How do I generate an AI listing description?

1. Open the **My Listings** sub-tab (or open any listing's Property Detail Modal).
2. Click the **AI Description** button.
3. Choose a tone: Professional, Conversational, Luxury, Quick & Punchy, or Detail-Heavy.
4. Click **Generate**.
5. Review the draft. Click **Regenerate** to try a different version, or **Copy** to use it.
6. Drafts are Fair Housing compliance-checked automatically before display.

### How do I generate AI social media content?

1. Open the **My Listings** sub-tab (or any listing modal).
2. Click the **AI Social** button.
3. Pick a platform: Instagram, Facebook, LinkedIn, or TikTok.
4. Click **Generate**.
5. The output includes a platform-appropriate caption, hashtags, and (for video platforms) a script outline.
6. Click **Copy** on each section to paste into the platform's composer.

### Hoku-equivalent

Instead of the page, ask Hoku:
- "Search MLS for 3-bed homes under [price] in [city]"
- "Show me Active listings on [street name]"
- "Pull stale listings (DOM > 90) in [ZIP]"
- "Generate a Professional description for my listing on [street]"
- "Write an Instagram post for [MLS#]"

**VA Assumable Loan Search**: For military buyers (or any buyer who can assume an existing VA mortgage), this search finds active listings where the seller's VA loan can be inherited at the original locked-in rate — typically 2.5-3.5% on loans originated 2020-2022. Real $1,000-2,000/mo savings vs current market rates.

The page supports four search modes: **City**, **Neighborhood**, **ZIP Code**, and **TMK / Parcel Number**. Pick one mode at a time — fields from inactive modes are not used in the query.

### How do I open the VA Assumable search page?

1. In the left sidebar, click **Opportunities** to expand it.
2. Click **VA Assumable** in the submenu.
3. Or navigate directly to /app/mls/assumable-va in your browser.

### How do I search VA-assumable homes by City?

1. Open the VA Assumable page.
2. Click the **City** tab at the top of the search form (selected by default).
3. In the **City** field, type the city name. Match is case-insensitive substring.
4. Optionally narrow with **Min Beds**, **Min Price**, and **Max Price**.
5. Click **Search VA Assumable**.
6. Review results in three confidence tiers (Tier 1 explicit MLS tags, Tier 2 remarks text-mining, Tier 3 unspecified).

### How do I search VA-assumable homes by Neighborhood?

1. Open the VA Assumable page.
2. Click the **Neighborhood** tab at the top of the search form.
3. In the **Neighborhood / Subdivision** field, type the neighborhood or subdivision name. Match is case-insensitive substring on the SubdivisionName field.
4. Optionally narrow with **Min Beds**, **Min Price**, and **Max Price**.
5. Click **Search VA Assumable**.

Tip: neighborhood matching depends on listing-agent tagging. If a neighborhood search returns nothing, try the City mode or use a ZIP that covers the same area.

### How do I search VA-assumable homes by ZIP Code?

1. Open the VA Assumable page.
2. Click the **ZIP Code** tab at the top of the search form.
3. In the **ZIP Code** field, type a 5-digit ZIP. Partial ZIPs (first 3 digits) are accepted — match uses startswith.
4. Optionally narrow with **Min Beds**, **Min Price**, and **Max Price**.
5. Click **Search VA Assumable**.

### How do I search VA-assumable homes by TMK / Parcel Number?

1. Open the VA Assumable page.
2. Click the **TMK / Parcel** tab at the top of the search form.
3. In the **TMK / Parcel Number** field, type the parcel number (called TMK in Hawaii, APN in most other states). Dashes are optional — the search strips them and matches on substring.
4. Optionally narrow with **Min Beds**, **Min Price**, and **Max Price** (most parcel searches return a single property, so price filters are usually unnecessary).
5. Click **Search VA Assumable**.

This mode is useful when an agent already has the parcel ID from a property tax record or a prospect list and wants to confirm whether that specific property is currently a VA-assumable opportunity.

### How do I read the result cards?

Each listing card shows:
- **Address** and city/state/ZIP at the top
- **List price** in the top right
- **Beds / baths / sqft / year built / property subtype / MLS#** in the meta row
- **Big green rate badge** (e.g., "2.75%") when the assumable rate was extracted from listing remarks
- **Monthly savings** (e.g., "$1,847/mo savings vs 6.5% market") computed at 80% LTV / 30-year mortgage
- **Remarks snippet** — the listing agent's exact wording about the assumable loan
- **Listing agent attribution**
- **View Listing →** link opens the full MLS detail

### How do I adjust the savings calculation?

By default savings are computed against a **6.5%** market rate. To model the deal at your buyer's actual rate quote:

1. Locate the "Compare savings against market rate of X%" field at the bottom of the search form.
2. Type your buyer's rate quote (e.g., 6.875).
3. The savings on every result card recomputes automatically — no need to re-search.

### How do I share a result with my buyer?

For now, click **View Listing →** on the card to open the full MLS details, then use your normal listing-share workflow (CRM → send via email/SMS, or save to a buyer's saved-search). A built-in "Send to Buyer" button is on the roadmap.

### What if the search returns no results?

VA-assumable listings are scarce. Try:
1. **Widen filters**: drop Min Beds, broaden price range.
2. **Switch search modes**: a ZIP search often catches listings that a Neighborhood search misses (subdivision tagging is inconsistent).
3. **Drop the geo filter entirely** to verify there are *any* VA-assumable listings in your MLS region.
4. **Ask Hoku**: "Are there any VA assumable listings in my MLS right now?" — Hoku will suggest follow-ups based on the result.

### Caveats every agent should tell the buyer

- VA loan assumption requires lender approval (typically 60-90 days)
- VA-eligible buyers (military / veterans) preserve the seller's VA entitlement; non-VA buyers can also assume but consume it
- Funding fee on assumption is **0.5%** of loan balance — vs. **2.15-3.3%** on a fresh origination
- The rate displayed on result cards is extracted from the listing's public remarks. It is **agent-stated, not verified**. Confirm with the listing agent before quoting a buyer.
- Monthly savings shown assume 80% LTV. The actual assumed loan balance depends on what the seller has paid down — confirm the actual balance with the listing agent.

### Hoku-equivalent

Instead of the page, you can also ask Hoku:
- "Find VA assumable homes in [your city] under [price]"
- "Show me homes my military buyer can assume in [ZIP]"
- "Look up parcel [number] for VA assumable"
- "Are there any VA-assumable listings in [neighborhood] with 3+ beds?"

Hoku will run the same search and summarize the top results inline.

API endpoint: GET /api/mls/search-assumable-va?city=...&neighborhood=...&zip=...&tmk=...&minPrice=...&maxPrice=...&minBeds=...

Results come back in three confidence tiers:
- **Tier 1 — Explicitly tagged**: Listing agent checked AssumableYN AND included VA in ListingTerms. Highest confidence; usually 5-15% of true VA-assumable inventory.
- **Tier 2 — Mentioned in remarks**: Listing description contains phrases like "Assumable VA", "Assume our VA loan", or specific rate language ("Assume at 2.875%"). Where most real inventory lives.
- **Tier 3 — Assumable, loan type unclear**: AssumableYN=true but the financing type isn't specified. Manual review needed — could be VA, FHA, or conventional.

When a rate appears in the public remarks (e.g., "Assume our 2.875% VA loan!"), the system extracts it and displays alongside the listing — agents can immediately see the savings vs current market rates.

Caveats agents should know:
- VA loan assumption requires lender approval (typically 60-90 days)
- VA-eligible buyers (military, veterans) are preferred — assumption preserves the seller's VA entitlement so the seller can use VA financing again later
- Non-VA buyers can also assume VA loans, but consume the seller's entitlement
- Funding fee on assumption is 0.5% of loan balance (much lower than 2.15-3.3% on a fresh origination)
- Rates extracted from remarks are agent-stated, not verified — confirm with the listing agent before quoting to a buyer

### 5.3 Market Monitor (Tab 2)

Market Monitor monitors market activity for a specific zip code or area.

1. Enter a zip code and select a timeframe (24 hours, 7 days, 30 days, or 90 days).
2. Toggle between **Map View** (Google Maps with color-coded markers) and **Hot Sheet View** (sortable spreadsheet).
3. Filter by status badges: Active, Pending, Closed, New, Back on Market, Price Increase, Price Decrease.
4. Map markers are color-coded by status and shaped by property type (circle = residential, diamond = condo, triangle = land).
5. Click any listing for full details.

### 5.4 Market Snapshot (Tab 3)

Real-time market statistics computed from MLS data.

1. Go to **MLS** > **Market Snapshot** tab.
2. Select a county from the dropdown.
3. View the **Market Temperature** gauge to see whether it is a buyer's or seller's market.
4. Review the **Quick Stats** cards: Closed Sales, Pending, Active, Months of Inventory, Days on Market, and Sale-to-List Ratio. Each card shows a 90-day trend arrow.
5. Analyze the **12-month bar charts** for Average Sales Price and Sales Activity trends.

Data is cached for 24 hours.

### 5.5 Market Analytics (Tab 4)

County-level market statistics dashboard. Combines MLS data with market-stats provider and HUD Fair Market Rents into one shareable analytics page. Cached 24 hours.

### How do I open Market Analytics?
1. In the left sidebar, click **MLS**.
2. Click the **Market Analytics** tab.

(Or go directly via Sidebar → **Deals** → **Market Analytics**.)

### How do I read the overview cards?
At the top of the page, the overview row shows:
- **Median Sale Price** — across all property types
- **SFR Median** — Single-Family Residence median
- **Condo/TH Median** — Condo + Townhouse median
- **$/Sqft** — median price per square foot
- **DOM** — median days on market
- **YoY Price Change** — year-over-year median price delta
- **Sales Momentum** — 6-month vs prior 6-month volume change
- **MLS Active** — current active listing count
- **MLS Closed (30d)** — closings in the last 30 days

### How do I drill into a specific ZIP?
1. Scroll to the **Sales Price by ZIP Code** table.
2. Click a ZIP row.
3. The breakdown panel opens with that ZIP's median, SFR median, Condo/TH median, $/sqft, listing count, DOM, and median rent.

### How do I read the grouped bar chart?
1. Scroll to the **Median Sale Price by ZIP** chart.
2. Each ZIP has two adjacent bars: SFR (red) vs Condo/TH (blue).
3. Sorted by SFR price descending. Hover any bar to see the exact value.

### How do I switch counties?
1. Click the **County** dropdown at the top of the page.
2. Pick the county you want.
3. The page reloads with that county's data.

### How do I export the data?
1. Click **Export** in the top-right of the page.
2. Choose **CSV** for the raw ZIP-level table or **PDF** for a branded report.

### Data sources

MLS (active and closed listings), market-stats provider (volume momentum and YoY), HUD (Fair Market Rents). All data cached 24 hours; refresh by reloading the page or clicking **Refresh** in the top-right.

### Hoku-equivalent
- "What's the median price in [county]?"
- "Show me YoY price change for [county]"
- "Compare SFR vs Condo medians in [ZIP]"
- "Export market analytics for [county] as PDF"

### 5.6 CMA — Comparative Market Analysis (Tab 5)

The CMA tab pulls comparable sales (Active / Pending / Closed within the same area, last 6 months by default), scores each comp's correlation to the subject property, calculates a suggested price range, and lets you save the report. When MLS comps are sparse, the system automatically falls back to public-records and AVM data.

### How do I open the CMA tab?

1. In the left sidebar, click **MLS**.
2. Click the **CMA** tab.

### How do I run a CMA from scratch?

1. Open the CMA tab.
2. Enter the subject property in the **Subject Property** form:
   - **Address**, **City**, **Postal Code**
   - **List Price** (or your target price if not listed)
   - **Beds**, **Baths**, **Living Area (sqft)**, **Year Built**, **Property Type**
3. Click **Run CMA**.
4. The page shows comp counts (total / active / pending / sold), average & median price, price per sqft, average DOM, list-to-sale ratio, and a suggested price range.
5. Scroll to the **Comps** table to review each comparable property with its correlation score.

### How do I run a CMA for an existing listing?

1. Open MLS Search and find the listing.
2. Click the listing card to open the Property Detail Modal.
3. Click the **Comps** tab inside the modal.
4. Click **Run CMA**.
5. The CMA pre-fills the subject details from the listing — review and click **Run** if you want to adjust any field first.

### How do I adjust comp filters?

1. In the CMA results, find the **Filters** panel above the comps table.
2. Adjust:
   - **Comp window** (default last 6 months)
   - **Distance radius** (default 1 mile)
   - **Sqft band** (default ±15%)
   - **Status** (Active / Pending / Closed checkboxes)
3. Click **Re-run** to refresh the comp set.

### How do I view the correlation score on each comp?

Each comp row in the table shows a **Correlation %** column — higher percentages mean closer match to the subject in size, age, beds/baths, and location. Comps below a minimum threshold are auto-excluded; you can override by clicking **Include** on any row.

### How do I save the CMA?

1. After running the CMA, click the **Save** button in the top-right of the results panel.
2. Give the saved CMA a name (defaults to the subject address).
3. The CMA appears under **Saved CMAs** at the top of the page for one-click reload later.

### How do I generate a CMA Report PDF?

1. After running or loading a CMA, click **Generate Report**.
2. Choose the report style.
3. The branded PDF includes: cover page with map, subject property details, comp table with adjustments, suggested price range, market context, and your agent branding.
4. Download or share the PDF link.

### What if MLS data is limited or returns no comps?

1. The system automatically falls back to public-records and AVM providers when MLS comp counts are low.
2. Comp count and source badges in the results panel make this transparent.
3. If the AVM-only fallback still doesn't return enough data, widen the comp window or distance radius and re-run.

### Hoku-equivalent

Instead of the page, ask Hoku:
- "Run a CMA for [address]"
- "What are the closed comps within a half mile of [address]?"
- "Suggested price for [address] based on the last 6 months"
- "Generate a CMA Report for [MLS#]"

### 5.7 Lead Matches (Tab 6)

Automatically matches your pipeline leads to active MLS listings based on their criteria (neighborhoods, must-haves, timeline, financing). Each match is scored 0-100 with match reasons. Top 5 matches per lead. Matches can be saved and tracked (new/sent/viewed/dismissed).

### 5.8 OH Sync (Tab 7)

Two-way open house synchronization between MLS and your local database. Pull upcoming open houses from MLS as draft events. Track which local events have been synced to MLS. Prevents duplicate imports via MLS key tracking.

### 5.9 Investment (Tab 8)

Multi-unit property analysis with per-unit breakdown (type, beds/baths, actual rent, pro forma rent). Calculates total units, monthly rent, and average rent. Auto-fills BRRRR and Flip analyzers from the investment data.

### 5.10 Hazard Map (Tab 9)

View flood, tsunami, and sea level rise hazard zones on an interactive map.

1. Go to **MLS** > **Hazard Map** tab.
2. Enter an address or ZIP code to center the map on that location.
3. Toggle hazard layers on/off in the sidebar panel.
4. Layer colors: **Blue** = FEMA Flood Zones, **Cyan** = Tsunami Evacuation Zones, **Teal** = Sea Level Rise (0.5-3.2 ft gradient).
5. The map automatically selects Hawaii GIS layers or FEMA NFHL depending on location.
6. You can also open the Hazard Map directly from a property's detail modal.`,
  },
  {
    id: "pipeline",
    title: "6. Pipeline",
    content: `## 6. Pipeline

The Pipeline provides a visual, Kanban-style board for managing your deal flow from initial lead to closing.

### How do I open the Pipeline?
1. In the left sidebar, click **Pipeline**.
2. The page opens to the Kanban board with 11 stages.

### How do I move a deal between stages?
1. Open the Pipeline.
2. Click and hold any deal card.
3. Drag it to the target stage column.
4. Release. The deal updates instantly and the stage change is logged.

### How do I view a deal's details?
1. On the Pipeline board, click the deal card (don't drag — just click).
2. The deal detail modal opens with: contact info, notes history, conversation history, action buttons.
3. From the modal you can: draft emails, create tasks, advance to next stage, or mark as lost.

### How do I draft an email to a deal contact?
1. Open the deal's detail modal.
2. Click the **Email** action button.
3. Pick a template or start from scratch.
4. Edit the subject and body.
5. Click **Send**. The thread is logged to the deal's history.

### How do I advance a deal to the next stage?
1. Open the deal's detail modal.
2. Click **Next Stage** in the top-right of the modal — OR drag the card on the board.
3. The new stage timestamp is recorded for cycle-time analytics.

### How do I mark a deal as lost?
1. Open the deal's detail modal.
2. Click **⋯** menu → **Mark as Lost**.
3. Pick a loss reason from the dropdown (price, timing, agent fit, etc.).
4. Confirm. The deal moves to a Lost archive and counts toward your lost-deal analytics.

### How do I switch between multiple pipelines?
1. On the Pipeline page, find the **Pipeline** dropdown at the top of the board.
2. Select the pipeline you want (e.g., Listings, Buyers, Investors).
3. The board reloads with that pipeline's stages.

### Pipeline stages reference

11 default stages, each with a unique color:
1. New Lead · 2. Initial Contact · 3. Qualification · 4. Initial Consultation · 5. Property Search / Listing Prep · 6. Open Houses & Tours · 7. Offer & Negotiation · 8. Under Contract / Escrow · 9. Closing Coordination · 10. Closed & Follow-up · 11. Review Request

CRM sync (if connected): your pipeline stages map to CRM pipeline stages. Deals auto-advance when emails or SMS are sent. Local pipeline is also available for agents without CRM.

### How do I open the Tasks page?
1. In the left sidebar, click **Tasks**.
2. The page opens to the **Today** tab by default.

### How do I create a task?
1. Open the Tasks page.
2. Click **+ New Task** in the top-right.
3. Enter the **Title** (required).
4. (Optional) Add description, set priority (Urgent / High / Medium / Low), due date and time, type (General / Follow-Up / Call / Email / Meeting / Showing / Document / Closing), and recurrence (Daily / Weekly / Bi-weekly / Monthly / Quarterly).
5. (Optional) Link the task to a Lead, Contact, Open House, or Transaction.
6. Click **Save**.

### How do I see overdue or upcoming tasks?
1. Open the Tasks page.
2. Click one of the tabs at the top: **All**, **Overdue**, **Today**, **Upcoming**, **Completed**.

### How do I mark a task complete?
1. Find the task in any tab.
2. Click the checkbox on the left of the task row.
3. The task moves to **Completed** with a timestamp.

### How do I snooze a task?
1. Click the **Snooze** icon on the task row.
2. Choose Tomorrow, Next Week, 2 Weeks, or **Custom Date**.
3. The due date updates accordingly.

### How do I bulk-complete or bulk-delete tasks?
1. Check the boxes on multiple task rows.
2. The bulk-action bar appears at the top with **Complete**, **Snooze**, **Delete**.
3. Click the action you want. Confirm if prompted.

### Hoku-equivalent (Pipeline)
- "Move [deal name] to Offer & Negotiation"
- "Show me my deals in Under Contract"
- "What's in stage 7 of my Buyers pipeline?"
- "Mark [deal name] as lost — reason: timing"

### Hoku-equivalent (Tasks)
- "Add a task to call [contact] tomorrow at 10am"
- "What's overdue on my task list?"
- "Snooze [task title] for a week"
- "Complete all tasks linked to [deal name]"`,
  },
  {
    id: "open-houses",
    title: "7. Open Houses",
    content: `## 7. Open Houses

The Open Houses section provides complete open house lifecycle management with built-in QR-code-based lead capture.

### How do I open the Open Houses page?
1. In the left sidebar, click **Open Houses**.
2. The page shows your upcoming, draft, and past events.

### How do I create an open house from MLS?
1. Open the Open Houses page.
2. Click **Create Open House**.
3. Choose **Event Type**: Sales (buyer check-in), Rental Showing (rental application), or Both.
4. In **Import from MLS**, search by MLS Number or by Address.
5. Click the matching listing — address, beds, baths, sqft, price, description, key features, photos, and location auto-fill.
6. Set the **Start Date/Time** and **End Date/Time**.
7. Click **Save**. The event is created as a Draft.

### How do I create an open house manually (without MLS)?
1. Open the Open Houses page.
2. Click **Create Open House**.
3. Choose Event Type.
4. Click **Skip Import** (or scroll past Import from MLS).
5. Manually enter address, beds, baths, sqft, price, description.
6. Upload photos in the **Property Photos** section.
7. Set Start/End Date/Time and click **Save**.

### How do I pick a flyer template?
1. Open the open house event detail page (click the event card from the list).
2. Scroll to the **Flyer Template** section.
3. Click one: **Modern** (clean default), **Modern Blue** (blue-themed), or **Elegant Warm** (warm tones).
4. Each template shows custom color swatches and image slot positions.

### How do I upload photos to the flyer?
1. On the event detail page, scroll to the **Photos** section.
2. Click each image slot (Primary, Secondary, Tertiary depending on template).
3. Choose a JPEG, PNG, or WebP under 5 MB.
4. Repeat for each slot the template supports.

### How do I download the flyer PDF?
1. On the event detail page, click **Download Flyer**.
2. Wait 5-10 seconds for the branded PDF to render.
3. Save the file. It includes your name, license, phone, headshot, brokerage logo, property photos, address, date/time, beds/baths/sqft/price, key features, location map, and a QR check-in code.

### How do I publish the open house so guests can check in?
1. On the event detail page, find the **Status** selector at the top.
2. Change it from **Draft** to **Published**.
3. The QR check-in URL is now live (until the event ends + 72 hours).
4. Print the flyer and display it at the property entrance for the open house.

### How do I view who checked in?
1. Open the event detail page after the open house.
2. Click the **Attendees** tab.
3. Each row shows name, email, phone, sign-in time, representation status, timeline, and financing.
4. Click **Export to CSV** to download the list.

### How do I view my open house performance?
1. Open the event detail page.
2. Click the **Scorecard** tab.
3. View metrics: sign-ins captured, contacted within 5 minutes %, represented-by-realtor %, looking-for-agent %.
4. The overall performance score (0-100) combines these.

### How does QR check-in work for guests?
1. Visitor at the open house scans the QR code on the printed flyer with their phone camera.
2. Phone opens a secure registration page (token expires 72 hours after event end).
3. Guest fills in: contact info (name, email, phone), email + SMS consent, representation (Y/N), timeline, financing, neighborhoods, must-haves.
4. On submit: guest is auto-scored 0-100 heat score, entered into the agent's pipeline, and synced to the CRM if connected.
5. The check-in page only works when the event status is **Published**.

### Hoku-equivalent
- "Create an open house for [MLS#] this Saturday from 1pm to 4pm"
- "Show me attendees from yesterday's open house"
- "What was the heat score on [guest name]?"
- "Download the flyer for [event name]"`,
  },
  {
    id: "leads",
    title: "8. Leads",
    content: `## 8. Leads

The Leads section manages prospects automatically captured from open house QR check-ins, lead-source webhooks, and other intake channels.

### How do I open the Leads page?
1. In the left sidebar, click **Leads**.
2. The page opens with summary charts at the top and a filtered lead list below.

### How do I view only Hot leads?
1. Open the Leads page.
2. Click the **Hot** tab (heat score 80+).
3. The list filters to your highest-priority leads.

### How do I view Warm, Cold, or DNC leads?
1. Open Leads.
2. Click the appropriate tab: **Warm** (50-79), **Cold** (<50), or **DNC** (Do Not Contact — already has an agent).

### How do I contact a lead from the list?
1. Find the lead row.
2. Click the **Phone** icon to call, **Message** icon to text, or **Email** icon to email.
3. Calls/texts/emails are logged to the lead's activity history automatically.

### How do I see a lead's full detail?
1. Click the lead's name in any tab.
2. The lead detail panel opens with: contact info, source, heat score breakdown, property of interest, timeline, financing, neighborhoods, must-haves, and full conversation history.

### How do I export the lead list?
1. Open the Leads page.
2. Set any tab filter (Hot, Warm, Cold, DNC, All).
3. Click **Export** in the top-right.
4. Choose **PDF** or **XLSX**.

### How do I read the analytics charts?
1. Scroll to the top of the Leads page.
2. The charts auto-update as new leads come in:
   - **Leads by Source**: which channel (Open House, lead-source feed, organic web, social) is producing leads
   - **Leads by Event**: which open houses generated the most leads
   - **Heat Score Distribution**: histogram of lead quality
   - **Pipeline Stage Breakdown**: how leads are progressing
   - **Leads Over Time** (weekly): velocity of new leads
   - **Buyer Readiness**: timeline-based readiness mix

### How heat scoring works (for context)

Every lead is auto-scored 0-100 at check-in:
- Contact Info (30 pts): Email (10) + Phone (10) + Email consent (5) + SMS consent (5)
- Representation (20 pts): No agent (20), Unsure (10), Has agent (5)
- Agent Reach Out (15 pts): Opted in to be contacted
- Timeline (20 pts): 0-3 months (20), 3-6 months (15), 6+ months (10), Just browsing (5)
- Financing (15 pts): Pre-approved/Cash (15), Needs lender (10), Not sure (5)
- Specificity (10 pts): Neighborhoods (5) + Must-haves (5)
- Multiple visits to the same property boost the score to 100 (RED HOT)

DNC: Leads who indicated they already have a realtor are auto-classified DNC (gray). They should not be solicited.

CRM sync: When a lead is submitted, it syncs to the connected CRM and triggers webhooks. Hot leads (80+) trigger a separate Hot Lead webhook. Pipeline stages auto-advance when communication occurs.

### Hoku-equivalent
- "Show me my hot leads"
- "Who came to my open house yesterday?"
- "What's the heat score on [lead name]?"
- "Export this week's leads to PDF"
- "Move [lead name] to the buyer pipeline"`,
  },
  {
    id: "contacts",
    title: "9. Contacts",
    content: `## 9. Contacts

The full address book — every contact synced from your CRM. Different from **Leads** (which are auto-captured from open-house check-ins): Contacts are the long-term database that lives in your CRM.

### How do I open Contacts?
1. Sidebar → click **Contacts** (or /app/contacts).
2. Requires CRM integration. If not connected, a warning banner links you to Integrations.

### How do I find a contact?
1. Type in the **Search** field at the top (debounced — results refresh as you type).
2. Search matches name, email, phone, and tags.

### How do I view a contact's detail?
1. Click any contact row.
2. The detail page shows full profile, communication history, notes, and tags from your CRM.

### How do I call/text/email a contact?
1. From the contact list, click the **Call**, **Text**, or **Email** button on the row.
2. Or open the detail page and use the same buttons in the header.
3. All communication is logged automatically to the contact's CRM record.

### How do I add a new contact?
1. Click **Add Contact** in the top-right.
2. Enter **First Name**, **Last Name**, **Email**, **Phone**, **Address** (optional).
3. Click **Save**.
4. The contact syncs to your CRM automatically.

### How do I tag a contact?
1. Open the contact's detail page.
2. Click the **Tags** field → type a tag name → press Enter.
3. Use existing tags by clicking them in the dropdown.
4. Tags sync back to the CRM and become available in Email Blast audience filtering.

### How do I send bulk Email or SMS to multiple contacts?
1. From the contact list, click the checkbox on each contact you want to include.
2. Click **Bulk Email** or **Bulk SMS** in the action bar.
3. Compose the message → click **Send**.
4. Review the sent/failed counts after delivery.

### How do I export my contacts?
1. (Optional) Apply a filter or select specific contacts.
2. Click **Export** in the top-right.
3. Choose **PDF** or **Excel (XLSX)**.
4. The file downloads with columns: Name, Email, Phone, City, Tags.

### How do I keep contacts and leads in sync?
1. Leads automatically promote into Contacts when a lead is moved past the **New Lead** stage in your pipeline.
2. Existing CRM contacts who match an incoming lead by email/phone are linked rather than duplicated.

**Hoku-equivalent queries**:
- "Find [name] in my contacts"
- "Add [name] as a contact with email [email] and phone [phone]"
- "Tag [name] as [tag]"
- "Email all my [tag] contacts"
- "Export contacts tagged [tag] to Excel"`,
  },
  {
    id: "analyzers",
    title: "9. Investment Analyzers",
    content: `## 9. Investment Analyzers

13 financial calculators for evaluating deals: investment property, BRRRR, flip, rental, STR, 1031, mortgage, net sheets, commission splits, and more. Most support MLS auto-import and PDF/Excel export.

### How do I open the Analyzers?
1. Sidebar \u2192 click **Analyzers** (or /app/analyzers).
2. The page shows a tile grid of all 13 calculators.

### How do I auto-import a property from MLS into any analyzer?
1. Open the calculator.
2. Click **Import from MLS**.
3. Search by address or MLS number \u2192 click the result.
4. Address, purchase price, taxes, beds/baths populate automatically.
5. Fill in remaining fields (loan terms, rent, etc.) and run the calculation.

### How do I export results?
1. After running any calculation, click **Export PDF** (branded) or **Export Excel** in the top-right.
2. Or click **Email** to send results directly to a CRM contact.

### How do I save an analysis for later?
1. Click **Save Analysis** in the top-right.
2. Enter a name and pick a folder.
3. Re-open from the **Saved** tab on the Analyzers page.

### How do I run an Investment Property analysis?
1. From the Analyzers page, open **Investment Property**.
2. Enter **Purchase Price**, **Down Payment**, **Interest Rate**, **Loan Term**, **Monthly Rent**, and **Operating Expenses**.
3. Click **Calculate**.
4. Review **ROI**, **Cap Rate**, **IRR**, **Cash-on-Cash Return**, and 30-year projections.
5. (Optional) Click **Save Analysis** to persist for the Compare Properties tool.

### How do I compare multiple investment properties?
1. Open **Compare Properties**.
2. Click each saved property to add it to the comparison (up to 5 at a time).
3. Review the side-by-side table \u2014 Cap Rate, Cash-on-Cash, IRR, Total ROI, Composite Score.
4. Sort by any metric to rank.

### How do I run a Rental Property analysis?
1. Open **Rental Property**.
2. Enter purchase price, financing, monthly rent, and operating expenses.
3. Click **Calculate**.
4. Review **NOI**, **Cap Rate**, **Cash-on-Cash**, **DSCR**, **GRM**, and monthly cash flow.

### How do I run a Short-Term Rental (STR) analysis?
1. Open **STR Analyzer**.
2. Enter nightly rate, expected occupancy %, cleaning fees per turnover, and operating expenses.
3. (Locale taxes apply automatically \u2014 e.g., GET + TAT for Hawaii markets.)
4. Click **Calculate**.
5. Review monthly and annual cash flow, expense breakdown chart, and multi-year revenue projection.

### How do I run a House Flip analysis?
1. Open **House Flip Analyzer**.
2. Enter **Purchase Price**, **ARV** (after-repair value), and **Renovation Budget**.
3. Click **Calculate**.
4. Review **70% Rule compliance**, projected gross/net profit, ROI, and annualized ROI.
5. (Optional) **Save Analysis**.

### How do I run a Quick Flip score?
1. Open **Quick Flip Analyzer**.
2. Enter ARV, repair costs, target purchase price.
3. Instantly see deal score, projected profit, ROI, 70% Rule pass/fail.

### How do I run a Wholesale MAO calculation?
1. Open **Wholesale MAO Calculator**.
2. Enter **ARV**, **Repair Costs**, and **Your Wholesale Fee**.
3. Click **Calculate**.
4. Review **MAO**, low/mid/high offer range, and investor margin.

### How do I run a BRRRR analysis?
1. Open **BRRRR Calculator**.
2. Enter purchase price, renovation costs, and ARV.
3. Enter refinance terms (LTV %, rate, term).
4. Enter projected rental income and operating expenses.
5. Click **Calculate**.
6. Review whether the deal hits **infinite returns** (all initial capital recovered at refi), 5-year projections, and equity capture.

### How do I plan a 1031 Exchange?
1. Open **1031 Exchange Analyzer**.
2. Enter the relinquished property's sale price, adjusted basis, and depreciation recapture.
3. Add up to 3 candidate replacement properties.
4. Click **Calculate**.
5. Review the **45-day identification deadline**, **180-day close deadline**, estimated tax savings, and 3-property rule validation.

### How do I run a Mortgage Calculator?
1. Open **Mortgage Calculator**.
2. Enter loan amount, rate, term, taxes, insurance.
3. (Optional) Add HOA and PMI.
4. Click **Calculate**.
5. Review the PITI breakdown and full amortization schedule.
6. Click **Export Excel** for the amortization table.

### How do I run a Seller Net Sheet?
1. Open **Seller Net Sheet**.
2. Enter sale price, mortgage payoff, commission rates, closing costs.
3. Add any seller concessions or credits.
4. Click **Calculate**.
5. Review estimated net proceeds \u2192 **Export PDF** to share with the seller.

### How do I run a Buyer Cash-to-Close?
1. Open **Buyer Cash-to-Close**.
2. Enter purchase price, down payment %, closing costs, prepaids, escrow reserves.
3. Add any seller or lender credits.
4. Click **Calculate**.
5. Review total cash needed \u2192 **Export PDF** to share with the buyer.

### How do I run a Commission Split calculation?
1. Open **Commission Split Calculator**.
2. Enter total commission and your split with your brokerage (or pick a preset).
3. Add transaction fees, E&O, team overrides.
4. (If approaching your cap) enter your year-to-date commission.
5. Click **Calculate**.
6. Review your estimated net commission. (Optional) **Save** the split as a preset.

**Hoku-equivalent queries**:
- "Run an investment analysis on [address]"
- "What's the cap rate on [address] at [rent]/month?"
- "Does this flip pass the 70% rule? ARV [value], rehab [value], purchase [value]"
- "Calculate net proceeds for [address] selling at [price]"
- "Calculate the mortgage payment on [price] at [rate]% over 30 years"`,
  },
  {
    id: "reports",
    title: "13. Reports",
    content: `## 13. Reports

Comprehensive analytics organized by role: market stats, solo-agent performance, team metrics, brokerage operations, and admin checklists. Most reports support PDF export, Excel export, and print-friendly view.

### How do I open Reports?
1. Sidebar → click **Reports** (or /app/reports).

### How do I navigate the categories?
The Reports page is grouped by audience and color-coded:
1. **Market Statistics (Red)** — public market data tied to your MLS market.
2. **Solo Agent (Blue)** — your personal performance.
3. **Small Teams (Purple)** — team-wide metrics.
4. **Brokerage (Green)** — brokerage-wide analytics. Visible to brokers/admins only.
5. **Assistants & Office Admin (Orange)** — operational checklists.
6. **MLS Agent Leaderboard** — see the dedicated section.

### How do I open a Market Statistics report?
1. Open Reports.
2. In the **Market Statistics** group, click the report tile for your market.
3. The report renders with charts (line/bar/area), comparison tables, and YoY toggles.
4. Use the date-range selector at the top to scope the period.
5. Click **Export PDF** or **Export Excel** in the top-right.

### How do I run a Solo Agent report?
1. Open Reports → **Solo Agent** group.
2. Click one:
   - **Lead Source ROI** — conversion rate and cost-per-closing by source.
   - **Pipeline Velocity** — average days per pipeline stage; bottleneck flags.
   - **Tax & Savings Reserve** — gross commission vs. recommended tax/expense reserves.
   - **Speed-to-Lead Audit** — average response time to portal leads.
3. Set the date range.
4. Click **Generate**.
5. Export PDF/Excel as needed.

### How do I run a Small Teams report?
1. Open Reports → **Small Teams** group.
2. Click one:
   - **Agent Leaderboard** — closings, calls, SMS, showings (radar chart).
   - **Lead Assignment Fairness** — per-member lead count and conversion rate.
   - **Team Commission Split Tracker** — house vs agent portions.
   - **Listing Inventory Health** — active listings, DOM, price-adjustment alerts at 21+ DOM.
3. Set the date range and click **Generate**.

### How do I run a Brokerage report?
1. Open Reports → **Brokerage** group (visible to brokers/admins only).
2. Click one:
   - **Company Dollar** — revenue after commissions and expenses.
   - **Compliance & Audit Log** — signed documents, ID verifications, wire confirmations.
   - **Brokerage Market Share** — rank by ZIP vs. national brands.
   - **Agent Retention Risk** — AI flags agents with 40%+ activity drop over 30 days.
3. Set scope (whole brokerage / office / team).
4. Click **Generate**.

### How do I run the Pending Document Checklist?
1. Open Reports → **Assistants & Office Admin** group.
2. Click **Pending Document Checklist**.
3. Review under-contract deals missing required signatures/forms.
4. Click any deal to jump to its file.

### How does report routing work?
Reports auto-filter to your MLS market. You only see market-statistics tiles for your connected MLS region — an agent in a Pacific Northwest market sees PNW market reports, an agent in the Mid-Atlantic sees regional county reports, etc.

### How do I export a report?
1. Open the report.
2. Click **Export PDF** for a branded PDF, **Export Excel** for the underlying data, or **Print** for the print-friendly view.

**Hoku-equivalent queries**:
- "Show me my Lead Source ROI for last quarter"
- "What's my pipeline velocity?"
- "Show me the team leaderboard for [period]"
- "Generate the company dollar report"
- "Which agents are flagged for retention risk?"`,
  },
  {
    id: "property-intel",
    title: "11. Property Intel & Prospecting",
    content: `## 11. Property Intel & Prospecting

The Property Intel page provides comprehensive property intelligence and 6 specialized prospecting tools.

### 11.1 Property Search (3 Methods)

The Property Intel page provides comprehensive property intelligence powered by public records, AVM data, and MLS — all merged into one unified Property Detail Modal regardless of where the data came from.

### How do I open Property Intel?

1. In the left sidebar, click **Property Intel**.
2. The page opens on the **Property Search** tab.

### How do I look up a single property by address?

1. Open Property Intel.
2. In the search bar at the top, select the **By Address** mode.
3. Type the street address (autocomplete will suggest matches).
4. Click the matching suggestion or press Enter.
5. The Property Detail Modal opens automatically with all data tabs ready.

### How do I browse all properties in a ZIP code?

1. Open Property Intel.
2. Select the **By Zip Code** mode.
3. Type a 5-digit ZIP.
4. Click **Search**.
5. The grid below shows every property indexed in that ZIP. Apply filters in the sidebar to narrow.

### How do I search a radius around a point?

1. Open Property Intel.
2. Select the **By Lat/Lng + Radius** mode.
3. Enter latitude, longitude, and radius in miles (max 50).
4. Click **Search**.
5. Results show all properties within the radius.

### How do I narrow results with filters?

1. After running any search, scroll to the **Filters** panel in the sidebar.
2. Adjust any combination of: Property Type, Beds, Baths, Year Built range, Sqft range, Lot Size, AVM Value range, Sale Amount range, Assessed Value range, Sale Date range, **Absentee Owner** toggle.
3. Click **Apply Filters** — results refresh in place.

### How do I open the full Property Detail Modal?

1. From any search result, click the property card.
2. The modal opens with these tabs (visibility depends on data availability):
   - **Opportunity Score** (when seller signals exist)
   - **Overview** · **Building** · **Financial** · **Sales History** · **Listing History**
   - **Comps** · **Ownership** · **Neighborhood** · **Market Stats** · **Federal/GIS**
3. Use **Esc** or the X to close.

### Reference detail (kept for context)

Apply filters: property type, beds/baths, year built, sqft, lot size, AVM value, sale amount, assessed value, absentee owner toggle, sale date range.

### 11.2 Property Detail Modal

Click any property to open the full intelligence report with tabs:
- **Opportunity Score** (first tab when seller data is present): Scoring breakdown with AI-generated outreach suggestions
- **Overview**: Address, beds/baths/sqft, year built, property type, lot size, owner info
- **Building**: Construction details, rooms, parking, utilities, interior features
- **Financial**: AVM with reliability check, assessment, tax, mortgage, equity, LTV, rental AVM, cap rate, gross yield
- **Sales History**: Historical closed transactions with dates, amounts, buyer/seller names, deed type
- **Listing History**: All MLS listings for the property (Active, Pending, Closed, Expired, Withdrawn, Canceled) with color-coded status badges, price changes, days on market, and listing/buyer agent info. Unlike Sales History which shows only closed transactions, Listing History shows every time the property was listed on MLS.
- **Comps**: Comparable sales with correlation scoring
- **Ownership**: County deed owner (green badge), co-owners, corporate/trust status, absentee, mailing address
- **Neighborhood**: Demographics, schools (with zones), crime, POIs, walk score
- **Market Stats**: Median price, avg DOM, active listings, price/sqft, median rent
- **Federal/GIS**: School attendance zones, FEMA hazard ratings, flood/tsunami/fire zones, opportunity zones

The AVM Reliability Check compares the automated valuation to county assessment and recent sales. If the difference exceeds 30%, the AVM is suppressed and the county assessment is shown instead.

### 11.2a Genie AVM (Proprietary Valuation)

The Genie AVM is Real Estate Genie's proprietary valuation model. **No third-party AVM is used as a source** — every input is analyzed by our own engine. It appears as a "Genie AVM" value card with a confidence badge on the Property Detail Modal.

**How it works:**

The Genie AVM weights five proprietary sources, dynamically scaled by comp match quality:

1. **MLS Closed Comps (55-70% weight)** — Primary source. Recent closed sales adjusted for size, beds, baths, age, lot size, condition, and features (pool, garage, outdoor space). **Property-type matching is enforced**: condo subjects only weight condo comps, single-family subjects only weight single-family comps. MLS comps are used when available; public-records / rental-data-provider comps are used as a fallback for off-market properties.
2. **List Price (30% weight when on-market)** — Calibrated by the area's actual list-to-sale ratio so it reflects what properties actually sell for, not what they're listed at.
3. **Time-Adjusted Last Sale (10-30% by recency)** — Anchors the value to an actual arm's-length transaction appreciated to today using the area's annual appreciation rate.
4. **Trend-Adjusted County Assessment (15-30%)** — Assessed value adjusted for the area's recent year-over-year assessment change.
5. **Area Median $/sqft Sanity Blend** — When the ensemble diverges 25%+ from sqft × area median $/sqft, the value blends 35% toward the median to prevent extreme outliers from sparse-comp areas.

Comp quality filters ensure only truly comparable properties influence the value: minimum 35% correlation, maximum 35% total adjustment cap, outlier removal at 50% from median, up to 20 comps.

**Comparison cards on the modal:** Two third-party valuations are shown alongside the Genie AVM as reference points only — they do not influence the Genie value:
- **Comps AVM** — comp-median valuation from a public-records / rental data provider.
- **Property AVM** — public-records valuation from the same provider.

**Hawaii-specific adjustments (applied on top of the ensemble):**

- **Leasehold discount (20-35%)**: Leasehold properties are valued lower than Fee Simple. The discount scales with remaining lease term.
- **Flood zone discount (3-5%)**: Properties in FEMA AE/VE flood zones receive a small valuation reduction reflecting insurance costs and risk.
- **High HOA penalty (-2%)**: Properties with HOA fees above $800/mo get a small reduction reflecting ongoing carrying costs.

**Why it matters:**

The Genie AVM is built from our own analysis of MLS data, public records, and market stats — not by reweighting somebody else's AVM. That makes the methodology transparent (every weight is shown in the methodology breakdown on the AVM tab) and lets us tune for local realities like Hawaii leasehold and condo-vs-SFR differences that generic AVMs miss.

### 11.2b Property Report (PDF)

From the Property Detail Modal, click the green **Property Report** button to generate a professional multi-page branded PDF. The report is designed as a complete property intelligence briefing.

**Report sections:**

1. **Cover Page**: Property address, map image, hero photo, agent branding (name, license, phone, email, brokerage)
2. **Value Snapshot**: AVM value, last sale price/date, estimated equity, LTV ratio, AVM confidence range bar, rental estimate with range and gross yield
3. **Property Details**: Property type, year built, beds/baths, living area, lot size, stories, parking, APN/TMK, county, land tenure
4. **Interior Features**: Plumbing fixtures, fireplace, attic, interior structure (when available)
5. **Exterior Features**: Building condition, pool, deck, patio, porch, fire sprinklers (when available)
6. **Legal Description**: Zoning, census tract, subdivision, legal description text
7. **Tax History**: Multi-year comparison table showing up to 5 years of land value, improvement value, total assessed, and annual tax amount
8. **Deed/Transaction Details**: Contract and recording dates, document type, buyer/seller names, buyer vesting, title company, document numbers, transfer tax
9. **Mortgage & Equity**: Loan balance, original loan amount, lender, loan type, LTV ratio, estimated equity with visual equity bar
10. **Mortgage Payment Estimate**: Estimated monthly payment with home price, down payment, loan amount, interest rate, P&I, tax, HOA, and total interest breakdown
11. **Sales History**: Table of all recorded transactions with dates, amounts, buyer/seller names
12. **Ownership**: Owner name, co-owner, occupancy status, absentee/corporate indicators, mailing address
13. **Comparable Sales**: Table showing up to 10 comps with address, price, beds/baths, sqft, close date, and match percentage
14. **Area Market Statistics**: Market type indicator (Seller's/Balanced/Buyer's), months of inventory, sold-to-list ratio, average DOM, median price, active listings, price per sqft, MoM trend indicators
15. **Hazard & Environmental Zones**: Hawaii-specific hazards (tsunami, lava flow, sea level rise, cesspool, SMA, DHHL) plus FEMA flood zone
16. **Neighborhood & Economic Context**: Median household income, median home value, median age, population density, unemployment rate, poverty rate, owner/renter occupied percentages
17. **Neighborhood Comparison**: Side-by-side table comparing your ZIP code vs County vs State on key housing metrics
18. **Schools**: Up to 6 nearby schools with name, level (Elementary/Middle/High), grades served, distance, enrollment, student-teacher ratio, and overall grade
19. **Livability & Walkability**: Livability index with total score and category breakdown bars (housing, neighborhood, transportation, environment, health, engagement, opportunity), plus walkability score
20. **Photo Gallery**: Up to 6 MLS photos

**Tips:**
- The report pulls all data already loaded in the Property Detail Modal -- no extra API calls
- Reports can also be saved and shared via a public link (expires after 30 days)
- All reports are branded with your agent information

### How do I generate a Property Report PDF?

1. Open Property Intel and look up the property by address.
2. In the Property Detail Modal, click the green **Property Report** button.
3. Wait for the report to render — typically 5-15 seconds depending on photos and chart count.
4. Click **Download** to save the PDF or **Copy Share Link** for a 30-day public link.

### How do I generate a Buyer Report PDF?

1. Open MLS Search or Property Intel and find the listed property.
2. In the Property Detail Modal, click the **Buyer Report** button.
3. (Optional) Type a **Personal Note** to your buyer in the modal that appears.
4. Click **Generate**.
5. Download the PDF or send the share link.

### How do I generate a Seller Report PDF?

1. From the sidebar, click **Seller Report** (under Reports / Property Intel).
2. In the **Search** field, type the seller's property address and select the suggested match.
3. Review the property summary card — public records, AVM, last sale, owner.
4. (Optional) Add a **Personal Note** to the seller in the optional message field.
5. (Optional) Pick a **Template** for the visual style (Editor / Archive / Noir / Terracotta / Blueprint).
6. Click **Generate Seller Report PDF**.
7. Download the PDF or copy the share link.

### 11.2c Buyer Report (PDF)

The Buyer Report is generated from **MLS listing data** and is designed for buyer clients evaluating a listed property. Click the **Buyer Report** button in the Property Detail Modal.

**Buyer Report sections:**
1. Cover page with hero photo and agent branding
2. Personal note (optional agent message to the buyer)
3. Listing status badge, price and AVM value cards with range bar
4. Basic facts (beds, baths, sqft, lot size)
5. Property information and building details
6. Interior and exterior features
7. MLS listing description
8. Location details (subdivision, zoning, flood zone)
9. Photo gallery (up to 12 listing photos)
10. Mortgage payment estimate with full PITI breakdown
11. Market trends with market type indicator and MoM trend arrows
12. Neighborhood section: Housing Facts & Stats comparison table (ZIP vs County vs State vs USA), People Facts, age distribution bar chart, income bracket bar chart
13. Walkability score
14. Environmental and hazard zones
15. Comparable sales table

### 11.2d Seller Report (PDF)

The Seller Report is generated from **property data (public records)** and is designed for seller clients considering listing their property. It includes valuation, equity analysis, and a pricing strategy.

**Seller Report is being rebuilt to a 13-page RPR-equivalent format.** The new report is agent-branded on every page, matches industry-standard Seller Report depth, and includes a Pricing Strategy workbench page.

**Pick your template.** Every report can be generated in one of five visual directions:
- **The Editor** (default) — classic navy + gold + bone; Playfair Display serif. Trust and gravitas.
- **The Archive** — modern minimal Swiss grid; Inter + JetBrains Mono; bold oversized numerals. Urban, new-construction, architectural.
- **Noir** — luxury dark; Cormorant Garamond on black with champagne accents. Waterfront, trophy homes, private offices.
- **Terracotta** — warm clay + cream; Fraunces rounded serif. Boutique lifestyle (Southwest, Austin, Sonoma, Santa Fe, coastal FL).
- **Blueprint** — corporate data; IBM Plex + cobalt blue with grid accents. Team brands, Compass/KW-style agents, data-forward sellers.

Same 13 sections and same data in every template — different personality, different fonts, different page-number format, different footer copy. Agent picks per report.

**13 sections (pages 1, 2, and 13 are live now — pages 3-12 are in progress and currently show a "Section in progress" notice):**
1. Cover — hero photo, address overlay, listing status pill, full agent card (live)
2. Valuation — Genie AVM™ with confidence stars, month-change, 12-month change, range bar, tax & assessment strip (live)
3. Property Facts — 3-column table showing Public Records, Listing, and Agent Refinements (live)
4. Interior & Exterior Features — listing vs public-records split tables (live)
5. Legal · Owner · Hazards — parcel/zoning/subdivision, owner facts, Hawaii-specific hazards (Flood Zone, Tsunami Evacuation Zone, Sea Level Rise Exposure, Cesspool Priority), sales history (live)
6. Property Photos — 6-photo magazine grid gallery (live)
7. Market Trends — 4 KPIs with month-over-month deltas, 5-point market-type gauge, ZIP vs County vs State vs USA median-value history chart (in progress)
8. Active Listings — 5-year list-price trend chart, price-band breakdown (in progress)
9. Sold Listings — 5-year sold-price trend + 12-month Sales vs Listings grouped bar chart (in progress)
10. Price vs Volume — dual-axis charts over 24 months (Median Sold Price vs Sales Count, Median List Price vs Active Listings) (in progress)
11. Market Activity — 4-column New / Closed / Distressed / Expired summary, area comp map with status pins (in progress)
12. Pricing Strategy & Refined Value — 4-column Comparable Groups table, 90-day Sold Price Comparison, CMA Summary, Refined Value Summary with agent-editable adjustments (live — agent-editable fields show "—" until populated)
13. About — About Real Estate Genie, data sources, agent card repeat, Equal Housing Opportunity glyph, disclaimer (live)

### 11.3 Prospecting (6 Search Types)

The Prospecting tab on Property Intel offers six specialized lead-finding searches. Each includes AI-powered prospect analysis with tier scoring, outreach drafts (letters, emails, SMS, talking points), and CSV/PDF export.

### How do I open the Prospecting tab?
1. In the left sidebar, click **Property Intel**.
2. Click the **Prospecting** tab.

### How do I run an Absentee Owners search?
1. Open Prospecting.
2. Click the **Absentee Owners** card.
3. Type a 5-digit ZIP and (optionally) set min years owned, beds/baths, property type filters.
4. Click **Run Search**.
5. Best targets: 15+ years owned with out-of-state mailing address.

### How do I run a High Equity search?
1. Open Prospecting and click **High Equity**.
2. Type a ZIP and (optionally) set a minimum equity percentage.
3. Click **Run Search**. Results sort by equity descending.
4. Focus on 70%+ equity combined with long ownership for the strongest prospects.

### How do I run a Pre-Foreclosure / Distressed search?
1. Open Prospecting and click **Pre-Foreclosure**.
2. Type a ZIP. Results show properties with active foreclosure filings, default amounts, and auction dates.
3. Click any property row for full distress signals (underwater status, LTV, lien counts).
4. Position outreach as "I can help you sell quickly to avoid foreclosure" — be sensitive; these owners are in distress.

### How do I run a Just Sold (Farming) search?
1. Open Prospecting and click **Just Sold**.
2. Type a ZIP. Results show closed sales from the last 6 months.
3. Click any sold property to see all neighboring homes within 0.5 miles.
4. Export the neighbor list as a postcard recipient list.
5. Send "Just Sold" postcards within 1-2 weeks of the closing while it's still fresh news.

### How do I run an Investor Portfolios search?
1. Open Prospecting and click **Investor Portfolios**.
2. Type a ZIP and set the minimum number of parcels owned.
3. Click **Run Search**. Results group by owner name showing every property in that owner's portfolio.
4. Approach with investment messaging — cap rates, 1031 exchanges, portfolio ROI.

### How do I run a DOM Prospecting search?
1. Open Prospecting and click **DOM Prospecting**.
2. Type one or more ZIPs.
3. (Optional) Adjust the tier multiplier vs market-average DOM (default 2.0x for Red).
4. Click **Run Search**.
5. Results are tiered:
   - **Red** (2x+ market-average DOM) — most stale, highest priority
   - **Orange** (1.5x+) — getting stale
   - **Charcoal** (1.15x+) — approaching threshold, monitor
   - **Green** (Expired/Withdrawn) — fair game; no active listing agreement
6. **IMPORTANT**: Only contact properties in the **Green** tier (expired/withdrawn). Soliciting active listings represented by another agent is unethical and often illegal.

### How do I monitor specific listings over time (DOM)?
1. After running a DOM Prospecting search, click any result.
2. Click **Monitor** to add it to your monitored list.
3. View monitored listings on the **Monitored Properties** sub-tab.
4. Receive alerts on tier changes, status changes (active → expired), and price changes via the **Alerts** sub-tab.

### How do I save a prospecting search for reuse?
1. After running any prospecting search, click **Save Search** in the top-right.
2. Name the search.
3. The saved search appears under **Saved Searches** for one-click reload.

### How do I export prospecting results?
1. After running a search, click **Export**.
2. Choose **CSV** (raw data) or **PDF** (branded report).
3. Each export includes all displayed columns plus skip-traced contact data where available.

### How do I draft AI outreach for a prospect?
1. Click any prospect row to open the detail panel.
2. Click **Outreach** to see AI-generated drafts.
3. Pick a format: **Letter**, **Email**, **SMS**, or **Talking Points**.
4. Edit the draft inline; click **Copy** to use.

### Hoku-equivalent
- "Find absentee owners with 15+ years ownership in [ZIP]"
- "Run a high-equity search in [ZIP] for 70%+ equity owners"
- "Show me pre-foreclosures in [ZIP]"
- "Find recent sold homes in [ZIP] for a postcard campaign"
- "Show me stale listings in [ZIP] with DOM > 90"
- "Generate an outreach letter for [address]"

### 11.4 Bird Dog Automated Prospecting

Bird Dog is an automated off-market lead hunting tool that searches for properties matching your criteria on a schedule and only alerts you on NEW leads not previously found.

### How do I open Bird Dog?
1. In the left sidebar, click **Opportunities** to expand it.
2. Click **Bird Dog**.

### How do I create a new Bird Dog search?
1. Open Bird Dog.
2. Click **+ New Search** in the top-right.
3. Enter a **ZIP code** (or list of ZIPs).
4. Select lead filters — check any combination of:
   - **Absentee Owner** — owner doesn't live at the property
   - **High Equity** — owner has 70%+ equity
   - **Vacant** — property is vacant
   - **Pre-Foreclosure** — active foreclosure filing
   - **Investor** — multi-property owner
   - **Tax Delinquent** — property tax behind
5. (Optional) Set **Min Equity %**, **Min Years Owned**, or **Property Type** for additional refinement.
6. Choose a **Schedule**: Daily, Weekly, or Monthly.
7. Give the search a name (e.g., "Absentee + High Equity in [ZIP]").
8. Click **Create Search**.

### How do I run a search immediately?
1. Open Bird Dog.
2. Find the search card in the list.
3. Click **Run Now**.
4. The scan runs in the background. New leads appear within 1-3 minutes.

### How do I view the leads from a Bird Dog search?
1. Open Bird Dog.
2. Click the search card to open its detail page.
3. The leads list shows each property with: owner name, address, equity, years owned, lead-score color (HOT red / WARM orange / COLD gray), and the trigger reasons (e.g., "Absentee + 70%+ equity").

### How do I skip-trace a lead to find their phone or email?
1. From the Bird Dog leads list, click a lead row.
2. In the lead detail panel, click **Skip Trace**.
3. Confirm the credit charge (skip-trace consumes credits per the agent's plan).
4. After 5-30 seconds, the panel shows: phone numbers (mobile + landline), email addresses, and social-media profiles when available.

### How do I export the Hot Sheet?
1. Open a Bird Dog search.
2. Click **Export Hot Sheet** in the top-right.
3. Choose **XLSX**.
4. The download includes a color-coded sheet (HOT = red rows, WARM = orange, COLD = gray) with full property, owner, and skip-traced contact data.

### How do I star a lead for follow-up?
1. Click the **★** icon on any lead row.
2. Starred leads appear in a separate **Starred** tab at the top of the search detail page.

### How do I edit or pause a Bird Dog search?
1. Open Bird Dog.
2. Click the search card.
3. In the detail page, click **Edit** to adjust criteria, or toggle **Active** off to pause.

### Lead-scoring tiers (for context)

- **HOT (red)** — most likely to sell: inherited property, pre-foreclosure, death transfer, tax delinquent, vacant + absentee, active foreclosure
- **WARM (orange)** — moderately likely: out-of-state absentee with equity, free & clear, long-term owner with high equity
- **COLD / NURTURE (gray)** — not likely right now: monitoring, no urgency signals

Combine multiple filters for the most targeted searches (e.g., absentee + high equity + long ownership = strong WARM-to-HOT prospect set).

### Hoku-equivalent
- "Bird dog absentee owners in [ZIP] with high equity, run weekly"
- "Run my [search name] Bird Dog now"
- "What new Bird Dog leads came in this week?"
- "Skip trace [owner name]"
- "Export the Hot Sheet for [search name]"`,
  },
  {
    id: "market-monitor",
    title: "11.5 Market Monitor",
    content: `## 11.5 Market Monitor

Market Monitor is an automated MLS alert system that sends notifications to your clients when listings matching their criteria change. Set up a profile once and the system scans daily, sending alerts for new listings, price drops, back-on-market properties, and more.

### How do I open Market Monitor?
1. In the left sidebar, click **Opportunities** to expand it.
2. Click **Market Monitor**.

### How do I create a new client profile?
1. Open Market Monitor.
2. Click **+ New Profile** in the top-right.
3. In the **Client Info** section, enter the client's name and at least one of: email, phone number.
4. In the **Search Criteria** section, set: ZIP code (or list of ZIPs), beds, baths, price range, property type.
5. In the **Notifications** section, check the channels you want: **Email**, **SMS**, **CRM**.
6. In the **Alert Types** section, check the events you want to trigger alerts:
   - **New Listing** — a property matching criteria hits the market
   - **Price Drop** — a matching property reduces its price
   - **Back on Market** — a previously pending or withdrawn listing returns to active
   - **Expired/Withdrawn** — a matching listing expires or is withdrawn
   - **Pending** — a matching listing goes under contract
7. Click **Save Profile**.

### How do I edit an existing profile?
1. Open Market Monitor.
2. Click the profile card from the list.
3. Click **Edit** in the top-right of the detail view.
4. Adjust criteria, notification channels, or alert types.
5. Click **Save**.

### How do I pause monitoring for a client?
1. Open Market Monitor.
2. Open the profile.
3. Toggle the **Active** switch off (or click **Pause**).
4. The system stops sending alerts until you toggle it back on.

### How do I trigger an immediate scan?
1. Open Market Monitor.
2. Open the profile.
3. Click **Run Now** in the top-right.
4. The scan runs in the background — check Alert History after 1-2 minutes.

### How do I view a client's alert history?
1. Open Market Monitor.
2. Click the profile.
3. Click the **Alerts** tab.
4. The list shows every alert sent to that client with timestamp, alert type, listing details, and delivery status per channel (email opened, SMS delivered, CRM thread created).

### How do I delete a profile?
1. Open Market Monitor.
2. Open the profile.
3. Click the **⋯** menu in the top-right and select **Delete**.
4. Confirm. Past alert history is retained for compliance; only the active profile is removed.

**Tips:**
- Create separate profiles for each client with their specific criteria.
- Adjust alert types based on whether the client is a buyer (New Listing, Price Drop) or seller (Pending, Expired).
- All alerts include property details, photos, and a link to the full listing.

### Hoku-equivalent
- "Set up a Market Monitor for [client name] in [ZIP]"
- "Pause Market Monitor for [client]"
- "Run [client]'s Market Monitor now"
- "What alerts has [client] received this week?"`,
  },
  {
    id: "neighborhoods",
    title: "12. Neighborhood Profiles",
    content: `## 12. Neighborhood Profiles

AI-generated, branded neighborhood reports for buyer/seller presentations and marketing. Pulls Census, schools, hazards, crime, and market data into a single 12-14 page PDF (or Word/DOCX).

### How do I open Neighborhood Profiles?
1. Sidebar → click **Neighborhoods** (or /app/neighborhoods).

### How do I generate a new profile?
1. Click **+ New Profile** in the top-right.
2. Enter the **Neighborhood Name** (e.g., [neighborhood]).
3. Enter the **Address** (any address inside the neighborhood — used to anchor maps and data).
4. Enter **City** and **State**.
5. (Optional) Add **Architectural Style** (e.g., Craftsman, Mid-century).
6. (Optional) Add **Nearby Amenities** (free-text — parks, schools, shopping you want highlighted).
7. (Optional) Add **Additional Context** (free-text — anything you want the AI to weave into the narrative).
8. Click **Generate**.
9. Wait ~10-20 seconds for the AI sections to render.

### How do I review the AI sections before exporting?
1. Open the generated profile.
2. Scroll through the on-page preview: **Lifestyle & Vibe**, **Location Intelligence**, **Market Pulse**, **Community Resources**, **Local Amenities**.
3. Click any section's **Edit** button to rewrite the text manually.
4. Click **Save**.

### How do I export the profile to PDF?
1. Click **Export PDF** in the top-right.
2. The PDF assembles 12-14+ pages with cover, housing facts, market trends, education, age, income, occupation, transportation, schools, amenities, and nearby neighborhoods.
3. The PDF saves to your downloads.

### How do I export the profile to Word?
1. Click **Export Word** (or **DOCX**) in the top-right.
2. The DOCX saves to your downloads — edit it freely in Word.

### How do I email the profile to a client?
1. Click **Send to Contact**.
2. Pick a CRM contact.
3. (Optional) Edit the cover note.
4. Click **Send**.

### What's in the exported PDF?
1. **Cover** — neighborhood map, name, city/state, your branding (headshot, name, license, brokerage logo).
2. **Housing Facts** — comparison table: ZIP vs County vs State vs USA (median home value, household income, population, median age, housing units, own/rent %).
3. **Market Trends** — Seller's/Balanced/Buyer's market indicator, months of inventory, sold-to-list ratio, median DOM, median sold price, MoM trend arrows, median estimated value with 1-month and 12-month change.
4. **Sold Home Stats** — distribution bar charts: price ranges, price/sqft, home sizes, home ages, bedroom counts.
5. **People Facts** — population, density, change since 2020, median age across geographic levels.
6. **Education Levels** — horizontal bars (graduate/pro, bachelor's, some college, associate's, HS, less than HS).
7. **Age Distribution** — bars by age group (Under 18 → 65+).
8. **Household Income** — brackets from >$200K down to <$25K.
9. **Occupational Categories** — management, service, sales, construction, production.
10. **Households with Children** — married with/without children, single with children.
11. **Transportation Modes** — drive/carpool, walk, bicycle, public transit, work from home.
12. **Economy** — multi-geo comparison + commute time distribution bar chart.
13. **Quality of Life** — elevation, rainfall, avg temperatures, commute time, superfund/brownfield sites.
14. **Schools** — up to 15 schools: type, grade range, enrollment, student-teacher ratio.
15. **Walkability** — Walk Score with label.
16. **Lifestyle & Vibe** — AI narrative.
17. **Location Intelligence** — AI proximity/accessibility analysis.
18. **Local Amenities** — parks, shopping, dining organized by category.
19. **Nearby Neighborhoods** — up to 6 micro-neighborhoods with median home value, home count, population.

### Where does the data come from?
- **Census ACS 5-year** — demographics, education, income, occupation, commute (4 geographic levels).
- **NCES** — public + private schools (cached for 1 year, refreshes August 1).
- **FBI CDE** — county crime statistics.
- **FEMA NRI / USGS** — hazard risk ratings.
- **OpenStreetMap** — points of interest (POIs).
- **FRED** — local sales trends.
- **State GIS** — school zone boundaries (Hawaii and other states with public GIS layers).

### How does Fair Housing compliance work?
1. Every generated profile runs through a built-in **Fair Housing Act compliance check** before display.
2. The check flags discriminatory language and re-prompts the AI to rewrite if found.
3. You can also toggle Fair Housing Mode in **Settings** to require an extra confirmation before export.

**Hoku-equivalent queries**:
- "Generate a neighborhood profile for [neighborhood]"
- "Make a profile for [city]"
- "Export the [neighborhood] profile to PDF"
- "Send the [neighborhood] profile to [contact]"`,
  },
  {
    id: "integrations",
    title: "13. Integrations",
    content: `## 13. Integrations

Connect external services — CRM, MLS, calendars, web assistant, webhooks, social — and centralize lead, contact, and event flow.

### How do I open Integrations?
1. Sidebar → click **Integrations** (or /app/integrations).
2. Each integration shows a card with **Connected**/**Disconnected** status, last-sync timestamp, and a **Test Connection** button.

### How do I connect my CRM?

1. Open the invitation email from **noreply@mg.aiprofitandgrowth.com** and accept.
2. Sign in to your CRM at **app.aiprofitandgrowth.com**.
3. In your CRM: **Settings → Private Integrations** → **+ Create Private Integration**.
4. Copy the **API Key** immediately (it will not be shown again).
5. Back in Real Estate Genie → **Integrations** → locate the **CRM** card.
6. Paste the API Key into the **API Key** field → click **Connect**. Status flips to **Connected**.
7. In your CRM: **Settings → Business Profile** → copy your **Location ID**.
8. In the CRM card → paste into **Location ID** → click **Save**.
9. Click **Load Pipelines** → pick your real estate sales pipeline.
10. Select **New Lead Stage** (where new leads land).
11. (Optional) Select **Initial Contact Stage** (leads auto-advance here when an email/SMS is sent).
12. Click **Save**.

### How do I connect Google Calendar?
1. On the **Google Calendar** card, click **Connect**.
2. Sign in with Google in the OAuth popup.
3. Grant calendar read/write permissions.
4. The card flips to **Connected** with a sync timestamp.

### How do I connect Outlook/Microsoft Calendar?
1. On the **Outlook Calendar** card, click **Connect**.
2. Sign in with your Microsoft account.
3. Grant calendar permissions.
4. The card flips to **Connected**.

### How do I disconnect a calendar?
1. On the calendar card, click the **...** menu \u2192 **Disconnect**.
2. Confirm. Local events stay; future syncs stop.

### What does the CRM connection give me?
- **Contact Sync** \u2014 bidirectional contact sync between Real Estate Genie and your CRM.
- **Opportunity Creation** \u2014 new leads auto-create opportunities in your CRM pipeline.
- **Pipeline Mapping** \u2014 map app pipeline stages to CRM pipeline stages.
- **Tag Management** \u2014 apply/manage CRM contact tags from within the app.
- **Notes** \u2014 notes added in the app sync to the matching CRM contact.

### How do I check or reconnect MLS?
1. The MLS card shows your current connection status (set up by your platform admin per region).
2. If status is **Disconnected**, contact your platform admin to reconfigure credentials.
3. Click **Test Connection** to verify the connection is alive.

### How do I configure n8n webhooks?
1. On the **n8n Webhooks** card, click **Configure**.
2. Enter your n8n webhook URL.
3. (Optional) Add an **HMAC secret key** for webhook signature verification.
4. Check the events to trigger (see below).
5. Click **Save**.

**Available Webhook Events:**
- **Lead Submitted** - new lead created.
- **Hot Lead** - heat score reaches 80+.
- **Open House Published** - open house event is published.
- **Open House Ended** - open house event concludes.
- **Consent Captured** - lead provides consent.
- **Integration Connected** - new integration is connected.

Failed webhooks auto-retry up to 3 times. View delivery logs from the card.

### How do I install the Hoku Web Assistant on my website?
1. On the **Hoku Web Assistant** card, click **View Embed Code**.
2. Copy the snippet.
3. Paste it before the closing **</body>** tag on your website.
4. A floating chat button appears in the bottom-right of every page.
5. (Optional) Add an **IDX Broker API key** in the card to enable IDX-only MLS search alongside your direct MLS connection.
6. Click **Save**.

### How does the Hoku Web Assistant qualify visitors?
- **Buyers** - captures name, email, phone, timeline, pre-approval, neighborhoods, must-haves. Optionally emails matching MLS listings.
- **Sellers** - captures the property address, looks up AVM and property details, then captures contact info.
- A scored lead lands in your pipeline; a CRM contact is created with the full conversation logged in notes.
- The lead appears on your Dashboard as "Needs Attention."

### How do I connect social channels?
1. On the **Social Channels** card, click **Connect** for each platform.
2. Sign in to authorize.
3. Lead responses from each platform now route into your unified inbox.

### How do I test an integration's connection?
1. On any integration card, click **Test Connection**.
2. The card shows a green checkmark on success or a red error with details on failure.

### What integrations are admin-only?
Configured at the platform level (not per-agent):
- **MLS** - credentials configured by platform admin per region.
- **Payment** - for subscription billing.
- **Property Data** - public-records, equity, ownership, foreclosure, absentee detection.
- **Federal Data** - FRED rates, HUD Fair Market Rents, USPS address validation, Census, BLS.
- **Maps** - geocoding and map embeds (no setup required).

**Hoku-equivalent queries**:
- "Connect my Google Calendar"
- "Test my CRM connection"
- "Show me my webhook delivery logs"
- "What's my MLS connection status?"`,
  },
  {
    id: "seller-map",
    title: "14. Seller Opportunity Map",
    content: `## 14. Seller Opportunity Map

The Seller Opportunity Map is an interactive, map-based prospecting tool that uses predictive analytics to identify likely sellers across an area.

### How do I open the Seller Map?
1. In the left sidebar, click **Opportunities** to expand it.
2. Click **Seller Map**.

### How do I search by ZIP code?
1. Open Seller Map.
2. In the search bar at the top, select the **ZIP** mode.
3. Type a 5-digit ZIP and press Enter.
4. The map zooms to the area and color-coded markers appear for every scored property.

### How do I search by lat/lng + radius?
1. Open Seller Map.
2. Select the **Radius** mode in the search bar.
3. Enter latitude, longitude, and radius in miles (max 50).
4. Press Enter or click **Search**.

### How do I search by parcel ID?
1. Open Seller Map.
2. Select the **Parcel** mode (called TMK in Hawaii, APN in most other states).
3. Type the parcel number with or without dashes.
4. Press Enter — the map centers on that parcel.

### How do I narrow results with filters?
1. After running a search, open the **Filters** panel on the left.
2. Adjust:
   - **Min Motivation Score** (default 40) — sets the minimum opportunity score for markers shown
   - **Absentee Only** — toggle on to show only properties where owner address differs from property
   - **Min Ownership Years** — minimum years owned
   - **Min Equity %** — minimum equity percentage
   - **Property Type** — Residential, Condo, Townhouse, Land, etc.
   - **Min Parcels Owned** — for finding investor portfolios
3. Filters apply live; markers update as you change values.

### How do I read the marker colors?
- **Red** — Very Likely seller (motivation score 70-100)
- **Orange** — Likely (50-69)
- **Yellow** — Possible (30-49)
- **Blue** — Unlikely (0-29)

### How do I view a property's full detail and outreach options?
1. Click a marker on the map.
2. The Property Detail Modal opens with the **Opportunity Score** tab first.
3. The Opportunity Score tab shows the scoring breakdown across all 12 dimensions plus AI-generated outreach suggestions.
4. Click **Letter**, **Email**, **SMS**, or **Talking Points** under outreach to generate a tailored message draft.
5. Use the other tabs (Overview, Building, Financial, Sales History, etc.) for the complete property briefing.

### How do I toggle the heat map or boundary overlays?
1. Open Seller Map.
2. In the **Layers** panel (top-right of the map), toggle:
   - **Heat Map** — density visualization of high-motivation sellers
   - **ZIP Boundaries** — click any ZIP to recenter the search
   - **Parcel Boundaries** — overlay parcel lines (Hawaii TMK via state GIS; other markets where supported)
   - **Satellite** — switch from streets to satellite imagery

### How do I save the current search?
1. Set up your filters and search area as desired.
2. Click **Save Search** in the top-right of the page.
3. Give the search a name (e.g., "Absentee + High Equity in [ZIP]").
4. Click **Save**. The search appears under **Saved Searches** for one-click reload.
5. Saved search results are globally cached for 7 days.

### How do I load a saved search?
1. Open Seller Map.
2. Click **Saved Searches** in the top-right.
3. Click the saved entry. The map loads with those filters and area applied.

### Seller Motivation Score (reference, 0-100)

12-dimension scoring algorithm. Scores normalized based on available data:
- High equity (15) · Long ownership (15) · Absentee owner (12) · Distress signals (12)
- Multi-property portfolio (8) · Transfer recency (8) · Owner type (6)
- Tax assessment gap (5) · Market trend (5) · Tax trend (5) · Appreciation (5) · HOA burden (4)

### Hoku-equivalent
- "Open the Seller Map for [ZIP]"
- "Find absentee owners with 70%+ equity in [ZIP]"
- "Save this search as [name]"
- "Show me my saved searches"
- "Generate an outreach letter for [address]"`,
  },
  {
    id: "farm-watchdog",
    title: "15. Farm & Watchdog",
    content: `## 15. Farm & Watchdog

Farm & Watchdog lets you monitor geographic areas with automated alerts for market changes (price drops, DOM thresholds, status flips, new listings).

### How do I open Farm & Watchdog?
1. In the left sidebar, click **Opportunities** to expand it.
2. Click **Farm & Watchdog**.

### How do I create a farm area?
1. Open Farm & Watchdog.
2. Click **+ Create Farm Area** in the top-right.
3. Choose how to define the area:
   - **ZIP** — type one or more 5-digit ZIPs
   - **Radius** — enter lat/lng + radius in miles
   - **Parcel Prefix** — type a partial parcel ID (TMK in Hawaii, APN elsewhere) to cover a section/block
4. Set property filters: price range, bedrooms, property types, listing statuses.
5. Give the farm a name.
6. Click **Save**.

### How do I view live listings in my farm?
1. Open Farm & Watchdog.
2. Click the farm card.
3. The detail page shows live MLS listings matching the farm's criteria.
4. Sort by clicking column headers: **Days on Market**, **Price** (asc/desc), or **Price Drop %**.
5. Click any listing card to open the full Property Detail Modal.

### How do I add a Watchdog alert rule?
1. Open the farm's detail page.
2. Click the **Watchdog** tab.
3. Click **+ Add Rule**.
4. Choose rule type:
   - **DOM Threshold** — alert when listings exceed a specified number of days on market (e.g., 75+ days)
   - **Price Drop Monitoring** — alert on price reductions, optionally with a minimum % threshold
   - **Status Changes** — alert on new listings, expirations, or withdrawals
5. Set notification channels: **Push**, **Email**, **SMS** (any combination).
6. Click **Save Rule**.

### How do I view and manage alerts?
1. Open the farm's detail page.
2. Click the **Alerts** tab.
3. Each alert shows timestamp, rule that triggered it, listing details, and a link to the full property.
4. Use the status badges to filter: **Unread**, **Read**, **Archived**.
5. Click an alert row to mark it read; click the archive icon to archive.

### How do I edit or pause a farm area?
1. Open the farm's detail page.
2. Click **Edit** (top-right) to change criteria or filters.
3. Toggle **Active** off to pause monitoring without deleting the farm.

### How do I delete a farm area?
1. Open the farm's detail page.
2. Click **⋯** → **Delete**.
3. Confirm. Past alerts are retained for compliance; the farm is removed.

A background MLS Watchdog job periodically scans your monitored areas and generates alerts on changes — no manual triggering required after rules are saved.

### Hoku-equivalent
- "Create a farm area for [ZIP] focused on 3-bed homes under [price]"
- "Show me listings in my [farm name] farm with price drops"
- "Alert me when listings in [ZIP] exceed 90 days on market"
- "Pause my [farm name] farm"
- "What new alerts do I have today?"`,
  },
  {
    id: "billing",
    title: "16. Billing & Plans",
    content: `## 16. Billing & Plans

Manage your subscription, payment methods, view invoices, and upgrade your plan.

### How do I open Billing?
1. Sidebar \u2192 click **Billing** (or /app/billing).

### How do I see my current plan and limits?
1. The **Current Subscription** card shows plan name, status (active/cancelled/past_due/suspended), monthly price, billing cycle, plan limits (agents, assistants, admins, offices), and next billing date.
2. The **Summary Stats** strip shows lifetime paid, unpaid invoices, and next payment amount/date.

### How do I view invoices?
1. Scroll to **Recent Invoices** \u2014 number, description, due date, status, amount, paid date.
2. Click any row to see the invoice detail and download a PDF.

### How do I view payment history?
1. Scroll to **Payment History** \u2014 date, invoice reference, payment method, amount, status.

### How do I upgrade my plan?
1. Click **Change Plan** in the top-right.
2. Compare features side-by-side.
3. Click **Select** under the desired plan.
4. Complete payment through the secure payment flow.
5. The upgrade takes effect immediately \u2014 new features unlock right away.

### How do I downgrade or cancel?
1. Click **Change Plan** \u2192 click your current plan \u2192 click **Cancel Subscription**.
2. Choose effective date (immediate or end of billing cycle).
3. Confirm.

### How do I add or change a payment method?
1. Scroll to **Payment Methods** \u2192 click **Add Payment Method** or **Edit** on an existing one.
2. Enter card or PayPal details.
3. Click **Set as Default** to use for the next invoice.

### What happens when I hit a usage limit?
1. A warning banner appears in the app when you near or hit a plan limit (leads, analyses, integrations).
2. Click the banner to view which limit was hit and the recommended upgrade.

**Hoku-equivalent queries**:
- "What's my current plan?"
- "Show me my next invoice"
- "When does my subscription renew?"
- "Upgrade me to [plan name]"`,
  },
  {
    id: "team-management",
    title: "17. Team Management",
    content: `## 17. Team Management

Manage team members, roles, office assignments, and seat limits. Visible to **Account Admins** only.

### How do I open Team Management?
1. Sidebar \u2192 click **Team** (or /app/team).
2. (Visible only to Account Admins.)

### How do I read the seat usage cards?
1. The top of the page shows 4 usage cards: **Agents**, **Assistants**, **Site Admins**, **Offices**.
2. Each card shows current/limit with a progress bar.
3. A red banner appears when any limit is reached \u2014 click it to upgrade your plan.

### How do I invite a team member?
1. Click **Invite Member** in the top-right.
2. Enter their **email address**.
3. Select their **Role**: Agent, Assistant, Team Lead, or Admin.
4. (Optional) Pick an **Office** if you have multiple locations.
5. Click **Send Invite**.
6. The invitee gets an email link \u2192 they click it \u2192 create account (or sign in) \u2192 they're added to your team.

### How do I create a member directly (without sending an invite)?
1. Click **+ Create Member**.
2. Enter name, email, role, office.
3. Set a temporary password (the member can change it on first login).
4. Click **Create**.

### How do I change a member's role?
1. Find the member row.
2. Click the **Role** dropdown \u2192 select the new role.
3. Change takes effect immediately.

### How do I assign a member to an office?
1. Find the member row \u2192 click the **Office** dropdown \u2192 select the office.

### How do I remove a member?
1. Find the member row \u2192 click **\u22ef** \u2192 **Remove**.
2. Confirm. The member loses access immediately. Their lead/transaction data stays in the brokerage.

### What are the team roles?
- **Owner** \u2014 full control over account, billing, all settings.
- **Admin** \u2014 manage team, settings, most account functions.
- **Team Lead** \u2014 standard agent access + Team Dashboard for team activity.
- **Agent** \u2014 standard access to all core features.
- **Assistant** \u2014 read-mostly access to assigned agents' work.

**Hoku-equivalent queries**:
- "Invite [email] as an agent"
- "Change [name]'s role to admin"
- "Show me my team usage"
- "Remove [name] from my team"`,
  },
  {
    id: "security",
    title: "18. Security & MFA",
    content: `## 18. Security & MFA

Protect your account with Multi-Factor Authentication, strong passwords, and active session management. All security settings live under **Settings → Security**.

### How do I open Security settings?
1. Sidebar → click **Settings**.
2. Click the **Security** tab.

### How do I enable Multi-Factor Authentication (MFA)?
1. In Security settings, find the **MFA** section.
2. Click **Enable MFA**.
3. Open your authenticator app (Google Authenticator, Authy, 1Password, Microsoft Authenticator).
4. Scan the QR code shown on screen.
5. Enter the 6-digit code from your authenticator to verify.
6. Click **Save Backup Codes** — store them somewhere safe (password manager or printed).
7. Click **Done**. MFA is now active on your next sign-in.

### How do I sign in with MFA enabled?
1. Enter email and password as usual.
2. Open your authenticator app.
3. Type the 6-digit code into the **MFA Code** field.
4. Click **Verify**.

### How do I use a backup code if I lose my authenticator?
1. On the MFA prompt, click **Use Backup Code**.
2. Enter one of your saved 8-character backup codes.
3. Each code works once. Generate new codes from Security settings after using one.

### How do I change my password?
1. In Security settings, find **Password**.
2. Enter **Current Password**, then **New Password** and confirmation.
3. Click **Change Password**.
4. You'll be signed out of other sessions for safety.

### How do I review and end active sessions?
1. In Security settings, scroll to **Active Sessions**.
2. Each session shows device, location, IP, and last-active time.
3. Click **End Session** on any session you don't recognize.
4. Click **Sign Out All Other Sessions** to nuke everything except your current device.

### How do I disable MFA?
1. Security settings → MFA → click **Disable MFA**.
2. Enter your password to confirm.

### What if I think my account is compromised?
1. **Change your password immediately** (Security → Password → Change Password).
2. Click **Sign Out All Other Sessions**.
3. Re-enable MFA if it wasn't already on.
4. Email **support@realestategenie.app** with the timeline of what you noticed.

### Security best practices
- Enable MFA. It blocks 99%+ of credential-stuffing attacks.
- Use a long, unique password (12+ chars, not reused on other sites). A password manager helps.
- Store backup codes somewhere offline.
- Review active sessions monthly.

**Hoku-equivalent queries**:
- "Enable MFA on my account"
- "Change my password"
- "Show my active sessions"
- "Sign me out of all other devices"`,
  },
  {
    id: "settings",
    title: "19. Settings",
    content: `## 19. Settings

Configure your profile, branding, AI auto-response, escalation rules, and security. Most agent-facing settings live here.

### How do I open Settings?
1. Sidebar → click **Settings** (or /app/settings).

### How do I update my profile?
1. Open Settings → **Profile** tab.
2. Update **Display Name**, **Email**, **License Number**, **Agency Name**, **Phone**.
3. Set **Locations Served** (cities/ZIPs/regions you cover).
4. Set **Timezone** (controls scheduled emails, reports, and event times).
5. Set **Landing Page** preference: Dashboard or Open Houses.
6. Click **Save**.

### How do I update my branding (headshot and logo)?
1. Open Settings → **Profile** tab.
2. Under **Headshot URL**, paste a public URL or click **Upload** to upload a photo.
3. Under **Company Logo URL**, paste your brokerage logo URL or upload.
4. Click **Save**.
5. Branding appears on every PDF (Property Report, Seller Report, CMA, Neighborhood Profile) and in Email Blast.

### How do I configure AI auto-response?
1. Open Settings → **Auto-Response** tab.
2. Toggle **SMS Auto-Response** on/off.
3. Toggle **Email Auto-Response** on/off.
4. Edit the **AI Persona** prompt (default works for most agents — customize tone if you want).
5. Set **Active Hours** (e.g., 24/7, business hours only, custom).
6. Click **Save**. Hoku now replies to inbound SMS/email leads automatically with context-aware messages.

### How do I set up escalation rules?
1. Open Settings → **Escalation Rules** tab.
2. Click **+ New Rule**.
3. Pick a trigger:
   - **Intent Signal** — strong buying/selling intent in the conversation.
   - **Sentiment** — frustrated/urgent tone.
   - **Engagement** — multi-message back-and-forth.
   - **Heat Score Threshold** — score crosses a value.
4. Pick the action: **Notify me**, **Pause auto-response**, **Move to pipeline stage**, **Tag**.
5. Click **Save**.

### How do I change security settings?
1. Open Settings → **Security** tab.
2. See the dedicated Security & MFA help section for full step-by-steps.

### How do I manage notifications?
1. Open Settings → **Notifications** tab.
2. Toggle **Email**, **SMS**, **Push** for each event: New Lead, Hot Lead, Open House Reminder, Watchdog Alert, Pipeline Stage Change, Daily Briefing, Weekly Recap.
3. Click **Save**.

**Hoku-equivalent queries**:
- "Update my phone number to [phone]"
- "Turn on SMS auto-response"
- "Change my landing page to Open Houses"
- "Update my brokerage logo to [URL]"`,
  },
  {
    id: "admin-guide",
    title: "20. Admin Guide",
    content: `## 20. Admin Guide

Platform admin tools: user management, plan configuration, MLS integrations, access requests, error logs, API usage. Visible only to users with the **Platform Admin** role.

### How do I open the Admin panel?
1. Sidebar \u2192 click **Admin** (or /admin).
2. (Visible only to Platform Admins.)

### How do I review the Admin Dashboard?
1. The Admin landing page shows: total users, active users, access requests, critical/warning alerts, open houses, leads, and 24h error count.
2. **Sales Opportunities** lists agents who exceeded plan limits \u2014 upsell candidates.

### How do I manage users?
1. Open Admin \u2192 **User Management**.
2. Search by email or name.
3. Click any user row to see their profile, plan, integrations, and activity.
4. Use the action buttons on each row: **Impersonate** ("View as Agent"), **Reset Password**, **Suspend**, **Restore**, **Delete**.

### How do I approve access requests?
1. Open Admin \u2192 **Access Requests**.
2. Each row shows requester email, requested role, signup date.
3. Click **Approve** or **Reject**.
4. (Optional) Bulk-select rows and approve/reject in batch.

### How do I send invitations?
1. Open Admin \u2192 **Invitations**.
2. Click **+ Bulk Invite** \u2192 paste comma- or newline-separated emails.
3. Pick the default plan for invitees.
4. Click **Send**.
5. Track delivery, accepted, and expired status from this page.

### How do I manage subscription plans?
1. Open Admin \u2192 **Plan Management**.
2. Click any plan to edit name, price, billing cycle, agent/assistant/admin/office seat limits.
3. Click **+ Create Plan** for a new plan.
4. **Save** \u2014 changes apply to new subscriptions immediately; existing subscriptions stay on their current terms.

### How do I assign or change a user's plan?
1. Open Admin \u2192 **Subscription Management**.
2. Find the user \u2192 click **Change Plan** \u2192 pick the target plan.
3. Choose **Effective Now** or **At Next Billing Cycle**.
4. Confirm.

### How do I configure feature toggles?
1. Open Admin \u2192 **Feature Management**.
2. Each row is a feature \u00d7 plan matrix.
3. Toggle a feature on/off per plan.
4. **Save**. Affects all users on the affected plan immediately.

### How do I configure MLS integrations per region?
1. Open Admin \u2192 **User MLS Integrations**.
2. Find the user \u2192 click **Configure**.
3. Pick the MLS provider for their region.
4. Enter credentials (OAuth, Basic Auth, or vendor Bearer token depending on provider).
5. Click **Test Connection** \u2192 **Save**.

### How do I monitor API usage and costs?
1. Open Admin \u2192 **API Usage Report**.
2. View calls per provider (MLS, Property Data, AI, Maps), cost per call, and total monthly burn.
3. Filter by date range and provider.

### How do I review error logs?
1. Open Admin \u2192 **Error Logs**.
2. Last 1000 entries shown with timestamp, user, route, status code, stack trace.
3. Search/filter by user or route.

### How do I impersonate an agent for support?
1. Open Admin \u2192 **User Management** \u2192 find the user.
2. Click **View as Agent**.
3. You see the app exactly as that agent sees it.
4. Click **Exit Impersonation** in the banner to return to admin view.

**Hoku-equivalent queries**:
- "Show me agents who exceeded their plan this month"
- "Approve [email]'s access request"
- "What's our API spend this month?"
- "Impersonate [agent name]"`,
  },
  {
    id: "showing-scheduler",
    title: "21. Showing Scheduler",
    content: `## 21. Showing Scheduler

A public-facing page where buyers and clients can self-book a property showing on your calendar. Confirmed bookings sync to your calendar and create a CRM activity.

### How do I open the Showing Scheduler?
1. Sidebar → click **Showing Scheduler** (or /app/showing-scheduler).

### How do I share my booking link with a client?
1. Open the Showing Scheduler.
2. Click **Copy Link** in the top-right.
3. Paste it into a text/email/social DM. (The public URL is realestategenie.app/showing.)

### How does a client book a showing?
1. The client opens the link.
2. They search a property by address or pick from your active listings.
3. They choose an available date and time on your calendar.
4. They enter name, email, phone, and any notes.
5. Submit creates a booking request that lands in your **Pending** queue.

### How do I review and confirm pending requests?
1. Open the Showing Scheduler.
2. Click the **Pending** tab.
3. Review each request — address, requested time, client info.
4. Click **Confirm** to accept (event goes on your calendar; client gets a confirmation).
5. Click **Decline** to reject (client gets a polite decline + offer to suggest alternate times).

### How do I block off times when I'm unavailable?
1. Open the Showing Scheduler.
2. Click the **Availability** tab.
3. Set your default weekly availability (e.g., Mon-Fri 9am-6pm).
4. Click **+ Block Time** to add specific blackouts (vacation, listing presentations, family commitments).
5. Save.

### How do I set the buffer between showings?
1. Open the **Settings** tab inside the Showing Scheduler.
2. Set **Buffer** (e.g., 30 min before/after each showing for travel).
3. Set **Min Notice** (e.g., 4 hours — clients can't book within that window).
4. Set **Max Showings/Day** if you want a daily cap.
5. Click **Save**.

### How do I cancel or reschedule a confirmed showing?
1. Open the **Confirmed** tab.
2. Click the row.
3. Click **Reschedule** to suggest a new time, or **Cancel** to release the slot.
4. The client gets an automatic notification either way.

**Hoku-equivalent queries**:
- "What showings are pending?"
- "Confirm the showing at [address]"
- "Block off Friday afternoon"
- "Show my showings this week"`,
  },
  {
    id: "email-blast",
    title: "22. Email Blast",
    content: `## 22. Email Blast

Email Blast sends MLS neighborhood listing updates to CRM contacts on a recurring schedule. Also used for Broker's Open announcements to share your active listings with other agents in the market.

### How do I open Email Blast?
1. In the left sidebar, click **Opportunities** to expand it.
2. Click **Email Blast**.

### How do I create a new Email Blast?
1. Open Email Blast.
2. Click **+ New Blast** in the top-right.
3. Type a **Blast Name** (e.g., "[neighborhood] weekly listings").
4. In the **Search Criteria** section:
   - Type the neighborhood or subdivision name
   - Add one or more ZIP codes
   - Check the MLS statuses to include: **Active**, **Closed**, **Price Change** (any combination)
5. In the **Recipients** section, search your CRM contacts and add them to the list.
6. Set the **Schedule**: Weekly, Biweekly, Monthly, or Manual (send only when you trigger it).
7. Click **Create**.

### How do I send a blast right now?
1. Open Email Blast.
2. Find the blast in the list.
3. Click **Send Now** on the row.
4. The system pulls the latest MLS data for the configured area, builds the email, and sends to all recipients.

### How do I edit a blast?
1. Click the blast row to open its detail page.
2. Click **Edit** in the top-right.
3. Adjust criteria, recipients, or schedule.
4. Click **Save**.

### How do I pause a recurring blast?
1. Open the blast detail page.
2. Toggle **Active** off.
3. Scheduled sends stop until toggled back on.

### How do I see who received my last blast?
1. Open the blast detail page.
2. Click the **History** tab.
3. Each row shows send date, recipient count, opens, clicks, and any bounces.

### How do I create a Broker's Open blast (send my listings to other agents)?
1. First, build the recipient list: open **Reports** → **MLS Agent Leaderboard**, generate the leaderboard, click **Export to CRM**. Agents are pushed to your CRM tagged "MLS Agent."
2. Open Email Blast and click **+ New Blast**.
3. In Recipients, filter by the **"MLS Agent"** tag to add the full agent list.
4. In Search Criteria, leave the neighborhood blank and check **My Listings Only** (the blast pulls your active listings instead of an area's listings).
5. Set schedule to **Manual** for one-off Broker's Open invites, or recurring if you regularly share inventory.
6. Click **Create**, then click **Send Now**.

### Hoku-equivalent
- "Create a weekly Email Blast for [neighborhood] active listings"
- "Send my [blast name] now"
- "Pause my [blast name] blast"
- "Show me last week's blast performance for [blast name]"
- "Send my listings to MLS agents in my CRM for a Broker's Open"`,
  },
  {
    id: "mls-leaderboard",
    title: "22.5 MLS Agent Leaderboard",
    content: `## 22.5 MLS Agent Leaderboard

The MLS Agent Leaderboard ranks agents in your market based on closed MLS transactions. Use it to identify top producers, track competition, and build your Broker's Open contact list.

### How do I open the MLS Agent Leaderboard?
1. In the left sidebar, click **Reports**.
2. Click **MLS Agent Leaderboard**.

### How do I generate a leaderboard?
1. Open the MLS Agent Leaderboard.
2. Set the **Time Period** dropdown (e.g., Last 30 days, Last Quarter, Last Year, Custom).
3. (Optional) Choose **Property Types** to include (Residential, Condo, Townhouse, etc.).
4. (Optional) Choose **Sides** (Listing Agent, Buyer Agent, or Both).
5. Click **Generate**.

### How do I sort the leaderboard?
1. After generating, click any column header in the table:
   - **Closings** — number of closed transactions
   - **Volume** — total dollar volume
   - **Average Price**
   - **Median DOM**
   - **List-to-Sale Ratio**
2. Click again to reverse the sort direction.

### How do I view an individual agent's detail?
1. Click an agent row in the leaderboard.
2. The detail panel shows their closed listings, average prices, DOM, and contact info pulled from MLS.

### How do I export to Excel?
1. After generating the leaderboard, click **Export to Excel** in the top-right.
2. The XLSX includes every column shown plus full agent contact data.

### How do I push agents to my CRM for Broker's Open outreach?
1. Click **Export to CRM** in the top-right.
2. Confirm. Each agent on the leaderboard is created/updated as a CRM contact with the **"MLS Agent"** tag.
3. Use that tag in **Email Blast** or **Broker's Open** to send branded outreach to the full list.

### Hoku-equivalent
- "Show me the top 20 agents in [county] this quarter"
- "Who closed the most volume in [ZIP] last year?"
- "Export the leaderboard for [county] to Excel"
- "Push leaderboard agents to my CRM with the MLS Agent tag"`,
  },
  {
    id: "glossary",
    title: "23. Glossary",
    content: `## 23. Glossary

Key terms used throughout The Real Estate Genie.

**1031 Exchange:** A tax-deferred exchange under IRS Section 1031 that allows an investor to sell a property and reinvest the proceeds in a like-kind property, deferring capital gains taxes. The IRS requires identification of replacement properties within 45 days and closing within 180 days.

**70% Rule:** A guideline used by house flippers: the maximum purchase price should be no more than 70% of the After-Repair Value (ARV) minus repair costs. Formula: MAO = (ARV \u00d7 0.70) \u2013 Repair Costs.

**ARV (After-Repair Value):** The estimated market value of a property after all renovations and improvements are completed.

**BRRR:** Buy, Renovate, Refinance, Rent \u2014 an investment strategy where an investor purchases a property, renovates it, refinances to recover capital, and rents it for ongoing income.

**Cap Rate (Capitalization Rate):** A measure of a property\u2019s profitability: Net Operating Income divided by the property\u2019s purchase price or current market value. Expressed as a percentage.

**Cash-on-Cash Return:** The annual pre-tax cash flow divided by the total cash invested. Measures the return on actual cash invested, not the total property value.

**Cash-to-Close:** The total amount of cash a buyer needs to bring to the closing table, including down payment, closing costs, prepaids, and escrow reserves, minus any credits.

**CMA (Comparative Market Analysis):** An analysis of recently sold comparable properties used to estimate the market value of a subject property.

**CRM:** Customer Relationship Management \u2014 a system for managing contacts, leads, and customer interactions. The Real Estate Genie integrates with an external CRM for contact sync, pipeline mapping, and automation.

**DSCR (Debt Service Coverage Ratio):** A measure of a property\u2019s ability to cover its debt obligations. Calculated as Net Operating Income divided by Total Debt Service. A DSCR above 1.0 means the property generates enough income to cover its debt.

**GRM (Gross Rent Multiplier):** A quick metric to evaluate rental property value: Purchase Price divided by Gross Annual Rental Income. Lower GRM values suggest better value.

**Heat Score:** A lead scoring metric (0\u2013100) used in The Real Estate Genie to indicate a lead\u2019s engagement level and likelihood to convert. Leads with a score of 80 or above are classified as \u201chot leads.\u201d

**HMAC:** Hash-based Message Authentication Code \u2014 a cryptographic method used to verify the authenticity and integrity of webhook payloads. Configure an HMAC secret key in the n8n webhook integration for added security.

**Infinite Returns:** A BRRR strategy outcome where the investor recovers 100% or more of their initial cash investment through refinancing, meaning ongoing cash flow is generated with no remaining capital at risk.

**IRR (Internal Rate of Return):** The annualized rate of return that makes the net present value of all cash flows from an investment equal to zero. Accounts for the time value of money.

**MAO (Maximum Allowable Offer):** The highest price an investor should pay for a property to achieve their target profit margin. Used primarily in flipping and wholesaling.

**MFA (Multi-Factor Authentication):** A security method that requires two or more verification steps to sign in, such as a password plus a code from an authenticator app.

**MLS (Multiple Listing Service):** A database of real estate listings shared among licensed real estate professionals. The Real Estate Genie accesses MLS data through your region's MLS provider, configured by a platform administrator.

**NOI (Net Operating Income):** Gross rental income minus operating expenses (excluding mortgage payments). Used to calculate Cap Rate and DSCR.

**PITI:** Principal, Interest, Taxes, and Insurance \u2014 the four components of a standard monthly mortgage payment.

**PMI (Private Mortgage Insurance):** Insurance required by lenders when the borrower\u2019s down payment is less than 20% of the property value. Added to the monthly mortgage payment.

**ROI (Return on Investment):** A general measure of the profitability of an investment, calculated as net profit divided by total investment cost, expressed as a percentage.

**Seller Net Sheet:** A document estimating the seller\u2019s proceeds from a property sale after deducting commissions, closing costs, mortgage payoff, and any concessions.

**TMK (Tax Map Key):** Hawaii's unique parcel identifier, used in property records and tax assessments. Most other states use APN (Assessor's Parcel Number) for the same purpose. The Seller Opportunity Map overlays parcel boundaries where supported.

**APN (Assessor's Parcel Number):** A unique parcel identifier issued by a county assessor. Equivalent to TMK in Hawaii. Format and dash conventions vary by county.

**Webhook:** An HTTP callback that sends real-time data to an external URL when a specific event occurs. The Real Estate Genie supports webhooks via n8n integration.`,
  },
  {
    id: "support",
    title: "24. Support & Legal",
    content: `## 24. Support & Legal

### 23.1 Getting Help

If you need assistance with The Real Estate Genie, please visit realestategenie.app for support options or contact your account administrator.

### 23.2 Legal Documents

- **End User License Agreement (EULA)** \u2014 Available at realestategenie.app/eula
- **Privacy Policy** \u2014 Available at realestategenie.app/privacy
- **Terms of Service** \u2014 Available at realestategenie.app/terms
- **Data Deletion Request** \u2014 Available at realestategenie.app/data-deletion

---

*\u00a9 2026 The Real Estate Genie. All rights reserved.*`,
  },
];
