# GHL Integration Status Report
**Date:** 2026-01-06
**Branch:** claude/fix-missing-form-fields-ymc8s

## ✅ OAuth Integration - FIXED

### What Was Fixed:
1. **OAuth Scope Granting** - All 19 scopes now successfully granted
   - Added: `associations.write`, `associations.readonly`
   - Added: `conversations.write`, `conversations.readonly`
   - Added: `conversations/message.write`, `conversations/message.readonly`

2. **Location ID Issue** - Correct sub-account location now returned
   - **Problem:** OAuth was returning agency location ID (`DshTXaOpOeTLLRAoR4SN`) instead of sub-account
   - **Root Cause:** User was in "Agency View" during app installation
   - **Solution:** Logged out completely from GHL, logged back into specific sub-account, reconnected
   - **Result:** Correct location ID now returned: `gTZBuJqALTmKjETniBEN` ✅

3. **Database Storage** - New integration record successfully created
   - Integration ID: `bfad5189-7f65-4b46-ad42-f2e81c477d0d`
   - Created: `2026-01-06T00:10:03.925699+00:00`
   - All fields saved with `ghl_` prefix for consistency
   - All 19 scopes present in JWT token

### Latest OAuth Callback Logs (2026-01-06 00:10:03):
```
✅ Location ID: gTZBuJqALTmKjETniBEN (CORRECT)
✅ authClass: Location (not Agency)
✅ authClassId: gTZBuJqALTmKjETniBEN
✅ primaryAuthClassId: gTZBuJqALTmKjETniBEN
✅ Scope count: 19/19
✅ All scopes granted:
   - contacts.write, contacts.readonly
   - opportunities.write, opportunities.readonly
   - locations.readonly, locations/customFields.*
   - conversations.write, conversations.readonly
   - conversations/message.write, conversations/message.readonly
   - objects/record.write, objects/record.readonly
   - objects/schema.write, objects/schema.readonly
   - associations.write, associations.readonly ⬅️ CRITICAL FOR LINKING
   - invoices.write, invoices.readonly
```

## ✅ Associations API - FIXED

### What Was Fixed:
1. **Endpoint Format**
   - **Old (404 error):** `POST /objects/custom_objects.registrations/records/{id}/associations`
   - **New (correct):** `POST /associations/relations`

2. **Request Format**
   - Now uses correct structure:
     ```json
     {
       "locationId": "...",
       "firstObjectKey": "custom_objects.registrations",
       "firstObjectId": "registration-record-id",
       "secondObjectKey": "contact",
       "secondObjectId": "contact-id"
     }
     ```

3. **Two Associations Created:**
   - Registration → Contact
   - Registration → OpenHouse

### Code Location:
- File: `src/lib/notifications/ghl-service.ts`
- Lines: 186-243

## ✅ Email Sending - FIXED

### What Was Fixed:
1. **GHL-First Email Strategy**
   - Primary: Send via GHL conversations API (for CRM tracking)
   - Fallback: Send via Resend if GHL fails

2. **API Format**
   - **Old (404 error):** Used `email` field
   - **New (correct):** Uses `contactId` field
   - Endpoint: `POST /conversations/messages`
   - Type: `Email`

3. **Email Templates:**
   - First visit: Standard thank you
   - Return visit: "RED HOT LEAD!" alert

### Code Location:
- GHL Service: `src/lib/notifications/ghl-service.ts:372-410`
- Email Templates: `src/lib/email/resend.ts`
- Lead Submit: `app/api/leads/submit/route.tsx:280-308`

## ✅ Token Storage - FIXED

### Field Name Standardization:
All GHL config fields now use `ghl_` prefix:
- `ghl_access_token`
- `ghl_refresh_token`
- `ghl_expires_at`
- `ghl_expires_in`
- `ghl_location_id`
- `ghl_user_id`
- `ghl_company_id`
- `ghl_pipeline_id` (optional)
- `ghl_new_lead_stage` (optional)

### Backwards Compatibility:
Token refresh utility (`src/lib/integrations/ghl-token-refresh.ts`) supports both:
- New format: `ghl_*` fields
- Old format: unprefixed fields

## 🔧 What Needs to Be Tested

### 1. End-to-End Registration Flow
Test a complete open house registration:

1. **Visit Registration Page**
   - Go to an open house event page
   - Fill out registration form
   - Submit registration

2. **Verify in GHL:**
   - ✅ Contact created or updated
   - ✅ OpenHouse custom object created
   - ✅ Registration custom object created
   - ✅ Association: Registration → Contact (visible in GHL UI)
   - ✅ Association: Registration → OpenHouse (visible in GHL UI)
   - ✅ Email sent and tracked in contact's conversation history

3. **Verify Email Delivery:**
   - Check if email sent via GHL (check conversation history in GHL)
   - If GHL fails, should fall back to Resend

4. **Check Heat Scoring:**
   - First visit = Cold/Warm
   - Return visit = Hot/Red Hot
   - Should see visit count increment

### 2. Return Visit Test
Submit registration twice for same open house:

1. First visit → should get standard thank you email
2. Second visit (same day) → should get "RED HOT LEAD!" email
3. Verify `visitcount` field increments in Registration record

### 3. Pipeline Integration (Optional)
If pipeline settings configured:

1. Check if Opportunity created in pipeline
2. Verify opportunity is in "New Lead" stage
3. Verify heat level tag applied

### 4. Webhook Testing (Optional)
User mentioned webhook settings available in GHL:

- Current webhook endpoint exists: `/api/webhooks/ghl`
- Configure in GHL to receive real-time updates
- Test events: ContactCreate, ContactUpdate, OpportunityCreate, etc.

## 📋 Configuration Checklist

### In GHL Marketplace:
- [x] All 19 scopes enabled in app settings
- [x] App published/saved with new scopes
- [ ] Webhook URL configured (optional): `https://yourdomain.com/api/webhooks/ghl`

### In Application:
- [x] OAuth connected with correct sub-account
- [x] Location ID verified: `gTZBuJqALTmKjETniBEN`
- [x] All 19 scopes granted in token
- [ ] Pipeline ID configured (if using pipeline feature)
- [ ] New Lead Stage ID configured (if using pipeline feature)

### Environment Variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GHL_CLIENT_ID=...
GHL_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=...
RESEND_API_KEY=... (for email fallback)
```

## 🎯 Next Steps

1. **Test Registration Flow**
   - Create a test open house event
   - Submit a registration
   - Verify all data appears in GHL correctly

2. **Verify Associations**
   - In GHL UI, navigate to Registration record
   - Check if linked Contact and OpenHouse are visible
   - Try navigating from Contact to see all their Registrations

3. **Test Email Tracking**
   - Submit registration
   - Go to Contact in GHL
   - Open Conversations tab
   - Verify welcome email appears in conversation history

4. **Configure Pipeline (Optional)**
   - Get pipeline ID from GHL
   - Get stage ID for "New Lead" stage
   - Update integration config with these IDs
   - Test opportunity creation

5. **Set Up Webhooks (Optional)**
   - In GHL settings, add webhook URL
   - Test by making changes in GHL
   - Check logs to see webhook events received

## 📝 Files Modified

1. `/app/api/integrations/ghl/connect/route.ts` - OAuth initiation
2. `/app/api/integrations/crm-callback/route.ts` - OAuth callback & token storage
3. `/src/lib/notifications/ghl-service.ts` - All GHL API calls
4. `/src/lib/integrations/ghl-token-refresh.ts` - Token refresh logic
5. `/app/api/leads/submit/route.tsx` - Registration submission
6. `/src/lib/email/resend.ts` - Email templates & fallback
7. `/app/api/webhooks/ghl/route.ts` - Webhook receiver (existing)
8. `/app/api/debug/show-oauth-url/route.ts` - OAuth diagnostic
9. `/app/api/debug/show-ghl-config/route.ts` - Config diagnostic
10. `/app/api/debug/check-ghl-scopes/route.ts` - Scope testing

## 🐛 Debugging Tools

Available diagnostic endpoints:
- `GET /api/debug/show-oauth-url` - Shows exact OAuth URL with scopes
- `GET /api/debug/show-ghl-config?agentId=xxx` - Shows stored config
- `GET /api/debug/check-ghl-scopes?agentId=xxx` - Tests scope access
- `GET /api/webhooks/ghl` - Webhook endpoint status

## ✨ Key Learnings

1. **Agency vs Sub-Account Authentication**
   - Critical to be logged into specific sub-account (not agency) during OAuth
   - "Agency View" dropdown during app installation determines which location ID is returned

2. **GHL Associations API**
   - Use `/associations/relations` endpoint (not the objects endpoint)
   - Format: `firstObjectKey/firstObjectId` → `secondObjectKey/secondObjectId`

3. **GHL Email API**
   - Must use `contactId` field (not `email`)
   - Email will appear in contact's conversation history in GHL
   - Good for CRM tracking and maintaining communication history

4. **Scope Persistence**
   - Scopes must be enabled in marketplace AND re-authorized via OAuth
   - Existing tokens won't automatically get new scopes
   - Must disconnect and reconnect to get updated token

## 🎉 Summary

All critical issues have been resolved:
- ✅ All 19 scopes successfully granted
- ✅ Correct location ID (sub-account) returned
- ✅ Token stored correctly in database
- ✅ Associations API using correct endpoint
- ✅ Email API using correct format
- ✅ GHL-first email strategy with Resend fallback

**Ready for end-to-end testing!**
