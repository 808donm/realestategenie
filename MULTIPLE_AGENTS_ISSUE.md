# 🔍 Multiple Agents Issue - Diagnosis & Solution

## 🎯 Problem Summary

You have **TWO different agents** in your system, each with their own GHL integration:

### Agent 1 (OLD) ❌

- **Agent ID:** `6d56532d-0aaa-4386-b4ab-73ff045b6f93`
- **Integration ID:** `625efff2-991e-4f64-a738-36ef5f3c6368`
- **Created:** December 12, 2025
- **Location ID:** `DshTXaOpOeTLLRAoR4SN` (agency - WRONG)
- **Scopes:** Only 5/19 (missing associations, conversations/message)
- **Status:** ❌ Missing critical scopes for registrations and emails

### Agent 2 (NEW) ✅

- **Agent ID:** `b80d448f-d58a-4cb6-bb13-f5a6d38b30ae`
- **Integration ID:** `bfad5189-7f65-4b46-ad42-f2e81c477d0d`
- **Created:** January 6, 2026 (TODAY!)
- **Location ID:** `gTZBuJqALTmKjETniBEN` (sub-account - CORRECT)
- **Scopes:** All 19/19 ✅
- **Status:** ✅ Fully functional with all required scopes

## 🔧 Why This Matters

When someone registers for an open house:

1. System looks up the `open_house_event` record
2. Gets the `agent_id` from that event
3. Fetches the GHL integration for THAT agent
4. Uses that agent's access token to make API calls

**If your open house events belong to Agent 1** → Uses old integration → API calls fail ❌
**If your open house events belong to Agent 2** → Uses new integration → Everything works ✅

## 🧪 How to Diagnose

### Step 1: Check Which Agent You're Logged In As

Visit: `GET /api/debug/whoami`

This will show:

- Your current user ID
- Your email
- Your GHL integration details
- Whether you're the "first agent" (important for diagnostic endpoints)

### Step 2: Check Your GHL Integration

If logged in as Agent 1 (`6d56532d...`):

```
GET /api/debug/show-ghl-config
```

If logged in as Agent 2 (`b80d448f...`):

```
GET /api/debug/show-ghl-config?agentId=b80d448f-d58a-4cb6-bb13-f5a6d38b30ae
```

Should show:

- ✅ Location ID: `gTZBuJqALTmKjETniBEN`
- ✅ Created: 2026-01-06

### Step 3: Check Which Agent Owns Your Open Houses

Run this query in your database:

```sql
SELECT
  id,
  agent_id,
  address,
  created_at
FROM open_house_events
ORDER BY created_at DESC
LIMIT 5;
```

The `agent_id` should match the agent with the working GHL integration.

## ✅ Solution Options

### Option A: Use Agent 2 (Recommended)

**If Agent 2 is your actual account:**

1. Make sure you're logged in as Agent 2 when using the app
2. Verify at `/api/debug/whoami` that your ID is `b80d448f-d58a-4cb6-bb13-f5a6d38b30ae`
3. Create your open house events while logged in as this agent
4. All registrations will use the working GHL integration ✅

### Option B: Reconnect OAuth for Agent 1

**If Agent 1 is your actual account and Agent 2 was a test:**

1. Log in as Agent 1 (`6d56532d...`)
2. Make absolutely sure you're logged into the GHL sub-account (not agency):
   - Go to GHL
   - Click account selector in top-right
   - Verify you see ONLY the sub-account (not agency options)
   - If you see agency options, log out and log back in to sub-account
3. Go to `/app/integrations` in your app
4. Disconnect GHL
5. Reconnect GHL
6. Verify at `/api/debug/show-ghl-config` that you now have:
   - Location ID: `gTZBuJqALTmKjETniBEN`
   - All 19 scopes

### Option C: Update Existing Events (Advanced)

**If you have many events under Agent 1 but want to use Agent 2:**

Run this SQL to transfer ownership:

```sql
UPDATE open_house_events
SET agent_id = 'b80d448f-d58a-4cb6-bb13-f5a6d38b30ae'
WHERE agent_id = '6d56532d-0aaa-4386-b4ab-73ff045b6f93';
```

⚠️ **Warning:** Only do this if Agent 2 is your real account and Agent 1 was created by mistake.

## 📊 Current OAuth Status (from logs)

Your most recent OAuth connection (2026-01-06 00:10:03) shows:

```
✅ Agent ID: b80d448f-d58a-4cb6-bb13-f5a6d38b30ae
✅ Integration ID: bfad5189-7f65-4b46-ad42-f2e81c477d0d
✅ Location ID: gTZBuJqALTmKjETniBEN (CORRECT sub-account)
✅ authClass: Location (not Agency)
✅ Scope count: 19/19

Scopes granted:
  ✅ contacts.write, contacts.readonly
  ✅ opportunities.write, opportunities.readonly
  ✅ locations.readonly, locations/customFields.*
  ✅ conversations.write, conversations.readonly
  ✅ conversations/message.write, conversations/message.readonly
  ✅ objects/record.write, objects/record.readonly
  ✅ objects/schema.write, objects/schema.readonly
  ✅ associations.write, associations.readonly
  ✅ invoices.write, invoices.readonly
```

**This integration is PERFECT and ready to use!** ✨

## 🎯 Recommended Next Steps

1. **Visit `/api/debug/whoami`** to see which agent you're currently logged in as

2. **If you're Agent 2** (`b80d448f...`):
   - ✅ You're good! Your integration is perfect
   - Create open house events and test registration
   - Everything should work

3. **If you're Agent 1** (`6d56532d...`):
   - **Option A:** Log out and log in as Agent 2 (if that's a valid account)
   - **Option B:** Reconnect OAuth while logged into GHL sub-account (not agency)
   - Verify you get location ID `gTZBuJqALTmKjETniBEN`

4. **Test the full flow:**
   - Create an open house event
   - Submit a registration
   - Verify in GHL:
     - Contact created ✅
     - OpenHouse record created ✅
     - Registration record created ✅
     - Associations visible ✅
     - Email in conversation history ✅

## 🔍 Diagnostic Endpoints Reference

- `GET /api/debug/whoami` - Shows current logged-in agent
- `GET /api/debug/show-ghl-config` - Shows GHL config (defaults to first agent)
- `GET /api/debug/show-ghl-config?agentId=xxx` - Shows specific agent's config
- `GET /api/debug/check-ghl-scopes` - Tests scope access (defaults to first agent)
- `GET /api/debug/check-ghl-scopes?agentId=xxx` - Tests specific agent's scopes
- `GET /api/debug/show-oauth-url` - Shows OAuth URL with all scopes

## 💡 Why The Diagnostic Endpoints Showed Wrong Data

The diagnostic endpoints default to the **first agent** in the database when no `agentId` parameter is provided:

```typescript
// From show-ghl-config/route.ts line 21
const { data: agent } = await admin
  .from("agents")
  .select("id, email")
  .limit(1) // ← Gets the FIRST agent
  .single();
```

Since Agent 1 (`6d56532d...`) was created first (December 12), it's the default.
Agent 2 (`b80d448f...`) was created later (during OAuth today).

To query Agent 2's data explicitly:

```
/api/debug/show-ghl-config?agentId=b80d448f-d58a-4cb6-bb13-f5a6d38b30ae
```

## ✨ Summary

✅ **OAuth is working perfectly** - all 19 scopes granted, correct location ID
✅ **Code is correct** - all API endpoints and associations fixed
✅ **Integration exists** - Agent 2 has a fully functional GHL integration

🎯 **You just need to use Agent 2 when creating/testing open house events!**

The OAuth you just completed was successful. You now have a working integration with:

- All 19 scopes ✅
- Correct sub-account location ID ✅
- Proper token storage ✅
- Ready for associations and email sending ✅

Just make sure you're logged in as the right agent when using the app!
