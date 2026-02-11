# GHL Custom Objects & Workflow Setup Guide

## Overview

This system uses **GHL Custom Objects** to model open house registrations as events rather than contact-level state. This architecture enables:

✅ **Multiple property visits** per contact
✅ **3-day expiration** for flyer requests
✅ **Smart decision logic** (single vs multi-property)
✅ **Direct SMS sending** via GHL API
✅ **Scalable architecture** without data overwrites

---

## Architecture Summary

### Data Model

**OpenHouse Custom Object** (one per open house event)
```javascript
{
  openHouseId: "uuid",
  address: "123 Main St, City, ST",
  startDateTime: "2025-12-23T14:00:00Z",
  endDateTime: "2025-12-23T16:00:00Z",
  flyerUrl: "https://realestategenie.app/api/open-houses/{id}/flyer",
  agentId: "agent-uuid",
  locationId: "ghl-location-id",
  beds: 3,
  baths: 2,
  sqft: 1850,
  price: 650000
}
```

**Registration Custom Object** (one per contact per open house)
```javascript
{
  registrationId: "reg-1234567890-abc123",
  contactId: "ghl-contact-id",
  openHouseId: "ghl-openhouse-custom-object-id",
  registeredAt: "2025-12-23T10:30:00Z",
  flyerStatus: "pending | offered | sent"
}
```

### Data Flow

```
Lead scans QR → Checks in
    ↓
Real Estate Genie creates/updates Contact in GHL
    ↓
Creates OpenHouse Custom Object (if doesn't exist)
    ↓
Creates Registration Custom Object in GHL
    ↓
Appends Registration to Contact (relationship)
    ↓
GHL Workflow A triggers on Registration created
    ↓
Sends email + SMS asking for YES reply
    ↓
Contact replies "YES"
    ↓
GHL Workflow B triggers on inbound message
    ↓
Calls /api/ghl/flyer-request webhook
    ↓
Our API checks 3-day expiration, queries registrations
    ↓
Our API sends SMS directly via GHL API (not workflow)
```

---

## Step 1: Create Custom Objects in GHL

### Create OpenHouse Custom Object

1. Go to **Settings → Custom Objects**
2. Click **+ Create Custom Object**
3. Name: `OpenHouse`
4. Add the following fields:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| openHouseId | Text | Yes | Unique ID from Real Estate Genie |
| address | Text | Yes | Full property address |
| startDateTime | DateTime | Yes | Open house start time |
| endDateTime | DateTime | Yes | Open house end time |
| flyerUrl | URL | Yes | Link to property flyer PDF |
| agentId | Text | Yes | Agent's UUID |
| locationId | Text | Yes | GHL location ID |
| beds | Number | No | Bedrooms |
| baths | Number | No | Bathrooms |
| sqft | Number | No | Square footage |
| price | Number | No | List price |

5. **Save** the Custom Object

### Create Registration Custom Object

1. Go to **Settings → Custom Objects**
2. Click **+ Create Custom Object**
3. Name: `Registration`
4. Add the following fields:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| registrationId | Text | Yes | Unique registration ID |
| contactId | Relationship (Contact) | Yes | Link to Contact |
| openHouseId | Text | Yes | Link to OpenHouse Custom Object |
| registeredAt | DateTime | Yes | Registration timestamp |
| flyerStatus | Dropdown | Yes | Options: pending, offered, sent |

5. **Relationships:**
   - Add relationship to **Contact** object
   - Relationship type: Many-to-One (many registrations per contact)

6. **Save** the Custom Object

---

## Step 2: Set Up GHL Workflows

### Workflow A: Registration Intake

**Purpose:** Send email and SMS when a lead checks in

**Trigger:**
- **Type:** Custom Object Record Created
- **Object:** Registration
- **Filter:** flyerStatus = "pending"

**Actions:**

1. **Wait:** 1 minute (let check-in complete)

2. **Send Email:**
   - To: `{{contact.email}}`
   - From: Your agent email
   - Subject: `Thanks for registering for the open house at {{custom_fields.property_address}}`
   - Body:
     ```html
     Hi {{contact.first_name}},

     Thank you for registering for the open house at {{custom_fields.property_address}}!

     The open house is scheduled for {{custom_fields.event_start_time}}.

     You can download the property flyer here:
     {{custom_fields.property_flyer_url}}

     See you there!

     Best regards,
     {{user.name}}
     {{custom_fields.agent_license}}
     ```

3. **Wait:** 30 seconds

4. **Send SMS:**
   - To: `{{contact.phone}}`
   - Message:
     ```
     Hi {{contact.first_name}}! Thanks for registering for the open house at {{custom_fields.property_address}}.

     Check your email for the flyer, or reply YES to get the link by text.

     - {{user.name}}
     ```

**End Workflow A**

---

### Workflow B: YES Reply Handler

**Purpose:** Handle "YES" replies and send flyer via API

**Trigger:**
- **Type:** Inbound Message (SMS)
- **Conditions:**
  - Message body contains: `YES`, `Y`, `SURE`, `OK`, `PLEASE`, `SEND` (case insensitive)

**Actions:**

1. **Custom Webhook:**
   - URL: `https://www.realestategenie.app/api/ghl/flyer-request`
   - Method: POST
   - Headers:
     - `Content-Type`: `application/json`
   - Body:
     ```json
     {
       "contactId": "{{contact.id}}"
     }
     ```

2. **Wait for Response** (webhook completes)

3. **End Workflow**
   *(Note: Our API sends the SMS directly - workflow doesn't need to)*

**End Workflow B**

---

### Workflow C: Numeric Choice Handler

**Purpose:** Handle numeric replies (1, 2, 3) for multi-property choices

**Trigger:**
- **Type:** Inbound Message (SMS)
- **Conditions:**
  - Message body matches regex: `^[0-9]$` (single digit)

**Actions:**

1. **Custom Webhook:**
   - URL: `https://www.realestategenie.app/api/ghl/flyer-choice`
   - Method: POST
   - Headers:
     - `Content-Type`: `application/json`
   - Body:
     ```json
     {
       "contactId": "{{contact.id}}",
       "choice": "{{message.body}}"
     }
     ```

2. **Wait for Response** (webhook completes)

3. **End Workflow**
   *(Note: Our API sends the SMS directly - workflow doesn't need to)*

**End Workflow C**

---

## Step 3: API Integration Flow

### When Lead Checks In

Our system (`ghl-sync.ts`) automatically:

1. Creates/updates Contact in GHL
2. Creates OpenHouse Custom Object (if doesn't exist)
3. Creates Registration Custom Object
4. Links Registration to Contact via relationship
5. Stores local tracking record in Supabase

**File:** `/src/lib/integrations/ghl-sync.ts:191-291`

### When Contact Replies "YES"

Workflow B calls: `POST /api/ghl/flyer-request`

**Our API logic:**

1. Query all registrations where `flyerStatus = "pending"` and `ghl_contact_id = contactId`
2. Filter out expired registrations (> 3 days old)
3. **If all expired:**
   - Send SMS: "Thanks for your interest! This open house registration has expired. Please contact {agent name} at {agent phone} for the property flyer."
4. **If 1 active registration:**
   - Send SMS with flyer URL directly
   - Update registration: `flyerStatus = "sent"`
5. **If 2+ active registrations:**
   - Generate offer token (24-hour expiration)
   - Create offer session in database
   - Send SMS with numbered list
   - Update registrations: `flyerStatus = "offered"`

**File:** `/app/api/ghl/flyer-request/route.ts`

### When Contact Replies with Number

Workflow C calls: `POST /api/ghl/flyer-choice`

**Our API logic:**

1. Find active offer session for contact
2. Validate offer token hasn't expired
3. Validate numeric choice is in range
4. Get registration at selected position
5. Send SMS with flyer URL
6. Update registration: `flyerStatus = "sent"`
7. Update offer session: `status = "responded"`

**File:** `/app/api/ghl/flyer-choice/route.ts`

---

## Step 4: Testing the Complete Flow

### Test 1: Single Property Visit (Within 3 Days)

1. Create an open house in Real Estate Genie
2. Check in as a test lead (new contact)
3. **Verify:**
   - Email received with flyer link
   - SMS received asking for YES reply
   - OpenHouse Custom Object created in GHL
   - Registration Custom Object created in GHL
   - Registration linked to Contact
4. Reply "YES" within 3 days
5. **Verify:**
   - Flyer URL sent directly via SMS
   - No numbered list (only one property)
   - Registration marked as `sent` in database

### Test 2: Multiple Property Visits

1. Create 3 open houses (same weekend)
2. Check in to all 3 as same contact
3. **Verify:**
   - 3 Registration Custom Objects created
   - 3 separate emails received
4. Reply "YES"
5. **Verify:**
   - Numbered list sent with all 3 properties
   - Offer token generated (24-hour expiration)
   - Registrations marked as `offered`
6. Reply "2"
7. **Verify:**
   - Flyer URL for property #2 sent
   - Registration #2 marked as `sent`
   - Offer session marked as `responded`

### Test 3: Expired Registration (> 3 Days)

1. Create an open house
2. Check in as a test lead
3. Wait 4 days (or manually update `registered_at` in database)
4. Reply "YES"
5. **Verify:**
   - SMS sent: "Thanks for your interest! This open house registration has expired. Please contact {agent} at {phone}..."
   - No flyer sent
   - Registration still `pending`

### Test 4: Expired Offer Token (> 24 Hours)

1. Create 2 open houses
2. Check in to both
3. Reply "YES" (gets numbered list)
4. Wait 25 hours (or manually update `expires_at` in database)
5. Reply "1"
6. **Verify:**
   - SMS sent: "Sorry, this offer has expired. Please reply YES to get a new list of properties."
   - Offer session marked as `expired`

---

## Database Migrations

### Run These Migrations in Order

1. **019_ghl_registrations.sql** - Creates registration and offer session tables
2. **020_add_ghl_custom_object_id.sql** - Adds GHL Custom Object ID column to open_house_events

**In Supabase Dashboard:**
1. Go to SQL Editor
2. Paste migration contents
3. Click **Run**

---

## Configuration Settings

### Environment Variables

Ensure these are set in your `.env`:

```bash
# GHL OAuth
GHL_CLIENT_ID=your-client-id
GHL_CLIENT_SECRET=your-client-secret

# App URL (for webhook callbacks)
NEXT_PUBLIC_APP_URL=https://www.realestategenie.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Agent Phone Number

Agent phone numbers are stored in the `agents` table (`phone_e164` column).

**Default fallback:** `808-555-1234` (if agent phone not set)

**To update:** Edit agent profile in Real Estate Genie dashboard

---

## Customization Options

### Change Flyer Expiration Window

Edit `/app/api/ghl/flyer-request/route.ts:12`:

```typescript
const FLYER_EXPIRATION_DAYS = 3; // Change to 5, 7, etc.
```

### Change Offer Token Expiration

Edit `/app/api/ghl/flyer-request/route.ts:169`:

```typescript
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Change 24 to 48 for 48 hours
```

### Customize SMS Messages

**Expired registration message:** `/app/api/ghl/flyer-request/route.ts:118`

**Single flyer message:** `/app/api/ghl/flyer-request/route.ts:141`

**Multi-choice list:** `/app/api/ghl/flyer-request/route.ts:214-225`

**Choice confirmation:** `/app/api/ghl/flyer-choice/route.ts:176`

---

## Troubleshooting

### Issue: Registration Custom Object Not Created

**Check:**
1. GHL integration is connected (check `integrations` table)
2. Access token is valid (not expired)
3. locationId is correct
4. Custom Object schema exists in GHL

**Solution:**
- Check logs: `console.log("Created Registration Custom Object in GHL:", ghlRegistrationId);`
- Verify in GHL: Settings → Custom Objects → Registration → Records

### Issue: Workflow Not Triggering

**Check:**
1. Workflow is published (not draft)
2. Trigger conditions match exactly
3. Registration Custom Object has `flyerStatus = "pending"`

**Solution:**
- Test workflow manually in GHL
- Check workflow execution logs

### Issue: SMS Not Sending

**Check:**
1. GHL API access token is valid
2. Contact has valid phone number
3. GHL location has SMS configured (Twilio/LC Phone)

**Solution:**
- Test with GHL API directly: `client.sendSMS({ contactId, message })`
- Check GHL conversation logs

### Issue: "All Registrations Expired" Even Though Recent

**Check:**
1. `registered_at` timestamp in database
2. Current server time vs registration time
3. FLYER_EXPIRATION_DAYS setting

**Solution:**
- Query database:
  ```sql
  SELECT id, registered_at,
         NOW() - registered_at as age
  FROM open_house_registrations
  WHERE ghl_contact_id = 'contact-id';
  ```

---

## Database Queries for Monitoring

### View All Registrations

```sql
SELECT
  r.id,
  r.ghl_contact_id,
  r.flyer_status,
  r.registered_at,
  r.flyer_sent_at,
  e.street_address,
  e.city,
  e.start_at,
  a.display_name as agent_name
FROM open_house_registrations r
JOIN open_house_events e ON r.event_id = e.id
JOIN agents a ON r.agent_id = a.id
ORDER BY r.registered_at DESC
LIMIT 50;
```

### View Active Offer Sessions

```sql
SELECT
  id,
  ghl_contact_id,
  offer_token,
  offer_count,
  offer_sent_at,
  expires_at,
  status,
  CASE
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN status = 'active' THEN 'ACTIVE'
    ELSE status
  END as current_status
FROM flyer_offer_sessions
WHERE status IN ('active', 'responded')
ORDER BY offer_sent_at DESC
LIMIT 20;
```

### View Registrations by Contact

```sql
SELECT
  r.id,
  r.flyer_status,
  r.registered_at,
  e.street_address,
  e.city,
  EXTRACT(DAY FROM NOW() - r.registered_at) as days_since_registration
FROM open_house_registrations r
JOIN open_house_events e ON r.event_id = e.id
WHERE r.ghl_contact_id = 'YOUR-CONTACT-ID-HERE'
ORDER BY r.registered_at DESC;
```

### Count Pending Registrations by Agent

```sql
SELECT
  a.display_name,
  COUNT(*) as pending_count
FROM open_house_registrations r
JOIN agents a ON r.agent_id = a.id
WHERE r.flyer_status = 'pending'
  AND r.registered_at > NOW() - INTERVAL '3 days'
GROUP BY a.display_name
ORDER BY pending_count DESC;
```

---

## Architecture Benefits

✅ **Scalable** - Unlimited open houses per contact, no field overwrites
✅ **Reliable** - Event-based architecture prevents data loss
✅ **Secure** - Token validation prevents stale/invalid replies
✅ **Auditable** - Full history of all registrations and offers
✅ **Flexible** - Easy to extend to other event types
✅ **Efficient** - Only sends SMS when needed, not on every workflow trigger

---

## Next Steps

1. ✅ Create OpenHouse and Registration Custom Objects in GHL
2. ✅ Set up Workflow A (Registration Intake)
3. ✅ Set up Workflow B (YES Reply Handler)
4. ✅ Set up Workflow C (Numeric Choice Handler)
5. ✅ Run database migrations
6. ✅ Test all scenarios (single, multiple, expired)
7. ✅ Monitor with database queries

---

## Support

**GHL API Documentation:**
- [Custom Objects API](https://marketplace.gohighlevel.com/docs/ghl/objects/custom-objects-api/)
- [Create Record API](https://marketplace.gohighlevel.com/docs/ghl/objects/create-object-record/)
- [Conversations API](https://marketplace.gohighlevel.com/docs/ghl/conversations/)

**Real Estate Genie Files:**
- GHL Client: `/src/lib/integrations/ghl-client.ts`
- GHL Sync: `/src/lib/integrations/ghl-sync.ts`
- Flyer Request API: `/app/api/ghl/flyer-request/route.ts`
- Flyer Choice API: `/app/api/ghl/flyer-choice/route.ts`
