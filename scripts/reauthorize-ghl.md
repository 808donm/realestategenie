# Re-authorize GHL Integration for Document Scopes

## Why This Is Needed

The GHL OAuth integration now requests additional scopes for document/contract creation:
- `documents_contracts/sendlink.write` - Send existing documents
- `documents_contracts_templates/sendlink.write` - Create and send documents from templates
- `documents_contracts/list.readonly` - List created documents
- `documents_contracts_template/list.readonly` - List available templates (note: singular "template")

Your existing OAuth token doesn't have these scopes, which is why you're getting the 401 error:
```
"The token is not authorized for this scope."
```

## How to Re-authorize

You need to disconnect and reconnect your GHL integration to get a new token with the updated scopes.

### Option 1: Via the App UI (Recommended)

1. Log into Real Estate Genie
2. Navigate to Settings → Integrations → GoHighLevel
3. Click "Disconnect" to remove the current integration
4. Click "Connect" to start a new OAuth flow
5. Approve all the requested permissions in GHL
6. You'll be redirected back with a new token that includes document scopes

### Option 2: Direct API Flow

If you want to re-authorize programmatically:

```bash
# 1. Get the authorization URL
curl "https://your-app.com/api/integrations/ghl/connect"

# 2. Visit the returned URL in your browser
# 3. Approve the permissions in GHL
# 4. GHL will redirect to /api/integrations/crm-callback with the new token
```

### Option 3: Database Manual Update (Advanced)

If you have a GHL refresh token, you can use it to get a new access token:

```bash
# Run this helper script (to be created)
npm run ghl:refresh-token
```

## Verification

After re-authorizing, verify the new scopes are present:

1. Try creating a lease document again
2. Check the logs - you should no longer see the 401 error
3. You should see: `✅ GHL document created directly via API`

## Scopes Now Requested

The complete list of scopes being requested:

- **Contacts**: `contacts.write`, `contacts.readonly`
- **Opportunities**: `opportunities.write`, `opportunities.readonly`
- **Locations**: `locations.readonly`, `locations/customFields.readonly`, `locations/customFields.write`
- **Conversations**: `conversations.write`, `conversations.readonly`, `conversations/message.readonly`, `conversations/message.write`
- **Custom Objects**: `objects/record.readonly`, `objects/record.write`, `objects/schema.readonly`, `objects/schema.write`
- **Associations**: `associations.write`, `associations.readonly`
- **Invoices**: `invoices.write`, `invoices.readonly`
- **Documents & Contracts** (NEW): `documents_contracts/list.readonly`, `documents_contracts/sendlink.write`, `documents_contracts_template/list.readonly`, `documents_contracts_templates/sendlink.write`

## Troubleshooting

**Q: I re-authorized but still get 401 errors**
A: Make sure you completely disconnected before reconnecting. The old token must be invalidated.

**Q: How do I know if I have the new scopes?**
A: Check the `agent_integrations` table - the `ghl_access_token` should be different after re-authorization. You can also decode the JWT token to verify scopes.

**Q: Can I test without re-authorizing?**
A: No. The OAuth token is cryptographically signed by GHL and cannot be modified. You must go through the OAuth flow again to get a token with new scopes.
