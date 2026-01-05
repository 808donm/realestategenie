# Troubleshooting GHL Open House Registrations

This guide helps diagnose why open house registrations aren't appearing in GoHighLevel (GHL).

## Quick Diagnostic Test

### Step 1: Run the Diagnostic Endpoint

Use this endpoint to test your GHL integration:

```bash
curl -X POST https://www.realestategenie.app/api/debug/test-ghl-registration \
  -H "Content-Type: application/json" \
  -d '{"eventId": "YOUR_OPEN_HOUSE_EVENT_ID"}'
```

Replace `YOUR_OPEN_HOUSE_EVENT_ID` with an actual open house event ID from your database.

The diagnostic will tell you:
- ✅ Which steps succeeded
- ❌ Where the process is failing
- 💡 Specific recommendations to fix the issue

### Step 2: Check Server Logs

If you're on Vercel:
1. Go to Vercel Dashboard
2. Select your project
3. Click on "Logs" in the left sidebar
4. Filter by `/api/leads/submit`
5. Look for messages with ❌ CRITICAL

If you're running locally:
1. Check your terminal/console where the Next.js dev server is running
2. Look for log messages when someone registers for an open house

**Key Log Messages:**
- `❌ CRITICAL: Failed to create GHL OpenHouse` - OpenHouse custom object creation failed
- `❌ CRITICAL: Failed to create GHL Registration` - Registration custom object creation failed
- `❌ CRITICAL: Skipping Registration creation - OpenHouse record was not created` - Registration skipped because OpenHouse failed

## Common Issues & Solutions

### Issue 1: Custom Objects Not Created in GHL

**Symptoms:**
- Logs show: `Failed to create OpenHouse` or `Failed to create Registration`
- Error message includes: `custom object not found`

**Solution:**
1. Log in to your GHL account
2. Go to **Settings → Custom Objects**
3. Verify these custom objects exist:
   - `openhouses` (singular or plural - check your exact naming)
   - `registrations`

4. For **openhouses** custom object, ensure these fields exist (exact names, case-sensitive):
   - `openhouseid` (Text)
   - `address` (Text)
   - `startdatetime` (Date/Time)
   - `enddatetime` (Date/Time)
   - `flyerUrl` (Text)
   - `agentId` (Text)
   - `beds` (Text or Number)
   - `baths` (Text or Number)
   - `sqft` (Text or Number)
   - `price` (Text or Number)

5. For **registrations** custom object, ensure these fields exist:
   - `registrationid` (Text)
   - `contactid` (Text)
   - `openhouseid` (Text)
   - `registerdat` (Date/Time)
   - `flyerstatus` (Multi-Select or Text)

### Issue 2: Associations Not Configured

**Symptoms:**
- OpenHouse and Registration objects are created
- Email merge tags like `{{registration.openHouses.address}}` show blank
- Logs show: `Failed to create OpenHouse association` or `Failed to create Contact association`

**Solution:**
1. In GHL, go to **Settings → Custom Objects**
2. Click on the **registrations** custom object
3. Click on **Associations** tab
4. Add two associations:
   - **registrations → contact** (Many-to-One or One-to-One)
   - **registrations → openhouses** (Many-to-One)

5. Save the associations

### Issue 3: GHL Integration Not Connected

**Symptoms:**
- Logs show: `GHL not connected, skipping notifications`
- No GHL logs appear at all

**Solution:**
1. Go to **Real Estate Genie → Integrations** page
2. Connect your GHL account
3. Ensure the integration status shows "Connected"
4. Verify the access token hasn't expired (the system auto-refreshes, but check if there are any refresh errors)

### Issue 4: Missing Associations Scope (MOST COMMON)

**Symptoms:**
- OpenHouse and Registration records ARE created successfully
- Email merge tags show blank values
- Logs show: `Failed to create Contact association (non-critical): The token is not authorized for this scope`
- Logs show: `Failed to create OpenHouse association (non-critical): The token is not authorized for this scope`

**Root Cause:**
The GHL OAuth token is missing the `associations.write` scope, which is required to link Registration → OpenHouse.

**Solution:**
1. Go to **GHL Developer Portal**: https://marketplace.gohighlevel.com/
2. Click **Apps** → Select your OAuth app
3. Go to **Settings** → **Scopes**
4. Add these scopes (if not already present):
   - ✅ `contacts.write`
   - ✅ `contacts.readonly`
   - ✅ `customObjects.write`
   - ✅ `customObjects.readonly`
   - ✅ **`associations.write`** ⬅️ **Required!**
   - ✅ **`associations.readonly`** ⬅️ **Required!**
   - ✅ `conversations.write` (for emails/SMS)
   - ✅ `opportunities.write` (for pipeline)

5. Click **Save**
6. **Important:** Users must reconnect their integration:
   - Go to Real Estate Genie → Integrations
   - Disconnect GHL
   - Reconnect GHL (this will request new scopes)

7. Test by registering for an open house again

**Verify Fix:**
```bash
curl https://www.realestategenie.app/api/debug/check-ghl-scopes?agentId=YOUR_AGENT_ID
```

### Issue 5: Other API Token Permissions

**Symptoms:**
- Logs show: `401 Unauthorized` or `403 Forbidden`
- OpenHouse or Registration creation fails with permission errors

**Solution:**
Ensure ALL required scopes are enabled in your GHL OAuth app (see Issue 4 above for complete list)

### Issue 6: Field Name Casing Issues

**Symptoms:**
- Objects are created but email merge tags show blank values
- Logs show objects created successfully but data not accessible

**Solution:**
The field names in GHL are **case-sensitive**. Verify your GHL custom object field names match exactly:

**For OpenHouse:**
- `flyerUrl` (camelCase, not `flyerurl` or `Flyerurl`)
- `agentId` (camelCase, not `agentid` or `Agentid`)

**In your GHL email templates, use:**
```
{{registration.openHouses.address}}
{{registration.openHouses.flyerUrl}}
{{registration.openHouses.agentId}}
```

Note: `openHouses` is plural in the merge tag path (it's the association name).

## Testing Your Fix

After making changes:

1. **Test with the diagnostic endpoint** (see Step 1 above)
2. **Register for a test open house**:
   - Visit your open house page: `https://www.realestategenie.app/oh/[eventId]`
   - Fill out and submit the registration form
   - Check server logs immediately

3. **Verify in GHL**:
   - Go to **Contacts** and find the test contact
   - Check that the Contact was created
   - Go to **Custom Objects → OpenHouses** and verify the record exists
   - Go to **Custom Objects → Registrations** and verify the record exists
   - Click on the Registration record and verify associations show the linked Contact and OpenHouse

4. **Test email merge tags**:
   - Create a test workflow in GHL
   - Add an email action
   - Use the merge tags: `{{registration.openHouses.address}}`
   - Trigger the workflow manually on your test contact
   - Verify the values populate correctly

## Still Having Issues?

If you're still experiencing problems:

1. **Collect these details:**
   - Full error message from server logs
   - Screenshot of your GHL custom objects setup
   - Screenshot of your GHL associations
   - Result from the diagnostic endpoint

2. **Common edge cases:**
   - Some GHL accounts have custom object names with different casing (e.g., `OpenHouses` vs `openhouses`)
   - Check your exact custom object API names in GHL Settings → Custom Objects → click object → check "API Name" field
   - You may need to update `/home/user/realestategenie/src/lib/notifications/ghl-service.ts` line 58 and 117 to match your exact API names

3. **Check GHL API logs:**
   - In GHL, go to **Settings → API**
   - Check recent API calls for errors
   - Look for 400/500 status codes

## Architecture Overview

Understanding the flow helps with debugging:

```
1. User submits open house registration form
   ↓
2. POST /api/leads/submit
   ↓
3. Create GHL Contact (or find existing)
   ↓
4. Create GHL OpenHouse custom object
   ↓
5. Create GHL Registration custom object
   ↓
6. Create associations:
   - Registration → Contact
   - Registration → OpenHouse
   ↓
7. Create GHL Opportunity (if pipeline configured)
   ↓
8. Trigger GHL workflow (via "OpenHouse" tag)
```

If **any** step fails, subsequent steps may be skipped. The enhanced logging will show exactly where the failure occurs.

## Related Files

- `/home/user/realestategenie/app/api/leads/submit/route.tsx` - Main registration endpoint
- `/home/user/realestategenie/src/lib/notifications/ghl-service.ts` - GHL API functions
- `/home/user/realestategenie/src/lib/integrations/ghl-token-refresh.ts` - Token management
- `/home/user/realestategenie/app/api/debug/test-ghl-registration/route.ts` - Diagnostic endpoint
- `/home/user/realestategenie/docs/GHL_REGISTRATION_EMAIL_SETUP.md` - Email merge tag documentation
