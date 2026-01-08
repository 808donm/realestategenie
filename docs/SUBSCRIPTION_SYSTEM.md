# Subscription Management System

Complete subscription and feature management system with usage monitoring, capacity warnings, and admin controls.

## Features

### 5-Tier Subscription Plans

1. **Solo Agent Pro** - $49/month
   - 1 agent, 5 properties, 50 tenants
   - Basic features for independent agents

2. **Team Growth** - $149/month
   - 5 agents, 25 properties, 250 tenants
   - Team management and integrations

3. **Brokerage Growth** - $349/month
   - 10 agents, 100 properties, 1,000 tenants
   - Broker dashboard and advanced analytics

4. **Brokerage Scale** - $799/month
   - 25 agents, 300 properties, 3,000 tenants
   - Priority support

5. **Enterprise** - Custom pricing
   - Unlimited resources
   - All features including API access and custom branding

### Usage Monitoring

- Real-time usage calculation (agents, properties, tenants)
- Automatic alert creation at 70% and 100% capacity
- Dashboard visibility for admins
- Sales opportunity tracking

### Warning Banners

**Yellow Warning (70% capacity)**
- Soft, dismissible banner
- "You're approaching the limit" messaging
- Suggests upgrade with next tier plan
- Shows on all pages until dismissed

**Red Critical (100%+ capacity)**
- Persistent, non-dismissible banner
- "You've exceeded your plan" messaging
- Urges immediate upgrade or sales contact
- Fair-use policy messaging (nothing stops working)

### Admin Features

- **User Management**: View all subscriptions and usage
- **Plans Management**: View plan details and subscriber counts
- **Features Management**: Feature matrix showing which features are in each plan
- **Sales Opportunities**: Highlighted accounts exceeding limits
- **Usage Statistics**: Dashboard cards for critical/warning alerts

### Email Notifications

Automated email system for capacity warnings:
- HTML email templates for 70% warnings
- HTML email templates for 100% critical alerts
- Includes upgrade suggestions and CTAs
- Tracks email sent status

### Feature Gating

Components and utilities for restricting features by plan:
- `FeatureGate` - Greys out UI with upgrade overlay
- `InlineFeatureGate` - Simple opacity/disable
- `UpgradeBadge` - Shows "Upgrade Required" badge
- Server-side feature checking utilities

## Database Schema

### Tables

- `subscription_plans` - Available plans with pricing and limits
- `features` - Application features that can be enabled/disabled
- `plan_features` - Maps features to plans
- `agent_usage` - Current usage counts per agent
- `usage_alerts` - Tracks capacity warnings
- `admin_notes` - Internal notes about accounts

### Functions

- `calculate_agent_usage(agent_uuid)` - Calculate current usage
- `has_feature_access(agent_uuid, feature_slug)` - Check feature access

## Setup Instructions

### 1. Run Database Migration

```bash
# Migration 065 creates all subscription tables
# Run this in your Supabase SQL editor or via CLI
```

### 2. Environment Variables

Add to `.env.local`:

```bash
# Cron job authentication
CRON_SECRET=your-random-secret-here

# Email service (choose one)
RESEND_API_KEY=your-resend-key
# OR
SENDGRID_API_KEY=your-sendgrid-key
# OR
AWS_SES_ACCESS_KEY=your-ses-key
```

### 3. Configure Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/usage-monitoring",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/send-usage-alerts",
      "schedule": "0 * * * *"
    }
  ]
}
```

- **Usage Monitoring**: Runs daily at 6 AM to check all accounts
- **Send Alerts**: Runs hourly to send pending email notifications

### 4. Configure Email Service

Edit `/src/lib/email/usage-alerts.ts` and uncomment your email provider:

```typescript
// Example with Resend
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: 'Real Estate Genie <notifications@realestategenie.app>',
  to: agent.email,
  subject,
  html
});
```

### 5. Assign Initial Subscriptions

Via Supabase SQL or admin UI:

```sql
-- Assign a plan to an agent
INSERT INTO agent_subscriptions (
  agent_id,
  subscription_plan_id,
  status,
  monthly_price,
  billing_cycle,
  current_period_start,
  current_period_end
)
VALUES (
  'agent-uuid-here',
  (SELECT id FROM subscription_plans WHERE slug = 'solo-agent-pro'),
  'active',
  49.00,
  'monthly',
  NOW(),
  NOW() + INTERVAL '1 month'
);
```

## Usage Examples

### Check Feature Access (Server Component)

```typescript
import { checkFeatureAccess } from "@/lib/subscriptions/server-utils";

export default async function MyPage() {
  const hasAdvancedAnalytics = await checkFeatureAccess("advanced-analytics");

  if (!hasAdvancedAnalytics) {
    redirect("/app/billing?feature=advanced-analytics");
  }

  // ... render page
}
```

### Feature Gate (Client Component)

```typescript
import { FeatureGate } from "@/lib/subscriptions/feature-gate";

export default function Dashboard({ hasTeamManagement }: Props) {
  return (
    <div>
      <FeatureGate
        hasAccess={hasTeamManagement}
        featureName="Team Management"
        upgradeMessage="Upgrade to Team Growth to manage multiple agents"
      >
        <TeamManagementPanel />
      </FeatureGate>
    </div>
  );
}
```

### Get User's Features

```typescript
import { getCurrentUserFeatures } from "@/lib/subscriptions/server-utils";

export default async function MyPage() {
  const features = await getCurrentUserFeatures();

  return (
    <div>
      {features.has('broker-dashboard') && <BrokerLink />}
      {features.has('advanced-analytics') && <AnalyticsLink />}
    </div>
  );
}
```

### Manual Usage Check

```typescript
import { getSubscriptionStatus } from "@/lib/subscriptions/utils";

const status = await getSubscriptionStatus(agentId);

if (status) {
  console.log(`Properties: ${status.usage.properties.current}/${status.usage.properties.limit}`);
  console.log(`Status: ${status.usage.properties.status}`); // 'ok', 'warning', or 'critical'
}
```

## Admin Workflows

### 1. View Sales Opportunities

Navigate to `/app/admin` - accounts exceeding limits are highlighted at the top with:
- Customer contact information
- Exceeded resources
- Email/view account buttons

### 2. Manage User Subscription

Go to `/app/admin/subscriptions` to:
- View all active subscriptions
- See usage vs. limits for each account
- Click "Manage" to change a user's plan

### 3. Update Plan Pricing

Go to `/app/admin/plans` to:
- View all subscription plans
- See subscriber counts
- Edit pricing and limits (future feature)

### 4. Manage Features

Go to `/app/admin/features` to:
- View feature matrix
- See which features are in each plan
- Enable/disable features per plan (future feature)

## Monitoring and Alerts

### Dashboard Cards

Admin overview shows:
- **Critical Alerts**: Accounts at/over 100% capacity
- **Warning Alerts**: Accounts at 70-99% capacity

### Email Flow

1. Usage monitoring cron runs daily
2. Checks all active subscriptions against limits
3. Creates alerts in `usage_alerts` table
4. Email cron runs hourly
5. Sends emails for unsent alerts
6. Marks alerts as `email_sent = true`

### Alert Resolution

Alerts are marked as resolved when:
- User upgrades to a higher plan
- User reduces usage below threshold
- Admin manually resolves via database

## Future Enhancements

- [ ] Stripe integration for automatic billing
- [ ] Self-service plan changes in billing page
- [ ] Plan/feature editing UI for admins
- [ ] Usage analytics and trends
- [ ] Overage billing for enterprise plans
- [ ] Trial period management
- [ ] Promo codes and discounts
- [ ] Annual billing with discounts
- [ ] Custom enterprise plan creation

## Troubleshooting

### Alerts Not Creating

Check that:
- Migration 065 ran successfully
- Agent has an active subscription
- Usage monitoring cron is configured
- `CRON_SECRET` env var is set

### Emails Not Sending

Check that:
- Email service API key is configured
- Email sending code is uncommented in `usage-alerts.ts`
- Send alerts cron is configured
- Check logs for email errors

### Feature Gates Not Working

Check that:
- Plan has features assigned in `plan_features` table
- Agent has active subscription
- Feature slugs match exactly
- RLS policies allow feature access

### Usage Not Calculating

Check that:
- `calculate_agent_usage()` function exists
- Agent has properties/leases in database
- RPC function has SECURITY DEFINER
- Function logic matches your data structure

## Support

For issues or questions about the subscription system:
1. Check database logs in Supabase
2. Review cron job logs in Vercel
3. Check email service logs
4. Review alert creation in `usage_alerts` table
