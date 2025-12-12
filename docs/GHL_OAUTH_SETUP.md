# GoHighLevel OAuth Setup Guide

This guide explains how to configure GoHighLevel OAuth integration for your Open House app.

## Prerequisites

- A GoHighLevel Agency account
- Access to GHL Marketplace (https://marketplace.gohighlevel.com/)

## Step 1: Create a GHL Marketplace App

1. Go to [https://marketplace.gohighlevel.com/](https://marketplace.gohighlevel.com/)
2. Log in with your GHL account
3. Navigate to **My Apps**
4. Click **Create New App** (or edit your existing app)

## Step 2: Configure OAuth Settings

### Basic Information
- **App Name:** Your app name (e.g., "Open House AI App")
- **App Description:** Brief description of your app
- **App Icon:** Upload your app icon (optional)

### OAuth Configuration

1. **Redirect URI:** This is critical for the OAuth flow to work
   ```
   https://yourdomain.com/api/integrations/ghl/callback
   ```
   Replace `yourdomain.com` with your actual Vercel production domain.

   For testing locally:
   ```
   http://localhost:3000/api/integrations/ghl/callback
   ```

2. **Scopes:** Select the following scopes:
   - ✅ `contacts.write` - Create/update contacts
   - ✅ `contacts.readonly` - Read contact information
   - ✅ `opportunities.write` - Create/update opportunities
   - ✅ `opportunities.readonly` - Read opportunities
   - ✅ `locations.readonly` - Read location information
   - ✅ `conversations/message.readonly` - Read messages (for SMS)
   - ✅ `conversations/message.write` - Send messages (for SMS)

3. Click **Save**

## Step 3: Get Your Credentials

After saving your app, you'll see:
- **Client ID** - Copy this value
- **Client Secret** - Copy this value (keep it secure!)

## Step 4: Configure Environment Variables

Add these to your `.env` file (or Vercel environment variables):

```bash
GHL_CLIENT_ID=your_client_id_here
GHL_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**For Vercel:**
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add each variable for **Production**, **Preview**, and **Development**

## Step 5: Test the OAuth Flow

1. Deploy your changes to Vercel
2. Log in to your app
3. Go to the **Integrations** page
4. Click **Connect GoHighLevel**
5. You should be redirected to GHL's authorization page
6. Select your location
7. Click **Authorize**
8. You should be redirected back to your app with a success message

## Common Issues & Solutions

### Issue: Redirects to GHL Agency Dashboard

**Problem:** After authorizing, you're taken to your GHL agency dashboard instead of back to your app.

**Solution:**
1. Check that the **Redirect URI** in your GHL app settings **exactly matches** your callback URL
2. Make sure `NEXT_PUBLIC_APP_URL` environment variable is set correctly
3. Try the connection flow again

### Issue: "Invalid redirect_uri" Error

**Problem:** OAuth flow shows an error about invalid redirect URI.

**Solution:**
1. Ensure the redirect URI in your GHL app settings is exactly:
   ```
   https://yourdomain.com/api/integrations/ghl/callback
   ```
2. No trailing slash
3. Must use HTTPS in production
4. Check for typos

### Issue: "Insufficient scopes" Error

**Problem:** Some features don't work after connecting.

**Solution:**
1. Go back to your GHL Marketplace app settings
2. Ensure all required scopes are selected (see Step 2 above)
3. Save the changes
4. Disconnect and reconnect your integration

### Issue: Access Token Expired

**Problem:** Integration stops working after some time.

**Solution:**
The app automatically refreshes tokens, but if you see this error:
1. Go to the Integrations page
2. Click **Disconnect**
3. Click **Connect GoHighLevel** again
4. Re-authorize the app

## Notification Behavior

When GHL is connected:
- ✅ **Emails** are sent via GHL Conversations API
- ✅ **SMS** messages are sent via GHL Conversations API
- ✅ Contacts are automatically created/updated in GHL
- ✅ All communication is tracked in your GHL location

When GHL is not connected:
- 📧 Emails fall back to Resend (if configured)
- 📱 SMS falls back to Twilio (if configured)
- ⚠️ If neither is configured, notifications are skipped

## Testing Notifications

After connecting GHL:

1. Create a test open house
2. Visit the check-in page
3. Fill out the form with your email/phone
4. Check for:
   - Email in your inbox
   - SMS on your phone
   - Contact created in GHL
   - Conversation threads in GHL

## Security Best Practices

- ✅ Keep `GHL_CLIENT_SECRET` secure - never commit to git
- ✅ Use environment variables for all credentials
- ✅ Rotate your client secret periodically
- ✅ Monitor your GHL API usage
- ✅ Test in development before deploying to production

## Support

- **GHL Documentation:** [https://highlevel.stoplight.io/](https://highlevel.stoplight.io/)
- **GHL Support:** [https://help.gohighlevel.com/](https://help.gohighlevel.com/)
- **Marketplace Support:** support@gohighlevel.com
