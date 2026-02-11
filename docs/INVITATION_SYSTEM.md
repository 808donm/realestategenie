# Invitation-Only Authentication System

## Overview

The Real Estate Genie uses a strict invitation-only authentication system to control access to the platform. New users cannot create accounts without receiving a valid invitation from an administrator.

## How It Works

### 1. Admin Creates Invitation

**Path**: Admin Dashboard → Invitations → Create New Invitation

**Process**:
- Admin enters the email address of the person to invite
- System generates:
  - Unique invitation ID (UUID)
  - Secure token for URL validation
  - Expiration timestamp (default: 7 days)
  - Status: `pending`
- Email sent to invitee with link: `/accept-invite/[id]?token=[token]`

**Database**: `user_invitations` table

### 2. User Accepts Invitation

**Path**: User clicks email link → `/accept-invite/[id]?token=[token]`

**Validation Steps**:
1. ✓ Invitation ID exists in database
2. ✓ Token matches invitation record
3. ✓ Invitation has not expired
4. ✓ Invitation status is `pending` (not already used)

**Registration Flow**:
1. User enters full name and password
2. User receives email verification code (6 digits, expires in 15 minutes)
3. User enters verification code
4. System validates code (max 5 attempts)
5. Account created in Supabase Auth
6. Database trigger validates invitation
7. Agent profile created
8. Invitation marked as `accepted`

### 3. Database Trigger Validation

**Trigger**: `on_auth_user_created` (fires after any auth user creation)

**Function**: `create_agent_profile()`

**Logic**:
```sql
1. Check if agent profile already exists
   - If YES: Allow (existing user signing back in)
   - If NO: Continue to step 2

2. Look for valid invitation
   - Query user_invitations WHERE:
     - email matches
     - status IN ('pending', 'accepted')
     - expires_at > NOW()

3. If NO invitation found:
   - Log security warning
   - Delete auth user immediately
   - Raise exception: "Account creation requires a valid invitation"

4. If invitation found:
   - Create agent profile with account_status='active'
   - Mark invitation as 'accepted'
   - Update accepted_at timestamp
```

### 4. Existing Users Sign In

**Path**: `/signin`

**Methods Available**:
- OAuth (Google, Facebook, LinkedIn)
- Magic link (email OTP)

**How It Works**:
- User clicks sign-in method
- Supabase checks if auth.users record exists
- **If EXISTS**: Sign in successful (no trigger fired)
- **If NOT EXISTS**: Trigger fires → No invitation found → Account deleted → Error shown

## Security Features

### ✅ Prevents Unauthorized Access
- OAuth sign-in only works for existing accounts
- Magic links only work for existing accounts
- New accounts MUST have valid invitation

### ✅ Invitation Expiration
- Invitations expire after set time (default: 7 days)
- Expired invitations automatically marked with status='expired'
- Cannot be used after expiration

### ✅ One-Time Use
- Invitations can only be accepted once
- Status changes from 'pending' → 'accepted'
- Subsequent attempts redirect to login

### ✅ Email Verification
- 6-digit verification code sent to email
- Code expires in 15 minutes
- Maximum 5 verification attempts
- Prevents automated abuse

### ✅ Security Logging
- Failed account creation attempts logged to `error_logs` table
- Includes email address and timestamp
- Severity level: 'warning'
- Admins can review unauthorized access attempts

## Database Tables

### `user_invitations`
```sql
- id: UUID (primary key)
- email: TEXT (invited user's email)
- token: TEXT (secure URL token)
- invited_by: UUID (admin who created invitation)
- status: TEXT ('pending', 'accepted', 'expired', 'cancelled')
- expires_at: TIMESTAMPTZ
- accepted_at: TIMESTAMPTZ
- verification_code: TEXT (6-digit code)
- verification_code_expires_at: TIMESTAMPTZ
- verification_attempts: INTEGER
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `agents`
```sql
- id: UUID (references auth.users.id)
- email: TEXT
- display_name: TEXT
- account_status: TEXT ('active', 'disabled', 'pending')
- is_admin: BOOLEAN
- ... (other profile fields)
```

## User Flows

### New User (First Time)
```
1. Admin sends invitation
   ↓
2. User receives email with link
   ↓
3. User clicks link → /accept-invite/[id]?token=[token]
   ↓
4. User enters name, password
   ↓
5. User receives verification code email
   ↓
6. User enters code
   ↓
7. Account created & validated
   ↓
8. Redirected to /signin
   ↓
9. User signs in with OAuth or magic link
   ↓
10. Access granted to dashboard
```

### Existing User (Returning)
```
1. User goes to /signin
   ↓
2. User clicks OAuth or enters email for magic link
   ↓
3. Supabase authenticates existing account
   ↓
4. No trigger validation (agent already exists)
   ↓
5. Access granted to dashboard
```

### Unauthorized User (No Invitation)
```
1. User goes to /signin
   ↓
2. User clicks OAuth (Google, etc.)
   ↓
3. OAuth creates auth.users record
   ↓
4. Trigger fires: on_auth_user_created
   ↓
5. No invitation found for email
   ↓
6. Auth user deleted immediately
   ↓
7. Exception raised
   ↓
8. User sees error: "Account creation requires a valid invitation"
```

## Admin Management

### Creating Invitations
- Navigate to: `/app/admin/invitations`
- Click "Create Invitation"
- Enter email address
- System sends email automatically
- Invitation appears in admin table

### Viewing Invitations
- Filter by status (pending, accepted, expired)
- See who created each invitation
- View creation and expiration dates
- Check if/when invitation was accepted

### Cancelling Invitations
- Click delete/cancel on invitation
- Status changes to 'cancelled'
- Link becomes invalid
- User cannot accept cancelled invitations

## Troubleshooting

### "Account creation requires a valid invitation"
**Cause**: User tried to sign in without a valid invitation
**Solution**: Admin must create invitation for that email address

### "Invitation has expired"
**Cause**: Invitation link is older than expiration period (7 days)
**Solution**: Admin must create a new invitation

### "Invalid verification code"
**Cause**: User entered wrong 6-digit code
**Solution**: Request new code or check email for correct code

### "Too many failed attempts"
**Cause**: User failed verification code 5+ times
**Solution**: Request new verification code

## Configuration

### Invitation Expiration
Default: 7 days from creation
To change: Update expiration logic in `/api/admin/invitations/create/route.ts`

### Verification Code Expiration
Default: 15 minutes
To change: Update logic in `/api/accept-invite/send-code/route.ts`

### Max Verification Attempts
Default: 5 attempts
To change: Update logic in `/api/accept-invite/route.ts`

## Related Files

### Database
- `supabase/migrations/014_admin_system.sql` - Creates user_invitations table
- `supabase/migrations/016_add_verification_codes.sql` - Adds verification code fields
- `supabase/migrations/038_invitation_only_auth.sql` - Enforces invitation validation

### API Routes
- `/app/api/admin/invitations/create/route.ts` - Create invitations
- `/app/api/accept-invite/route.ts` - Accept invitation and create account
- `/app/api/accept-invite/send-code/route.ts` - Send verification code

### Frontend
- `/app/signin/signin-client.tsx` - Sign-in page with invitation notice
- `/app/accept-invite/[id]/page.tsx` - Invitation acceptance page
- `/app/accept-invite/[id]/accept-invite.client.tsx` - Acceptance form
- `/app/app/admin/invitations/page.tsx` - Admin invitation management

### Database Functions
- `create_agent_profile()` - Trigger function with invitation validation
- `on_auth_user_created` - Trigger that fires after auth user creation
