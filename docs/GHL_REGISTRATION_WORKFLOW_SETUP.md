# GHL Registration-Based Workflow Setup

## Architecture Overview

This system models open house attendance as **registration events** instead of contact-level state. This enables:

✅ **Multiple property visits** - Contact can attend many open houses
✅ **Delayed responses** - System knows which flyer to send days/weeks later
✅ **No data overwrites** - Each registration is independent
✅ **Token-based validation** - Prevents stale/invalid replies

---

## How It Works

### 1. Lead Checks In

```
Lead scans QR code at open house
    ↓
Lead submits form with contact info
    ↓
Real Estate Genie creates/updates contact in GHL
    ↓
Adds tag: "open-house-{eventId}"
    ↓
Creates Registration record (agent_id, event_id, contact_id, status=pending)
    ↓
GHL Workflow A triggers on tag
```

### 2. Contact Replies YES

```
Contact replies "YES" to initial SMS
    ↓
GHL Workflow B triggers on "YES" reply
    ↓
Calls /api/ghl/flyer-request
    ↓
API queries all registrations where flyer_status = 'pending'
    ↓
Decision:
  - 1 pending? → Send flyer URL directly
  - 2+ pending? → Generate offer token, send numbered list
```

### 3. Contact Chooses Property (If Multiple)

```
Contact replies with number (1, 2, 3, etc.)
    ↓
GHL Workflow C triggers on numeric reply
    ↓
Calls /api/ghl/flyer-choice
    ↓
API validates offer token (not expired)
    ↓
Resolves registration at selected position
    ↓
Returns flyer URL for that property
    ↓
Marks registration as 'sent'
```

---

## Data Model

### Registration Record

```typescript
{
  id: uuid,
  agent_id: uuid,
  event_id: uuid,
  lead_id: uuid,
  ghl_contact_id: string,

  // Status progression: pending → offered → sent (or declined)
  flyer_status: "pending" | "offered" | "sent" | "declined",

  // Timestamps
  registered_at: timestamp,
  flyer_offered_at: timestamp,
  flyer_sent_at: timestamp,

  // Multi-choice tracking
  last_offer_token: string,
  offer_token_expires_at: timestamp,
  offer_position: integer, // 1, 2, 3, etc.
}
```

### Offer Session (For Multi-Property)

```typescript
{
  id: uuid,
  ghl_contact_id: string,
  offer_token: string (unique),
  registration_ids: uuid[], // Ordered array
  offer_count: integer,
  expires_at: timestamp, // 24 hours from creation
  status: "active" | "responded" | "expired" | "invalid",

  // Response tracking
  responded_at: timestamp,
  selected_position: integer,
  selected_registration_id: uuid,
}
```

---

## GHL Workflow Setup

### Workflow A: Registration Intake

**Trigger:** Tag Added
**Tag Filter:** Starts with `open-house-`

**Actions:**

1. **Wait:** 2 minutes (let them finish checking in)

2. **Send Email:**
   - To: `{{contact.email}}`
   - Subject: `Thank you for registering for {{custom_fields.property_address}}`
   - Body: Use the email template from `GHL_TAG_TRIGGER_SETUP.md`
   - Includes property details and flyer download link

3. **Wait:** 1 minute (give them time to receive email)

4. **Send SMS:**
   - To: `{{contact.phone}}`
   - Message:
     ```
     Hi {{contact.first_name}}! Thanks for registering for the open house at {{custom_fields.property_address}}.

     Check your email for the property flyer, or reply YES to get the link via text.

     - {{user.name}}
     ```

**End of Workflow A**

---

### Workflow B: Customer Replies YES

**Trigger:** Inbound Message
**Conditions:**
- Message contains: `YES`, `Y`, `SURE`, `OK`, `PLEASE`, `SEND`
- Case insensitive

**Actions:**

1. **Send Webhook:**
   - URL: `https://www.realestategenie.app/api/ghl/flyer-request`
   - Method: POST
   - Body:
     ```json
     {
       "contactId": "{{contact.id}}",
       "agentId": "{{user.id}}"
     }
     ```

2. **Wait for Response:** (GHL waits for webhook response)

3. **Condition:**
   - If `{{webhook.response.action}}` = `"send_single"`
     - Go to Action 4
   - If `{{webhook.response.action}}` = `"send_choices"`
     - Go to Action 5
   - If `{{webhook.response.action}}` = `"none"`
     - End workflow

4. **Send SMS (Single Flyer):**
   - Message: `{{webhook.response.message}}`
   - End workflow

5. **Send SMS (Multiple Choice):**
   - Message: `{{webhook.response.message}}`
   - Continue to Workflow C

**End of Workflow B**

---

### Workflow C: Customer Replies with Choice

**Trigger:** Inbound Message
**Conditions:**
- Message is numeric: `1`, `2`, `3`, etc.
- Contact has been through Workflow B in last 24 hours

**Actions:**

1. **Send Webhook:**
   - URL: `https://www.realestategenie.app/api/ghl/flyer-choice`
   - Method: POST
   - Body:
     ```json
     {
       "contactId": "{{contact.id}}",
       "choice": "{{message.body}}"
     }
     ```

2. **Wait for Response:**

3. **Condition:**
   - If `{{webhook.response.action}}` = `"send_flyer"`
     - Go to Action 4
   - If `{{webhook.response.action}}` = `"expired"`
     - Go to Action 5
   - If `{{webhook.response.action}}` = `"out_of_range"`
     - Go to Action 6
   - If `{{webhook.response.action}}` = `"no_active_offer"`
     - Go to Action 7

4. **Send SMS (Valid Choice):**
   - Message: `{{webhook.response.message}}`
   - Add Tag: `flyer-sent`
   - End workflow

5. **Send SMS (Expired):**
   - Message: `{{webhook.response.message}}`
   - End workflow

6. **Send SMS (Invalid Number):**
   - Message: `{{webhook.response.message}}`
   - End workflow

7. **Send SMS (No Active Offer):**
   - Message: `{{webhook.response.message}}`
   - End workflow

**End of Workflow C**

---

## API Endpoints Reference

### POST /api/ghl/flyer-request

**Purpose:** Handle YES replies, decide single vs multiple flyer offer

**Request:**
```json
{
  "contactId": "ghl-contact-id",
  "agentId": "agent-uuid" (optional)
}
```

**Response (Single Property):**
```json
{
  "action": "send_single",
  "flyerUrl": "https://www.realestategenie.app/api/open-houses/{eventId}/flyer",
  "propertyAddress": "123 Main St, City, ST",
  "message": "Here's your property flyer for 123 Main St..."
}
```

**Response (Multiple Properties):**
```json
{
  "action": "send_choices",
  "offerToken": "abc123...",
  "propertyCount": 3,
  "expiresAt": "2025-12-23T12:00:00Z",
  "message": "Great! I see you're registered for multiple open houses:\n\n1. 123 Main St (3bd, 2ba)\n2. 456 Oak Ave (4bd, 3ba)\n3. 789 Pine Rd (2bd, 1ba)\n\nReply with the number (1-3) to get that property's flyer."
}
```

**Response (No Pending):**
```json
{
  "action": "none",
  "message": "No pending open house registrations found."
}
```

---

### POST /api/ghl/flyer-choice

**Purpose:** Handle numeric replies for multi-property offers

**Request:**
```json
{
  "contactId": "ghl-contact-id",
  "choice": "2"
}
```

**Response (Valid):**
```json
{
  "action": "send_flyer",
  "flyerUrl": "https://www.realestategenie.app/api/open-houses/{eventId}/flyer",
  "propertyAddress": "456 Oak Ave, City, ST",
  "selectedPosition": 2,
  "message": "Here's your property flyer for 456 Oak Ave..."
}
```

**Response (Expired):**
```json
{
  "action": "expired",
  "message": "Sorry, this offer has expired. Please reply YES to get a new list of properties."
}
```

**Response (Out of Range):**
```json
{
  "action": "out_of_range",
  "message": "Please choose a number between 1 and 3."
}
```

**Response (No Active Offer):**
```json
{
  "action": "no_active_offer",
  "message": "Sorry, I don't have any active property offers for you. Please reply YES to request a flyer."
}
```

---

## Custom Fields Required in GHL

Create these custom fields in **Settings → Custom Fields:**

| Field Name | Type | Key | Usage |
|------------|------|-----|-------|
| Property Address | Text | `property_address` | Full property address |
| Property Flyer URL | Text | `property_flyer_url` | Direct PDF link |
| Event Start Time | Text | `event_start_time` | Formatted date/time |
| Open House Event ID | Text | `open_house_event_id` | Unique event ID |
| Beds | Number | `beds` | Bedrooms |
| Baths | Number | `baths` | Bathrooms |
| Sq Ft | Number | `sqft` | Square footage |
| Price | Number | `price` | List price |
| Heat Score | Number | `heat_score` | Lead quality (0-100) |

These are set when the contact is created/updated during check-in.

---

## Testing the Complete Flow

### Test 1: Single Property Visit

1. Create an open house
2. Register as a test lead (new contact)
3. **Verify:**
   - Email received with flyer link
   - SMS received asking if they want flyer
4. Reply "YES"
5. **Verify:**
   - Flyer URL sent directly via SMS
   - No numbered list (only one property)

### Test 2: Multiple Property Visits

1. Create 3 open houses (same weekend)
2. Register for all 3 as same contact (same email/phone)
3. **Verify:**
   - 3 separate emails (one per property)
   - 3 registration records created in database
4. Reply "YES" to any SMS
5. **Verify:**
   - Numbered list sent with all 3 properties
   - Offer token generated with 24-hour expiration
6. Reply "2"
7. **Verify:**
   - Flyer URL for property #2 sent
   - Registration #2 marked as 'sent'
   - Offer session marked as 'responded'

### Test 3: Delayed Response

1. Register for 2 open houses
2. Wait 3 days
3. Reply "YES"
4. **Verify:**
   - Numbered list still sent correctly
   - Offer token generated fresh
5. Reply "1"
6. **Verify:**
   - Correct flyer sent

### Test 4: Expired Token

1. Register for 2 open houses
2. Reply "YES" (gets offer token)
3. Wait 25+ hours (token expires in 24 hours)
4. Reply "1"
5. **Verify:**
   - Error message: "Sorry, this offer has expired. Please reply YES to get a new list."
6. Reply "YES" again
7. **Verify:**
   - New offer token generated
   - Fresh numbered list sent

### Test 5: Invalid Choice

1. Register for 2 open houses
2. Reply "YES"
3. Reply "5" (out of range)
4. **Verify:**
   - Error message: "Please choose a number between 1 and 2."

---

## Database Queries for Monitoring

### View All Registrations for a Contact

```sql
SELECT
  r.id,
  r.flyer_status,
  r.registered_at,
  r.flyer_sent_at,
  e.street_address,
  e.city,
  e.start_at
FROM open_house_registrations r
JOIN open_house_events e ON r.event_id = e.id
WHERE r.ghl_contact_id = 'contact-id-here'
ORDER BY r.registered_at DESC;
```

### View Active Offer Sessions

```sql
SELECT
  id,
  ghl_contact_id,
  offer_token,
  offer_count,
  expires_at,
  status
FROM flyer_offer_sessions
WHERE status = 'active'
  AND expires_at > NOW()
ORDER BY offer_sent_at DESC;
```

### View All Pending Flyers for an Agent

```sql
SELECT
  r.ghl_contact_id,
  COUNT(*) as pending_count
FROM open_house_registrations r
WHERE r.agent_id = 'agent-uuid'
  AND r.flyer_status = 'pending'
GROUP BY r.ghl_contact_id
ORDER BY pending_count DESC;
```

---

## Benefits of This Architecture

### ✅ Scalability
- Handle unlimited open houses per contact
- No contact field overwrites
- Clean separation of concerns

### ✅ Reliability
- Token-based validation prevents stale replies
- Expiration system (24 hours) keeps data fresh
- Registration events are immutable

### ✅ Simplicity
- Visual workflow builder in GHL
- Clear decision logic
- Easy to debug

### ✅ Tracking
- Full history per contact
- Audit trail of all interactions
- Analytics on flyer delivery

### ✅ Future-Proof
- Easy to add new registration types
- Can extend to other event types (seminars, buyer tours, etc.)
- API-driven architecture

---

## Common Issues & Solutions

### Issue: "No pending registrations found"

**Cause:** Registration record wasn't created during check-in

**Solution:**
1. Check if `syncLeadToGHL()` was called
2. Verify registration creation in logs
3. Query database: `SELECT * FROM open_house_registrations WHERE ghl_contact_id = 'contact-id'`

### Issue: "Offer has expired"

**Cause:** Token expires after 24 hours

**Solution:**
- This is expected behavior
- Contact should reply "YES" again to get a fresh offer
- Adjust expiration in `/app/api/ghl/flyer-request/route.ts` line 117 if needed

### Issue: Workflow doesn't trigger

**Cause:** Tag not added to contact

**Solution:**
1. Check GHL contact has tag: `open-house-{eventId}`
2. Verify workflow trigger is set to "Tag Added" with filter "Starts with: open-house-"
3. Check workflow is published and active

---

## Next Steps

1. **Run database migration:** `019_ghl_registrations.sql`
2. **Set up custom fields** in GHL (see table above)
3. **Create Workflow A** (Registration Intake)
4. **Create Workflow B** (YES Reply Handler)
5. **Create Workflow C** (Numeric Choice Handler)
6. **Test all scenarios** (see Testing section)
7. **Monitor with database queries** (see Monitoring section)

---

## Architecture Quote

> "Model registrations as events, not contact state. Contacts are shared. Open houses are repeatable. Registrations are many-to-many."

> "If you model this as 'last open house' on the contact, it will fail. If you model it as registrations + reply routing, it will scale cleanly."

This architecture ensures your system can handle any number of properties per contact without data loss or ambiguity.
