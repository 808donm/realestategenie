import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's account membership (use admin client to bypass
    // self-referential RLS policies on account_members; use .limit(1)
    // instead of .single() because a user may belong to multiple accounts)
    const { data: currentMembers } = await supabaseAdmin
      .from("account_members")
      .select("account_id, account_role")
      .eq("agent_id", userData.user.id)
      .eq("is_active", true)
      .in("account_role", ["owner", "admin"])
      .limit(1);

    const currentMember = currentMembers?.[0] ?? null;

    if (!currentMember) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get the member being updated
    const { data: targetMember } = await supabaseAdmin
      .from("account_members")
      .select("account_id, account_role, agent_id")
      .eq("id", memberId)
      .single();

    if (!targetMember || targetMember.account_id !== currentMember.account_id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent resetting your own password through this endpoint
    if (targetMember.agent_id === userData.user.id) {
      return NextResponse.json({ error: "Use your account settings to change your own password" }, { status: 400 });
    }

    // Prevent non-owners from resetting owner/admin passwords
    if (currentMember.account_role === "admin" && (targetMember.account_role === "owner" || targetMember.account_role === "admin")) {
      return NextResponse.json({ error: "Only owners can reset administrator passwords" }, { status: 403 });
    }

    const { password } = await request.json();

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Reset the password via Supabase admin auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      targetMember.agent_id,
      { password }
    );

    if (authError) {
      console.error("Error resetting password:", authError);
      return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
    }

    // Flag the user to change their password on next login
    await supabaseAdmin
      .from("agents")
      .update({ must_change_password: true })
      .eq("id", targetMember.agent_id);

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
