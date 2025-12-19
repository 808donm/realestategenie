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
    const { invitationId, email, password, fullName, verificationCode } = await request.json();

    if (!invitationId || !email || !password || !fullName || !verificationCode) {
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

    // Check invitation expiration
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

    // Verify the verification code
    if (!invitation.verification_code) {
      return NextResponse.json(
        { error: "Verification code not generated. Please request a new code." },
        { status: 400 }
      );
    }

    // Check verification code expiration
    if (new Date(invitation.verification_code_expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Check verification attempts (max 5 attempts)
    if (invitation.verification_attempts >= 5) {
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 400 }
      );
    }

    // Verify code matches
    if (invitation.verification_code !== verificationCode.trim()) {
      // Increment failed attempts
      await admin
        .from("user_invitations")
        .update({
          verification_attempts: invitation.verification_attempts + 1,
        })
        .eq("id", invitationId);

      return NextResponse.json(
        { error: "Invalid verification code. Please try again." },
        { status: 400 }
      );
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find((u) => u.email === email);

    if (existingAuthUser) {
      // Delete existing auth user if found
      console.log(`Deleting existing auth user for ${email}`);
      await admin.auth.admin.deleteUser(existingAuthUser.id);
    }

    // Check if agent record exists
    const { data: existingAgent } = await admin
      .from("agents")
      .select("id")
      .eq("email", email)
      .single();

    if (existingAgent) {
      // Delete existing agent record
      console.log(`Deleting existing agent record for ${email}`);
      await admin.from("agents").delete().eq("id", existingAgent.id);
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
      console.error("Auth creation error:", authError);
      await logError({
        endpoint: "/api/accept-invite",
        errorMessage: authError?.message || "Failed to create user",
        severity: "error",
      });
      return NextResponse.json(
        { error: `Database error creating new user: ${authError?.message || "Unknown error"}` },
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
      console.error("Agent creation error:", agentError);
      // Rollback: delete the auth user
      await admin.auth.admin.deleteUser(authData.user.id);

      await logError({
        endpoint: "/api/accept-invite",
        errorMessage: agentError.message,
        severity: "error",
      });
      return NextResponse.json(
        { error: `Database error creating agent profile: ${agentError.message}` },
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
