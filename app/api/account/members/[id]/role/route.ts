import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
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

    // Get the member being updated
    const { data: targetMember } = await supabaseAdmin
      .from("account_members")
      .select("account_id, account_role, agent_id")
      .eq("id", memberId)
      .single();

    if (!targetMember || targetMember.account_id !== currentMember.account_id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent users from changing their own role
    if (targetMember.agent_id === userData.user.id) {
      return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
    }

    // Prevent admins from changing owner roles
    if (currentMember.account_role === "admin" && targetMember.account_role === "owner") {
      return NextResponse.json({ error: "You cannot change an owner's role" }, { status: 403 });
    }

    const { role } = await request.json();

    if (!role || !["agent", "assistant", "admin", "owner"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Only owners can assign admin role
    if (role === "admin" && currentMember.account_role !== "owner") {
      return NextResponse.json({ error: "Only owners can assign administrator role" }, { status: 403 });
    }

    // Only owners can be changed to owner (transferring ownership)
    if (role === "owner" && currentMember.account_role !== "owner") {
      return NextResponse.json({ error: "Only owners can transfer ownership" }, { status: 403 });
    }

    // If changing from current role, check if there's seat availability for new role
    if (role !== targetMember.account_role) {
      const { data: canAdd } = await supabaseAdmin.rpc("can_add_account_member", {
        p_account_id: currentMember.account_id,
        p_role: role,
      });

      if (!canAdd) {
        return NextResponse.json(
          { error: `No ${role} seats available. Please upgrade your plan.` },
          { status: 400 }
        );
      }
    }

    // Update the member's role
    const { error: updateError } = await supabaseAdmin
      .from("account_members")
      .update({
        account_role: role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (updateError) {
      console.error("Error updating role:", updateError);
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    return NextResponse.json({ message: "Role updated successfully" });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
