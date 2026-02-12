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

    // Check if user is account owner or admin (use admin client to bypass RLS)
    const { data: accountMembers } = await supabaseAdmin
      .from("account_members")
      .select("account_id, account_role")
      .eq("agent_id", userData.user.id)
      .eq("is_active", true)
      .in("account_role", ["owner", "admin"])
      .limit(1);

    const accountMember = accountMembers?.[0] ?? null;

    if (!accountMember) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { email, role, office_id } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    if (!["agent", "assistant", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check seat availability using database function
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

    // Check if user already exists with this email
    const { data: existingAgent } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("email", email)
      .single();

    // If user already exists, check if they're already in this account
    if (existingAgent) {
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
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Create invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("user_invitations")
      .insert({
        email,
        invited_by: userData.user.id,
        invitation_token: invitationToken,
        account_id: accountMember.account_id,
        invited_role: role,
        office_id: office_id || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single();

    if (invitationError) {
      console.error("Error creating invitation:", invitationError);
      return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
    }

    // TODO: Send invitation email here
    // For now, we'll just return the invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/accept-invite/${invitationToken}`;

    return NextResponse.json({
      message: "Invitation sent successfully",
      invitation_link: invitationLink,
      invitation,
    });
  } catch (error) {
    console.error("Error sending invitation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
