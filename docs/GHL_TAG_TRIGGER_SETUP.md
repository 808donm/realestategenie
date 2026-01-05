# GHL Tag-Based Workflow Setup (Recommended)

## Why This Approach?

✅ **No webhooks needed** - Uses GHL's built-in triggers
✅ **Lower cost** - No external API calls
✅ **More efficient** - Direct contact updates
✅ **Simpler** - Fewer moving parts
✅ **Better tracking** - Everything in GHL contacts

---

## How It Works

```
Lead Checks In
    ↓
Create/Update Contact in GHL
    ↓
Add Tag: "open-house-{eventId}"
    ↓
Set Custom Fields (flyer_url, property_address, etc.)
    ↓
GHL Workflow Triggers on "Tag Added"
    ↓
Send Email + SMS Automatically
```

---

## Step 1: Create Custom Fields in GHL

Go to **Settings** → **Custom Fields** and create:

| Field Name | Type | Key | Purpose |
|------------|------|-----|---------|
| Property Address | Text | `property_address` | Full address |
| Property Flyer URL | Text | `property_flyer_url` | Direct PDF link |
| Event Start Time | Text | `event_start_time` | Formatted date/time |
| Open House Event ID | Text | `open_house_event_id` | Unique ID |
| Beds | Number | `beds` | # of bedrooms |
| Baths | Number | `baths` | # of bathrooms |
| Sq Ft | Number | `sqft` | Square footage |
| Price | Number | `price` | List price |
| Heat Score | Number | `heat_score` | Lead quality (0-100) |
| Representation | Text | `representation` | Buyer representation |
| Timeline | Text | `timeline` | Purchase timeline |
| Financing | Text | `financing` | Financing status |
| Neighborhoods | Text | `neighborhoods` | Areas of interest |
| Must Haves | Text | `must_haves` | Requirements |

---

## Step 2: Create Email Template in GHL

Go to **Marketing** → **Email Templates** → **Create Template**

**Template Name:** `Open House Flyer Email`

**Subject:** `Thank you for registering for {{custom_fields.property_address}}`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .content {
            padding: 30px 20px;
            background: #ffffff;
        }
        .property-details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .property-details h2 {
            margin-top: 0;
            color: #667eea;
        }
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 15px;
        }
        .detail-item {
            padding: 8px;
            background: white;
            border-radius: 4px;
        }
        .detail-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
        }
        .detail-value {
            font-size: 16px;
            font-weight: bold;
            color: #333;
        }
        .button {
            background: #667eea;
            color: white !important;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
            margin: 20px 0;
            font-weight: bold;
            font-size: 16px;
        }
        .button:hover {
            background: #5568d3;
        }
        .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            background: #f8f9fa;
            border-radius: 0 0 8px 8px;
        }
        .cta-section {
            text-align: center;
            margin: 30px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏡 Thank You for Registering!</h1>
    </div>

    <div class="content">
        <p>Hi {{contact.first_name}},</p>

        <p>Thank you for registering for our open house! We're excited to show you this beautiful property.</p>

        <div class="property-details">
            <h2>{{custom_fields.property_address}}</h2>

            <div class="details-grid">
                {{#if custom_fields.beds}}
                <div class="detail-item">
                    <div class="detail-label">Bedrooms</div>
                    <div class="detail-value">{{custom_fields.beds}}</div>
                </div>
                {{/if}}

                {{#if custom_fields.baths}}
                <div class="detail-item">
                    <div class="detail-label">Bathrooms</div>
                    <div class="detail-value">{{custom_fields.baths}}</div>
                </div>
                {{/if}}

                {{#if custom_fields.sqft}}
                <div class="detail-item">
                    <div class="detail-label">Square Feet</div>
                    <div class="detail-value">{{custom_fields.sqft}}</div>
                </div>
                {{/if}}

                {{#if custom_fields.price}}
                <div class="detail-item">
                    <div class="detail-label">List Price</div>
                    <div class="detail-value">${{custom_fields.price}}</div>
                </div>
                {{/if}}
            </div>

            <p style="margin-top: 15px;">
                <strong>📅 Open House:</strong> {{custom_fields.event_start_time}}
            </p>
        </div>

        <div class="cta-section">
            <p style="font-size: 16px; margin-bottom: 15px;">
                Download the detailed property flyer to review before your visit:
            </p>
            <a href="{{custom_fields.property_flyer_url}}" class="button">
                📄 Download Property Flyer
            </a>
        </div>

        <p>We've prepared detailed information about the property, neighborhood, and local amenities for you to review.</p>

        <p><strong>What to expect at the open house:</strong></p>
        <ul>
            <li>Complete property tour</li>
            <li>Neighborhood information</li>
            <li>Answer all your questions</li>
            <li>Discuss financing options</li>
        </ul>

        <p>If you have any questions before the open house, please don't hesitate to reach out!</p>

        <p>Looking forward to seeing you there!</p>

        <p>Best regards,<br>
        {{user.name}}<br>
        {{#if user.phone}}{{user.phone}}<br>{{/if}}
        {{user.email}}
        {{#if custom_fields.agent_license}}<br>License #: {{custom_fields.agent_license}}{{/if}}
        </p>
    </div>

    <div class="footer">
        <p>You're receiving this because you registered for an open house.</p>
        <p>If you have questions, reply to this email or call {{user.phone}}</p>
    </div>
</body>
</html>
```

---

## Step 3: Create GHL Workflow

Go to **Automation** → **Workflows** → **Create Workflow**

**Workflow Name:** `Open House Registration Follow-up`

### Trigger: Tag Added

1. Click **Add Trigger**
2. Select **Tag Added**
3. **Tag Filter:** Starts with `open-house-`
4. This will trigger whenever a contact gets tagged with any open house tag

### Action 1: Send Email with Flyer

**Action Type:** Send Email

**Trigger:** Immediately (no delay)

**Template:** Select `Open House Flyer Email` (created in Step 2)

**To:** `{{contact.email}}`

**From:** Your verified email

**Notes:**
- All property data will auto-populate from custom fields
- Flyer link is in `{{custom_fields.property_flyer_url}}`

### Action 2: Wait (Optional)

**Action Type:** Wait

**Duration:** 2 minutes

**Purpose:** Give them time to receive the email before SMS

### Action 3: Send Thank You SMS

**Action Type:** Send SMS

**To:** `{{contact.phone}}`

**Message:**
```
Hi {{contact.first_name}}! Thanks for registering for the open house at {{custom_fields.property_address}} on {{custom_fields.event_start_time}}.

Check your email for the property flyer, or reply YES to get the link via text.

- {{user.name}}
```

### Action 4: Wait for Reply

**Action Type:** Wait for Reply

**Channel:** SMS

**Timeout:** 7 days

**Continue if reply contains:**
- `YES`
- `Y`
- `SURE`
- `OK`
- `PLEASE`
- `SEND`

**On timeout or "NO":** End workflow

### Action 5: Send Flyer Link via SMS

**Action Type:** Send SMS

**Message:**
```
Here's your property flyer for {{custom_fields.property_address}}:

{{custom_fields.property_flyer_url}}

See you at the open house! Let me know if you have any questions.

- {{user.name}}
```

### Action 6: Add "Flyer Sent" Tag

**Action Type:** Add Tag

**Tag:** `flyer-sent-via-sms`

**Purpose:** Track who requested flyer via SMS

---

## Step 4: Handle Multiple Open Houses

### Option A: One Workflow per Visit (Simple)

Each time they attend an open house:
1. New tag is added: `open-house-{eventId}`
2. Workflow triggers again
3. Sends email + SMS for that specific property
4. Custom fields are updated with latest property

**Pros:**
- Simple - same workflow for all
- Works automatically
- Clear conversation per property

**Cons:**
- If they attend 3 properties in one weekend, they get 3 separate SMS threads

### Option B: Smart Deduplication (Advanced)

Add a **Condition** at the start of the workflow:

**If:** Contact has more than 1 tag starting with `open-house-`

**Then:** Send different message:
```
Hi {{contact.first_name}}! Thanks for registering for multiple open houses.

You're registered for:
{{#each tags that start with 'open-house-'}}
- Property {{index + 1}}
{{/each}}

Check your email for all property flyers, or reply with the property number to get a specific flyer via text.
```

**Note:** This requires GHL workflow logic to enumerate tags, which may need custom code.

---

## Step 5: Update Real Estate Genie Code

The good news: **We already do most of this!**

The `ghl-sync.ts` already creates/updates contacts and adds tags. We just need to ensure it adds the right custom fields.

### Check `src/lib/integrations/ghl-sync.ts`

Make sure these custom fields are being set:

```typescript
customFields: {
  property_address: propertyAddress,
  property_flyer_url: `${baseUrl}/api/open-houses/${lead.event_id}/flyer`,
  event_start_time: new Date(event.start_at).toLocaleString(),
  open_house_event_id: lead.event_id,

  beds: event.beds?.toString(),
  baths: event.baths?.toString(),
  sqft: event.sqft?.toString(),
  price: event.price?.toString(),

  heat_score: lead.heat_score?.toString(),
  representation: payload.representation || "",
  timeline: payload.timeline || "",
  financing: payload.financing || "",
  neighborhoods: payload.neighborhoods || "",
  must_haves: payload.must_haves || "",
}
```

And tags:

```typescript
tags: [
  `open-house-${lead.event_id}`,  // This triggers the workflow!
  "open-house",                    // General category
  propertyAddress,                 // For easy filtering
  getHeatLevel(lead.heat_score),  // hot/warm/cold
  payload.timeline || "",
  payload.financing || "",
].filter(Boolean)
```

---

## Step 6: Test the Flow

### Test Single Property Visit

1. Create an open house
2. Register as a test lead
3. **Verify in GHL:**
   - Contact created/updated
   - Tag added: `open-house-{eventId}`
   - Custom fields populated
4. **Verify workflow:**
   - Email received with flyer link
   - SMS received asking if they want flyer
5. Reply "YES"
6. Verify flyer link received via SMS

### Test Multiple Property Visits

1. Create 2-3 open houses
2. Register for all as same contact (same email/phone)
3. **Verify in GHL:**
   - Same contact
   - Multiple tags: `open-house-{eventId1}`, `open-house-{eventId2}`, etc.
   - Custom fields updated to latest property
4. **Verify workflow:**
   - Workflow triggered for each tag
   - Separate email for each property
   - SMS conversation tracks all

---

## Benefits of This Approach

### ✅ Cost-Effective
- No webhook infrastructure
- No extra API calls
- Uses existing contact sync

### ✅ Efficient
- Direct contact updates
- GHL handles all automation
- Native conversation threading

### ✅ Simple
- Fewer moving parts
- Easy to debug
- Visual workflow builder

### ✅ Scalable
- Works for any number of properties
- Same workflow for all open houses
- Easy to modify

### ✅ Better Tracking
- All data in GHL contacts
- Tags show attendance history
- Custom fields store property details
- Native GHL analytics

---

## Comparison with Webhook Approach

| Feature | Tag Trigger | Webhook |
|---------|-------------|---------|
| **Setup** | ✅ Simple | 🟡 Complex |
| **Cost** | ✅ Free | 🟡 API calls |
| **Reliability** | ✅ High | 🟡 Depends on uptime |
| **Debugging** | ✅ Easy in GHL | 🟡 Check logs |
| **Flexibility** | ✅ Visual builder | 🟡 Code changes |
| **Data Storage** | ✅ In contact | 🟡 Webhook payload |

---

## Monitoring & Analytics

### View in GHL

**Contacts with Open House Tags:**
1. Go to **Contacts**
2. Filter by tag: `open-house-`
3. See all open house attendees

**Workflow Performance:**
1. Go to **Automation** → **Workflows**
2. Click on your workflow
3. View analytics:
   - Trigger count
   - Completion rate
   - Drop-off points

**Custom Reports:**
1. Create Smart List: Contacts with tag starting with `open-house-`
2. Group by custom field `property_address`
3. See attendance per property

---

## Advanced: Track Multiple Properties

### Add Custom Field for Visit History

**Field Name:** `open_house_history`
**Type:** Long Text

Each time they visit, **append** to this field:
```
123 Main St (Jan 15, 2025)
456 Oak Ave (Jan 18, 2025)
789 Pine Rd (Jan 20, 2025)
```

Then in workflow, you can parse this to show full history.

---

## Need Help?

- **GHL Workflows:** https://help.gohighlevel.com/support/solutions/folders/155000000898
- **GHL Tags:** https://help.gohighlevel.com/support/solutions/articles/155000000345
- **Custom Fields:** https://help.gohighlevel.com/support/solutions/articles/155000000272
