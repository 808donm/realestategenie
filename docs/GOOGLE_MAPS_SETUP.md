# Google Maps API Setup Guide

## Overview

Real Estate Genie uses geocoding to convert property addresses into map coordinates (latitude/longitude) so that property maps can be displayed on open house detail pages.

**Geocoding Services (in order of preference):**
1. **Google Maps Geocoding API** (Primary) - Most reliable and accurate
2. **OpenStreetMap Nominatim** (Fallback) - Free but may be blocked or rate-limited

---

## Why Google Maps?

**Advantages:**
- ✅ **Highly reliable** - Works consistently, rarely blocked
- ✅ **Accurate** - Especially for US addresses
- ✅ **Fast** - No rate limit concerns (within free tier)
- ✅ **Supports all address formats** - Street, city, state, zip, etc.

**OpenStreetMap Issues:**
- ❌ Often blocked by hosting providers (Vercel, AWS, etc.)
- ❌ Strict rate limits (1 request/second)
- ❌ Less accurate for some US addresses
- ❌ May return no results for valid addresses

---

## Step 1: Get a Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Accept terms of service if prompted

**Note:** Google Cloud requires a credit card, but the Geocoding API has a generous free tier:
- **$200 free credit** for new accounts (first 90 days)
- **Free tier:** First $200/month of usage is free (ongoing)
- **Cost:** $5 per 1,000 requests after free tier
- **Typical usage:** 50-100 requests/month for most agents = **FREE**

---

## Step 2: Create a New Project

1. Click the **project dropdown** at the top of the page
2. Click **New Project**
3. Enter project name: `RealEstateGenie` (or your preferred name)
4. Click **Create**
5. Wait for the project to be created (~30 seconds)

---

## Step 3: Enable the Geocoding API

1. In the Google Cloud Console, go to **APIs & Services → Library**
   - Or visit: https://console.cloud.google.com/apis/library

2. Search for: **"Geocoding API"**

3. Click on **"Geocoding API"**

4. Click the blue **"Enable"** button

5. Wait for it to activate (~10 seconds)

---

## Step 4: Create an API Key

1. Go to **APIs & Services → Credentials**
   - Or visit: https://console.cloud.google.com/apis/credentials

2. Click **+ Create Credentials** at the top

3. Select **API Key**

4. Your API key will be created and shown in a popup
   - It will look like: `AIzaSyDaGmWka4JgXSc9sIXlyGQ-dGp6qeWyOmU`

5. **Copy the API key** - you'll need it in the next step

6. Click **Restrict Key** (recommended for security)

---

## Step 5: Restrict Your API Key (Recommended)

For security, restrict your API key to only work with the Geocoding API and your domain:

1. On the API key details page:
   - **Name:** Change to "Real Estate Genie - Geocoding"

2. **Application restrictions:**
   - Select **"HTTP referrers (web sites)"**
   - Add your domains:
     ```
     https://www.realestategenie.app/*
     https://realestategenie.app/*
     http://localhost:3000/*
     ```

3. **API restrictions:**
   - Select **"Restrict key"**
   - From the dropdown, select:
     - ✅ **Geocoding API**
   - (Make sure ONLY Geocoding API is checked)

4. Click **Save**

---

## Step 6: Add API Key to Your Environment

### For Local Development

1. Open your `.env.local` file (or create it if it doesn't exist)

2. Add this line:
   ```bash
   GOOGLE_MAPS_API_KEY=AIzaSyDaGmWka4JgXSc9sIXlyGQ-dGp6qeWyOmU
   ```
   *(Replace with your actual API key)*

3. Restart your development server:
   ```bash
   npm run dev
   ```

### For Production (Vercel)

1. Go to your Vercel dashboard
2. Select your project: **realestategenie**
3. Go to **Settings → Environment Variables**
4. Click **Add**
5. Enter:
   - **Name:** `GOOGLE_MAPS_API_KEY`
   - **Value:** Your API key (paste it)
   - **Environment:** Select all (Production, Preview, Development)
6. Click **Save**
7. **Redeploy** your application for changes to take effect

### For Other Hosting Providers

**Netlify:**
- Go to Site Settings → Build & Deploy → Environment
- Add `GOOGLE_MAPS_API_KEY` with your key

**AWS Amplify:**
- Go to App Settings → Environment Variables
- Add `GOOGLE_MAPS_API_KEY` with your key

**Railway:**
- Go to Variables tab
- Add `GOOGLE_MAPS_API_KEY` with your key

---

## Step 7: Test Geocoding

1. **Create a new open house** in your app:
   - Address: `1600 Amphitheatre Parkway, Mountain View, CA 94043`
   - Start/End times: Any future time

2. **Check the logs** for geocoding success:
   ```
   Geocoding address: 1600 Amphitheatre Parkway, Mountain View, CA 94043
   ✓ Geocoded with Google Maps: { latitude: 37.4224, longitude: -122.0856, ... }
   ```

3. **View the open house detail page** - you should see a map

4. **If geocoding fails**, check logs for:
   ```
   Google Maps API key not found, skipping Google geocoding
   Falling back to OpenStreetMap...
   ```
   - This means the API key is not set correctly

---

## Troubleshooting

### Issue: "Geocoding Failed" or No Map Showing

**Check 1: API Key is Set**
```bash
# In your terminal (local development)
echo $GOOGLE_MAPS_API_KEY

# Should output your key
# If empty, check your .env.local file
```

**Check 2: API is Enabled**
- Go to Google Cloud Console
- Check **APIs & Services → Dashboard**
- Verify "Geocoding API" is listed and enabled

**Check 3: API Key Restrictions**
- Go to **APIs & Services → Credentials**
- Click on your API key
- Make sure:
  - ✅ Geocoding API is allowed
  - ✅ Your domain is in the HTTP referrer list (if restricted)
  - ✅ No IP address restrictions (unless you need them)

**Check 4: Billing is Enabled**
- Go to **Billing** in Google Cloud Console
- Verify billing account is linked to your project
- You don't need to pay anything (free tier is generous)
- But billing must be enabled for API to work

### Issue: "API Key Restricted" Error

**Solution:** Check API key restrictions
1. Go to Google Cloud Console → Credentials
2. Click your API key
3. Under "API restrictions":
   - Either select "Don't restrict key" (less secure)
   - Or make sure "Geocoding API" is in the allowed list

### Issue: "Quota Exceeded" Error

**Check your usage:**
1. Go to Google Cloud Console
2. Navigate to **APIs & Services → Geocoding API → Quotas**
3. Check "Requests per day"

**Free tier limits:**
- 40,000 requests per month free
- Typical usage: 50-100/month for most agents
- If you exceed, you'll be charged $5 per 1,000 requests

**Solution:** If you're hitting limits unexpectedly:
- Check for geocoding loops in your code
- Make sure addresses are only geocoded once per open house
- Consider caching geocoding results

### Issue: Fallback to OpenStreetMap Still Failing

**OpenStreetMap may be blocked by your hosting provider**

**Temporary solutions:**
1. Use a different hosting provider
2. Set up a geocoding proxy
3. Manually enter coordinates for each property

**Long-term solution:**
- Set up Google Maps API (this guide)

---

## Cost Estimate

### Typical Monthly Usage

**Average agent:**
- Creates 4 open houses per month
- Each requires 1 geocoding request
- **Total:** 4 requests/month = **$0.00** (well within free tier)

**Busy agent:**
- Creates 50 open houses per month
- **Total:** 50 requests/month = **$0.00** (free tier covers 40,000/month)

**Agency with 100 agents:**
- 100 agents × 50 open houses = 5,000 requests/month
- **Cost:** $0.00 (free tier covers first 40,000)

### You'll Only Pay If:
- You exceed 40,000 geocoding requests per month
- That's **1,333 open houses per month**
- For a single agent, this is virtually impossible to reach

---

## Alternative: Free-Only Setup (No Google Maps)

If you don't want to set up Google Maps at all:

**The system will automatically use OpenStreetMap as a fallback**

**Pros:**
- ✅ No API key needed
- ✅ No billing setup required
- ✅ Completely free

**Cons:**
- ❌ May be blocked by hosting providers
- ❌ Less reliable (frequent failures)
- ❌ Slower response times
- ❌ Rate limited to 1 request/second

**To use OpenStreetMap only:**
- Simply don't add `GOOGLE_MAPS_API_KEY` to your environment
- The system will skip Google and go straight to OpenStreetMap

---

## Security Best Practices

1. **Never commit API keys to git**
   - API keys should only be in `.env.local` (which is gitignored)
   - Never in `.env` or source code files

2. **Use API key restrictions**
   - Restrict to only Geocoding API
   - Restrict to your domain (HTTP referrers)
   - This prevents unauthorized usage if key is leaked

3. **Monitor usage**
   - Check Google Cloud Console monthly
   - Set up budget alerts (optional)

4. **Rotate keys if compromised**
   - If you accidentally commit your key to git
   - Immediately delete the key in Google Cloud Console
   - Create a new one

---

## Summary

1. ✅ Create Google Cloud account
2. ✅ Enable Geocoding API
3. ✅ Create and restrict API key
4. ✅ Add `GOOGLE_MAPS_API_KEY` to environment variables
5. ✅ Redeploy your application
6. ✅ Test by creating a new open house

**With Google Maps API configured:**
- Maps will show reliably for all open houses
- No more "Map not available" messages
- Fast, accurate geocoding for US addresses

**Without Google Maps API:**
- System falls back to OpenStreetMap (may work, may not)
- Maps may fail to load frequently
- "Map not available" message will show

---

## Useful Links

- **Google Cloud Console:** https://console.cloud.google.com/
- **Geocoding API Docs:** https://developers.google.com/maps/documentation/geocoding
- **Pricing:** https://developers.google.com/maps/documentation/geocoding/usage-and-billing
- **Free Trial:** https://cloud.google.com/free
