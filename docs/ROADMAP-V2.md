# RealEstateGenie v2 — Development Roadmap

## Context

This roadmap defines the v2 feature set for RealEstateGenie, transforming it from a property management and open house tool into a full AI-powered real estate operations platform. The app already has: Next.js 16, React 19, Supabase, extensive GHL integration (contacts, pipelines, opportunities, conversations, SMS, email, contracts, invoices, custom objects), Vercel AI SDK (`ai@6`, `@ai-sdk/openai`), ATTOM property data, Trestle MLS, GHL document signing, Twilio, Stripe/PayPal, 14 broker reports, and a Capacitor mobile shell.

v2 adds: AI agents that operate inside GHL, voice AI, a client-facing deal tracker, ad management with lead scoring, enhanced analytics with AI analysis, 5 new AI features, and native mobile apps.

---

## Phase 1: Foundation & Shared Infrastructure (Weeks 1–3)

**Why first:** Every feature below depends on a shared AI agent framework, a deal/transaction data model, and a unified event bus.

### 1A. AI Agent Framework

Create a reusable agent execution layer using Vercel AI SDK that all AI features share.

- **`src/lib/ai/agent-executor.ts`** — Core agent loop: takes a system prompt + tools + context, runs multi-step tool-calling via `generateText` with `maxSteps`
- **`src/lib/ai/tools/`** — Shared tool definitions wrapping existing clients:
  - `ghl-tools.ts` — Wraps `GHLClient` methods as AI-callable tools (create contact, update opportunity stage, send SMS/email, create contract, search contacts, get pipeline)
  - `attom-tools.ts` — Wraps ATTOM property lookups
  - `calendar-tools.ts` — Schedule tasks, set reminders (via GHL calendar API)
  - `web-search-tools.ts` — Web search via Bing/Google API for property research
  - `deal-tracker-tools.ts` — Read/update deal milestones (Phase 2)
- **`src/lib/ai/prompts/`** — System prompts per agent type (employee, voice, ad manager)
- **`supabase/migrations/xxx_ai_agent_logs.sql`** — Log table: `ai_agent_actions(id, agent_id, agent_type, action, input, output, tokens_used, created_at)`

**Reuses:** `src/lib/integrations/ghl-client.ts` (all 35+ methods), `src/lib/ai/openai-client.ts`, `src/lib/integrations/attom-client.ts`

### 1B. Deal/Transaction Data Model

Shared data model for the timeline tracker, AI agents, and analytics.

- **`supabase/migrations/xxx_deals.sql`**:

  ```
  deals (
    id uuid PK, agent_id FK, contact_id text, ghl_opportunity_id text,
    deal_type enum('buying','selling'), status enum('active','pending','closed','cancelled'),
    property_address text, price numeric,
    client_name text, client_email text, client_phone text,
    client_portal_token text UNIQUE,  -- for unauthenticated client access
    created_at, updated_at
  )

  deal_milestones (
    id uuid PK, deal_id FK,
    milestone_key text,  -- e.g. 'offer_accepted', 'inspection_scheduled'
    status enum('pending','in_progress','completed','skipped'),
    completed_at timestamptz, notes text,
    updated_by text,  -- 'agent', 'ai_employee', 'system'
    created_at
  )

  deal_activity_log (
    id uuid PK, deal_id FK, actor text, action text, details jsonb, created_at
  )
  ```

### 1C. Event Bus / Webhook Router

Route GHL webhooks and internal events to the right AI agent.

- **`app/api/webhooks/ghl/route.ts`** — Central GHL webhook handler that dispatches to:
  - New lead → AI lead scorer
  - Incoming message (SMS/FB/IG/WhatsApp) → AI conversation responder
  - Opportunity stage change → Deal tracker update
  - Missed call → Voice AI follow-up
- **`src/lib/events/event-bus.ts`** — Internal pub/sub for cross-feature communication

---

## Phase 2: AI Employee in GHL (Weeks 3–6)

**The real estate assistant that handles tasks agents would otherwise do manually.**

### What it does

- Prepares contracts for signing (using GHL contracts and document signing)
- Performs web searches for property research, comps, market data
- Schedules tasks and reminders on the buying/selling timeline
- Drafts and sends follow-up messages to leads/clients
- Updates pipeline stages based on deal progress
- Generates listing descriptions, social posts, and email campaigns

### Implementation

- **`app/api/ai/employee/chat/route.ts`** — Streaming chat endpoint using Vercel AI SDK `streamText`. Agent has access to all GHL tools + web search + deal tracker tools.
- **`app/app/ai-employee/page.tsx`** — Chat UI using `@ai-sdk/react` `useChat` hook. Shows conversation thread + action cards (e.g., "Contract created for John Smith — Review & Send")
- **`app/app/ai-employee/task-queue.tsx`** — View of pending/completed AI actions with approve/reject for sensitive tasks (sending contracts, moving pipeline stages)
- **`src/lib/ai/prompts/employee-prompt.ts`** — System prompt with real estate domain knowledge, compliance guardrails (no legal/financial advice), and tool usage instructions
- **Human-in-the-loop:** Sensitive actions (send contract, move to "Closed" stage, send offer) require agent approval via the task queue. Non-sensitive actions (draft message, search, schedule reminder) execute immediately.

### GHL-specific

- Use existing `GHLClient.createContract()` and `sendContractForSignature()`
- Use existing `GHLClient.createOpportunity()` and `updateOpportunityStage()`
- Use existing `GHLClient.sendSMS()` and `sendEmail()` for outreach
- Use existing `ghl-documents-client.ts` patterns for document generation

---

## Phase 3: GHL Voice AI Agent (Weeks 5–8)

**Answers phone calls, pre-qualifies leads, provides basic info, forwards to agent when needed.**

### What it does

- Answers inbound calls with a natural AI voice
- Pre-qualifies leads: timeline, budget, pre-approval status, buying/selling
- Answers deal status questions using synced data on the GHL contact record
- Answers basic property questions about properties the agent is actively working with the client (synced to GHL — NOT raw ATTOM data)
- Forwards to the live agent when AI can't answer or caller requests it
- Logs call summary and lead score to GHL contact record

### Implementation

Uses **GHL's built-in Conversation AI** with phone channel (Voice AI). This keeps everything inside GHL's ecosystem and avoids a separate telephony provider.

- **`app/app/integrations/voice-ai-card.tsx`** — Configuration UI for voice AI settings:
  - Enable/disable, set business hours, greeting message
  - Configure which GHL phone number to use
  - Set forwarding number (agent's cell)
  - Define qualification questions
  - Set knowledge base (property FAQs, current listings)
- **`app/api/ai/voice/config/route.ts`** — Save voice AI configuration
- **`app/api/ai/voice/knowledge-sync/route.ts`** — Sync current listings, deal statuses, and property data to GHL Conversation AI knowledge base
- **`app/api/webhooks/ghl/voice-call-completed/route.ts`** — Post-call webhook handler:
  - Parses call transcript from GHL
  - Runs AI lead scoring on the transcript
  - Creates/updates GHL contact with qualification data
  - Adds to pipeline at correct stage
  - Notifies agent via SMS/push of qualified leads
- **`supabase/migrations/xxx_voice_calls.sql`** — `voice_calls(id, agent_id, ghl_contact_id, duration, transcript, lead_score, qualification_data jsonb, forwarded boolean, created_at)`

### Data Sync to GHL Contact Records

The Voice AI reads data from GHL contact records — it does NOT access ATTOM or the app database directly. This keeps sensitive property data agent-only while giving the voice AI what it needs.

**Sync triggers** (via `app/api/ai/voice/knowledge-sync/route.ts` + webhook handlers):

1. **Deal milestone updates →** Write a human-readable summary to the GHL contact's custom fields:
   - `deal_status`: "Inspection completed, appraisal ordered"
   - `next_milestone`: "Appraisal - estimated March 12"
   - `deal_type`: "Buying"
   - `property_address`: "123 Main St, Honolulu, HI"
2. **Agent's active properties with this client →** Sync brief property summaries to GHL contact notes:
   - Address, list price, beds/baths/sqft, showing status
   - Only properties the agent is actively working with THIS client
3. **Active listings (MLS/Trestle) →** Sync listing summaries to GHL Conversation AI knowledge base for general inquiry handling
4. **Agent-curated FAQ →** Business hours, office location, general process questions

**What the Voice AI can answer:**

- "Where is my deal?" → reads `deal_status` and `next_milestone` from contact
- "What properties are we looking at?" → reads active property notes from contact
- "What are your office hours?" → reads from knowledge base
- "How does the closing process work?" → reads from FAQ knowledge base

**What the Voice AI forwards to the agent:**

- Pricing advice, negotiation strategy, legal questions
- Anything requiring ATTOM/MLS deep data
- Any question it can't answer confidently

---

## Phase 4: Home Buying/Selling Timeline Tracker (Weeks 6–10)

**A "Domino's pizza tracker" for real estate transactions with a client portal.**

### Milestone Templates

**Buying timeline (14 milestones):**

1. Pre-Approval → 2. Agent Consultation → 3. Home Search Active → 4. Property Tours → 5. Offer Submitted → 6. Offer Accepted → 7. Earnest Money Deposited → 8. Inspection Scheduled → 9. Inspection Completed → 10. Appraisal Ordered → 11. Appraisal Completed → 12. Final Loan Approval → 13. Final Walkthrough → 14. Closing Day

**Selling timeline (12 milestones):**

1. Listing Consultation → 2. Pre-Listing Prep → 3. Photos & Marketing → 4. Listed on MLS → 5. Showings Active → 6. Offer Received → 7. Offer Accepted → 8. Buyer Inspection → 9. Appraisal → 10. Buyer Final Approval → 11. Final Walkthrough → 12. Closing Day

### Agent-Facing UI

- **`app/app/deals/page.tsx`** — Deal list with status filters, search, sort by closing date
- **`app/app/deals/[id]/page.tsx`** — Deal detail with visual timeline (horizontal stepper), milestone management, activity log, documents, contact info
- **`app/app/deals/[id]/timeline.tsx`** — The tracker component: visual progress bar with milestone dots, current step highlighted, click to expand details/notes
- **`app/app/deals/new/page.tsx`** — Create deal form (link to GHL contact/opportunity, set deal type, enter property details)

### Client Portal (Public)

- **`app/portal/[token]/page.tsx`** — Unauthenticated client view using `client_portal_token`
  - Shows: property photo, address, deal type, agent info
  - Visual timeline tracker (read-only) showing current progress
  - Milestone details: what's completed, what's next, estimated dates
  - Agent contact card with click-to-call/text
  - "Have a question?" button that sends a message to the AI employee or triggers a callback
- **`app/portal/[token]/layout.tsx`** — Clean, branded portal layout (agent's colors/logo)
- No login required — the unique token in the URL provides access

### AI Integration

- AI Employee can update milestones via `deal-tracker-tools.ts`
- Voice AI can read deal status to answer "Where is my closing?"
- Milestone changes trigger notification to client (email via Resend + SMS via GHL)
- Auto-advance: When GHL opportunity stage changes, auto-update corresponding milestone

---

## Phase 5: Ad Management & Lead Scoring (Weeks 9–14)

**Manage Google/social ads from the app, with AI lead scoring and omnichannel messaging.**

### 5A. Ad Account Connection & Management

- **`app/app/ads/page.tsx`** — Ad dashboard with connected accounts overview
- **`app/app/ads/accounts/page.tsx`** — Connect Google Ads, Facebook/Meta Ads, Instagram via OAuth
  - Uses GHL's built-in ad account connections where possible
  - Direct OAuth for platforms GHL doesn't cover
- **`app/app/ads/create/page.tsx`** — AI-assisted ad creation:
  - Select platform(s), campaign type, budget, schedule
  - AI generates ad copy + suggests targeting based on agent's listings and farm areas
  - Preview before publishing
  - Schedule on ad calendar
- **`app/app/ads/calendar/page.tsx`** — Visual calendar showing scheduled/active/completed ad campaigns
- **`app/app/ads/performance/page.tsx`** — Cross-platform performance: spend, impressions, clicks, leads, cost-per-lead

### 5B. AI Lead Scoring

- **`src/lib/ai/lead-scorer.ts`** — Scores leads 1-100 based on:
  - Source quality (Google ad vs organic vs referral)
  - Engagement signals (pages visited, time on site, form completeness)
  - Qualification data (from voice AI or form: timeline, budget, pre-approval)
  - Behavioral patterns (repeat visits, listing saves, open house attendance)
- **`app/api/webhooks/ghl/new-lead/route.ts`** — On new lead:
  1. Score the lead
  2. Create GHL contact with score in custom field
  3. Place in correct pipeline stage based on score
  4. High-score leads (70+): Immediate agent notification via SMS + push
  5. Medium-score leads (40-69): AI sends nurture sequence
  6. Low-score leads (<40): Add to drip campaign

### 5C. Omnichannel Message Inbox

- **`app/app/inbox/page.tsx`** — Unified inbox pulling from GHL conversations:
  - WhatsApp, Facebook Messenger, Instagram DM, SMS, Google Business Messages
  - Shows all channels in one thread per contact
  - AI-suggested replies (generated from context)
  - One-click "let AI respond" or "respond manually"
- Uses existing `GHLClient.getConversations()`, `getConversationMessages()`, `sendSMS()`, `sendEmail()`
- **`app/api/webhooks/ghl/inbound-message/route.ts`** — Handles incoming messages:
  - AI reads message, checks if it can auto-respond
  - Business-hours auto-responses for simple questions
  - Complex questions queued for agent with AI-drafted reply

---

## Phase 6: Improved Analytics (Weeks 10–14)

**5 agent reports + 5 broker reports, all with AI analysis and recommendations.**

### Agent Reports (5 Must-Haves)

1. **Lead Conversion Funnel** — `app/app/reports/lead-conversion/`
   - Tracks: New Lead → Contacted → Qualified → Showing → Offer → Closed
   - Shows conversion rates between each stage, average time in stage
   - AI insight: "Your Qualified→Showing conversion dropped 18% this month. You have 12 qualified leads that haven't been shown a property in 14+ days — prioritize these for showings this week."

2. **Commission Forecast** — `app/app/reports/commission-forecast/`
   - Pipeline value by stage with probability-weighted forecast
   - Projected monthly/quarterly income based on current deals
   - AI insight: "Based on your pipeline, you're projected to close $47K in commission next quarter. To hit your $60K goal, you need 3 more listings at your average price point — focus farming efforts in [zip code] where you had success last quarter."

3. **Client Response Time** — `app/app/reports/response-time/`
   - Average time to first response by lead source
   - Response time distribution (% under 5 min, 15 min, 1 hr, 24 hr)
   - AI insight: "Your average response to Google Ads leads is 47 minutes — 3x slower than your Zillow leads. Enable Voice AI for after-hours Google leads to reduce this to under 60 seconds."

4. **Marketing ROI by Channel** — `app/app/reports/marketing-roi/`
   - Spend vs closed revenue by channel (Google, Facebook, farming, open house, referral)
   - Cost per lead, cost per closing, ROI percentage
   - AI insight: "Your open house leads cost $12 each and close at 8%. Facebook leads cost $45 and close at 2%. Shift $500/month from Facebook to more open houses for an estimated 3 additional closings per year."

5. **Active Deal Health** — `app/app/reports/deal-health/`
   - All active deals with days-in-stage, next milestone, risk flags
   - Stalled deal alerts (no activity in X days)
   - AI insight: "The Johnson deal has been in 'Appraisal Ordered' for 11 days — average is 5. Contact the lender to check status. The Martinez deal inspection is tomorrow — prep a repair negotiation strategy."

### Broker/Agency Owner Reports (5 Must-Haves)

6. **Agent Performance Scorecard** — `app/app/reports/agent-scorecard/`
   - Per-agent metrics: deals closed, volume, avg days to close, lead conversion rate, client satisfaction
   - Ranking and comparison across team
   - AI insight: "Agent Sarah has the highest conversion rate (12%) but lowest lead volume. Agent Mike has 3x the leads but 4% conversion. Consider reassigning some of Mike's overflow leads to Sarah."

7. **Brokerage Revenue Dashboard** — `app/app/reports/brokerage-revenue/`
   - Total GCI, company dollar, per-agent splits
   - Month-over-month and year-over-year trends
   - AI insight: "Brokerage GCI is up 22% YoY but company dollar is flat — your average split has shifted from 70/30 to 75/25 as top producers renegotiated. Consider a cap model to retain talent while protecting margins."

8. **Recruiting & Retention Risk** — enhances existing `app/app/reports/agent-retention-risk/`
   - Agent tenure, production trends, engagement metrics
   - Churn risk scoring based on declining activity
   - AI insight: "3 agents show declining activity patterns similar to agents who left last year. Schedule 1-on-1s with them this week. Your recruiting pipeline has 5 candidates — 2 are producing $2M+ at their current brokerage."

9. **Market Share by Zip Code** — enhances existing `app/app/reports/brokerage-market-share/`
   - Your brokerage's listing/closing share vs competitors per zip
   - Trend over time, opportunities in underserved areas
   - AI insight: "You have 18% market share in 96813 but only 3% in adjacent 96814 which has 40% more transactions. Assign 2 agents to farm 96814 — start with Just Sold postcards around your recent closing on King St."

10. **Compliance & Risk Audit** — enhances existing `app/app/reports/compliance-audit/`
    - Missing disclosures, unsigned documents, overdue tasks per deal
    - License expiration tracking
    - AI insight: "4 deals are missing seller disclosure forms — all are past the 5-day deadline. 2 agent licenses expire within 60 days. Flag these immediately to avoid liability."

### AI Analysis Engine

- **`src/lib/ai/report-analyzer.ts`** — Takes report data as structured JSON, generates actionable insights via `generateText`
- **`app/api/ai/analyze-report/route.ts`** — API endpoint that accepts report type + data, returns AI analysis
- Each report page has an "AI Insights" card that auto-generates on load

---

## Phase 7: Five Must-Have AI Features (Weeks 12–16)

**Built with Vercel AI SDK gateway. Practical features, not AI for AI's sake.**

### 7A. Smart Offer Writer

**Problem:** Agents spend 30-60 minutes drafting competitive offers, researching comps, and writing escalation clauses.

- **`app/app/ai-employee/offer-writer/page.tsx`** — Input: property address, offer price, client details, special conditions
- AI pulls comps from ATTOM, analyzes market conditions (DOM, price trends), and generates:
  - Complete offer letter with appropriate contingencies
  - Escalation clause recommendations based on market heat
  - Suggested earnest money amount based on local norms
  - Cover letter to listing agent
- Output: GHL contract draft ready for review and signature

### 7B. Listing Presentation Generator

**Problem:** Creating compelling listing presentations takes hours of research and design for each pitch.

- **`app/app/ai-employee/listing-presentation/page.tsx`** — Input: property address
- AI assembles a complete listing presentation PDF:
  - Market analysis with recent comps (ATTOM)
  - Neighborhood profile (existing AI feature)
  - Suggested list price with justification
  - Marketing plan (photography, staging, open house schedule)
  - Agent's track record in the area
  - Net proceeds estimate for the seller
- Uses existing `@react-pdf/renderer` and `jspdf` for PDF generation

### 7C. AI Transaction Coordinator

**Problem:** Tracking deadlines, documents, and follow-ups across multiple simultaneous deals is error-prone.

- Runs as a background agent that monitors all active deals daily
- **Auto-actions:**
  - Sends deadline reminders to all parties 48 hours before (inspection deadline, financing contingency, etc.)
  - Detects stalled deals and alerts the agent
  - Follows up on outstanding documents ("Hi John, we're still waiting on your pre-approval letter")
  - Generates weekly status summaries for each client
- **`src/lib/ai/transaction-coordinator.ts`** — Cron job (via Vercel Cron or Supabase pg_cron) that runs daily
- Uses deal tracker milestones + GHL contact data + existing SMS/email tools

### 7D. Intelligent CMA (Comparative Market Analysis)

**Problem:** Pulling comps and creating CMAs is tedious and the quality depends on agent experience.

- **`app/app/property-data/cma/page.tsx`** — Input: subject property address
- AI automatically:
  - Pulls 10-20 recent sales within configurable radius (ATTOM `comparables` + `saleshistory`)
  - Filters to true comps (similar beds/baths/sqft/age/lot)
  - Adjusts values for differences (pool, garage, condition, lot size)
  - Generates a price range recommendation with confidence level
  - Produces a client-ready CMA PDF with photos, maps, and adjustments
- **`src/lib/ai/cma-engine.ts`** — Comp selection and adjustment logic
- Reuses: ATTOM client, geocoding, existing PDF generation patterns

### 7E. Predictive Seller Lead Identification

**Problem:** Agents waste time farming homeowners who aren't ready to sell.

- **`app/app/property-data/likely-sellers/page.tsx`** — Input: zip code or farm area
- AI analyzes ATTOM property data to identify likely sellers based on:
  - Ownership tenure (10+ years = high equity)
  - Life events: estate/trust ownership, divorce filings, pre-foreclosure
  - Property characteristics: empty nest indicators (4+ bed, 1-2 occupants), deferred maintenance signals
  - Market timing: properties that have appreciated 50%+ since purchase
  - Absentee/corporate ownership with declining rental values
- Scores each property 1-100 and generates personalized outreach suggestions
- "Send postcard" action that integrates with farming workflow
- Reuses: Existing prospecting modes (absentee, equity, foreclosure) + ATTOM data + federal data

---

## Phase 8: React Native Mobile Apps (Weeks 14–20)

**Native iOS and Android apps replacing the current Capacitor web wrapper.**

### Architecture

- **Monorepo structure:** Add `mobile/` directory alongside existing `app/`
- **Framework:** React Native with Expo for faster development
- **Shared logic:** Extract API client layer from Next.js into shared `packages/api-client/` used by both web and mobile
- **Auth:** Supabase Auth with deep link magic links + biometric unlock (FaceID/TouchID)

### Core Mobile Screens

1. **Dashboard** — Today's tasks, upcoming appointments, new leads, deal updates
2. **Deals** — Deal list + timeline tracker (swipe through milestones)
3. **Inbox** — Unified messaging (GHL conversations) with quick AI-reply
4. **AI Employee** — Chat interface for on-the-go task delegation
5. **Contacts** — GHL contact search + detail
6. **MLS Search** — Full MLS search with filters, saved searches, listing detail, and send-to-contact (mirrors existing web MLS feature)
7. **Property Lookup** — Quick ATTOM property lookup by address (camera scan address sign)
8. **Open Houses** — QR check-in management, lead capture
9. **Notifications** — Push notifications for: new leads, deal updates, AI task completions, messages

### Native Features

- **Push notifications** via Firebase Cloud Messaging / APNs
- **Camera** for property photos, document scanning, address sign OCR
- **Location** for nearby property lookups
- **Biometric auth** for quick app access
- **Offline mode** for property data caching
- **Share extension** for sharing listings via native share sheet

### Migration from Capacitor

- Keep Capacitor config as fallback during transition
- Gradually replace with React Native screens
- Target: iOS App Store + Google Play Store submission

---

## Phase Summary & Dependencies

```
Phase 1: Foundation (Weeks 1-3)     <- Everything depends on this
  |-- Phase 2: AI Employee (Weeks 3-6)
  |-- Phase 3: Voice AI (Weeks 5-8)       <- needs AI framework
  |-- Phase 4: Deal Tracker (Weeks 6-10)  <- needs deal data model
  |     |-- Phase 5: Ads & Lead Scoring (Weeks 9-14)
  |     |-- Phase 6: Analytics (Weeks 10-14)
  |     +-- Phase 7: AI Features (Weeks 12-16)
  +-- Phase 8: Mobile (Weeks 14-20)       <- can start UI earlier, API needs phases 1-4
```

**Critical path:** Phase 1 → Phase 4 → Phase 7C (Transaction Coordinator)
This is the highest-value chain: shared infra → deal tracking → automated deal management.

**Quick wins to ship early:**

- AI Employee chat (Phase 2) — usable as soon as GHL tools are wired up
- Client portal (Phase 4) — high client-facing impact, simple to build
- AI report insights (Phase 6) — add to existing 14 reports with minimal UI work

---

## Key Technical Decisions

| Decision           | Choice                             | Rationale                                                              |
| ------------------ | ---------------------------------- | ---------------------------------------------------------------------- |
| AI SDK             | Vercel AI SDK (`ai@6`)             | Already in stack, supports streaming, tool calling, multi-provider     |
| LLM                | OpenAI GPT-4o via `@ai-sdk/openai` | Already integrated, best tool-calling support                          |
| Voice AI           | GHL Conversation AI                | Native GHL integration, no separate telephony to manage                |
| Document Signing   | GHL Documents (exclusively)        | Cost savings, keeps everything in GHL ecosystem                        |
| Mobile             | React Native + Expo                | True native experience, shared JS logic, better than Capacitor wrapper |
| Client Portal Auth | Token-based (no login)             | Minimal friction for clients checking deal status                      |
| Ad Management      | GHL ad integrations + direct OAuth | Leverage GHL where possible, supplement with direct API for gaps       |
| Background Jobs    | Vercel Cron + Supabase pg_cron     | No additional infra needed                                             |
| Real-time Updates  | Supabase Realtime                  | Already using Supabase, free real-time subscriptions                   |
