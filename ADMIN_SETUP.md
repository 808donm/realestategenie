# Admin System Setup Guide

This guide explains how to configure and use the admin system for Real Estate Genie.

## Overview

The admin system provides:
- **User Management**: Enable/disable accounts, grant admin privileges, delete users
- **Invitation System**: Invite new users via secure email invitations
- **Error Logging**: Monitor and troubleshoot application errors

## Initial Setup

### 1. Run Database Migration

The admin system requires database tables and policies. Run the migration:

```sql
-- In Supabase SQL Editor, run:
-- /supabase/migrations/014_admin_system.sql
```

This migration:
- Adds `is_admin` and `account_status` columns to `agents` table
- Creates `user_invitations` table for invitation management
- Creates `error_logs` table for error tracking
- Sets up Row Level Security (RLS) policies
- Sets `dmangiarelli@ent-techsolutions.com` as initial super admin

### 2. Disable Public Sign-ups

To make the app invitation-only:

1. Go to Supabase Dashboard → Authentication → Settings
2. Find "Enable email signup" and toggle it **OFF**
3. This ensures only invited users can create accounts

### 3. Configure Error Log Cleanup (Optional)

Error logs are retained for 90 days by default. To automatically clean up old logs:

**Option A: Using Supabase pg_cron (Recommended)**

```sql
-- In Supabase SQL Editor:
SELECT cron.schedule(
  'delete-old-error-logs',
  '0 2 * * *', -- Run daily at 2 AM
  $$
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);
```

**Option B: Manual Cleanup**

Periodically run this SQL query:

```sql
DELETE FROM error_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

## Using the Admin System

### Accessing Admin Dashboard

1. Sign in as an admin user
2. Navigate to `/app/admin`
3. You'll see the admin sidebar with:
   - **Overview**: System statistics
   - **Users**: Manage user accounts
   - **Invitations**: Send and manage invitations
   - **Error Logs**: View application errors

### User Management

**View All Users**
- Go to `/app/admin/users`
- See all registered users with their status

**Enable/Disable Accounts**
- Click "Disable" to prevent a user from signing in
- Click "Enable" to restore access
- Disabled users cannot access the app

**Grant/Revoke Admin Privileges**
- Click "Make Admin" to grant admin access
- Click "Remove Admin" to revoke admin privileges
- Admins can manage other users and view error logs

**Delete Users**
- Click "Delete User"
- Type the user's email to confirm
- This permanently removes the user from both `agents` table and Supabase Auth

### Invitation System

**Send an Invitation**

1. Go to `/app/admin/invitations`
2. Click "Create Invitation"
3. Enter the recipient's email address
4. Copy the generated invitation link
5. Send the link to the recipient (via GHL, email, etc.)

**Invitation Details**
- Invitations expire after 7 days
- Each invitation has a unique secure token
- Recipients create their own password during registration
- Once accepted, invitation status changes to "accepted"

**Invitation States**
- **Pending**: Not yet accepted
- **Accepted**: User successfully created account
- **Expired**: Invitation passed expiration date
- **Cancelled**: Admin cancelled the invitation

**Cancel an Invitation**
- Find the pending invitation
- Click "Cancel"
- The invitation link will no longer work

### Error Logging

**View Error Logs**
- Go to `/app/admin/error-logs`
- See all application errors with severity, endpoint, and message

**Filter Logs**
- Filter by severity: Critical, Error, Warning, Info
- Search by error message, endpoint, or user email
- Click on any row to expand and see full details

**Severity Levels**
- **Critical**: System-breaking errors requiring immediate attention
- **Error**: Errors that affect functionality but don't break the system
- **Warning**: Potential issues that should be monitored
- **Info**: Informational logging for debugging

**Auto-Refresh**
- Enable "Auto-refresh" to reload logs every 30 seconds
- Useful for monitoring errors in real-time

## Security Considerations

### Row Level Security (RLS)

All admin tables have RLS policies:

**user_invitations**
- Only admins can create, view, and manage invitations
- Public users can verify invitation tokens (for registration)

**error_logs**
- Only admins can view error logs
- System can insert logs (via service role)

**agents**
- Admins can view all users
- Users can only view their own profile
- Only admins can update user status and admin privileges

### Service Role Usage

The admin system uses the service role key for:
- Creating user invitations (bypasses RLS)
- Processing invitation acceptance (creates auth users)
- Logging errors (system-level logging)

⚠️ **Never expose the service role key to the client!**

All service role usage is in API routes or server components.

## Troubleshooting

### "Unauthorized" when accessing /app/admin

**Cause**: User is not an admin or account is disabled

**Solution**:
1. Check `agents` table for the user
2. Ensure `is_admin = TRUE`
3. Ensure `account_status = 'active'`
4. Run this SQL to grant admin:
```sql
UPDATE agents
SET is_admin = TRUE, account_status = 'active'
WHERE email = 'user@example.com';
```

### Invitation link shows "Invalid or expired invitation"

**Causes**:
- Invitation has expired (> 7 days old)
- Token parameter is missing from URL
- Invitation ID doesn't exist
- Invitation already accepted

**Solution**:
- Create a new invitation
- Ensure URL format: `/accept-invite/{id}?token={token}`
- Check invitation status in admin dashboard

### Errors not appearing in error logs

**Cause**: Error logging not integrated in that endpoint

**Solution**:
Use the `logError` utility in API routes:

```typescript
import { logError } from "@/lib/error-logging";

try {
  // Your code
} catch (error: any) {
  await logError({
    agentId: user?.id,
    endpoint: "/api/your-endpoint",
    errorMessage: error.message,
    stackTrace: error.stack,
    severity: "error",
  });

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

### User can't sign up (no invitation)

**Cause**: Public sign-ups are disabled (by design)

**Solution**:
- Admin must create an invitation
- Send invitation link to the user
- User registers via the invitation link

## API Routes

### Admin API Endpoints

All admin endpoints require authentication and admin privileges:

- `POST /api/admin/users/update-status` - Enable/disable user accounts
- `POST /api/admin/users/toggle-admin` - Grant/revoke admin privileges
- `POST /api/admin/users/delete` - Delete user account
- `POST /api/admin/invitations/create` - Create user invitation

### Public API Endpoints

These endpoints are accessible without authentication:

- `POST /api/accept-invite` - Process invitation acceptance (creates user)

## Database Schema

### agents table

```sql
- id: UUID (primary key, references auth.users)
- email: TEXT
- display_name: TEXT
- is_admin: BOOLEAN (default: false)
- account_status: TEXT (active/disabled/pending)
- created_at: TIMESTAMPTZ
```

### user_invitations table

```sql
- id: UUID (primary key)
- email: TEXT
- token: TEXT (unique)
- invited_by: UUID (references agents)
- status: TEXT (pending/accepted/expired/cancelled)
- expires_at: TIMESTAMPTZ
- accepted_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

### error_logs table

```sql
- id: UUID (primary key)
- agent_id: UUID (references agents)
- endpoint: TEXT
- error_message: TEXT
- error_code: TEXT
- stack_trace: TEXT
- user_agent: TEXT
- severity: TEXT (info/warning/error/critical)
- created_at: TIMESTAMPTZ
```

## Best Practices

1. **Regularly review error logs** to catch issues early
2. **Limit admin users** to only those who need access
3. **Set up error log cleanup** to avoid database bloat
4. **Use appropriate severity levels** when logging errors
5. **Monitor invitation expiration** and resend if needed
6. **Disable accounts** instead of deleting when possible (preserves audit trail)

## Support

For questions or issues:
- Check error logs at `/app/admin/error-logs`
- Review Supabase logs in the Supabase Dashboard
- Check Vercel deployment logs for runtime errors
