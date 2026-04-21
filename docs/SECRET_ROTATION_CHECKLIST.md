# Secret Rotation Checklist

**Context:** Vercel environment was compromised on 2026-04-18. All secrets held in Vercel env at that time should be treated as exposed and rotated before the attacker can exploit them. This file tracks rotation status and serves as an operational runbook.

**How to use:** Tick boxes as you complete each rotation. Commit updates to this file as you go so the audit trail lives in git history. For each item, record the rotation date and initials of the operator.

---

## Rotation flow for every item

For each secret below:

1. Generate a new value in the provider's dashboard (link in each row)
2. Paste the new value into Vercel → Project → Settings → Environment Variables → **Production** slot (overwrite, save)
3. Repeat for **Preview** and **Development** envs if your workflow uses them
4. Trigger a fresh deploy in Vercel (**uncheck "Use existing Build Cache"**) OR push an empty commit:
   ```bash
   git commit --allow-empty -m "Force redeploy after <VAR_NAME> rotation" && git push
   ```
5. Test the dependent feature works (see "verify" column)
6. In the provider's dashboard, revoke / delete the old value (if the provider requires manual revocation — some only let you have one active key at a time, which makes revocation automatic)
7. Tick the box below with date and operator

If anything breaks after a rotation, check Vercel runtime logs for the specific var name in error messages — usually "Invalid API key" or "401 unauthorized" for the service that holds the now-stale cached value. Fresh redeploy fixes 95% of those cases (warm-cache issue).

---

## ✅ Already rotated

- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — replaced with `sb_publishable_...`, legacy JWT disabled · **2026-04-18** · don.m
- [x] `SUPABASE_SERVICE_ROLE_KEY` — replaced with `sb_secret_...`, legacy JWT disabled · **2026-04-18** · don.m
- [x] `ANTHROPIC_API_KEY` — rotated at console.anthropic.com · **2026-04-18** · don.m
- [x] `OPENAI_API_KEY` — rotated at platform.openai.com (unused in code but was in env) · **2026-04-18** · don.m
- [x] **Vercel ↔ GitHub integration** — revoked & reconnected · **2026-04-18** · don.m
- [x] **Supabase `team_members` RLS recursion** — fixed (migration 20260418120000) · **2026-04-18** · don.m

---

## 🔴 Critical — rotate next

Highest blast-radius items. Each can be used for direct financial damage or data exfiltration within minutes of compromise.

- [ ] `STRIPE_SECRET_KEY` · dashboard.stripe.com → Developers → API keys → Roll · Verify: webhook delivery succeeds, checkout flow works · **Date: ___ · Op: ___**
- [ ] `STRIPE_WEBHOOK_SECRET` · Stripe dashboard → Webhooks → endpoint → Signing secret → Roll. Update both sides simultaneously; may drop 1-2 webhook deliveries during rotation · Verify: force a test webhook, check it validates · **Date: ___ · Op: ___**
- [ ] `TWILIO_AUTH_TOKEN` · console.twilio.com → Account → API Keys & Tokens → Primary Auth Token → Request new. `TWILIO_ACCOUNT_SID` is not secret; `TWILIO_PHONE_NUMBER` is not secret · Verify: send a test SMS from app · **Date: ___ · Op: ___**
- [ ] `RESEND_API_KEY` · resend.com → API Keys → revoke old, create new · Verify: transactional email delivery · **Date: ___ · Op: ___**
- [ ] `GOOGLE_MAPS_API_KEY` · console.cloud.google.com → APIs & Services → Credentials · Verify: map renders on seller-report cover · **Date: ___ · Op: ___**
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` · Same GCP Credentials page. **Add HTTP-referrer restriction to `*.realestategenie.app` + `localhost:*` before saving** so the scraped value can't be reused from other domains · Verify: in-app map components load · **Date: ___ · Op: ___**
- [ ] `GOOGLE_STATIC_MAP_API_KEY` · Same GCP Credentials page · Verify: PDF cover-page maps render · **Date: ___ · Op: ___**
- [ ] `GOOGLE_TTS_API_KEY` · Same GCP Credentials page · Verify: any TTS feature if used · **Date: ___ · Op: ___**

---

## 🟠 High — paid third-party APIs

Metered APIs. Attacker exhausting your quota = your bill.

- [ ] `REAPI_API_KEY` · reapi.com dashboard → API Keys → Regenerate · Verify: property search returns results · **Date: ___ · Op: ___**
- [ ] `REALIE_API_KEY` · realie.io dashboard → API Keys · Verify: property lookup returns data · **Date: ___ · Op: ___**
- [ ] `RENTCAST_API_KEY` · app.rentcast.io → API Keys → Revoke + regenerate · Verify: rental estimate lookup · **Date: ___ · Op: ___**
- [ ] `HUD_API_TOKEN` · huduser.gov API portal → request new token · Verify: Fair Market Rent lookup · **Date: ___ · Op: ___**
- [ ] `USPS_CLIENT_ID` + `USPS_CLIENT_SECRET` · developer.usps.com → App → Regenerate credentials (OAuth2 pair — rotate together) · Verify: address validation endpoint · **Date: ___ · Op: ___**
- [ ] `EPA_AQS_KEY` · aqs.epa.gov — may need to email `aqsdatamart@epa.gov` to request a new key · Verify: air quality lookup · **Date: ___ · Op: ___**

---

## 🟡 Medium — OAuth client secrets + webhook signing

- [ ] `GHL_CLIENT_SECRET` · marketplace.gohighlevel.com → app → Settings → Client Keys → Regenerate. **OR delete entirely if moving to PIT-only flow** (see `docs/GHL_OAUTH_SETUP.md` for migration path) · Verify: existing agent OAuth refresh still works OR remove route · **Date: ___ · Op: ___**
- [ ] `GHL_AGENCY_ACCESS_TOKEN` · GHL Agency View → Settings → Private Integrations → Create new agency PIT with scopes: `locations.write`, `locations.readonly`, `snapshots.readonly`, `snapshots.write` · Verify: test agent signup triggers sub-account creation · **Date: ___ · Op: ___**
- [ ] `GHL_WEBHOOK_SECRET` · GHL app webhook config → regenerate signing secret. Update both sides simultaneously · Verify: test webhook validates sig · **Date: ___ · Op: ___**
- [ ] `GOOGLE_CALENDAR_CLIENT_SECRET` · console.cloud.google.com → OAuth 2.0 Client IDs → your calendar app → Reset secret. `GOOGLE_CALENDAR_CLIENT_ID` stays. Monitor for `invalid_client` errors post-rotation · Verify: test agent calendar refresh · **Date: ___ · Op: ___**
- [ ] `MICROSOFT_CALENDAR_CLIENT_SECRET` · portal.azure.com → App registrations → your app → Certificates & secrets → New client secret. `MICROSOFT_CALENDAR_CLIENT_ID` + `MICROSOFT_CALENDAR_TENANT_ID` stay · Verify: test agent calendar refresh · **Date: ___ · Op: ___**
- [ ] `ZILLOW_WEBHOOK_SECRET` · Zillow Bridge Interactive portal → Webhook config → regenerate · Verify: test webhook sig · **Date: ___ · Op: ___**

---

## 🟢 Platform-internal signing secrets

These are generated by you, not a third party. Rotating invalidates outstanding signed tokens of that type — note the user-visible impact before rotating.

- [ ] `NEXTAUTH_SECRET` · Generate: `openssl rand -base64 48` · **Impact: all logged-in users kicked, must re-login.** Schedule for low-traffic window. Verify: can log in after deploy · **Date: ___ · Op: ___**
- [ ] `CRON_SECRET` · Generate: `openssl rand -hex 32` · Update Vercel cron config headers too (any `Authorization: Bearer $CRON_SECRET` in `vercel.json`) · Verify: cron routes still 200 on their next run · **Date: ___ · Op: ___**
- [ ] `VAPID_PRIVATE_KEY` · Generate new keypair: `npx web-push generate-vapid-keys`. **Impact: existing push subscriptions break; users re-subscribe.** Also update `NEXT_PUBLIC_VAPID_PUBLIC_KEY` with the matching public half · Verify: send a test push · **Date: ___ · Op: ___**
- [ ] `QR_TOKEN_SECRET` · Generate: `openssl rand -base64 32` · **Impact: outstanding QR-link tokens invalidated** (e.g., open-house check-in links in SMS queues) · Verify: generate new QR, scan, verify · **Date: ___ · Op: ___**

---

## 🔵 Free-tier APIs (lower priority — within a week)

Free tier, rate-limited, no financial exposure. Rotate when convenient.

- [ ] `CENSUS_API_KEY` · api.census.gov/data/key_signup.html · **Date: ___ · Op: ___**
- [ ] `FRED_API_KEY` · fred.stlouisfed.org → My Account → API Keys → Request new · **Date: ___ · Op: ___**
- [ ] `BLS_API_KEY` · bls.gov → Developer Portal · **Date: ___ · Op: ___**

---

## 🚫 Not yet issued (N/A for this rotation)

- `RMLS_BEARER_TOKEN` — vendor application not yet submitted; no token exists to rotate yet. When issued, goes straight to Production Vercel env.

---

## Not secrets (skip)

These are identifiers or configuration values, not rotatable credentials:

`ADMIN_EMAIL`, `EMAIL_FROM`, `VAPID_EMAIL`, `EPA_AQS_EMAIL`, `GHL_CLIENT_ID` (public OAuth identifier), `GHL_COMPANY_ID`, `GHL_LOCATION_IDS`, `GHL_WEBHOOK_URL`, `GHL_WORKFLOW_WEBHOOK_URL`, `GHL_SNAPSHOT_ID`, `GOOGLE_CALENDAR_CLIENT_ID`, `MICROSOFT_CALENDAR_CLIENT_ID`, `MICROSOFT_CALENDAR_TENANT_ID`, `HAWAII_STATEWIDE_PARCELS_URL`, `HONOLULU_*_URL`, `TRESTLE_API_URL`, `RMLS_API_URL`, `NEXT_PUBLIC_*` (public by definition), `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (public half of VAPID pair), `NODE_ENV`, `VERCEL`, `VERCEL_URL`, `AWS_LAMBDA_FUNCTION_NAME`, `CHROME_PATH`, `BRIEFING_AI_MODEL` / `COPILOT_AI_MODEL` / `PROSPECT_AI_MODEL` / `COMP_GENIE_MODEL` / `REPORT_AI_MODEL` (model ID strings), `TWILIO_PHONE_NUMBER`, `TWILIO_ACCOUNT_SID` (SID is an identifier, auth token is the secret), `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `EPA_AQS_EMAIL`.

**Verify `DATABASE_URL`:** If this is present in Vercel env and contains a password component, rotate it like a secret. If it's purely a Supabase pooler URL without credentials, it's safe. Check the value before deciding.

---

## Post-rotation hygiene (do once after all secrets rotated)

- [ ] **Supabase JWT signing secret** — Supabase → Project Settings → Authentication → JWT Settings → Rotate. **Kills all user sessions** (everyone re-logs in). Only necessary if you suspect an attacker may have minted session tokens during the compromise window. Schedule for a low-traffic window · **Date: ___ · Op: ___**
- [ ] **Supabase log audit** — scan Database + API logs during the compromise window for abnormal patterns: large SELECTs from `agents`/`leads`/`properties`, bulk storage downloads, unexpected INSERTs into `auth.users` · **Date: ___ · Op: ___**
- [ ] **Supabase `auth.users` audit** — SQL: `select email, created_at, last_sign_in_at from auth.users order by created_at desc limit 100;` — look for unfamiliar emails or sign-ins from the compromise window · **Date: ___ · Op: ___**
- [ ] **GitHub OAuth apps / GitHub Apps / Deploy keys / PATs** — github.com/settings/applications and repo → Settings → Deploy keys. Revoke anything unfamiliar · **Date: ___ · Op: ___**
- [ ] **Trestle per-agent credentials** — Trestle OAuth credentials live per-agent, not in our env. They weren't directly exposed by the Vercel breach. No central rotation needed. Individual agents reconnect via the UI if suspicious activity is observed on their MLS account.

---

## Verification after each tier

Run through the app's primary flows once each tier is complete:

- [ ] After Critical tier: payment → SMS → email → maps all functional
- [ ] After High tier: property search → AVM → rental estimate all functional
- [ ] After Medium tier: OAuth (CRM / Calendar) reconnect flow functional
- [ ] After Platform-internal tier: can log in, cron jobs next scheduled run succeeds, push notifications reach a test device

---

## Incident timeline

| Date | Event | Operator |
|---|---|---|
| 2026-04-17 | Supabase introduces `sb_publishable_` / `sb_secret_` key format (external event, not incident-related) | — |
| 2026-04-18 | Vercel breach detected. Supabase keys rotated. Anthropic + OpenAI rotated. GitHub integration reconnected. `team_members` RLS recursion discovered + fixed. Checklist begins. | don.m |
| | | |
| | | |

Append new rows as the rotation progresses.
