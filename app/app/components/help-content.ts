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

The MLS section provides 6 tabs for working with MLS data, powered by HiCentral MLS via Trestle by CoreLogic.

### 5.1 Prerequisites

Your account must have Trestle (CoreLogic) credentials configured. This is set up by a platform administrator under **Integrations**. If you do not see MLS data, contact your administrator.

### 5.2 MLS Search (Tab 1)

1. Navigate to **MLS** from the main navigation.
2. Search by zip code, city, address, or building/condo name (e.g., "Park Lane", "The Century").
3. Filter by: Status (Active, Pending, Closed, Expired, Withdrawn, Canceled), property type, price range, beds/baths, Days on Market, 27 property feature badges, and a rental toggle.
4. Listings display color-coded badges: blue **New** (on market < 7 days), purple **Back on Market**, green **Price Down**, red **Price Up**.
5. Click any listing to open the full Property Detail Modal with all tabs.

**My Listings** sub-tab shows your own active listings with MLS sync status.

**AI Tools**: Generate AI-powered listing descriptions (multiple tones) and social media content (Instagram, Facebook, LinkedIn, TikTok) with captions, hashtags, and video scripts.

### 5.3 Market Watch (Tab 2)

Market Watch monitors market activity for a specific zip code or area.

1. Enter a zip code and select a timeframe (24 hours, 7 days, 30 days, or 90 days).
2. Toggle between **Map View** (Google Maps with color-coded markers) and **Hot Sheet View** (sortable spreadsheet).
3. Filter by status badges: Active, Pending, Closed, New, Back on Market, Price Increase, Price Decrease.
4. Map markers are color-coded by status and shaped by property type (circle = residential, diamond = condo, triangle = land).
5. Click any listing for full details.

### 5.4 CMA (Tab 3)

Generate a Comparative Market Analysis for any property.

1. Enter the subject property details: address, city, postal code, list price, beds, baths, sqft, year built, property type.
2. The system pulls comparable sales from MLS (Active, Pending, Closed within the same area, last 6 months).
3. If MLS data is limited, it automatically falls back to RentCast and Realie AVM.
4. Review: total/active/pending/sold comp counts, average and median prices, price per sqft, average DOM, suggested price range, list-to-sale ratio.
5. Each comp is scored for correlation to the subject property.
6. Save CMA reports for future reference.

### 5.5 Lead Matches (Tab 4)

Automatically matches your pipeline leads to active MLS listings based on their criteria (neighborhoods, must-haves, timeline, financing). Each match is scored 0-100 with match reasons. Top 5 matches per lead. Matches can be saved and tracked (new/sent/viewed/dismissed).

### 5.6 OH Sync (Tab 5)

Two-way open house synchronization between MLS and your local database. Pull upcoming open houses from MLS as draft events. Track which local events have been synced to MLS. Prevents duplicate imports via MLS key tracking.

### 5.7 Investment (Tab 6)

Multi-unit property analysis with per-unit breakdown (type, beds/baths, actual rent, pro forma rent). Calculates total units, monthly rent, and average rent. Auto-fills BRRRR and Flip analyzers from the investment data.`,
  },
  {
    id: "pipeline",
    title: "6. Pipeline",
    content: `## 6. Pipeline

The Pipeline provides a visual, Kanban-style board for managing your deal flow from initial lead to closing.

### 6.1 Pipeline Stages

Your pipeline has 11 stages, each with a unique color:
1. New Lead
2. Initial Contact
3. Qualification
4. Initial Consultation
5. Property Search / Listing Prep
6. Open Houses & Tours
7. Offer & Negotiation
8. Under Contract / Escrow
9. Closing Coordination
10. Closed & Follow-up
11. Review Request

### 6.2 Managing Deals

1. Navigate to **Pipeline** from the main navigation.
2. Drag and drop deal cards between stages to update their status.
3. Click on a deal card to view details: contact info, notes history, conversation history, and action buttons.
4. From the detail modal, you can draft emails, create tasks, advance to the next stage, or mark as lost.
5. Use the pipeline dropdown to switch between multiple pipelines.

### 6.3 CRM Sync

If you have connected the CRM integration, your pipeline maps to CRM pipeline stages. Leads automatically advance when emails or SMS are sent. See the **Integrations** section for setup. A local pipeline is also available for agents without CRM.

### 6.4 Tasks

The Tasks page provides full task management:
- **Tabs**: All, Overdue, Today, Upcoming, Completed
- **Task Fields**: Title, description, priority (Urgent/High/Medium/Low), due date/time, type (General/Follow-Up/Call/Email/Meeting/Showing/Document/Closing), recurrence (Daily/Weekly/Bi-weekly/Monthly/Quarterly)
- **Entity Linking**: Link tasks to a Lead, Contact, Open House, or Transaction
- **Actions**: Mark complete, snooze (tomorrow/next week/2 weeks/custom), bulk operations (complete, snooze, delete)
- **Export**: CSV or PDF`,
  },
  {
    id: "open-houses",
    title: "7. Open Houses",
    content: `## 7. Open Houses

The Open Houses section provides complete open house lifecycle management with built-in lead capture.

### 7.1 Creating an Open House

1. Navigate to **Open Houses** and click **Create Open House**.
2. **Choose Event Type**: Sales (buyer check-in), Rental Showing (rental application), or Both.
3. **Import from MLS** (recommended): Search by MLS Number or by Address. Select from results -- the system auto-fills address, beds, baths, sqft, price, description, key features, photos, and location.
4. Set start and end date/time.
5. Click **Save** to create the event as a draft.

### 7.2 Choose a Flyer Template

On the event detail page, select a flyer template:
- **Modern** -- Clean default layout
- **Modern Blue** -- Blue-themed with hero and secondary image slots
- **Elegant Warm** -- Warm tones with three image positions

Each template has custom color swatches. Upload photos for each image slot (JPEG, PNG, WebP, max 5MB).

### 7.3 Edit Property Details

Click **Edit Property Details** to update: address, beds, baths, sqft, price, listing description, key features, and photos (primary, secondary, tertiary). These details appear on the flyer and the check-in page.

### 7.4 Download Flyer

Click **Download Flyer** to generate a branded PDF containing:
- Your name, license number, phone, headshot, and company logo
- Property photos, address, date/time
- Beds, baths, sqft, price, key features, and description
- A map showing the property location
- A QR code for guest check-in

### 7.5 Displaying the Flyer and Guest Registration

1. Print the flyer and display it at the property entrance.
2. Visitors scan the QR code with their phone camera.
3. The QR code links to a secure registration page (token expires after 72 hours).
4. The check-in page only works when the event status is **Published** -- change the status from Draft to Published before the event.

### 7.6 What the Registration Page Asks Guests

1. **Contact Info** (required): Name, Email, Phone, Consent checkboxes (email + SMS)
2. **Representation**: "Do you currently have a realtor?" -- Yes (show realtor name field) / No / Unsure
3. **If not represented**: "Would you like the agent to reach out?"
4. **Buyer Qualification**: Timeline (0-3 months / 3-6 months / 6+ months / Just browsing), Financing (Pre-approved / Cash / Need a lender / Not sure), Neighborhoods interested in, Must-haves

Upon submission, the guest is automatically scored (0-100 heat score), entered into the pipeline, and synced to CRM if connected.

### 7.7 Attendees and Scorecard

- **Attendees** tab lists all captured leads with name, email, phone, sign-in time, representation status, timeline, and financing. Export to CSV.
- **Scorecard** shows performance metrics: sign-ins captured, contacted within 5 minutes (%), represented by realtor (%), looking for agent (%). An overall performance score (0-100) combines these metrics. Track which leads you have contacted and your response time.`,
  },
  {
    id: "leads",
    title: "8. Leads",
    content: `## 8. Leads

The Leads section manages prospects automatically captured from open house QR check-ins, Zillow webhooks, and other sources.

### 8.1 Dashboard and Charts

The Leads page opens with interactive charts: Leads by Source (Open House, Zillow, Google, Facebook, etc.), Leads by Event, Heat Score Distribution, Pipeline Stage Breakdown, Leads Over Time (weekly), and Buyer Readiness.

### 8.2 Lead List

Leads are organized into tabs: **Hot** (80+), **Warm** (50-79), **Cold** (<50), and **DNC** (Do Not Contact -- already has an agent). Each lead shows: Name, Contact buttons (Call/Text/Email), Property, Heat Score, Timeline, and Date. Export to PDF or XLSX.

### 8.3 Heat Scoring

Every lead is automatically scored from 0 to 100 at check-in based on:
- **Contact Info** (30 pts): Email (10) + Phone (10) + Email consent (5) + SMS consent (5)
- **Representation** (20 pts): No agent (20), Unsure (10), Has agent (5)
- **Agent Reach Out** (15 pts): Opted in to be contacted
- **Timeline** (20 pts): 0-3 months (20), 3-6 months (15), 6+ months (10), Just browsing (5)
- **Financing** (15 pts): Pre-approved/Cash (15), Needs lender (10), Not sure (5)
- **Specificity** (10 pts): Neighborhoods mentioned (5) + Must-haves mentioned (5)
- Multiple visits to the same property boost the score to 100 (RED HOT).

### 8.4 DNC (Do Not Contact)

Leads who indicate they already have a realtor are automatically classified as DNC (gray). These leads should not be solicited.

### 8.5 CRM Sync

When a lead is submitted, it syncs to your CRM (if connected) and triggers webhook events. Hot leads (80+) trigger a separate Hot Lead webhook. Leads can be advanced through pipeline stages manually or automatically when communication occurs.`,
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

Analyze Airbnb/VRBO investment potential with Hawaii-specific tax calculations.

**Key Features:** Nightly rate and occupancy modeling, Hawaii GET (4.712%) and TAT (10.25%) tax calculations, monthly and yearly cash flow projections, expense breakdown charts, multi-year revenue projections.

**How to Use:**
1. Navigate to **Analyzers > STR Analyzer**.
2. Enter the nightly rate, expected occupancy rate, cleaning fees per turnover, and property expenses.
3. Review monthly and annual cash flow with Hawaii-specific tax deductions.
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

- **Pending Document Checklist**: Under-contract deals missing required signatures/forms`,
  },
  {
    id: "property-intel",
    title: "11. Property Intel & Prospecting",
    content: `## 11. Property Intel & Prospecting

The Property Intel page provides comprehensive property intelligence and 6 specialized prospecting tools.

### 11.1 Property Search (3 Methods)

1. **By Address**: Enter a street address for an exact property lookup.
2. **By Zip Code**: Enter a zip code to browse all properties in that area.
3. **By Lat/Lng + Radius**: Enter latitude, longitude, and radius in miles.

Apply filters: property type, beds/baths, year built, sqft, lot size, AVM value, sale amount, assessed value, absentee owner toggle, sale date range.

### 11.2 Property Detail Modal

Click any property to open the full intelligence report with tabs:
- **Opportunity Score** (first tab when seller data is present): Scoring breakdown with AI-generated outreach suggestions
- **Overview**: Address, beds/baths/sqft, year built, property type, lot size, owner info
- **Building**: Construction details, rooms, parking, utilities, interior features
- **Financial**: AVM with reliability check, assessment, tax, mortgage, equity, LTV, rental AVM, cap rate, gross yield
- **Sales History**: Historical transactions with dates, amounts, buyer/seller names, deed type
- **Comps**: Comparable sales with correlation scoring
- **Ownership**: County deed owner (green badge), co-owners, corporate/trust status, absentee, mailing address
- **Neighborhood**: Demographics, schools (with zones), crime, POIs, walk score
- **Market Stats**: Median price, avg DOM, active listings, price/sqft, median rent
- **Federal/GIS**: School attendance zones, FEMA hazard ratings, flood/tsunami/fire zones, opportunity zones

The AVM Reliability Check compares the automated valuation to county assessment and recent sales. If the difference exceeds 30%, the AVM is suppressed and the county assessment is shown instead.

### 11.3 Prospecting (6 Search Types)

1. **Absentee Owners**: Finds owners not living at the property. Best targets: 15+ years owned, out-of-state mailing address.
2. **High Equity**: Finds owners with significant equity (AVM - mortgage). Focus on 70%+ equity with long ownership.
3. **Pre-Foreclosure/Distressed**: Properties showing distress signals (underwater, high LTV, assessment drops). Be sensitive -- position as someone who can help.
4. **Just Sold (Farming)**: Recent closed sales (last 6 months) + all neighboring homes within 0.5 miles for postcard campaigns.
5. **Investor Portfolios**: Multi-property owners grouped by name. Approach with investment messaging (cap rates, 1031 exchanges, ROI).
6. **DOM Prospecting**: Stale, expired, and withdrawn listings tiered by DOM ratio (Red/Orange/Charcoal/Green). Only contact expired/withdrawn listings -- never solicit active listings.

Each search includes AI-powered prospect analysis with scoring, tier assignment, outreach drafts (letters, emails, SMS, talking points), and CSV/PDF export.`,
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

Profiles pull from: NCES schools, FBI crime, FEMA/USGS hazards, OpenStreetMap POI, FRED sales trends, Hawaii GIS school zones, and Census demographics. School data is cached for 1 year (refreshes August 1).

### 12.4 Fair Housing Compliance

Every profile includes a built-in Fair Housing Act compliance check that validates no discriminatory language is present.

### 12.5 Export

Export profiles as a professional multi-page PDF (10-12 pages) or Word/DOCX. The PDF includes:
- **Cover page** with map, neighborhood name, and your agent branding (headshot, name, license, brokerage logo)
- **Housing Facts & Stats** comparison table (ZIP vs. County vs. State vs. USA) with median home value, income, population, own/rent percentages
- **Market Trends** with market type indicator (Seller's/Balanced/Buyer's Market), key stats cards
- **People Facts & Demographics** with education levels, age distribution, income brackets, and occupational categories as horizontal bar charts
- **Economy** with commute time distribution and income comparisons
- **Schools** listing with enrollment, student-teacher ratio
- **Lifestyle & Community** AI-generated narrative content
- **Local Amenities** organized by category
- Consistent headers, footers, and page numbers throughout

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

### 14.2 Trestle (CoreLogic MLS)

Trestle by CoreLogic provides access to MLS listing data. This is a credentials-based integration configured by a platform administrator.

**Setup (Admin Only):**
1. Navigate to **Integrations** and locate the Trestle card.
2. Enter your Trestle API credentials (provided by CoreLogic).
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
4. Optionally enter your IDX Broker API key to enable MLS search (if you don't have Trestle connected).

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

The Seller Opportunity Map is an interactive, map-based prospecting tool that uses predictive analytics to identify likely sellers.

### 14.1 Searching

Search by: zip code, latitude/longitude + radius (up to 50 miles), or TMK (Tax Map Key) for Hawaii parcels.

### 14.2 Seller Motivation Score (0-100)

Each property is scored across 12 dimensions:
- High equity (15pts), Long ownership (15pts), Absentee owner (12pts), Distress signals (12pts)
- Multi-property portfolio (8pts), Transfer recency (8pts), Owner type (6pts)
- Tax assessment gap (5pts), Market trend (5pts), Tax trend (5pts), Appreciation (5pts), HOA burden (4pts)

Scores are normalized based on available data (missing data excluded from the denominator).

**Score Levels:** Very Likely (70-100) red, Likely (50-69) orange, Possible (30-49) yellow, Unlikely (0-29) blue

### 14.3 Map Features

- Color-coded property markers by motivation score
- Heat map layer showing density of high-motivation sellers
- ZIP code boundary overlay (clickable for search)
- TMK parcel boundary overlay (Hawaii) via ArcGIS
- Streets and satellite imagery toggle
- Auto-search on pan/zoom (debounced 600ms)

### 14.4 Filters

Min motivation score (default 40), absentee-only toggle, min ownership years, min equity %, property type, min parcels owned.

### 14.5 Property Details and Outreach

Click any property to open the full Property Detail Modal with the Opportunity Score tab first. This shows the scoring breakdown, AI-generated outreach suggestions (letters, emails, SMS, talking points), and all standard property tabs.

### 14.6 Saved Searches

Save search parameters with a custom name for quick reload. Search results are cached globally for 7 days.`,
  },
  {
    id: "farm-watchdog",
    title: "15. Farm & Watchdog",
    content: `## 15. Farm & Watchdog

The Farm & Watchdog page lets you monitor geographic areas and set up automated alerts for market changes.

### 15.1 Creating a Farm Area

1. Navigate to **Farm** from the main navigation.
2. Click **Create Farm Area**.
3. Define the area by: zip code, radius (lat/lng), or TMK prefix.
4. Set property filters: price range, bedrooms, property types, listing statuses.
5. Save the farm area with a custom name.

### 15.2 Farm Listings

Each farm area shows live MLS listings matching your criteria. Sort by: Days on Market, price ascending/descending, or price drop percentage. View full property details including agent info, photos, and virtual tour links.

### 15.3 Watchdog Rules

Create automated alert rules for each farm area:
- **DOM Threshold**: Alert when listings exceed a specified number of days on market
- **Price Drop Monitoring**: Track price reductions with percentage calculations
- **Status Changes**: New listings, expirations, withdrawals

### 15.4 Notifications

Configure multi-channel alerts: push notifications, email, and SMS. Alert statuses track as unread, read, or archived. A background cron job (MLS Watchdog) periodically checks your monitored properties and generates alerts on changes.`,
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
- **Trestle (CoreLogic MLS)** \u2014 Configure MLS data access credentials.

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
    id: "glossary",
    title: "22. Glossary",
    content: `## 22. Glossary

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

**MLS (Multiple Listing Service):** A database of real estate listings shared among licensed real estate professionals. The Real Estate Genie accesses MLS data through the Trestle by CoreLogic integration.

**NOI (Net Operating Income):** Gross rental income minus operating expenses (excluding mortgage payments). Used to calculate Cap Rate and DSCR.

**PITI:** Principal, Interest, Taxes, and Insurance \u2014 the four components of a standard monthly mortgage payment.

**PMI (Private Mortgage Insurance):** Insurance required by lenders when the borrower\u2019s down payment is less than 20% of the property value. Added to the monthly mortgage payment.

**ROI (Return on Investment):** A general measure of the profitability of an investment, calculated as net profit divided by total investment cost, expressed as a percentage.

**Seller Net Sheet:** A document estimating the seller\u2019s proceeds from a property sale after deducting commissions, closing costs, mortgage payoff, and any concessions.

**TMK (Tax Map Key):** A unique identifier for parcels of land in Hawaii, used in property records and tax assessments. The Seller Opportunity Map overlays TMK parcel boundaries.

**Webhook:** An HTTP callback that sends real-time data to an external URL when a specific event occurs. The Real Estate Genie supports webhooks via n8n integration.`,
  },
  {
    id: "support",
    title: "23. Support & Legal",
    content: `## 23. Support & Legal

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
