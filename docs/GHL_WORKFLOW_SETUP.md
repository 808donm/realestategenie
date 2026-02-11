# GHL Workflow Setup for Open House Flyer Follow-up

## Overview

This guide shows you how to set up a GHL workflow that automatically sends emails and SMS messages to leads who register for your open houses, including handling multiple property visits.

---

## Step 1: Create Workflow in GHL

### 1.1 Create New Workflow

1. In GHL, go to **Automation** → **Workflows**
2. Click **Create Workflow**
3. Name it: **"Open House Flyer Follow-up"**

### 1.2 Set Trigger: Webhook

1. Click **Add Trigger**
2. Select **Webhook**
3. GHL will generate a unique webhook URL like:
   ```
   https://services.leadconnectorhq.com/hooks/abc123xyz/webhook-trigger/def456
   ```
4. **Copy this URL** - you'll need it for Step 2

---

## Step 2: Configure Custom Fields in GHL

Go to **Settings** → **Custom Fields** and create these:

| Field Name | Type | Key | Purpose |
|------------|------|-----|---------|
| Open House Event ID | Text | `open_house_event_id` | Unique ID for the event |
| Property Address | Text | `property_address` | Full property address |
| Property Flyer URL | Text | `property_flyer_url` | Direct link to PDF flyer |
| Event Start Time | Date/Time | `event_start_time` | When the open house starts |
| Attended Properties | Long Text | `attended_properties` | List of all properties visited |

---

## Step 3: Add Your GHL Webhook URL to Real Estate Genie

### 3.1 Add Environment Variable

In Vercel (or your `.env` file):

```bash
GHL_WEBHOOK_URL=https://services.leadconnectorhq.com/hooks/abc123xyz/webhook-trigger/def456
```

Replace with the URL from Step 1.2

### 3.2 Update Integration Config

The webhook URL can also be stored per-agent in their GHL integration config. We'll update the code to support this.

---

## Step 4: Build the GHL Workflow

### Action 1: Update Contact

**Action Type:** Update Contact

**Fields to Update:**
- Custom Field: `open_house_event_id` = `{{webhook.event_id}}`
- Custom Field: `property_address` = `{{webhook.property_address}}`
- Custom Field: `property_flyer_url` = `{{webhook.flyer_url}}`
- Custom Field: `event_start_time` = `{{webhook.event_start_time}}`
- Add Tag: `open-house-{{webhook.event_id}}`
- Add Tag: `{{webhook.property_address}}`

**Append to Custom Field:**
- `attended_properties` += `{{webhook.property_address}} ({{webhook.event_start_time}})\n`

### Action 2: Send Email with Flyer

**Action Type:** Send Email

**Trigger:** Immediately

**To:** `{{contact.email}}`

**Subject:** Thank you for registering for the open house at {{custom_values.property_address}}

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .header { background: #667eea; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .button { background: #667eea; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 5px; display: inline-block; }
        .footer { padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Thank You for Registering!</h1>
    </div>
    <div class="content">
        <p>Hi {{contact.first_name}},</p>

        <p>Thank you for registering for the open house at:</p>
        <p><strong>{{custom_values.property_address}}</strong></p>
        <p><strong>{{custom_values.event_start_time}}</strong></p>

        <p>We've prepared a detailed property flyer for you to review before your visit.</p>

        <p style="text-align: center; margin: 30px 0;">
            <a href="{{custom_values.property_flyer_url}}" class="button">
                Download Property Flyer
            </a>
        </p>

        <p>Looking forward to seeing you at the open house!</p>

        <p>Best regards,<br>
        {{user.name}}<br>
        {{user.phone}}<br>
        {{user.email}}</p>
    </div>
    <div class="footer">
        <p>If you have any questions, please don't hesitate to reach out.</p>
    </div>
</body>
</html>
```

### Action 3: Send Thank You SMS

**Action Type:** Send SMS

**Trigger:** Immediately

**To:** `{{contact.phone}}`

**Message:**
```
Hi {{contact.first_name}}! Thanks for registering for the open house at {{custom_values.property_address}}.

Would you like me to text you the property flyer link? Reply YES if interested.

- {{user.name}}
```

### Action 4: Wait for Reply

**Action Type:** Wait for Reply

**Wait For:** SMS Reply

**Timeout:** 7 days

**Continue If:** Reply contains (case-insensitive):
- `YES`
- `Y`
- `SURE`
- `OK`
- `PLEASE`

If timeout or "NO" → End workflow

### Action 5: Check for Multiple Properties

**Action Type:** Condition

**If:** `{{custom_values.attended_properties}}` contains newline (`\n`)

- **Yes** (Multiple properties) → Go to Action 6
- **No** (Single property) → Go to Action 7

### Action 6: Ask Which Property (Multiple Visits)

**Action Type:** Send SMS

**Message:**
```
Great! I see you've visited multiple properties:

{{custom_values.attended_properties}}

Which property flyer would you like? Reply with the address or number.
```

**Then:** Wait for Reply (30 days timeout)

**Then:** Extract address from reply and match to `attended_properties`

**Then:** Update `property_flyer_url` to the correct flyer URL

**Then:** Go to Action 7

### Action 7: Send Flyer Link

**Action Type:** Send SMS

**Message:**
```
Here's your property flyer for {{custom_values.property_address}}:

{{custom_values.property_flyer_url}}

Feel free to reach out with any questions. Looking forward to seeing you at the open house!

- {{user.name}}
```

### Action 8: Add Tag

**Action Type:** Add Tag

**Tag:** `flyer-sent`

---

## Step 5: Update Real Estate Genie Code

Now we need to modify the code to send data TO the GHL webhook instead of sending messages directly.

### Create New Service: `src/lib/integrations/ghl-webhook.ts`

```typescript
/**
 * Send data to GHL webhook to trigger workflows
 */

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export interface GHLWebhookPayload {
  event_id: string;
  property_address: string;
  flyer_url: string;
  event_start_time: string;
  contact_id?: string;

  // Lead data
  first_name: string;
  last_name: string;
  email: string;
  phone: string;

  // Additional context
  representation?: string;
  timeline?: string;
  financing?: string;
  neighborhoods?: string;
  must_haves?: string;
}

/**
 * Send open house registration to GHL webhook
 */
export async function sendToGHLWorkflow(
  agentId: string,
  payload: GHLWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get GHL integration to find webhook URL
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("config")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    if (!integration) {
      throw new Error("GHL integration not found");
    }

    const config = integration.config as any;
    const webhookUrl = config.workflow_webhook_url || process.env.GHL_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error("GHL webhook URL not configured");
    }

    // Send to GHL webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GHL webhook failed: ${error}`);
    }

    console.log("Successfully sent to GHL workflow webhook");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to send to GHL workflow:", error);
    return { success: false, error: error.message };
  }
}
```

### Update `src/lib/integrations/ghl-sync.ts`

Replace the flyer follow-up section with:

```typescript
import { sendToGHLWorkflow } from "./ghl-webhook";

// ... existing code ...

// After successfully syncing lead to GHL, trigger workflow
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.realestategenie.app";
const flyerUrl = `${baseUrl}/api/open-houses/${lead.event_id}/flyer`;

await sendToGHLWorkflow(lead.agent_id, {
  event_id: lead.event_id,
  property_address: propertyAddress,
  flyer_url: flyerUrl,
  event_start_time: event.start_at,
  contact_id: contactId,

  first_name: firstName,
  last_name: lastName,
  email: payload.email || "",
  phone: payload.phone_e164 || "",

  representation: payload.representation,
  timeline: payload.timeline,
  financing: payload.financing,
  neighborhoods: payload.neighborhoods,
  must_haves: payload.must_haves,
}).catch((err) => {
  console.error("Failed to trigger GHL workflow:", err);
  // Don't fail the sync
});
```

---

## Step 6: Store Webhook URL per Agent

Allow agents to configure their own GHL webhook URL in the integration settings.

### Update Integration Config Schema

When connecting GHL, allow storing the webhook URL:

```typescript
config: {
  access_token: "...",
  refresh_token: "...",
  location_id: "...",
  workflow_webhook_url: "https://services.leadconnectorhq.com/hooks/.../webhook-trigger/...",
}
```

---

## Step 7: Test the Complete Flow

### 7.1 Test Single Property Visit

1. Create an open house
2. Register as a test lead
3. Check email for flyer link
4. Check SMS for thank you message
5. Reply "YES"
6. Verify flyer link received via SMS

### 7.2 Test Multiple Property Visits

1. Create 3 open houses (same weekend)
2. Register for all 3 as same lead (same email/phone)
3. Reply "YES" to any of the follow-up messages
4. Verify you're asked which property
5. Reply with address or number
6. Verify correct flyer link received

### 7.3 Test Delayed Response

1. Register for open house
2. Wait 3 days
3. Reply "YES"
4. Verify flyer still sent correctly

---

## Handling Multiple Properties (Advanced)

### Option A: Use GHL Workflow Logic

In the workflow, use a **Condition** action to parse `attended_properties`:

```
If attended_properties contains "\n" (multiple lines):
  - Send list of properties
  - Wait for reply
  - Extract selection
  - Build correct flyer_url based on selection
  - Send that flyer
Else:
  - Send single flyer
```

### Option B: Use Custom Field for Each Property

Create indexed custom fields:
- `property_1_address`
- `property_1_flyer_url`
- `property_1_event_id`
- `property_2_address`
- `property_2_flyer_url`
- `property_2_event_id`
- etc.

Then in workflow, check which fields are populated and build the list.

---

## Webhook Payload Reference

When Real Estate Genie sends data to GHL webhook:

```json
{
  "event_id": "uuid-123",
  "property_address": "123 Main Street, Honolulu, HI 96815",
  "flyer_url": "https://www.realestategenie.app/api/open-houses/uuid-123/flyer",
  "event_start_time": "2025-01-20T14:00:00Z",
  "contact_id": "ghl-contact-id",

  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+18085551234",

  "representation": "yes",
  "timeline": "3-6 months",
  "financing": "pre-approved",
  "neighborhoods": "Downtown, Waikiki",
  "must_haves": "2+ bedrooms, parking"
}
```

---

## Benefits of This Approach

✅ **Visual workflow builder** - Easy to customize without code
✅ **GHL handles conversation state** - No custom database needed
✅ **Native SMS threading** - All messages in one GHL conversation
✅ **Easy A/B testing** - Clone workflow and test variations
✅ **Built-in analytics** - GHL tracks workflow performance
✅ **No webhook receiver needed** - GHL manages everything

---

## Need Help?

- **GHL Workflows Documentation:** https://help.gohighlevel.com/support/solutions/folders/155000000898
- **GHL Webhook Triggers:** https://help.gohighlevel.com/support/solutions/articles/155000001022
