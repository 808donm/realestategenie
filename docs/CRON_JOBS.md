# Cron Jobs Setup

This document explains how to set up automated tasks (cron jobs) for the Real Estate Genie application.

## Lease Status Transitions

**Endpoint:** `GET /api/cron/lease-status-transitions`

**Purpose:** Automatically updates lease statuses based on dates:
- Activates leases when their start date arrives
- Converts leases to month-to-month when their end date arrives
- Updates property/unit occupancy status accordingly

**Frequency:** Should run daily (recommended: 1am UTC)

---

## Setup Options

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

1. Create a `vercel.json` file in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/lease-status-transitions",
      "schedule": "0 1 * * *"
    }
  ]
}
```

2. Add the cron secret to your Vercel environment variables:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `CRON_SECRET` = `your-random-secret-string`

3. Deploy to Vercel - cron jobs will run automatically

**Schedule format:** `0 1 * * *` = Every day at 1:00 AM UTC

---

### Option 2: GitHub Actions

1. Create `.github/workflows/cron-lease-status.yml`:

```yaml
name: Lease Status Transitions

on:
  schedule:
    # Runs at 1:00 AM UTC every day
    - cron: '0 1 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  run-cron:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Lease Status Transitions
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/lease-status-transitions" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

2. Add GitHub Secrets:
   - Go to GitHub repo → Settings → Secrets → Actions
   - Add: `APP_URL` = `https://yourdomain.com`
   - Add: `CRON_SECRET` = `your-random-secret-string`

---

### Option 3: External Cron Service (e.g., cron-job.org, EasyCron)

1. Sign up for a cron service like [cron-job.org](https://cron-job.org)

2. Create a new cron job:
   - **URL:** `https://yourdomain.com/api/cron/lease-status-transitions`
   - **Schedule:** Daily at 1:00 AM
   - **Headers:** Add `Authorization: Bearer your-cron-secret`

3. Set environment variable in your hosting:
   - `CRON_SECRET` = `your-random-secret-string`

---

## Environment Variables

Add this to your `.env.local` (development) and hosting environment (production):

```bash
# Cron job security
CRON_SECRET=your-random-secure-string-here
```

**Generate a secure secret:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use an online tool like: https://www.random.org/strings/
```

---

## Manual Testing

You can manually trigger the cron job for testing:

```bash
curl -X GET "http://localhost:3000/api/cron/lease-status-transitions" \
  -H "Authorization: Bearer your-cron-secret"
```

**Response example:**
```json
{
  "success": true,
  "timestamp": "2026-02-01T01:00:00.000Z",
  "activated": 2,
  "convertedToMonthToMonth": 1,
  "totalProcessed": 3
}
```

---

## Monitoring

Check your application logs to see cron job execution:

- Vercel: Dashboard → Your Project → Deployments → View Function Logs
- GitHub Actions: Actions tab → Workflow runs
- External service: Check service dashboard

**Look for log entries:**
- `🔄 Running lease status transitions for...`
- `✅ Activated lease {id} for {tenant}`
- `✅ Converted lease {id} to month-to-month for {tenant}`

---

## Troubleshooting

**Cron job returns 401 Unauthorized:**
- Verify `CRON_SECRET` environment variable is set
- Check the Authorization header matches the secret

**Leases not updating:**
- Check that lease dates are in the correct format (YYYY-MM-DD)
- Verify lease status is `pending_start` or `active`
- Check application logs for errors

**Too many leases processing:**
- The job only processes leases where dates have passed
- This is normal if you have many leases starting/ending on the same day
