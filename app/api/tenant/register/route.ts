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

    // Find tenant user by invitation token
    const { data: tenantUser, error: tenantError } = await supabase
      .from("tenant_users")
      .select("*, pm_leases(*)")
      .eq("invitation_token", token)
      .single();

    if (tenantError || !tenantUser) {
      return NextResponse.json(
        { error: "Invalid or expired invitation token" },
        { status: 400 }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(tenantUser.invitation_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation token has expired" },
        { status: 400 }
      );
    }

    // Check if already registered
    if (tenantUser.registered_at) {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 }
      );
    }

    // Update auth user with password
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
      tenantUser.id,
      { password: password }
    );

    if (updateAuthError) {
      console.error("Error updating auth user:", updateAuthError);
      return NextResponse.json(
        { error: "Failed to set password" },
        { status: 500 }
      );
    }

    // Mark tenant user as registered
    const { error: updateTenantError } = await supabase
      .from("tenant_users")
      .update({
        registered_at: new Date().toISOString(),
        invitation_token: null, // Invalidate token after use
        invitation_expires_at: null,
      })
      .eq("id", tenantUser.id);

    if (updateTenantError) {
      console.error("Error updating tenant user:", updateTenantError);
      return NextResponse.json(
        { error: "Failed to complete registration" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Registration complete! You can now log in.",
      email: tenantUser.email,
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
