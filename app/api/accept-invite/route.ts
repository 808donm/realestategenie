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

    // Check if user already exists in auth using getUserByEmail (more reliable)
    try {
      const { data: existingAuthUser } = await admin.auth.admin.getUserByEmail(email);

      if (existingAuthUser?.user) {
        console.log(`Found existing auth user for ${email}, deleting...`);

        // Delete with shouldSoftDelete: false to ensure hard delete
        const { error: deleteAuthError } = await admin.auth.admin.deleteUser(
          existingAuthUser.user.id,
          false // shouldSoftDelete = false for hard delete
        );

        if (deleteAuthError) {
          console.error("Failed to delete existing auth user:", deleteAuthError);
          return NextResponse.json(
            { error: `Cannot create account: An account with this email already exists and could not be removed. Please contact support.` },
            { status: 409 }
          );
        } else {
          console.log(`Successfully deleted auth user for ${email}`);

          // Wait a moment for cascade deletes to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (e: any) {
      // User doesn't exist, this is fine
      console.log(`No existing auth user found for ${email}:`, e.message);
    }

    // Double-check agent record doesn't exist (should be cascade deleted)
    const { data: existingAgent } = await admin
      .from("agents")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingAgent) {
      console.log(`Agent record still exists for ${email}, manually deleting...`);
      const { error: deleteAgentError } = await admin
        .from("agents")
        .delete()
        .eq("id", existingAgent.id);

      if (deleteAgentError) {
        console.error("Failed to delete existing agent:", deleteAgentError);
        return NextResponse.json(
          { error: `Cannot create account: Database cleanup failed. Please contact support.` },
          { status: 500 }
        );
      } else {
        console.log(`Successfully deleted agent record for ${email}`);
      }
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
