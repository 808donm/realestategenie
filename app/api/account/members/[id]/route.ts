import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(
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

    // Get current user's account membership
    const { data: currentMember } = await supabase
      .from("account_members")
      .select("account_id, account_role")
      .eq("agent_id", userData.user.id)
      .eq("is_active", true)
      .single();

    if (!currentMember || (currentMember.account_role !== "owner" && currentMember.account_role !== "admin")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get the member being removed
    const { data: targetMember } = await supabaseAdmin
      .from("account_members")
      .select("account_id, account_role, agent_id")
      .eq("id", memberId)
      .single();

    if (!targetMember || targetMember.account_id !== currentMember.account_id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent users from removing themselves
    if (targetMember.agent_id === userData.user.id) {
      return NextResponse.json({ error: "You cannot remove yourself from the team" }, { status: 400 });
    }

    // Prevent removing the owner
    if (targetMember.account_role === "owner") {
      return NextResponse.json({ error: "Cannot remove account owner" }, { status: 400 });
    }

    // Admins can only remove agents and assistants
    if (currentMember.account_role === "admin" && targetMember.account_role === "admin") {
      return NextResponse.json({ error: "Admins cannot remove other administrators" }, { status: 403 });
    }

    // Deactivate the member (soft delete)
    const { error: updateError } = await supabaseAdmin
      .from("account_members")
      .update({
        is_active: false,
        left_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (updateError) {
      console.error("Error removing member:", updateError);
      return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }

    return NextResponse.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
