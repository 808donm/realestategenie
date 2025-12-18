import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@/lib/error-logging";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { invitationId, email, password, fullName } = await request.json();

    if (!invitationId || !email || !password || !fullName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify invitation
    const { data: invitation, error: inviteError } = await admin
      .from("user_invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("email", email)
      .eq("status", "pending")
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      await admin
        .from("user_invitations")
        .update({ status: "expired" })
        .eq("id", invitationId);

      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError || !authData.user) {
      await logError({
        endpoint: "/api/accept-invite",
        errorMessage: authError?.message || "Failed to create user",
        severity: "error",
      });
      return NextResponse.json(
        { error: authError?.message || "Failed to create account" },
        { status: 500 }
      );
    }

    // Create agent profile
    const { error: agentError } = await admin.from("agents").insert({
      id: authData.user.id,
      email,
      display_name: fullName,
      is_admin: false,
      account_status: "active",
    });

    if (agentError) {
      // Rollback: delete the auth user
      await admin.auth.admin.deleteUser(authData.user.id);

      await logError({
        endpoint: "/api/accept-invite",
        errorMessage: agentError.message,
        severity: "error",
      });
      return NextResponse.json(
        { error: "Failed to create agent profile" },
        { status: 500 }
      );
    }

    // Mark invitation as accepted
    await admin
      .from("user_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitationId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await logError({
      endpoint: "/api/accept-invite",
      errorMessage: error.message,
      stackTrace: error.stack,
      severity: "error",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
