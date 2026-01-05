import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@/lib/error-logging";
import crypto from "crypto";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, phone } = await request.json();

    // Validation
    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: "All fields are required: Full Name, Email, and Phone" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Check if email already has an invitation
    const { data: existingInvitation } = await admin
      .from("user_invitations")
      .select("id, status")
      .eq("email", email)
      .in("status", ["pending", "accepted"])
      .single();

    if (existingInvitation) {
      if (existingInvitation.status === "accepted") {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in." },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: "A pending invitation already exists for this email. Please check your inbox." },
          { status: 400 }
        );
      }
    }

    // Check if user already exists in auth
    const { data: usersList } = await admin.auth.admin.listUsers();
    const existingAuthUser = usersList?.users?.find((u) => u.email === email);

    if (existingAuthUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 400 }
      );
    }

    // Generate secure token for invitation
    const token = crypto.randomBytes(32).toString("hex");

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invitation, error: inviteError } = await admin
      .from("user_invitations")
      .insert({
        email,
        token,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        invited_by: null, // Self-registration, no admin inviter
      })
      .select()
      .single();

    if (inviteError || !invitation) {
      console.error("Failed to create invitation:", inviteError);
      await logError({
        endpoint: "/api/register",
        errorMessage: inviteError?.message || "Failed to create invitation",
        severity: "error",
      });

      return NextResponse.json(
        { error: "Failed to create account invitation" },
        { status: 500 }
      );
    }

    // Store phone and full name in a temporary table or metadata
    // For now, we'll pass them through the URL and use them in the accept-invite flow
    // Alternatively, we could add fields to user_invitations table to store this

    console.log(`Self-registration invitation created for ${email}`);

    // Return invitation details for redirect
    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
      token: invitation.token,
      message: "Please complete your account setup",
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    await logError({
      endpoint: "/api/register",
      errorMessage: error.message,
      stackTrace: error.stack,
      severity: "error",
    });

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
