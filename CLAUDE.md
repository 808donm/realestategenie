# CLAUDE.md -- Real Estate Genie Workspace Instructions

> **Keep this file updated** when project conventions change.
> **Never put secrets, API keys, or tokens in this file.**

---

## 1. Project Overview

Real Estate Genie is a SaaS platform for real estate agents. Initial market focus is Hawaii, but the app is designed to scale nationally. All code should be market-agnostic unless explicitly dealing with Hawaii-specific data sources (hazard zones, Honolulu tax/parcel APIs).

- **Stack**: Next.js 16 (App Router) + React 19 + TypeScript + TailwindCSS 4
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Auth**: Supabase Auth (JWT, email/password, MFA)
- **Hosting**: Vercel (serverless functions, cron jobs, preview deployments)
- **Mobile**: Capacitor 8 (iOS/Android wrapper)
- **AI**: Vercel AI Gateway + Anthropic Claude + OpenAI
- **CRM**: GoHighLevel (GHL) via OAuth
- **MLS**: Trestle (CoreLogic) via OAuth -- per-agent licensed connections

---

## 2. Architecture & File Conventions

### Directory Structure
- `app/` -- Next.js App Router (pages, API routes, layouts)
- `app/app/` -- Protected routes (requires auth)
- `app/api/` -- API routes, webhooks, cron jobs
- `src/lib/` -- Core business logic, integrations, utilities
- `src/components/` -- Shared React UI components
- `supabase/migrations/` -- Database migrations (append-only)
- `docs/` -- Documentation

### Naming Conventions
- **Client components**: `*.client.tsx` (has `"use client"` directive)
- **Server components**: `*.tsx` (plain, no suffix -- server is the default)
- **API routes**: `route.ts` inside `app/api/` directories
- **Integration clients**: `src/lib/integrations/<provider>-client.ts`
- **Path alias**: `@/*` maps to `./src/*`

---

## 3. Coding Standards

- **TypeScript strict mode** is enabled. Do not use `any` unless interfacing with untyped external data.
- **ESLint** with Next.js core-web-vitals config. Run `npm run lint` before committing.
- **Prettier** is configured (`.prettierrc`). Run `npm run format` to format all files, or `npm run format:check` to verify.
- **Settings**: Double quotes, semicolons, trailing commas, 120-char line width, 2-space indent.
- **ESLint + Prettier**: `eslint-config-prettier` disables ESLint formatting rules so Prettier owns formatting, ESLint owns logic.
- **No em dashes** in user-facing text or comments. Use regular dashes or reword.

### Code Quality Rules
- Do not add features, refactor, or "improve" code beyond what was requested.
- Do not add comments, docstrings, or type annotations to code you did not change.
- Do not create helpers or abstractions for one-time operations.
- Do not add error handling for scenarios that cannot happen.
- Delete unused code completely. No backwards-compatibility shims or `_unused` variables.

---

## 4. Security -- ALWAYS Priority #1

Security is non-negotiable. Every code change, database modification, and API integration must consider security first.

### PII Protection
- Real estate data contains names, addresses, phone numbers, financial info, and ownership records.
- Never log PII to console in production. Use structured logging with redaction.
- Never expose PII in client-side error messages or URL parameters.
- Validate and sanitize all user input at system boundaries.

### Database Security
- **RLS is mandatory** on all tables. Never bypass RLS except with the service role key in server-side code.
- Never modify existing RLS policies without explicit approval.
- Migrations are append-only. Never delete, rename, or rewrite existing migration files.
- New migrations must be reviewed for security implications before applying.

### Auth & Access Control
- Agent data is strictly isolated. An agent must never see another agent's data.
- **MLS connections are individually licensed.** An agent's MLS credentials and data must never be shared with or accessible to another agent. This is a licensing and legal requirement.
- Service role key usage is server-side only. Never expose it to the client.
- OAuth tokens (GHL, Google, Microsoft, Trestle) must be stored encrypted and scoped per agent.

### API Security
- All API routes must verify auth (`supabase.auth.getUser()`) before processing.
- Webhook endpoints must validate signatures/tokens from the source.
- Never trust client-provided IDs without verifying ownership via RLS or explicit checks.

---

## 5. Data Sources & Priority

### Property Data Hierarchy
1. **Realie** (primary) -- County records: ownership, tax assessments, sales history, equity, liens, foreclosure. Most complete for Hawaii (non-disclosure state).
2. **RentCast** (secondary) -- Supplements Realie with AVM, rental estimates, market stats, and additional sales history.
3. **Trestle MLS** (per-agent, licensed) -- Active/closed listings, comps, market trends. Agent-specific credentials.
4. **ATTOM** (legacy/fallback) -- Routed through Realie/RentCast. Direct ATTOM calls are deprecated.

### Federal/Public Data
- Census, FRED, BLS, HUD, FEMA -- free public APIs for demographics, economic indicators, flood zones.
- Hawaii-specific: Statewide parcels, Honolulu tax/ArcGIS, hazard zones.

When merging data from multiple sources, Realie is authoritative for sales history and ownership. RentCast supplements with valuation and market data. This hierarchy is codified in `app/api/integrations/attom/property/route.ts`.

---

## 6. Cost Management & Caching

### API Call Discipline
- **Always weigh cost vs. necessity** before making external API calls. Realie, RentCast, and Trestle charge per call.
- **Cache aggressively.** Property data, area statistics, and market data should be cached and reused.
- Never make redundant API calls. Check if data is already loaded or cached before fetching.
- Batch requests where the API supports it.

### Caching Strategy
- Cached data should be available **globally within the app** but **scoped by area**.
- An agent in San Diego should not trigger MLS queries for Honolulu data, and vice versa.
- MLS data is per-agent (licensed). Cache it per agent, never share across agents.
- Property data from Realie/RentCast can be shared across agents for the same property (it is public record data).
- Use Supabase for persistent caching. Use in-memory or edge caching for hot data.

### Vercel Constraints
- **Serverless function timeout**: 60s on Pro plan. API routes that call multiple external APIs must use `Promise.all()` for parallel fetching.
- **Function size**: 50MB compressed max.
- **Cron jobs**: Verify your Vercel plan supports the number of crons configured in `vercel.json` (currently 6).
- **Bandwidth**: 1TB/month on Pro. Be mindful of image-heavy responses (MLS photos, PDF reports).
- **Build time**: 45-minute max.

---

## 7. Branching & Deployment

### Git Workflow
- **Never push directly to `main`.** Main is production. A bad push takes the app down for all users.
- **Always work on feature branches** (e.g., `feature/admin-enhancements`).
- Push to the feature branch. Vercel creates a preview deployment automatically.
- Create a PR to merge into `main` only after the preview build succeeds and the feature is verified.
- Merging to `main` requires user approval.

### Commit Conventions
- Write concise commit messages that explain the "why," not the "what."
- Include `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` in commits authored by Claude.
- Do not commit `.env`, credentials, or secrets. Ever.
- Do not commit `node_modules/`, `.next/`, or build artifacts.

### Dependency Management
- **Major version upgrades require explicit approval.** No exceptions.
- Do not introduce new major dependencies without discussion.
- Prefer existing libraries already in the project over adding new ones.

---

## 8. Testing Strategy

### Current State
No automated test suite exists yet. Manual testing is the norm.

### Domain-Aware Testing Setup
The app's auth is tied to `realestategenie.app`. To enable testing on Vercel preview deployments:
- Configure Supabase redirect URLs to accept `https://*-808donm.vercel.app/**`
- Set `NEXT_PUBLIC_SITE_URL` dynamically: use `VERCEL_URL` env var on previews, production domain otherwise
- For server-side test utilities, use the service role key behind `NODE_ENV === 'test'` guards

### Testing Expectations
- Run `npm run build` to verify no TypeScript or build errors before pushing.
- Run `npm run lint` to catch ESLint issues.
- Test critical paths manually on Vercel preview deployments before merging to main.
- When adding new integration clients or utility functions, consider adding unit tests.

---

## 9. Build & Run Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development server |
| `npm run build` | Production build (also validates TypeScript) |
| `npm run start` | Start production server locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Verify formatting without changes |
| `npx tsc --noEmit` | Type-check without emitting |
| `npx cap sync` | Sync web build to mobile (Capacitor) |
| `npx cap open ios` | Open iOS project in Xcode |
| `npx cap open android` | Open Android project in Android Studio |

---

## 10. UX Philosophy

### Simplicity First
- **One click does something.** Every feature should be as close to a single button press as possible. Minimize multi-step workflows. If a user has to click three times, find a way to make it one.
- **Make it obvious.** Users should never wonder "what do I do next?" Buttons should have clear labels. Forms should be short. Defaults should be smart.
- **People use apps that are easy to use.** Complexity kills adoption. When designing a feature, always ask: "Can this be simpler?"

### AI Should Be Proactive
- Hoku (the AI copilot) should be intuitive and anticipatory. After completing a task, it should suggest the logical next step: "I found 3 comps for this property. Want me to generate a report?"
- AI should reduce friction, not add it. Pre-fill forms, suggest defaults, surface relevant data before the user asks for it.
- The AI should always be thinking: "How can I best help you next?"

---

## 11. Interaction Contract -- How Claude Should Behave

### Before Making Changes
- **Read before editing.** Always read a file before modifying it. Understand context.
- **Ask before large changes.** If a task touches more than 5 files or changes architecture, confirm the approach first.
- **Check for existing patterns.** Before writing new code, search for similar patterns already in the codebase and follow them.

### Making Changes
- Prefer small, focused edits over large rewrites.
- Match the style and patterns of surrounding code.
- Do not refactor adjacent code that is not part of the task.
- When modifying integration clients, preserve the existing data source hierarchy.
- When adding database changes, create a new migration file (never modify existing ones).

### After Making Changes
- Run `npx tsc --noEmit` to verify the build compiles.
- Commit to the feature branch, never to main.
- Summarize what changed and why in the commit message.

### When in Doubt...
- **Ask a clarifying question** instead of guessing.
- If unsure about data source priority, security implications, or cost impact -- stop and ask.
- If a task seems to require a major dependency or architectural change -- stop and ask.
- If modifying auth flows, RLS policies, or payment logic -- stop and ask.
- Bias toward doing less and confirming, rather than doing too much and getting it wrong.
