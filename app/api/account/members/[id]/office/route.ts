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
      .select("account_id")
      .eq("id", memberId)
      .single();

    if (!targetMember || targetMember.account_id !== currentMember.account_id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const { office_id } = await request.json();

    // If office_id is provided, verify it belongs to this account
    if (office_id) {
      const { data: office } = await supabaseAdmin
        .from("offices")
        .select("id")
        .eq("id", office_id)
        .eq("account_id", currentMember.account_id)
        .eq("is_active", true)
        .single();

      if (!office) {
        return NextResponse.json({ error: "Office not found" }, { status: 404 });
      }
    }

    // Update the member's office assignment
    const { error: updateError } = await supabaseAdmin
      .from("account_members")
      .update({
        office_id: office_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (updateError) {
      console.error("Error updating office:", updateError);
      return NextResponse.json({ error: "Failed to update office assignment" }, { status: 500 });
    }

    return NextResponse.json({ message: "Office assignment updated successfully" });
  } catch (error) {
    console.error("Error updating office assignment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
