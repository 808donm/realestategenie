# Open House Flyer Follow-up System

## Overview

This system automatically sends open house flyers to leads via GHL (GoHighLevel) after they check in to an open house. It intelligently handles scenarios where a contact has attended multiple open houses.

## How It Works

### 1. Lead Checks In
When someone scans the QR code and checks in to an open house:
- Their information is saved to `lead_submissions`
- They are automatically synced to GHL as a contact
- An automated thank you message is sent asking if they want the property flyer

### 2. Initial Follow-Up Message
**Sent via SMS through GHL:**
```
Hi [FirstName]! Thanks for visiting the open house at [Address].
Would you like me to send you the property flyer? Reply YES if interested.
- [Agent Name]
```

### 3. Contact Responds
When the contact replies:

#### Scenario A: They Attended Only One Open House
- System immediately sends the flyer link
- Message: "Here's the property flyer for [Address]: [Link]"

#### Scenario B: They Attended Multiple Open Houses
- System asks which property they want the flyer for
- Message:
```
You've visited multiple properties! Which flyer would you like?

1. 123 Main St (01/15/2024)
2. 456 Oak Ave (01/18/2024)
3. 789 Pine Rd (01/20/2024)

Reply with the number (1-3)
```

### 4. Flyer Delivery
- Contact receives a link to download the PDF flyer
- All interactions are tracked in the database
- Agent can see the complete conversation history in GHL

## Database Schema

### `open_house_flyer_followups`
Tracks each follow-up interaction:
- `status`: pending → sent → responded_yes → flyer_sent (or needs_clarification)
- `thank_you_sent_at`: When initial message was sent
- `response_received_at`: When contact responded
- `flyer_sent_at`: When flyer was delivered
- `selected_event_id`: Which property they requested (if multiple)

### `contact_open_house_attendance`
Tracks which open houses each contact has attended:
- Unique constraint on `(ghl_contact_id, event_id)`
- Used to determine if contact attended multiple properties

## API Endpoints

### 1. Send Follow-Up (Manual or Automatic)
**POST** `/api/open-houses/send-flyer-followup`

```json
{
  "leadId": "uuid"
}
```

This is automatically called after GHL sync, but can also be manually triggered.

### 2. Webhook Handler
**POST** `/api/webhooks/ghl/message-response`

Receives inbound message notifications from GHL.

**GHL Webhook Payload:**
```json
{
  "type": "InboundMessage",
  "locationId": "...",
  "contactId": "...",
  "body": "YES",
  "direction": "inbound",
  ...
}
```

## GHL Setup Instructions

### Step 1: Enable Webhooks in GHL

1. Log in to your GHL account
2. Go to **Settings** → **Integrations** → **Webhooks**
3. Click **Add Webhook**
4. Configure:
   - **Webhook URL**: `https://yourdomain.com/api/webhooks/ghl/message-response`
   - **Events to Subscribe**:
     - ✅ `InboundMessage`
   - **Status**: Active

### Step 2: Test the Webhook

1. Send a test message from GHL to a contact
2. Have the contact reply
3. Check the webhook logs in GHL to confirm delivery
4. Check your server logs for processing confirmation

### Step 3: Verify Integration

1. Create a test open house
2. Check in as a lead using the QR code
3. Verify you receive the thank you message
4. Reply "YES"
5. Verify you receive the flyer link

## Message Flow Diagram

```
┌─────────────┐
│ Lead Checks │
│    In       │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Sync to GHL    │
│ (create contact)│
└──────┬──────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Send Thank You + Ask for Flyer  │
│ "Reply YES if interested"       │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────┐
│ Contact Replies │
│     "YES"       │
└──────┬──────────┘
       │
       ▼
┌────────────────────────────┐
│ Check # of Open Houses     │
│ They've Attended           │
└──────┬───────────────┬─────┘
       │               │
  One  │               │  Multiple
       ▼               ▼
┌─────────────┐  ┌──────────────────┐
│ Send Flyer  │  │ Ask Which One?   │
│    Link     │  │ "Reply 1, 2, 3"  │
└─────────────┘  └────────┬─────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Contact Replies │
                 │      "2"        │
                 └────────┬────────┘
                          │
                          ▼
                  ┌─────────────┐
                  │ Send Flyer  │
                  │    Link     │
                  └─────────────┘
```

## Response Detection

The system recognizes these as "YES":
- YES, YEA, YA, Y
- SURE, OK, OKAY
- PLEASE

The system recognizes these as "NO":
- NO, NAH, N
- NOT INTERESTED

For clarification (which property), it looks for numbers: 1, 2, 3, etc.

## Error Handling

### Failed Message Send
- Status set to `error`
- `last_error` field populated
- `error_count` incremented
- Can be retried manually via API

### Invalid Response
- If response is ambiguous, status stays at `sent`
- Follow-up can be sent again manually

### Multiple Response Handling
- System uses latest pending follow-up
- Older follow-ups are ignored once status changes

## Monitoring & Analytics

### Database Queries

**See all pending follow-ups:**
```sql
SELECT * FROM open_house_flyer_followups
WHERE status IN ('sent', 'needs_clarification')
ORDER BY created_at DESC;
```

**Count flyers sent today:**
```sql
SELECT COUNT(*) FROM open_house_flyer_followups
WHERE status = 'flyer_sent'
AND flyer_sent_at >= CURRENT_DATE;
```

**Contacts who attended multiple properties:**
```sql
SELECT ghl_contact_id, COUNT(*) as visit_count
FROM contact_open_house_attendance
GROUP BY ghl_contact_id
HAVING COUNT(*) > 1;
```

**Response rate:**
```sql
SELECT
  COUNT(*) FILTER (WHERE status IN ('responded_yes', 'flyer_sent', 'needs_clarification')) as responded,
  COUNT(*) FILTER (WHERE status = 'responded_no') as declined,
  COUNT(*) FILTER (WHERE status = 'sent') as no_response,
  COUNT(*) as total
FROM open_house_flyer_followups
WHERE thank_you_sent_at >= NOW() - INTERVAL '7 days';
```

## Troubleshooting

### Follow-up not sending
1. Check GHL integration is connected
2. Verify contact has `ghl_contact_id` in `lead_submissions`
3. Check `open_house_flyer_followups` table for error messages
4. Verify GHL API credentials are valid

### Webhook not receiving responses
1. Check webhook URL is correct in GHL
2. Verify webhook is active
3. Check GHL webhook logs for delivery attempts
4. Test with manual message in GHL

### Contact not receiving flyer
1. Check `open_house_flyer_followups` status
2. Verify `flyer_sent_at` is populated
3. Check audit log for flyer delivery
4. Test flyer link manually: `/api/open-houses/[eventId]/flyer`

## Future Enhancements

- [ ] Email follow-ups in addition to SMS
- [ ] Configurable message templates per agent
- [ ] Delay option (send follow-up X hours after check-in)
- [ ] A/B testing different message variants
- [ ] Analytics dashboard for agent
- [ ] Automatic retry on failed sends
- [ ] Drip campaigns for non-responders

## Security Considerations

- Webhook endpoint validates GHL signature (future enhancement)
- All database operations use RLS policies
- Flyer links are publicly accessible (intended behavior)
- No sensitive data exposed in flyer URLs
- Rate limiting on webhook endpoint (future enhancement)
