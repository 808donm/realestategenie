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
  "/app/property-data": "mls",
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
  "/app/farm": "seller-map",
  "/app/showing": "showing-scheduler",
};

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "getting-started",
    title: "1. Getting Started",
    content: `## 1. Getting Started

### 1.1 About The Real Estate Genie

The Real Estate Genie is a comprehensive SaaS platform designed for real estate agents, brokers, and teams. It provides tools for managing leads, analyzing investment properties, tracking deals through a visual pipeline, managing open houses, handling property management tasks, and much more — all from a single, unified application.

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
- **Property Management** — Lease and rental application management.
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
| **Agent** | Standard user with access to all core features including Dashboard, MLS, Pipeline, Open Houses, Leads, Contacts, Analyzers, Reports, Neighborhoods, Property Management, Integrations, Billing, and Settings. |
| **Team Lead** | All Agent permissions plus access to the Team Dashboard for monitoring team activity and performance. |
| **Admin (Account)** | All Agent permissions plus the ability to manage Team settings, invite and remove team members, and configure account-wide settings. |
| **Admin (Platform)** | Full platform access including the Admin panel, admin-only integrations (Stripe, PayPal, Realie.ai, Federal Data), and user management across the platform. |`,
  },
  {
    id: "dashboard",
    title: "2. Dashboard",
    content: `## 2. Dashboard

The Dashboard is your home base in The Real Estate Genie. It provides an at-a-glance overview of your real estate business activity and key performance indicators.

### 2.1 Stats Tiles

At the top of the Dashboard, you will see Stats Tiles displaying your key metrics at a glance. These may include total active leads, deals in pipeline, upcoming open houses, and other performance indicators relevant to your business.

### 2.2 Heat Score Chart

The Heat Score Chart visualizes the distribution of your leads by their Heat Score (0\u2013100). Leads with a score of 80 or above are considered \u201chot leads\u201d and are highlighted for immediate attention. This chart helps you prioritize your outreach efforts.

### 2.3 Pipeline Stage Breakdown

This chart shows how many deals you have in each stage of your Pipeline. It provides a visual representation of your deal flow, helping you identify bottlenecks and ensure deals are progressing smoothly.

### 2.4 Activity Feed

The Activity Feed displays a chronological list of recent actions and events, such as new leads, stage changes, open house registrations, and integration activity. Use it to stay informed about what is happening across your business.

### 2.5 Integration Health

The Integration Health widget shows the status of your connected integrations (CRM, Trestle MLS, n8n Webhooks, etc.). Green indicators mean the integration is connected and functioning properly. If an integration shows a warning or error, navigate to the Integrations page to troubleshoot.`,
  },
  {
    id: "broker-dashboard",
    title: "3. Broker Dashboard",
    content: `## 3. Broker Dashboard

The Broker Dashboard provides advanced analytics and management tools designed for real estate brokers who oversee multiple agents or offices.

**Access Requirement:** The Broker Dashboard requires the **Brokerage Growth** subscription plan. If you are on a lower-tier plan, you will see a prompt to upgrade when attempting to access this section.

To upgrade, navigate to **Billing** and select the Brokerage Growth plan.`,
  },
  {
    id: "mls",
    title: "4. MLS",
    content: `## 4. MLS (Multiple Listing Service)

The MLS section allows you to search and browse real estate listings powered by Trestle by CoreLogic.

### 4.1 Prerequisites

To use MLS features, your account must have Trestle (CoreLogic) credentials configured. This integration is set up by a platform administrator under **Integrations**. If you do not see MLS data, contact your administrator to verify that Trestle credentials are properly configured.

### 4.2 Searching Listings

1. Navigate to **MLS** from the main navigation.
2. Use the search bar and filters to find properties by location, price range, property type, bedrooms, bathrooms, and other criteria.
3. Click on any listing to view detailed property information, photos, and listing history.
4. From a listing detail view, you can add the property to an Analyzer for investment analysis or add associated contacts to your Leads.`,
  },
  {
    id: "pipeline",
    title: "5. Pipeline",
    content: `## 5. Pipeline

The Pipeline provides a visual, Kanban-style board for managing your deal flow from initial lead to closing.

### 5.1 Understanding Pipeline Stages

Your pipeline consists of configurable stages that represent the steps in your deal process. You can customize stage names and order to match your workflow. Typical stages might include: New Lead, Initial Contact, Showing Scheduled, Offer Made, Under Contract, and Closed.

### 5.2 Managing Deals

1. Navigate to **Pipeline** from the main navigation.
2. Drag and drop deal cards between stages to update their status.
3. Click on a deal card to view details, add notes, or update information.
4. Create new deals manually by clicking the **Add Deal** button.

### 5.3 CRM Sync

If you have connected the CRM integration, your pipeline stages can be mapped to CRM pipeline stages. Leads will automatically move through stages as activities occur (such as emails or SMS being sent). See the **Integrations** section for CRM setup instructions.`,
  },
  {
    id: "open-houses",
    title: "6. Open Houses",
    content: `## 6. Open Houses

The Open Houses section helps you create, manage, and track open house events with built-in lead capture.

### 6.1 Creating an Open House Event

1. Navigate to **Open Houses** from the main navigation.
2. Click **Create Open House**.
3. Enter the property address, date, start time, and end time.
4. Add any additional details such as notes or special instructions.
5. Click **Save** to create the event.

### 6.2 Lead Check-In

During an open house, attendees can check in using the public registration page. This page is accessible at a unique URL you can share (the format is realestategenie.app/oh). The check-in process captures attendee information and consent, automatically creating new leads in your system.

### 6.3 Consent Capture

The Real Estate Genie includes built-in consent capture during lead check-in. Attendees acknowledge how their information will be used, helping you maintain compliance with data privacy regulations.

### 6.4 Webhook Events

When you publish an open house event, it triggers webhook events that can be used with n8n automation workflows. Events include **Open House Published** and **Open House Ended**. See the **Integrations** section for webhook configuration.`,
  },
  {
    id: "leads",
    title: "7. Leads",
    content: `## 7. Leads

The Leads section is your central hub for managing incoming prospects and nurturing them through your sales process.

### 7.1 Managing Leads

View, filter, and sort your leads from the Leads page. Each lead record includes contact information, source, status, Heat Score, and activity history.

### 7.2 Heat Scoring

Every lead is assigned a Heat Score from 0 to 100 based on their engagement and likelihood to convert:

- **Hot Leads (80\u2013100)** — High priority. These leads show strong buying signals and should be contacted immediately.
- **Warm Leads (50\u201379)** — Moderate engagement. Follow up with these leads regularly.
- **Cool Leads (20\u201349)** — Low engagement. Continue nurturing through automated campaigns.
- **Cold Leads (0\u201319)** — Minimal engagement. Consider re-engagement strategies or archiving.

### 7.3 CRM Sync and Webhooks

When a lead is submitted, it triggers CRM sync (if connected) and n8n webhook events. Hot leads (score \u2265 80) trigger a separate **Hot Lead** webhook event, enabling you to set up special automation for high-priority prospects.

### 7.4 Consent Tracking

The Real Estate Genie tracks consent status for each lead. When a lead provides consent during open house check-in or other capture forms, it is recorded and visible on the lead record. A **Consent Captured** webhook event is also triggered.`,
  },
  {
    id: "contacts",
    title: "8. Contacts",
    content: `## 8. Contacts

The Contacts section serves as your contact relationship management tool within The Real Estate Genie.

### 8.1 Managing Contacts

Add, edit, and organize your professional contacts. Each contact record can include name, email, phone number, address, and custom notes.

### 8.2 CRM Sync

If the CRM integration is connected, your contacts will sync bidirectionally. Changes made in The Real Estate Genie are reflected in your CRM, and vice versa. This ensures your contact database is always up to date across both platforms.`,
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
4. Use the DSCR to assess whether the property generates sufficient income to cover debt service.`,
  },
  {
    id: "reports",
    title: "10. Reports",
    content: `## 10. Reports

The Reports section provides reporting and analytics tools to help you track and analyze your real estate business performance.

Access **Reports** from the main navigation to view dashboards covering your lead conversion rates, deal pipeline velocity, revenue projections, and other key performance indicators. Use date range filters to analyze specific periods and identify trends in your business.`,
  },
  {
    id: "neighborhoods",
    title: "11. Neighborhood Profiles",
    content: `## 11. Neighborhood Profiles

The Neighborhoods section provides detailed profiles with demographic and market data for areas you serve.

### 11.1 What You Can Find

- Population demographics and household statistics
- Median home values and price trends
- School ratings and nearby amenities
- Market activity and inventory levels
- Employment and income data

### 11.2 How to Use

1. Navigate to **Neighborhoods** from the main navigation.
2. Search for a neighborhood by name, ZIP code, or city.
3. Review the neighborhood profile including demographics, market data, and local statistics.
4. Use this data to advise clients, prepare CMAs, and identify emerging markets.`,
  },
  {
    id: "property-management",
    title: "12. Property Management",
    content: `## 12. Property Management

The Property Management section provides tools for managing rental properties, leases, and tenant applications.

### 12.1 Lease Management

1. Navigate to **Property Management > Leases**.
2. Click **Create Lease** to set up a new lease agreement.
3. Enter lease details: property address, tenant information, lease term (start and end dates), monthly rent, security deposit, and any special terms.
4. Track lease status, upcoming renewals, and payment history.

### 12.2 Rental Applications

Manage incoming rental applications through the Property Management section. Review applicant information, run screening checks, and approve or deny applications \u2014 all within the platform.`,
  },
  {
    id: "tenant-portal",
    title: "13. Tenant Portal",
    content: `## 13. Tenant Portal

The Tenant Portal is a separate, tenant-facing interface that allows your tenants to manage their rental experience. Tenants access it by logging in or registering at the tenant portal.

### 13.1 Tenant Features

- **Dashboard** — Overview of the tenant\u2019s account, upcoming payments, and recent activity.
- **Invoices** — View and track invoices for rent and other charges.
- **Lease Details** — Access the current lease agreement, terms, and important dates.
- **Messages** — Communicate directly with the property manager through a built-in messaging system.
- **Payment Methods** — Add, edit, and manage payment methods for rent payments.
- **Work Orders** — Submit and track maintenance requests. Include descriptions, photos, and priority level.

### 13.2 Tenant Registration

Tenants can register for the portal using the registration link provided by their property manager. Once registered, they can sign in to access all portal features.`,
  },
  {
    id: "integrations",
    title: "14. Integrations",
    content: `## 14. Integrations

The Integrations page allows you to connect third-party services to extend the functionality of The Real Estate Genie. Navigate to **Integrations** from the main navigation to view and manage all available integrations.

### 14.1 CRM Integration

Connect your CRM to sync contacts, manage opportunities, map pipelines, and automate lead workflows.

**Connecting Your CRM:**
1. Navigate to **Integrations** and locate the CRM card.
2. Click **Connect**. You will be redirected to authorize The Real Estate Genie to access your CRM account via OAuth.
3. Grant the requested permissions and you will be redirected back to the app.
4. The CRM integration status will show as **Connected**.

**Configuring CRM Pipeline Mapping:**
1. After connecting, go to the CRM integration settings.
2. Select the CRM Pipeline that corresponds to your real estate deal flow.
3. Select the stage where new leads should land (e.g., "New Lead").
4. Optionally, select an "Initial Contact" stage \u2014 leads will automatically move to this stage after an email or SMS is sent.
5. Save your configuration.

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

### 14.4 Social Channels

Connect social media channels to manage lead responses from social platforms. Configure your social channels under the Integrations page to centralize your lead communication.

### 14.5 Google Maps

Google Maps powers geocoding, property map embeds, and location-based features throughout the app (including the Seller Opportunity Map). This integration is configured via the platform\u2019s Google Maps API key and does not require individual user setup.

### 14.6 Bridge Interactive / Zillow (Coming Soon)

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
    title: "15. Seller Opportunity Map",
    content: `## 15. Seller Opportunity Map

The Seller Opportunity Map is an interactive, map-based prospecting tool that uses predictive analytics to identify likely sellers in your market.

### 15.1 Predictive Seller Scoring

Each property is assigned a Predictive Seller Score (0\u2013100) based on multiple data signals:

- Equity level
- Length of ownership
- Absentee owner status
- Multiple property ownership
- Distress signals
- Recent property transfers
- Tax delinquency

**Score Levels:**
- **Very Likely** \u2014 High score, strong indicators of motivation to sell.
- **Likely** \u2014 Moderate indicators.
- **Possible** \u2014 Some indicators present.
- **Unlikely** \u2014 Few or no indicators.

### 15.2 Map Features

- Interactive map with property markers and heat map overlay
- Search by zip code or TMK (Tax Map Key) number
- Filter by score range, property type, equity level, and absentee status
- Hawaii-specific: TMK parcel boundary overlay via ArcGIS
- One-click actions: Add to CRM, Generate Report, Draft Outreach
- Saved searches for repeated prospecting`,
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
