import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Tenant Registration API
 *
 * Completes tenant registration after clicking invitation link
 * Sets password and marks account as registered
 *
 * POST /api/tenant/register
 * Body: { token: string, password: string }
 */

// Use service role to update tenant user
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 12) {
      return NextResponse.json(
        { error: "Password must be at least 12 characters" },
        { status: 400 }
      );
    }

    // Find invitation by token
    const { data: invitation, error: invitationError } = await supabase
      .from("tenant_invitations")
      .select("*, pm_leases(*)")
      .eq("invitation_token", token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation token" },
        { status: 400 }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(invitation.invitation_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation token has expired" },
        { status: 400 }
      );
    }

    // Check if already registered
    if (invitation.registered_at) {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 }
      );
    }

    // Create auth user NOW (during registration)
    let authUserId: string;
    let authUserEmail: string;

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: "tenant",
        name: invitation.tenant_name,
        lease_id: invitation.lease_id,
      },
    });

    if (authError) {
      // User might already exist from previous failed attempt
      console.log(`⚠️ Auth user creation failed: ${authError.message}`);
      console.log(`🔍 Attempting to find existing auth user for ${invitation.email}...`);

      // Try to find existing user
      try {
        const { data: sqlResult } = await supabase.rpc('get_auth_user_by_email', {
          user_email: invitation.email
        });

        console.log(`🔍 SQL lookup result:`, sqlResult);

        if (sqlResult && sqlResult.length > 0) {
          const existingUser = sqlResult[0];
          authUserId = existingUser.id;
          authUserEmail = existingUser.email;
          console.log(`✅ Found existing auth user: ${authUserId}`);
          console.log(`   - Deleted at: ${existingUser.deleted_at || 'not deleted'}`);
          console.log(`   - Confirmed at: ${existingUser.confirmed_at || 'not confirmed'}`);

          // If user was soft-deleted, try to delete permanently first
          if (existingUser.deleted_at) {
            console.log(`⚠️ User was soft-deleted, attempting permanent deletion...`);
            const { error: deleteError } = await supabase.auth.admin.deleteUser(authUserId);
            if (deleteError) {
              console.error("Failed to permanently delete user:", deleteError);
            } else {
              console.log(`✅ Permanently deleted old user, will retry creation`);

              // Retry creating the user after deletion
              const { data: retryUser, error: retryError } = await supabase.auth.admin.createUser({
                email: invitation.email,
                password: password,
                email_confirm: true,
                user_metadata: {
                  role: "tenant",
                  name: invitation.tenant_name,
                  lease_id: invitation.lease_id,
                },
              });

              if (retryError || !retryUser.user) {
                console.error("Retry creation also failed:", retryError);
                return NextResponse.json(
                  { error: "Failed to create account. Please contact support." },
                  { status: 500 }
                );
              }

              authUserId = retryUser.user.id;
              authUserEmail = retryUser.user.email!;
              console.log(`✅ Successfully created user after deletion: ${authUserId}`);
            }
          } else {
            // User exists and is not deleted, update password
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              authUserId,
              { password: password }
            );

            if (updateError) {
              console.error("Error updating password:", updateError);
              return NextResponse.json(
                { error: "Failed to set password. Please contact support." },
                { status: 500 }
              );
            }

            console.log(`✅ Updated password for existing user`);
          }
        } else {
          console.error("❌ Auth user creation failed and user not found in database");
          console.error("   This suggests a database constraint or trigger is preventing user creation");
          return NextResponse.json(
            { error: "Failed to create account. Please contact support." },
            { status: 500 }
          );
        }
      } catch (lookupErr) {
        console.error("Error looking up existing user:", lookupErr);
        return NextResponse.json(
          { error: "Failed to create account. Please contact support." },
          { status: 500 }
        );
      }
    } else if (authUser.user) {
      authUserId = authUser.user.id;
      authUserEmail = authUser.user.email!;
      console.log(`✅ Created new auth user for tenant: ${authUserId}`);
    } else {
      console.error("❌ No auth user returned");
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    // Check if tenant_users record already exists (from previous failed attempt)
    const { data: existingTenantUser } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("id", authUserId)
      .maybeSingle();

    if (!existingTenantUser) {
      // Create tenant_users record
      const { error: tenantUserError } = await supabase
        .from("tenant_users")
        .insert({
          id: authUserId,
          lease_id: invitation.lease_id,
          email: invitation.email,
          phone: invitation.phone,
          registered_at: new Date().toISOString(),
        });

      if (tenantUserError) {
        console.error("Error creating tenant user:", tenantUserError);
        // Only rollback if we just created the auth user
        if (!authError) {
          await supabase.auth.admin.deleteUser(authUserId);
        }
        return NextResponse.json(
          { error: "Failed to complete registration" },
          { status: 500 }
        );
      }

      console.log(`✅ Created tenant_users record`);
    } else {
      console.log(`✅ tenant_users record already exists`);
    }

    // Create default notification preferences (upsert to handle duplicates)
    await supabase
      .from("tenant_notification_preferences")
      .upsert({
        tenant_user_id: authUserId,
      }, {
        onConflict: "tenant_user_id",
        ignoreDuplicates: true,
      });

    // Mark invitation as registered
    const { error: updateInvitationError } = await supabase
      .from("tenant_invitations")
      .update({
        registered_at: new Date().toISOString(),
        auth_user_id: authUserId,
        invitation_token: null, // Invalidate token after use
      })
      .eq("id", invitation.id);

    if (updateInvitationError) {
      console.error("Error updating invitation:", updateInvitationError);
      // Non-fatal, registration succeeded
    }

    console.log(`✅ Tenant registration complete for ${invitation.email}`);

    return NextResponse.json({
      success: true,
      message: "Registration complete! You can now log in.",
      email: invitation.email,
    });
  } catch (error) {
    console.error("Error in tenant registration route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
