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
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
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

    if (authError || !authUser.user) {
      console.error("Error creating auth user:", authError);
      return NextResponse.json(
        { error: "Failed to create account. Please try again or contact support." },
        { status: 500 }
      );
    }

    console.log(`✅ Created auth user for tenant: ${authUser.user.id}`);

    // Create tenant_users record
    const { error: tenantUserError } = await supabase
      .from("tenant_users")
      .insert({
        id: authUser.user.id,
        lease_id: invitation.lease_id,
        email: invitation.email,
        phone: invitation.phone,
        registered_at: new Date().toISOString(),
      });

    if (tenantUserError) {
      console.error("Error creating tenant user:", tenantUserError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: "Failed to complete registration" },
        { status: 500 }
      );
    }

    // Create default notification preferences
    await supabase
      .from("tenant_notification_preferences")
      .upsert({
        tenant_user_id: authUser.user.id,
      }, {
        onConflict: "tenant_user_id",
        ignoreDuplicates: true,
      });

    // Mark invitation as registered
    const { error: updateInvitationError } = await supabase
      .from("tenant_invitations")
      .update({
        registered_at: new Date().toISOString(),
        auth_user_id: authUser.user.id,
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
