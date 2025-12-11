# Email and SMS Notifications Setup

This guide explains how to set up automated email and SMS notifications for open house attendees.

## Features

When an attendee checks in at an open house, the system automatically sends:

1. **Check-in Confirmation (Email & SMS)** - Sent to all attendees
   - Thanks them for visiting
   - Includes property details and open house date/time
   - Provides agent contact information
   - Includes a download link to the property flyer

2. **Greeting Email & SMS** - Sent only to unrepresented attendees who request contact
   - Personal greeting from the agent
   - Promise to follow up within 24 hours
   - Emphasizes willingness to help

## Email Setup (Resend)

### 1. Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your API Key

1. Navigate to [https://resend.com/api-keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Give it a name (e.g., "Open House App")
4. Copy the API key (starts with `re_`)

### 3. Configure Your Domain (Production)

For production use, you should set up a custom domain:

1. Go to [https://resend.com/domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records to your domain provider
5. Wait for verification (usually 15-30 minutes)

### 4. Add to Environment Variables

Add to your `.env` file:

```bash
RESEND_API_KEY=re_your_actual_api_key_here
EMAIL_FROM=Open House <noreply@yourdomain.com>
```

**Note:** For testing, you can use the default Resend sandbox domain. For production, use your verified domain.

## SMS Setup (Twilio)

### 1. Create a Twilio Account

1. Go to [https://www.twilio.com](https://www.twilio.com)
2. Sign up for a free trial account
3. Verify your phone number

### 2. Get Your Credentials

1. Go to [https://console.twilio.com](https://console.twilio.com)
2. From the dashboard, copy:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (click to reveal)

### 3. Get a Phone Number

1. Go to [https://console.twilio.com/us1/develop/phone-numbers/manage/search](https://console.twilio.com/us1/develop/phone-numbers/manage/search)
2. Search for a phone number in your area
3. Purchase the number (free trial includes credits)
4. Copy the phone number (format: `+1234567890`)

### 4. Add to Environment Variables

Add to your `.env` file:

```bash
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

## Testing

### Test Email Notifications

1. Create a test open house in the app
2. Visit the QR code check-in page (`/oh/{eventId}`)
3. Fill out the form with your email
4. Check the "I agree to receive emails" checkbox
5. Submit the form
6. Check your email inbox

### Test SMS Notifications

1. Use the same check-in form
2. Add your phone number
3. Check the "I agree to receive SMS" checkbox
4. Submit the form
5. Check your phone for the SMS

**Note:** During Twilio trial, you can only send SMS to verified phone numbers. Add your test number at [https://console.twilio.com/us1/develop/phone-numbers/manage/verified](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)

## Notification Logic

### Check-in Confirmation
Sent to **all attendees** who consent to email/SMS:
- Email: Beautiful HTML template with property details and flyer download link
- SMS: Short text with property address and agent contact

### Greeting Message
Sent **only** when:
- Attendee selects "No" for "Are you currently represented by an agent?"
- Attendee checks "Yes, please contact me"
- Attendee consents to email/SMS

## Costs

### Resend
- **Free Tier:** 3,000 emails/month
- **Paid Plans:** Start at $20/month for 50,000 emails
- [Pricing Details](https://resend.com/pricing)

### Twilio
- **Free Trial:** $15 in credits
- **SMS Cost:** ~$0.0075 per message (US)
- **Phone Number:** $1.15/month
- [Pricing Details](https://www.twilio.com/sms/pricing)

## Troubleshooting

### Emails Not Sending

1. Check Resend API key is correct in `.env`
2. Verify `EMAIL_FROM` uses your verified domain
3. Check Vercel function logs for errors
4. Check Resend dashboard for delivery status

### SMS Not Sending

1. Verify Twilio credentials in `.env`
2. Check phone number format (`+1234567890`)
3. Ensure recipient number is verified (trial accounts)
4. Check Twilio console logs for errors
5. Verify you have sufficient credits

### Flyer Link Not Working

1. Ensure `NEXT_PUBLIC_APP_URL` is set to your production URL
2. Test the flyer download directly: `https://yourdomain.com/api/open-houses/{id}/flyer`

## Privacy & Compliance

- Attendees must explicitly consent to receive emails and SMS
- All messages include opt-out instructions ("Reply STOP to opt out")
- Consent is captured with timestamp in the database
- Only attendees who check consent boxes will receive notifications

## Customization

To customize the email templates, edit:
- `/lib/notifications/email-service.ts`

To customize SMS messages, edit:
- `/lib/notifications/sms-service.ts`

## Support

- **Resend:** [https://resend.com/docs](https://resend.com/docs)
- **Twilio:** [https://www.twilio.com/docs](https://www.twilio.com/docs)
