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

The Dashboard is your command center in The Real Estate Genie. It provides a comprehensive overview of your real estate business with intelligent recommendations.

### 2.1 Needs Attention

At the top, the **Needs Attention** section highlights urgent follow-ups -- leads that have not been contacted in 3 or more days and have a heat score of 50 or above. These are shown in amber to draw your attention.

### 2.2 Hoku Assistant

Hoku is your AI copilot, available as a floating button on the bottom-right of every page. Click the Hoku button to open a conversational interface where you can ask questions, run searches, draft communications, and execute tasks. Hoku knows about every property you are viewing and can provide context-aware help.

### 2.3 AI Daily Briefing

The AI Daily Briefing generates a numbered priority list (1-3 items) based on your current business state: urgent follow-ups, hot lead count, today's open house events, and new leads this week. It helps you start your day knowing exactly what needs attention first.

### 2.4 Pipeline Stats

Shows a count-by-stage breakdown of your leads, total lead count, and hot leads count. Click through to the full Pipeline view to manage your deal flow.

### 2.5 Tasks Widget

Displays your tasks in three sections: Overdue, Today, and Upcoming (3 tasks per section). Each task shows a priority color dot (red/orange/blue/green). Quick-complete checkboxes let you mark tasks done without leaving the dashboard.

### 2.6 Upcoming Events

Shows your next 5 events from the next 2 weeks across all connected calendars (Google Calendar, Outlook, CRM). Events are color-coded by source for easy identification.

### 2.7 Active Listings

Displays your total active listings, average Days on Market (DOM), and flags stale listings (21+ DOM) with a warning section showing affected addresses.

### 2.8 Quick Actions

A 7-button grid for one-click navigation: New Open House, View Leads, Pipeline, MLS Search, Reports, Calculators, Tasks. Below this, **One-Tap Contact Actions** show your hot leads (heat score 70+) with direct Call, Text, and Email links. A floating action bar at the bottom-right provides quick access to common actions.

### 2.9 Recent Activity Feed

A real-time chronological log of leads, open house events, integrations, and webhooks. Leads display heat score badges (HOT/WARM/COLD). Times are shown relative (Just now, 5m ago, 1h ago, 3d ago).

### 2.10 Sync Health

Shows the connection status of your calendar integrations (Google Calendar, Outlook, CRM) with last sync timestamps. Green = connected, amber = warning, red = error.`,
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

The Calendar provides a unified view of all your events across connected calendar systems.

### 4.1 Calendar Integrations

The Calendar supports three external sources plus local events:

- **Google Calendar** (blue dot) -- Connect via OAuth on the Integrations page
- **Microsoft/Outlook Calendar** (green dot) -- Connect via OAuth on the Integrations page
- **CRM Calendar** (purple dot) -- Connect via CRM API key on the Integrations page
- **Local Calendar** (gray dot) -- Events created directly in the app

### 4.2 Views and Navigation

Toggle between Month, Week, and Day views. Use the navigation arrows to move between date ranges. The current date is always highlighted.

### 4.3 Managing Events

1. Click **Create Event** to open the event form.
2. Enter a title, description, location, date/time range, and optionally toggle all-day.
3. Select which calendar to create the event in.
4. Add attendees if needed.
5. Click **Save** to create the event.

You can also click on any existing event to edit or delete it.

### 4.4 Two-Way Sync

Changes made in The Real Estate Genie sync back to your connected calendars, and vice versa. The sync engine handles conflict resolution: app edits win by default, except for CRM booked meetings (from online booking pages), which always take precedence.

Use the **Sync** button to force a full sync across all connected sources.

### 4.5 Source Filtering

Use the source toggles to show or hide events from specific calendars. Each event displays a colored dot indicating its source.`,
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

The Contacts section manages your CRM contacts. Note: Contacts are different from Leads -- Leads are auto-captured from open house check-ins, while Contacts are synced from your CRM.

### 9.1 Contact List

Contacts are alphabetically grouped and searchable (with debounced search). Each contact shows: Name, Email, Phone, Location (City/State), and Tags (displayed as badges).

### 9.2 Actions

Each contact has Call, Text, and Email action buttons. Click a contact to view their full detail page with history and notes from CRM.

### 9.3 Adding Contacts

Click **Add Contact** to manually create a contact (first name, last name, email, phone, address). New contacts sync to your CRM automatically.

### 9.4 Bulk Operations

Select multiple contacts using checkboxes, then send bulk Email or SMS messages. Track sent/failed counts.

### 9.5 Export

Export your contacts to PDF or XLSX with columns: Name, Email, Phone, City, Tags.

### 9.6 CRM Requirement

The Contacts page requires the CRM integration. If not connected, a warning banner appears with a link to the Integrations page.`,
  },
  {
    id: "analyzers",
    title: "9. Investment Analyzers",
    content: `## 9. Investment Analyzers

The Analyzers section provides 12 powerful financial analysis tools designed for real estate investment evaluation. Each tool is tailored to a specific investment strategy or transaction calculation.

### 9.1 Investment Property Analyzer

Evaluate the financial performance of a potential investment property.

**Key Metrics:** Return on Investment (ROI), Capitalization Rate (Cap Rate), Internal Rate of Return (IRR), and Cash-on-Cash Return.

**How to Use:**
1. Navigate to **Analyzers > Investment Property Analyzer**.
2. Enter property details: purchase price, down payment, loan terms, expected rental income, and operating expenses.
3. Review the calculated metrics and financial projections.
4. Save the analysis to your database for future reference.

### 9.2 1031 Exchange Analyzer

Plan and track a 1031 tax-deferred exchange with timeline management and tax savings calculations.

**Key Features:** IRS 45-day identification rule tracking, 180-day closing deadline tracking, tax savings calculations, and replacement property comparison.

**How to Use:**
1. Navigate to **Analyzers > 1031 Exchange Analyzer**.
2. Enter the relinquished (sold) property details: sale price, adjusted basis, depreciation recapture.
3. Add potential replacement properties for comparison.
4. The tool tracks your critical deadlines: 45 days to identify replacement properties and 180 days to close.
5. Review estimated tax savings from deferring capital gains.

### 9.3 BRRR Strategy Analyzer

Analyze the Buy, Renovate, Refinance, Rent (BRRR) investment strategy.

**Key Metrics:** Infinite Returns analysis, cash-out refinancing projections, and multi-family support.

**How to Use:**
1. Navigate to **Analyzers > BRRR Strategy Analyzer**.
2. Enter the purchase price, renovation costs, and after-repair value (ARV).
3. Input refinancing terms (LTV ratio, interest rate, loan term).
4. Enter projected rental income and operating expenses.
5. Review whether the deal achieves infinite returns (all initial capital recovered through refinance).

### 9.4 House Flip Analyzer

Evaluate potential house flip deals using the 70% Rule and detailed ROI projections.

**Key Metrics:** 70% Rule compliance, projected ROI, rehab cost estimates, and financing options analysis.

**How to Use:**
1. Navigate to **Analyzers > House Flip Analyzer**.
2. Enter the purchase price, estimated ARV, and renovation budget.
3. The tool calculates whether the deal meets the 70% Rule (purchase + rehab \u2264 70% of ARV).
4. Review projected profit, ROI, and holding cost estimates.

### 9.5 Compare Properties

Place multiple investment properties side by side for direct comparison.

**Key Features:** Side-by-side comparison of all key financial metrics for multiple properties.

**How to Use:**
1. Navigate to **Analyzers > Compare Properties**.
2. Select two or more saved property analyses.
3. View a side-by-side comparison of all key metrics including Cap Rate, Cash-on-Cash Return, IRR, and more.
4. Use the comparison to make informed investment decisions.

### 9.6 Mortgage Calculator

Calculate monthly mortgage payments with a full PITI (Principal, Interest, Taxes, Insurance) breakdown.

**Key Features:** PITI calculation, HOA and PMI inclusion, full amortization schedule, and Excel export.

**How to Use:**
1. Navigate to **Analyzers > Mortgage Calculator**.
2. Enter loan amount, interest rate, loan term, property taxes, and insurance.
3. Optionally add HOA fees and PMI (if down payment is less than 20%).
4. Review the monthly payment breakdown and amortization schedule.
5. Export the amortization schedule to Excel for your records.

### 9.7 Seller Net Sheet

Estimate a seller\u2019s net proceeds after all closing costs and deductions.

**Key Features:** Commission calculations, closing cost estimates, mortgage payoff, seller concessions, and PDF/Excel export.

**How to Use:**
1. Navigate to **Analyzers > Seller Net Sheet**.
2. Enter the sale price, outstanding mortgage balance, commission rates, and estimated closing costs.
3. Add any seller concessions or credits.
4. Review the estimated net proceeds.
5. Export to PDF or Excel to share with your client.

### 9.8 Buyer Cash-to-Close

Calculate the total cash a buyer needs at closing.

**Key Features:** Down payment, closing costs, prepaids, escrow reserves, and credit calculations. PDF export.

**How to Use:**
1. Navigate to **Analyzers > Buyer Cash-to-Close**.
2. Enter the purchase price, down payment percentage, estimated closing costs, and prepaid items.
3. Add any seller credits or lender credits.
4. Review the total cash-to-close estimate.
5. Export to PDF to share with your buyer.

### 9.9 Commission Split Calculator

Calculate agent net income after brokerage splits, caps, and fees.

**Key Features:** Brokerage split structures, cap tracking, transaction fee calculations, team override management, and split presets.

**How to Use:**
1. Navigate to **Analyzers > Commission Split Calculator**.
2. Enter the total commission amount and your split arrangement with your brokerage.
3. Add any transaction fees, E&O insurance, or team overrides.
4. If you are approaching your cap, enter your year-to-date commission for accurate calculations.
5. Review your estimated net commission. Save split presets for quick future calculations.

### 9.10 Quick Flip Analyzer

Quickly evaluate a potential flip deal with a streamlined scoring system.

**Key Features:** Fast deal scoring, profit projection, ROI calculation, and 70% Rule MAO (Maximum Allowable Offer) check.

**How to Use:**
1. Navigate to **Analyzers > Quick Flip Analyzer**.
2. Enter the ARV, repair costs, and target purchase price.
3. Instantly see the deal score, projected profit, ROI, and whether it passes the 70% Rule.

### 9.11 Wholesale MAO Calculator

Calculate the Maximum Allowable Offer (MAO) for wholesale deals.

**Key Features:** MAO calculation, investor margin analysis, and offer range recommendations.

**How to Use:**
1. Navigate to **Analyzers > Wholesale MAO Calculator**.
2. Enter the ARV, estimated repair costs, and your desired wholesale fee.
3. The calculator determines the MAO and provides an offer range.
4. Review the investor margin to ensure the deal is attractive to end buyers.

### 9.12 Rental Property Calculator

Analyze the financial performance of a rental property investment.

**Key Metrics:** Net Operating Income (NOI), Cap Rate, Cash-on-Cash Return, Debt Service Coverage Ratio (DSCR), Gross Rent Multiplier (GRM), and monthly cash flow.

**How to Use:**
1. Navigate to **Analyzers > Rental Property Calculator**.
2. Enter the purchase price, financing details, monthly rental income, and operating expenses.
3. Review all key financial metrics.
4. Use the DSCR to assess whether the property generates sufficient income to cover debt service.

### 9.13 Short-Term Rental (STR) Analyzer

Analyze Airbnb/VRBO investment potential with locale-aware tax calculations.

**Key Features:** Nightly rate and occupancy modeling, locale-specific lodging/transient tax calculations (e.g., Hawaii GET 4.712% + TAT 10.25%; configurable for other states), monthly and yearly cash flow projections, expense breakdown charts, multi-year revenue projections.

**How to Use:**
1. Navigate to **Analyzers > STR Analyzer**.
2. Enter the nightly rate, expected occupancy rate, cleaning fees per turnover, and property expenses.
3. Review monthly and annual cash flow with locale-specific tax deductions applied automatically.
4. View charts showing revenue projections and expense breakdowns.

### 9.14 Shared Features

All calculators share these capabilities:
- **MLS Auto-Import**: One-click data pull from MLS listings (address, purchase price, taxes, insurance)
- **Export**: Excel (.xlsx) and PDF with professional formatting and agent branding
- **Email Sharing**: Send results directly to a client contact
- **Save/Load**: Complex analyses (Investment, Flip, BRRRR, 1031) persist in the database for future reference
- **Charts**: Pie charts (expense breakdown), line charts (cash flow projections), bar charts (deal scoring)`,
  },
  {
    id: "reports",
    title: "13. Reports",
    content: `## 13. Reports

The Reports section provides comprehensive analytics organized by role and category. All reports support PDF export, Excel export, and print-friendly format.

### 13.1 Market Statistics (Red)

- **Oahu Annual Resales**: 40 years of residential sales data with line/bar/area charts
- **Oahu Monthly Report**: SF & condo sales, median prices, DOM, pending inventory, YoY comparisons
- **Maui Monthly**, **Hawaii Island Monthly**, **Kauai Monthly**: Island-specific market data
- **Statewide Comparison**: Official Hawaii Realtors stats across all four counties
- **York & Adams Counties, PA**: RAYAC monthly data with school district breakdowns

### 13.2 Solo Agent Reports (Blue)

- **Lead Source ROI**: Conversion rates and cost-per-closing by lead source
- **Pipeline Velocity**: Days per pipeline stage, deal bottleneck identification
- **Tax & Savings Reserve**: Gross commission vs. tax/expense reserves
- **Speed-to-Lead Audit**: Average response time to portal leads

### 13.3 Small Teams Reports (Purple)

- **Agent Leaderboard**: Activity vs. results with radar chart comparison
- **Lead Assignment Fairness**: Per-member leads and conversion rates
- **Team Commission Split Tracker**: House vs. agent portions
- **Listing Inventory Health**: Active listings, DOM, price adjustment alerts for 21+ DOM

### 13.4 Brokerage Reports (Green)

- **Company Dollar**: Revenue after commissions and expenses
- **Compliance & Audit Log**: Signed documents, ID verifications, wire confirmations
- **Brokerage Market Share**: Rank by zip code vs. Big Box brands
- **Agent Retention Risk**: AI flags for agents with 40%+ activity drop over 30 days

### 13.5 Assistants & Office Admin (Orange)

- **Pending Document Checklist**: Under-contract deals missing required signatures/forms

### 13.6 Report Routing

Reports are filtered based on your MLS connection. You will only see reports relevant to your market. For example, an agent connected to a Hawaii MLS will see Hawaii market reports, while an agent connected to a Pennsylvania MLS will see Pennsylvania reports.`,
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

The Genie AVM is Real Estate Genie's proprietary valuation model. It appears as a "Genie AVM" value card with a confidence badge on the Property Detail Modal.

**How it works:**

The Genie AVM is a proprietary ensemble model that dynamically weights four data sources:

1. **List Price (30-40% weight)** - When a property is actively listed, the agent's asking price is the strongest signal. Luxury properties ($2M+) get 40% weight since comps are sparse at high price points.
2. **MLS Closed Comps (20-45% weight)** - Recent closed sales from MLS, adjusted for differences in size, beds, baths, and age. Up to 15 comps are used for a broader sample.
3. **Property AVM (15% weight)** - Third-party valuation used as a minor cross-check, not a primary input.
4. **County Assessment Trend (15-25% weight)** - Assessed value adjusted for the local assessment-to-market ratio over time.

The model also uses list-to-sale ratio calibration -- it tracks how properties in each area actually sell relative to their asking price, and adjusts accordingly. Comp quality filters ensure only truly comparable properties influence the value: minimum correlation threshold, maximum adjustment cap (35%), and outlier removal.

**Hawaii-specific adjustments:**

- **Leasehold discount (25-35%)**: Leasehold properties are valued lower than Fee Simple. The discount varies based on remaining lease term.
- **Flood zone discount (3-5%)**: Properties in FEMA flood zones receive a small valuation reduction reflecting insurance costs and risk.
- **High HOA impact**: Unusually high HOA fees reduce the effective value to reflect ongoing carrying costs.

**Why it matters:**

Generic AVMs often miss Hawaii-specific factors like leasehold tenure, which can reduce a property's value by a third. The Genie AVM accounts for these local realities. For methodology details, see this help section. The Property Detail Modal keeps the display clean with just the value and confidence badge.

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

Generate AI-powered neighborhood profiles for marketing materials and client presentations.

### 12.1 Creating a Profile

1. Navigate to **Neighborhoods** from the main navigation.
2. Enter: neighborhood name, address, city, state, and optionally architectural style, nearby amenities, and additional context.
3. Click **Generate** to create the profile using AI (GPT-4).

### 12.2 Profile Sections

1. **Lifestyle & Vibe**: Character description, walkability, community feel
2. **Location Intelligence**: Proximity to transit, commute corridors, accessibility
3. **Market Pulse** (optional): Median price, days on market, active inventory, price per sqft
4. **Community Resources**: Schools with district info, safety/law enforcement disclaimer
5. **Local Amenities**: Parks, shopping, dining organized by type

### 12.3 Data Sources

Profiles pull from: NCES schools, FBI crime, FEMA/USGS hazards, OpenStreetMap POI, FRED sales trends, state GIS school zones (where available), and Census demographics. School data is cached for 1 year (refreshes August 1).

### 12.4 Fair Housing Compliance

Every profile includes a built-in Fair Housing Act compliance check that validates no discriminatory language is present.

### 12.5 Export

Export profiles as a professional multi-page PDF (12-14+ pages) or Word/DOCX. The PDF includes:

1. **Cover Page**: Neighborhood map, name, city/state, agent branding (headshot, name, license, brokerage logo)
2. **Housing Facts & Stats**: Comparison table (ZIP vs County vs State vs USA) with median home value, household income, population, median age, housing units, own/rent percentages
3. **Market Trends**: Market type indicator (Seller's/Balanced/Buyer's Market), key stats cards (months of inventory, sold-to-list, median DOM, median sold price), MoM trend arrows for all metrics, median estimated value with 1-month and 12-month change
4. **Sold Home Stats**: Distribution bar charts showing price ranges, price per sqft, home sizes, home ages, and bedroom counts of recently sold homes
5. **People Facts & Stats**: Population, density, population change since 2020, median age across geographic levels
6. **Education Levels**: Horizontal bar charts showing graduate/professional, bachelor's, some college, associate's, high school, less than HS
7. **Age Distribution**: Bar chart showing population by age group (Under 18 through 65+)
8. **Household Income Brackets**: Bar chart from >$200K down to <$25K
9. **Occupational Categories**: Bar chart of employment categories (management, service, sales, construction, production)
10. **Households with Children**: Breakdown of married with/without children and single with children
11. **Transportation Modes**: How people get to work (drive/carpool, walk, bicycle, public transit, work from home)
12. **Economy**: Multi-geo comparison table with income, commute time; commute time distribution bar chart
13. **Quality of Life**: Elevation, annual rainfall, average temperatures (Jan/Jul min/max), commute time, superfund/brownfield sites
14. **Schools**: Table of up to 15 schools with type, grade range, enrollment, and student-teacher ratio
15. **Walkability**: Walk score display with label
16. **Lifestyle & Vibe**: AI-generated character narrative
17. **Location Intelligence**: AI-generated proximity and accessibility analysis
18. **Local Amenities**: Parks, shopping, and dining organized by category
19. **Nearby Neighborhoods**: Grid of up to 6 micro-neighborhoods with median home value, number of homes, and population

Census data is automatically fetched from the ACS 5-year survey at 4 geographic levels when you export the PDF.`,
  },
  {
    id: "integrations",
    title: "12. Integrations",
    content: `## 14. Integrations

The Integrations page allows you to connect third-party services to extend the functionality of The Real Estate Genie. Navigate to **Integrations** from the main navigation to view and manage all available integrations.

### 14.1 CRM Integration

Connect your CRM to sync contacts, manage opportunities, map pipelines, and automate lead workflows. Follow the five steps below to get fully set up.

**Step 1 — Sign In to Your CRM**
You will receive an invitation email from **noreply@mg.aiprofitandgrowth.com**. Click the link in the email to accept the invitation, then sign in to your CRM at **app.aiprofitandgrowth.com**.

**Step 2 — Create a Private Integration API Key**
1. Inside your CRM, navigate to **Settings > Private Integrations**.
2. Create a new Private Integration and copy the API Key immediately — it will not be shown again.

**Step 3 — Connect the CRM in REG**
1. In The Real Estate Genie, navigate to **Integrations** and locate the CRM card.
2. Paste the API Key you copied in Step 2 into the API Key field.
3. Click **Connect**. The integration status will show as **Connected**.

**Step 4 — Add Your CRM Location ID**
1. In your CRM, navigate to **Settings > Business Profile** and copy your **Location ID**.
2. Back in The Real Estate Genie CRM integration settings, paste the Location ID into the Location ID field and save.

**Step 5 — Select Your Sales Pipeline**
1. Click **Load Pipelines** to pull your CRM pipelines.
2. Select the pipeline that corresponds to your real estate deal flow.
3. Select the **New Lead Stage** — this is where new leads will land when synced.
4. Optionally, select an **Initial Contact Stage** — leads will automatically move to this stage after an email or SMS is sent.
5. Click **Save** to finalize your configuration.

**CRM Features:**
- **Contact Sync** \u2014 Contacts are synced bidirectionally between The Real Estate Genie and your CRM.
- **Opportunity Creation** \u2014 New leads automatically create opportunities in your CRM pipeline.
- **Pipeline Mapping** \u2014 Map your app pipeline stages to CRM pipeline stages.
- **Tag Management** \u2014 Apply and manage tags on CRM contacts from within the app.
- **Notes** \u2014 Notes added in the app sync to the corresponding CRM contact.

### 14.2 MLS

Provides access to MLS listing data for the agent's market. This is a credentials-based integration configured by a platform administrator (the actual MLS provider varies by region — your administrator handles provider selection and credentials).

**Setup (Admin Only):**
1. Navigate to **Integrations** and locate the MLS card.
2. Enter your MLS API credentials (provided by your MLS).
3. Click **Save and Verify** to confirm the connection.
4. Once verified, MLS data will be available to all users in the MLS section.

### 14.3 n8n Webhooks

Connect The Real Estate Genie to n8n workflow automation by configuring webhook endpoints that trigger on specific events.

**Setting Up Webhooks:**
1. Navigate to **Integrations** and locate the n8n Webhooks card.
2. Click **Configure**.
3. Enter your n8n webhook URL.
4. (Optional) Add an HMAC secret key for webhook signature verification.
5. Select which events should trigger the webhook (see list below).
6. Click **Save**.

**Available Webhook Events:**
- **Lead Submitted** \u2014 Triggered when a new lead is created.
- **Hot Lead** \u2014 Triggered when a lead\u2019s Heat Score reaches 80 or above.
- **Open House Published** \u2014 Triggered when an open house event is published.
- **Open House Ended** \u2014 Triggered when an open house event concludes.
- **Consent Captured** \u2014 Triggered when a lead provides consent.
- **Integration Connected** \u2014 Triggered when a new integration is connected.

**Webhook Reliability:** Webhooks include automatic retry logic with up to 3 attempts if delivery fails. You can view delivery logs directly in the app to troubleshoot any issues.

### 14.4 Hoku Web Assistant

Add an AI chat assistant to your website that pre-qualifies visitors and captures leads.

**Setup:**
1. Navigate to **Integrations** and find the **Hoku Web Assistant** card.
2. Copy the embed code and paste it before the closing \\</body\\> tag on your website.
3. A floating chat button appears in the bottom-right corner of your site.
4. Optionally enter your IDX Broker API key to enable MLS search (if you don't have a direct MLS integration connected).

**How It Works:**
- Visitors click the chat button and Hoku greets them as your assistant.
- **Buyers**: Hoku captures name, email, phone, timeline, pre-approval, neighborhoods, and must-haves. Optionally searches for matching MLS listings and emails them to the visitor.
- **Sellers**: Hoku captures the property address, looks up the AVM and property details, then captures contact info.
- A scored lead is created in your pipeline and a contact is created in your CRM with the full conversation in the notes.
- The lead appears on your Dashboard as "Needs Attention."

### 14.5 Social Channels

Connect social media channels to manage lead responses from social platforms. Configure your social channels under the Integrations page to centralize your lead communication.

### 14.7 Google Maps

Google Maps powers geocoding, property map embeds, and location-based features throughout the app (including the Seller Opportunity Map). This integration is configured via the platform\u2019s Google Maps API key and does not require individual user setup.

### 14.8 Bridge Interactive / Zillow (Coming Soon)

This integration will provide property valuations, rental estimates, and market data from Zillow. It is currently in development and will be available in a future release.

### 14.7 Admin-Only Integrations

The following integrations are available only to platform administrators and are configured at the platform level:

- **Stripe** \u2014 Payment processing for subscription billing.
- **PayPal** \u2014 Alternative payment processing.
- **Realie.ai** \u2014 Property intelligence data including equity estimates, ownership information, loan-to-value ratios, foreclosure status, and absentee owner detection.
- **Federal Data** \u2014 Access to data from the Federal Reserve (FRED), HUD (Fair Market Rents, income limits, Section 8), USPS (address validation), Census Bureau (demographics), and Bureau of Labor Statistics (employment data).`,
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

Manage your subscription, view invoices, and upgrade your plan from the Billing section.

### 16.1 Subscription Plans

The Real Estate Genie offers multiple subscription tiers:

- **Starter / Free Tier** \u2014 Access to core features with usage limits. Ideal for individual agents getting started.
- **Brokerage Growth** \u2014 Unlocks the Broker Dashboard, advanced analytics, and higher usage limits. Designed for brokers and growing teams.

Additional plans may be available. Visit the Billing page for the most current plan options and pricing.

### 16.2 How to Upgrade

1. Navigate to **Billing** from the main navigation.
2. Review the available plans and their features.
3. Click **Upgrade** on your desired plan.
4. Complete the payment process through Stripe or PayPal.
5. Your account will be upgraded immediately, and new features will become available.

### 16.3 Usage Limits and Warnings

Each plan includes usage limits for certain features (such as number of leads, analyses, or integrations). When you approach a limit, a warning banner will appear in the app. To remove limits, upgrade to a higher-tier plan.

### 16.4 Payment Methods

The Real Estate Genie accepts payments via Stripe (credit/debit cards) and PayPal. Manage your payment methods from the Billing page.`,
  },
  {
    id: "team-management",
    title: "17. Team Management",
    content: `## 17. Team Management

Account administrators can manage team members, roles, and permissions from the Team section.

### 17.1 Inviting Team Members

1. Navigate to **Team** from the main navigation (visible to Account Admins only).
2. Click **Invite Member**.
3. Enter the team member\u2019s email address and select their role (Agent, Team Lead, or Admin).
4. Click **Send Invite**. The invitee will receive an email with an invitation link.
5. The invitee clicks the link, creates an account (or signs in if they already have one), and is added to your team.

### 17.2 Team Roles

- **Owner** \u2014 Full control over the account, billing, and all settings.
- **Admin** \u2014 Can manage team members, settings, and most account functions.
- **Team Lead** \u2014 Standard agent access plus the Team Dashboard for monitoring team activity.
- **Agent** \u2014 Standard access to all core features.

### 17.3 Managing Team Members

From the Team page, you can view all team members, change their roles, or remove them from the team. Changes take effect immediately.`,
  },
  {
    id: "security",
    title: "18. Security & MFA",
    content: `## 18. Security & MFA

Protect your account with Multi-Factor Authentication and other security settings.

### 18.1 Multi-Factor Authentication (MFA)

MFA requires a second verification step when signing in, significantly reducing the risk of unauthorized access. See Section 1.4 for detailed setup instructions.

### 18.2 Security Best Practices

- Enable MFA on your account.
- Use a strong, unique password that you do not use for other services.
- Store your MFA backup codes in a secure location.
- Review your account activity regularly.
- If you suspect unauthorized access, change your password immediately and contact support.`,
  },
  {
    id: "settings",
    title: "19. Settings",
    content: `## 19. Settings

Customize your profile and account preferences from the Settings section.

### 19.1 Profile Settings

1. Navigate to **Settings > Profile**.
2. Update your personal information including name, email, phone number, and profile photo.
3. Set your preferred notification preferences.
4. Click **Save** to apply your changes.

### 19.2 Security Settings

Access security settings at **Settings > Security** to manage MFA, change your password, and review active sessions. See Section 18 for details.`,
  },
  {
    id: "admin-guide",
    title: "20. Admin Guide",
    content: `## 20. Admin Guide

This section is for platform administrators with access to the Admin panel.

### 20.1 Accessing the Admin Panel

Platform admins can access the Admin panel from the main navigation. The **Admin** link is visible only to users with the Platform Admin role.

### 20.2 Admin-Only Integrations

Several integrations require admin access to configure:

- **Stripe** \u2014 Configure payment processing for the platform. Manage API keys and webhook endpoints.
- **PayPal** \u2014 Set up PayPal as an alternative payment processor.
- **Realie.ai** \u2014 Configure property intelligence data access. This is a platform-wide integration that provides equity, ownership, LTV, foreclosure, and absentee owner data.
- **Federal Data** \u2014 Configure access to federal data sources including FRED (economic data), HUD (Fair Market Rents, income limits, Section 8), USPS (address validation), Census Bureau (demographics), and BLS (employment data).
- **MLS** \u2014 Configure MLS data access credentials. Provider varies by region; your administrator selects the appropriate MLS for your market.

### 20.3 User Management

From the Admin panel, platform administrators can manage all users on the platform, review account statuses, and handle support escalations.

### 20.4 Platform Configuration

Admins can configure platform-wide settings including Google Maps API keys, webhook configurations, and integration defaults that apply to all users.`,
  },
  {
    id: "showing-scheduler",
    title: "21. Showing Scheduler",
    content: `## 21. Showing Scheduler

The Showing Scheduler provides a public-facing page where your clients can schedule property showings.

### 21.1 How It Works

1. Share your showing scheduler link with clients (realestategenie.app/showing).
2. Clients select a property and choose an available date and time.
3. You receive a notification of the new showing request.
4. Manage and confirm showings from within the app.`,
  },
  {
    id: "email-blast",
    title: "22. Email Blast",
    content: `## 22. Email Blast

Email Blast lets you send MLS neighborhood updates to your CRM contacts on a recurring schedule. You can also use it for Broker's Open announcements to share your current listings with other agents.

### 22.1 Creating a Blast

1. Navigate to **Email Blast** from the main navigation.
2. Click **+ New Blast**.
3. Enter the neighborhood or subdivision name and one or more ZIP codes.
4. Select the MLS statuses to include: Active, Closed, Price Change, or any combination.
5. Search your CRM contacts and add them to the recipient list.
6. Set a schedule: Weekly, Biweekly, Monthly, or Manual (send only when you choose).
7. Click **Create** to save the blast.

### 22.2 Sending a Blast

- Scheduled blasts run automatically at the configured interval.
- Click **Send Now** on any blast to trigger it immediately, regardless of schedule.
- Each blast pulls the latest MLS data for the configured area and statuses before sending.

### 22.3 Broker's Open

Use Email Blast to send your current listings to other agents for Broker's Open events.

1. Export agents from the **MLS Agent Leaderboard** to your CRM (they are tagged "MLS Agent").
2. Create a new blast targeting contacts tagged "MLS Agent."
3. Include your active listings and send on demand or on a schedule.`,
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
