import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@/lib/error-logging";
import crypto from "crypto";

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { invitationId, token, fullName, password } = await request.json();

    if (!invitationId || !token || !fullName || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify invitation
    const { data: invitation, error: inviteError } = await admin
      .from("user_invitations")
      .select("id, email, token, status, expires_at")
      .eq("id", invitationId)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Invalid invitation" },
        { status: 404 }
      );
    }

    // Verify token
    if (invitation.token !== token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation already used" },
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
        { error: "Invitation expired" },
        { status: 400 }
      );
    }

    // Generate 6-digit verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes

    // Store verification code in invitation
    const { error: updateError } = await admin
      .from("user_invitations")
      .update({
        verification_code: verificationCode,
        verification_code_expires_at: expiresAt.toISOString(),
        verification_attempts: 0,
      })
      .eq("id", invitationId);

    if (updateError) {
      console.error("Failed to store verification code:", updateError);
      return NextResponse.json(
        { error: "Failed to generate verification code" },
        { status: 500 }
      );
    }

    // Send verification code via email
    try {
      // Dynamic import to prevent build-time module loading
      const { sendVerificationCode } = await import("@/lib/email/resend");

      await sendVerificationCode({
        to: invitation.email,
        code: verificationCode,
        expiresInMinutes: 15,
      });

      return NextResponse.json({
        success: true,
        message: "Verification code sent to your email",
      });
    } catch (emailError: any) {
      console.error("Failed to send verification email:", emailError);
      await logError({
        endpoint: "/api/accept-invite/send-code",
        errorMessage: `Failed to send verification code: ${emailError.message}`,
        severity: "error",
      });

      return NextResponse.json(
        { error: "Failed to send verification code. Please try again." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    await logError({
      endpoint: "/api/accept-invite/send-code",
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
