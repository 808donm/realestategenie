# GHL Flyer Follow-up Automation Guide

## 🎯 You Have TWO Options

We've already built an **automated webhook-based system** for you (Option 1), but you can also use **GHL's native workflow builder** (Option 2) if you prefer.

---

## ✅ OPTION 1: Automated System (Already Built!)

**This is already implemented and working!** When a lead checks in to an open house:

### What Happens Automatically:
1. ✅ Lead syncs to GHL as a contact
2. ✅ SMS sent: "Hi [Name]! Thanks for visiting [Address]. Would you like the property flyer? Reply YES if interested."
3. ✅ When they reply "YES":
   - If they attended **one** open house → Flyer link sent immediately
   - If they attended **multiple** open houses → System asks which one they want
4. ✅ All tracked in database with full audit trail

### How It Works:
- Uses **GHL custom fields** to store the open house ID
- **Webhook** receives their replies and processes them
- **Smart logic** handles multiple property attendance
- Works even if they reply **days or weeks later**

### Setup Required:
**Only need to configure the GHL webhook once:**

1. **In GHL:** Settings → Integrations → Webhooks
2. **Add Webhook:**
   - URL: `https://www.realestategenie.app/api/webhooks/ghl/message-response`
   - Event: ✅ `InboundMessage`
   - Status: Active
3. **Save** - That's it!

### Custom Fields in GHL:
When leads sync, these custom fields are automatically populated:
- `representation` - Buyer representation status
- `wants_reach_out` - If they want agent to reach out
- `neighborhoods` - Neighborhoods they're interested in
- `must_haves` - Property must-haves

### How Multiple Open Houses Are Handled:
The system uses the `contact_open_house_attendance` table to track every property a contact visits:

**Example:**
```
Contact ID: abc123
- Attended: 123 Main St (Jan 15)
- Attended: 456 Oak Ave (Jan 18)
- Attended: 789 Pine Rd (Jan 20)
```

When they reply "YES" on Jan 25:
1. System queries attendance table
2. Finds 3 properties
3. Sends: "Which flyer? Reply 1, 2, or 3"
4. They reply: "2"
5. System sends flyer for 456 Oak Ave

### Database Tables:
```sql
-- Tracks each follow-up conversation
open_house_flyer_followups
  - lead_id (which lead)
  - event_id (which open house)
  - ghl_contact_id (GHL contact)
  - status (sent → responded_yes → flyer_sent)
  - selected_event_id (if multiple properties)

-- Tracks property visits
contact_open_house_attendance
  - ghl_contact_id (who)
  - event_id (which property)
  - attended_at (when)
```

---

## 🔧 OPTION 2: GHL Native Workflow (Manual Setup)

If you prefer to use GHL's workflow builder instead:

### Step 1: Create Custom Fields in GHL

Go to **Settings → Custom Fields** and create:

| Field Name | Field Type | API Key |
|------------|------------|---------|
| Open House ID | Text | `open_house_id` |
| Open House Address | Text | `open_house_address` |
| Property Flyer URL | Text | `property_flyer_url` |
| Attended Properties | Text Area | `attended_properties` |

### Step 2: Update Lead Sync Code

You would need to modify `/src/lib/integrations/ghl-sync.ts` to include:

```typescript
customFields: {
  representation: payload.representation || "",
  wants_reach_out: payload.wants_agent_reach_out ? "Yes" : "No",
  neighborhoods: payload.neighborhoods || "",
  must_haves: payload.must_haves || "",

  // Add these new fields:
  open_house_id: lead.event_id,
  open_house_address: propertyAddress,
  property_flyer_url: `https://www.realestategenie.app/api/open-houses/${lead.event_id}/flyer`,

  // Track multiple properties (append to existing)
  attended_properties: `${propertyAddress} (${lead.event_id})\n`,
}
```

### Step 3: Create GHL Workflow

**Workflow Name:** "Open House Flyer Follow-up"

**Trigger:** Contact Created or Updated with tag "open-house"

**Actions:**

1. **Send Email** (Immediate)
   - Subject: "Thank you for visiting {{custom_fields.open_house_address}}"
   - Body:
   ```html
   Hi {{first_name}},

   Thanks for visiting the open house at {{custom_fields.open_house_address}}!

   Here's the property flyer:
   {{custom_fields.property_flyer_url}}

   Feel free to reach out with any questions.

   Best regards,
   {{user.name}}
   ```

2. **Send SMS** (Immediate)
   ```
   Hi {{first_name}}! Thanks for visiting {{custom_fields.open_house_address}}.
   Would you like the property flyer? Reply YES if interested. - {{user.name}}
   ```

3. **Wait for Reply** (Condition)
   - If reply contains "YES" or "Y" or "SURE" → Go to Step 4
   - If reply contains "NO" → End workflow

4. **Check Multiple Properties** (Condition)
   - If `attended_properties` has multiple lines → Go to Step 5
   - Else → Go to Step 6

5. **Ask Which Property** (Send SMS)
   ```
   You've visited multiple properties! Which flyer would you like?

   {{custom_fields.attended_properties}}

   Reply with the property number
   ```
   - **Wait for reply** → Extract number → Store in custom field

6. **Send Flyer Link** (Send SMS)
   ```
   Here's your property flyer: {{custom_fields.property_flyer_url}}

   Feel free to reach out with any questions!
   ```

### Step 4: Test the Workflow

1. Create a test open house
2. Check in as a test lead
3. Verify email received
4. Verify SMS received
5. Reply "YES"
6. Verify flyer link received

---

## 🔍 Comparison: Which Option Should You Use?

| Feature | Option 1 (Webhook) | Option 2 (GHL Workflow) |
|---------|-------------------|------------------------|
| **Setup Time** | 2 minutes | 30-60 minutes |
| **Maintenance** | Zero - fully automated | Manual workflow updates |
| **Multiple Properties** | ✅ Automatic | 🟡 Complex conditions needed |
| **Delayed Responses** | ✅ Works perfectly | ✅ Works perfectly |
| **Tracking** | ✅ Full database audit | 🟡 GHL logs only |
| **Customization** | Code changes needed | Easy via GHL UI |
| **Testing** | Via webhook logs | Via GHL workflow tester |

---

## 📊 Monitoring Active System

### Check Follow-up Status:
```sql
-- See all pending follow-ups
SELECT * FROM open_house_flyer_followups
WHERE status IN ('sent', 'needs_clarification')
ORDER BY created_at DESC;

-- Contacts with multiple property visits
SELECT ghl_contact_id, COUNT(*) as visit_count
FROM contact_open_house_attendance
GROUP BY ghl_contact_id
HAVING COUNT(*) > 1;
```

### View in GHL:
1. Go to **Contacts**
2. Find the contact
3. View **Conversation** tab
4. See all SMS exchanges

---

## 🚀 Recommended Approach

**Use Option 1 (Automated Webhook System)** because:
- ✅ Already built and tested
- ✅ Handles complexity automatically
- ✅ Zero maintenance
- ✅ Full audit trail
- ✅ Just needs 2-minute webhook setup

**Use Option 2 (GHL Workflow)** only if:
- You want to customize messages frequently
- You prefer visual workflow builder
- You have GHL workflow expertise
- You don't mind manual updates

---

## 📞 Need Help?

Refer to `docs/FLYER_FOLLOWUP_SETUP.md` for detailed technical documentation.
