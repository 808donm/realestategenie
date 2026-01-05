# Database Migrations

This directory contains SQL migrations for the Real Estate Genie application.

## How to Apply Migrations

### Option 1: Using Supabase CLI (Recommended)

1. Install Supabase CLI if not already installed:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Apply all migrations:
   ```bash
   supabase db push
   ```

### Option 2: Manually via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file in order:
   - `001_feature_flags.sql`
   - `002_agents_branding.sql`
   - `003_teams_workspaces.sql`
   - `004_open_house_fact_sheet.sql`
   - `005_lead_handling_rules.sql`
   - `006_integrations.sql`
   - `007_webhook_logs.sql`
4. Run each migration

### Option 3: Using Supabase Migration Tool

```bash
cd supabase/migrations
for file in *.sql; do
  supabase db execute --file "$file"
done
```

## Migrations Overview

### 001_feature_flags.sql
- Creates `feature_flags` table
- Sets up RLS policies
- Creates trigger to auto-create flags for new agents
- **Purpose:** Progressive feature rollout system

### 002_agents_branding.sql
- Extends `agents` table with branding fields:
  - `headshot_url` - Agent photo URL
  - `brokerage_name` - Company name
  - `bio` - Short bio
  - `theme_color` - Brand color (#hex)
  - `disclaimer_text` - Legal disclaimer
  - `landing_page_enabled` - Toggle landing page
- **Purpose:** Agent customization and branding

### 003_teams_workspaces.sql
- Creates `teams` table
- Creates `team_members` table with roles (owner/admin/member)
- Sets up RLS policies for team access
- Creates trigger to auto-add owner to team
- **Purpose:** Multi-agent team support

### 004_open_house_fact_sheet.sql
- Extends `open_house_events` with property details:
  - `beds`, `baths`, `sqft`, `price`
  - `key_features` (array)
  - `hoa_fee`, `parking_notes`, `showing_notes`
  - `disclosure_url`, `offer_deadline`
  - `flyer_url`, `flyer_enabled`
  - `listing_description`
  - `verified_by`, `verified_at`
- **Purpose:** Structured property information

### 005_lead_handling_rules.sql
- Extends `open_house_events` with lead routing rules:
  - `represented_send_info_only`
  - `unrepresented_ask_reach_out`
  - `unrepresented_notify_immediately`
  - `unrepresented_start_workflows`
  - `consent_sms_text`, `consent_email_text`
  - `consent_version`
- **Purpose:** Automated lead handling based on representation status

### 006_integrations.sql
- Creates `integrations` table (GHL, n8n, IDX)
- Creates `integration_mappings` table (GHL pipelines/stages)
- Sets up RLS policies
- **Purpose:** Third-party integration management

### 007_webhook_logs.sql
- Creates `webhook_logs` table
- Tracks webhook deliveries, retries, errors
- Sets up RLS policies
- **Purpose:** Webhook debugging and monitoring

## Rollback

To rollback a migration, you'll need to create a reverse migration. For example:

```sql
-- Rollback 007_webhook_logs.sql
DROP TABLE IF EXISTS webhook_logs CASCADE;
```

## Environment Variables

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## After Migration

1. **Test RLS policies:**
   - Create a test agent account
   - Verify they can only access their own data

2. **Verify triggers:**
   - Create a new agent → feature flags should auto-create
   - Create a team → owner should be added as team member

3. **Check indexes:**
   ```sql
   SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public';
   ```

## Common Issues

### Issue: "relation does not exist"
- **Solution:** Ensure migrations run in order (001, 002, 003...)

### Issue: "permission denied"
- **Solution:** Use service role key for migrations

### Issue: RLS blocking queries
- **Solution:** Check auth.uid() is set correctly, or use service role

## Support

For migration issues, check:
- Supabase logs in dashboard
- SQL Editor error messages
- RLS policies (disable temporarily for debugging)
