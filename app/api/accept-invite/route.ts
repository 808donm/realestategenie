import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@/lib/error-logging";
import { createGHLSubAccount } from "@/lib/integrations/ghl-sub-account";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export async function POST(request: NextRequest) {
  try {
    const { invitationId, email, password, fullName, verificationCode } = await request.json();

    if (!invitationId || !email || !password || !fullName || !verificationCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
    }

    // Check invitation expiration
    if (new Date(invitation.expires_at) < new Date()) {
      await admin.from("user_invitations").update({ status: "expired" }).eq("id", invitationId);

      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
    }

    // Verify the verification code
    if (!invitation.verification_code) {
      return NextResponse.json(
        { error: "Verification code not generated. Please request a new code." },
        { status: 400 },
      );
    }

    // Check verification code expiration
    if (new Date(invitation.verification_code_expires_at) < new Date()) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new code." }, { status: 400 });
    }

    // Check verification attempts (max 5 attempts)
    if (invitation.verification_attempts >= 5) {
      return NextResponse.json({ error: "Too many failed attempts. Please request a new code." }, { status: 400 });
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

      return NextResponse.json({ error: "Invalid verification code. Please try again." }, { status: 400 });
    }

    // Check if user already exists as an agent or in auth
    const { data: usersList } = await admin.auth.admin.listUsers();
    const existingAuthUser = usersList?.users?.find((u) => u.email === email);
    const { data: existingAgent } = await admin.from("agents").select("id").eq("email", email).maybeSingle();

    // Check if email exists in lead submissions (stored in JSONB payload)
    const { data: existingLeads, error: leadCheckError } = await admin
      .from("lead_submissions")
      .select("id")
      .contains("payload", { email: email });

    console.log(`Pre-creation check for ${email}:`, {
      hasAuthUser: !!existingAuthUser,
      hasAgent: !!existingAgent,
      hasLeads: existingLeads?.length || 0,
    });

    // Delete any lead submissions with this email
    if (existingLeads && existingLeads.length > 0) {
      console.log(`Found ${existingLeads.length} lead submissions for ${email}, deleting...`);
      const { error: deleteLeadsError } = await admin
        .from("lead_submissions")
        .delete()
        .contains("payload", { email: email });

      if (deleteLeadsError) {
        console.error("Failed to delete lead submissions:", deleteLeadsError);
      } else {
        console.log(`Successfully deleted lead submissions for ${email}`);
      }
    }

    // If user exists in auth or agents, we need to clean up
    if (existingAuthUser || existingAgent) {
      // Delete agent first (triggers cascade)
      if (existingAgent) {
        console.log(`Deleting existing agent for ${email}...`);
        await admin.from("agents").delete().eq("id", existingAgent.id);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Delete auth user
      if (existingAuthUser) {
        console.log(`Deleting existing auth user for ${email}...`);
        await admin.auth.admin.deleteUser(existingAuthUser.id, false);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    // Wait a bit to ensure all deletions are processed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create user in Supabase Auth
    console.log(`Creating new auth user for ${email}...`);
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
      console.error("Auth error details:", JSON.stringify(authError, null, 2));
      console.error("Auth error code:", (authError as any)?.code);
      console.error("Auth error status:", (authError as any)?.status);

      await logError({
        endpoint: "/api/accept-invite",
        errorMessage: authError?.message || "Failed to create user",
        severity: "error",
      });
      return NextResponse.json(
        {
          error: `Database error creating new user: ${authError?.message || "Unknown error"}. Please try again or contact support if the issue persists.`,
        },
        { status: 500 },
      );
    }

    console.log(`Successfully created auth user for ${email}, agent profile created by trigger`);

    // Note: Agent profile is automatically created by the on_auth_user_created trigger
    // No need to manually insert into agents table

    // Auto-admin: if this is the first agent on the site, grant admin privileges
    const { count: agentCount } = await admin.from("agents").select("id", { count: "exact", head: true });

    if (agentCount !== null && agentCount <= 1) {
      console.log(`First agent on site — granting admin privileges to ${email}`);
      await admin.from("agents").update({ is_admin: true, role: "admin" }).eq("id", authData.user.id);
    }

    // Mark invitation as accepted
    await admin
      .from("user_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitationId);

    // If the invitation has account context, add user to the account
    if (invitation.account_id && invitation.invited_role) {
      // Check if not already a member
      const { data: existingMembership } = await admin
        .from("account_members")
        .select("id")
        .eq("account_id", invitation.account_id)
        .eq("agent_id", authData.user.id)
        .maybeSingle();

      if (!existingMembership) {
        await admin.from("account_members").insert({
          account_id: invitation.account_id,
          agent_id: authData.user.id,
          account_role: invitation.invited_role,
          office_id: invitation.office_id || null,
          is_active: true,
        });

        // Get the account's subscription plan and create a subscription for the new member
        const { data: account } = await admin
          .from("accounts")
          .select("subscription_plan_id")
          .eq("id", invitation.account_id)
          .single();

        if (account?.subscription_plan_id) {
          const today = new Date().toISOString().split("T")[0];
          const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          await admin.from("agent_subscriptions").insert({
            agent_id: authData.user.id,
            subscription_plan_id: account.subscription_plan_id,
            plan_type: "professional",
            status: "active",
            monthly_price: 0,
            current_period_start: today,
            current_period_end: trialEnd,
            trial_end_date: trialEnd,
            account_id: invitation.account_id,
          });
        }
      }
    }

    // Create GHL sub-account for the new agent (non-blocking)
    // This runs in the background and doesn't block the registration flow
    createGHLSubAccount(authData.user.id)
      .then((result) => {
        if (result.success) {
          console.log(`GHL sub-account created for ${email}: ${result.locationId}`);
        } else {
          console.warn(`GHL sub-account creation skipped for ${email}: ${result.error}`);
        }
      })
      .catch((err) => {
        console.error(`GHL sub-account creation failed for ${email}:`, err);
      });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await logError({
      endpoint: "/api/accept-invite",
      errorMessage: error.message,
      stackTrace: error.stack,
      severity: "error",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
