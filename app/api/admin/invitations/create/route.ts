import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
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
    const supabase = await supabaseServer();

    // Check admin authorization
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("agents")
      .select("is_admin, account_status, display_name, email")
      .eq("id", user.id)
      .single();

    if (!adminUser?.is_admin || adminUser.account_status !== "active") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingAgent } = await admin
      .from("agents")
      .select("id")
      .eq("email", email)
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation
    const { data: existingInvite } = await admin
      .from("user_invitations")
      .select("id")
      .eq("email", email)
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { error: "There is already a pending invitation for this email" },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Create invitation
    const { data: invitation, error: inviteError } = await admin
      .from("user_invitations")
      .insert({
        email,
        token,
        invited_by: user.id,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError || !invitation) {
      await logError({
        agentId: user.id,
        endpoint: "/api/admin/invitations/create",
        errorMessage: inviteError?.message || "Failed to create invitation",
        severity: "error",
      });
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    // Generate invitation URL
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const inviteUrl = `${origin}/accept-invite/${invitation.id}?token=${token}`;

    // Send invitation email via Resend
    try {
      // Dynamic import to prevent build-time module loading
      const { sendInvitationEmail } = await import("@/lib/email/resend");

      await sendInvitationEmail({
        to: email,
        invitationUrl: inviteUrl,
        invitedBy: adminUser.display_name || adminUser.email,
        expiresAt: new Date(invitation.expires_at),
      });

      console.log("Invitation email sent successfully to:", email);
    } catch (emailError: any) {
      // Log email error but don't fail the invitation creation
      console.error("Failed to send invitation email:", emailError);
      await logError({
        agentId: user.id,
        endpoint: "/api/admin/invitations/create",
        errorMessage: `Failed to send invitation email: ${emailError.message}`,
        severity: "warning",
      });

      // Return success but indicate email wasn't sent
      return NextResponse.json({
        success: true,
        inviteUrl,
        invitation,
        emailSent: false,
        warning: "Invitation created but email could not be sent. Please share the link manually.",
      });
    }

    return NextResponse.json({
      success: true,
      inviteUrl,
      invitation,
      emailSent: true,
    });
  } catch (error: any) {
    await logError({
      endpoint: "/api/admin/invitations/create",
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
