import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is account owner or admin
    const { data: accountMembers, error: memberErr } = await supabaseAdmin
      .from("account_members")
      .select("account_id, account_role")
      .eq("agent_id", userData.user.id)
      .eq("is_active", true)
      .in("account_role", ["owner", "admin"])
      .limit(1);

    const accountMember = accountMembers?.[0] ?? null;

    if (!accountMember) {
      console.error("Admin check failed:", memberErr, "user:", userData.user.id);
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { email, display_name, role, password, office_id } = await request.json();

    if (!email || !role || !password) {
      return NextResponse.json({ error: "Email, role, and password are required" }, { status: 400 });
    }

    if (!["agent", "assistant", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check seat availability
    const { data: canAdd } = await supabaseAdmin.rpc("can_add_account_member", {
      p_account_id: accountMember.account_id,
      p_role: role,
    });

    if (!canAdd) {
      return NextResponse.json(
        { error: `No ${role} seats available. Please upgrade your plan.` },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingAgent } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("email", email)
      .single();

    if (existingAgent) {
      // Check if they're already in this account
      const { data: existingMember } = await supabaseAdmin
        .from("account_members")
        .select("id")
        .eq("account_id", accountMember.account_id)
        .eq("agent_id", existingAgent.id)
        .single();

      if (existingMember) {
        return NextResponse.json(
          { error: "This user is already a member of your team" },
          { status: 400 }
        );
      }

      // Existing user not in this account — add them as a member
      const { error: addError } = await supabaseAdmin
        .from("account_members")
        .insert({
          account_id: accountMember.account_id,
          agent_id: existingAgent.id,
          account_role: role,
          office_id: office_id || null,
        });

      if (addError) {
        console.error("Error adding existing user to account:", addError);
        return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
      }

      return NextResponse.json({ message: "Existing user added to team" });
    }

    // Create a system invitation so the auth trigger allows account creation
    const token = crypto.randomUUID();
    const { error: inviteError } = await supabaseAdmin
      .from("user_invitations")
      .insert({
        email,
        token,
        invited_by: userData.user.id,
        status: "pending",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        account_id: accountMember.account_id,
        invited_role: role,
        office_id: office_id || null,
      });

    if (inviteError) {
      console.error("Error creating system invitation:", inviteError);
      return NextResponse.json({ error: "Failed to prepare account" }, { status: 500 });
    }

    // Create the auth user with the temporary password
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: display_name || email,
        full_name: display_name || email,
      },
    });

    if (authError || !newUser.user) {
      console.error("Error creating auth user:", authError);
      // Clean up the invitation
      await supabaseAdmin
        .from("user_invitations")
        .update({ status: "cancelled" })
        .eq("token", token);
      return NextResponse.json(
        { error: authError?.message || "Failed to create user" },
        { status: 500 }
      );
    }

    // Update agent profile with display name
    if (display_name) {
      await supabaseAdmin
        .from("agents")
        .update({ display_name })
        .eq("id", newUser.user.id);
    }

    // Flag agent to change password on first login
    await supabaseAdmin
      .from("agents")
      .update({ must_change_password: true })
      .eq("id", newUser.user.id);

    // Add to account as a member
    const { error: memberError } = await supabaseAdmin
      .from("account_members")
      .insert({
        account_id: accountMember.account_id,
        agent_id: newUser.user.id,
        account_role: role,
        office_id: office_id || null,
      });

    if (memberError) {
      console.error("Error adding member to account:", memberError);
      return NextResponse.json({ error: "User created but failed to add to team" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Team member created successfully",
      user_id: newUser.user.id,
    });
  } catch (error) {
    console.error("Error creating team member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
