# GHL Registration Email Setup - Flyer URL and Property Details

## Email Merge Tags

The correct merge tags to use in your GHL email templates are:

```
Download your property flyer: {{registration.openHouses.flyerUrl}}

Property Address: {{registration.openHouses.address}}

Agent ID: {{registration.openHouses.agentId}}
```

These fields are accessed through the **association** between Registration and OpenHouse custom objects.

## Required GHL Custom Object Fields

### OpenHouse Custom Object Fields

The following fields must exist in your **OpenHouse** custom object in GHL:

| Field Name | Internal Name | Type | Description |
|------------|---------------|------|-------------|
| Address | `address` | Text | Property address (e.g., "123 Main St, Honolulu, HI") |
| Flyer URL | `flyerUrl` | Text | URL to download the property flyer PDF |
| Agent ID | `agentId` | Text | Agent's unique ID in the system |

**Important:** The internal field names must use the **exact casing** shown above:
- `address` (all lowercase)
- `flyerUrl` (camelCase)
- `agentId` (camelCase)

### How to Verify Fields in GHL

1. Go to **Settings → Custom Objects**
2. Find your **OpenHouses** custom object
3. Verify the internal field names match exactly (case-sensitive)
4. If they don't match, edit the field and update the internal name

### Example Email Template

```html
<p>Thank you for visiting the open house at <strong>{{registration.openHouses.address}}</strong>!</p>

<p>
  <a href="{{registration.openHouses.flyerUrl}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
    Download Property Fact Sheet
  </a>
</p>

<p>We'll be in touch soon with more information about this property.</p>
```

## How It Works

1. **User checks in** at open house via QR code
2. **System creates OpenHouse record** with all property details:
   - `address` - Property address
   - `flyerUrl` - Full URL to download the PDF flyer
   - `agentId` - Agent's unique ID
   - Plus other fields (beds, baths, price, etc.)
3. **System creates Registration record** linking the contact to the open house
4. **System creates association** between Registration → OpenHouse
5. **GHL workflow triggers** on the "OpenHouse" tag
6. **Email template accesses** OpenHouse fields via the association: `{{registration.openHouses.fieldName}}`

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
- Verify field names in OpenHouse object match exactly (case-sensitive): `address`, `flyerUrl`, `agentId`
- Check that both OpenHouse and Registration records were created (view in GHL custom objects)
- Verify the association exists between Registration → OpenHouse
- Ensure your workflow is triggered by Registration or Contact, not OpenHouse directly

## Troubleshooting

### Merge tags showing blank
**Cause**: Field names don't match exactly or association is missing

**Fix**:
- Verify OpenHouse custom object has fields with exact names: `address`, `flyerUrl`, `agentId` (case-sensitive)
- Check that the association between Registration → OpenHouse exists in GHL
- Test merge tag syntax: `{{registration.openHouses.address}}` (note the plural "openHouses")

### Flyer URL returns 404
**Cause**: Event ID is invalid or event has been deleted

**Fix**: Check that the open house event still exists in the database

### Association errors in GHL logs
**Cause**: Association between Registration → OpenHouse is missing

**Fix**:
- Check that both custom objects exist in GHL
- Verify the association is created (code creates it automatically)
- You can manually create the association in GHL Settings → Custom Objects → Associations

## Correct Merge Tag Format

The merge tags access OpenHouse fields through the Registration association:

**Correct format:**
```
{{registration.openHouses.address}}     ✅ Works
{{registration.openHouses.flyerUrl}}    ✅ Works
{{registration.openHouses.agentId}}     ✅ Works
```

**Incorrect formats:**
```
{{openhouse.address}}                   ❌ Missing registration context
{{registration.openHouse.address}}      ❌ Singular "openHouse" (should be plural)
{{registration.address}}                ❌ Field not on Registration object
```

Note: Use **plural** "openHouses" in the merge tag to access the associated OpenHouse object.

## Code Implementation

The application sends these field values when creating the OpenHouse custom object:

```typescript
{
  locationId: params.locationId,
  properties: {
    "address": params.address,        // {{registration.openHouses.address}}
    "flyerUrl": params.flyerUrl,      // {{registration.openHouses.flyerUrl}}
    "agentId": params.agentId,        // {{registration.openHouses.agentId}}
    // ... other fields
  }
}
```

The field names in the code **must match** the internal field names in your GHL OpenHouse custom object for the merge tags to work.

## Related Documentation

- See `docs/GHL_CUSTOM_OBJECTS_SETUP.md` for complete custom object schema
- See `docs/GHL_WORKFLOW_SETUP.md` for workflow trigger configuration
- See `docs/GHL_TAG_TRIGGER_SETUP.md` for tag-based automation setup
