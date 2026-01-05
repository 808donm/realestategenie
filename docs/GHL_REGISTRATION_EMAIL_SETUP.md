# GHL Registration Email Setup - Flyer URL and Property Details

## Problem
Email merge tags for property details were not showing up in emails sent from GHL workflows:
- `{{registration.openHouse_address}}`
- `{{registration.openHouse_flyerUrl}}`
- `{{registration.openHouse_agentId}}`

## Root Cause
These fields were only stored in the **OpenHouse** custom object, not in the **Registration** custom object. GHL email templates cannot reliably navigate associations between custom objects in merge tags.

## Solution
The application now stores these fields **directly** in the Registration custom object, making them immediately accessible in email templates.

## Required GHL Custom Object Fields

### Registration Custom Object Fields

You need to add the following fields to your **Registration** custom object in GHL:

| Field Name | Internal Name | Type | Description |
|------------|---------------|------|-------------|
| OpenHouse Flyer URL | `openhouse_flyerurl` | Text | URL to download the property flyer PDF |
| OpenHouse Address | `openhouse_address` | Text | Property address (e.g., "123 Main St, Honolulu, HI") |
| OpenHouse Agent ID | `openhouse_agentid` | Text | Agent's unique ID in the system |

### How to Add Fields in GHL

1. Go to **Settings → Custom Objects**
2. Find your **Registrations** custom object
3. Click **Edit** or **Add Field**
4. For each field above:
   - **Field Name**: Use the name from the "Field Name" column
   - **Internal Name**: Use the exact name from the "Internal Name" column
   - **Field Type**: Text
   - Click **Save**

## Email Merge Tags

Once the fields are added, use these merge tags in your GHL email templates:

```
Download your property flyer: {{registration.openhouse_flyerurl}}

Property Address: {{registration.openhouse_address}}

Agent ID: {{registration.openhouse_agentid}}
```

### Example Email Template

```html
<p>Thank you for visiting the open house at <strong>{{registration.openhouse_address}}</strong>!</p>

<p>
  <a href="{{registration.openhouse_flyerurl}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
    Download Property Fact Sheet
  </a>
</p>

<p>We'll be in touch soon with more information about this property.</p>
```

## How It Works

1. **User checks in** at open house via QR code
2. **System creates OpenHouse record** with all property details
3. **System creates Registration record** linking the contact to the open house
4. **Registration record includes**:
   - `openhouse_flyerurl` - The full URL to download the PDF flyer
   - `openhouse_address` - The property address
   - `openhouse_agentid` - The agent's ID
5. **GHL workflow triggers** on the "OpenHouse" tag
6. **Email template accesses** fields directly via `{{registration.field_name}}`

## Flyer URL Format

The flyer URL follows this format:
```
https://www.realestategenie.app/api/open-houses/{eventId}/flyer
```

This generates a PDF with:
- Property photos
- Address and details (beds, baths, sqft, price)
- Agent contact information
- QR code to check in at the open house

## Testing

To verify the setup works:

1. **Create a test contact** in GHL
2. **Manually trigger** your OpenHouse workflow email
3. **Check that merge tags populate** with actual values
4. **Click the flyer URL** to ensure it downloads the PDF

If fields show as blank:
- Verify field names match exactly (case-sensitive)
- Check that the Registration record was created (view in GHL custom objects)
- Ensure your workflow is using the Registration object, not Contact

## Troubleshooting

### Merge tags showing blank
**Cause**: Field names don't match or fields don't exist in Registration object
**Fix**: Double-check field internal names match exactly: `openhouse_flyerurl`, `openhouse_address`, `openhouse_agentid`

### Flyer URL returns 404
**Cause**: Event ID is invalid or event has been deleted
**Fix**: Check that the open house event still exists in the database

### Association errors in GHL logs
**Cause**: Normal - fields are now stored directly, associations are optional
**Fix**: No action needed - associations are created but not required for email merge tags

## Migration from Old Setup

If you were previously relying on associations to access OpenHouse fields:

**Old (unreliable):**
```
{{openhouse.address}}  ❌ Doesn't work reliably
```

**New (reliable):**
```
{{registration.openhouse_address}}  ✅ Works every time
```

Update all your email templates to use the new `registration.openhouse_*` merge tags.

## Related Documentation

- See `docs/GHL_CUSTOM_OBJECTS_SETUP.md` for complete custom object schema
- See `docs/GHL_WORKFLOW_SETUP.md` for workflow trigger configuration
- See `docs/GHL_TAG_TRIGGER_SETUP.md` for tag-based automation setup
