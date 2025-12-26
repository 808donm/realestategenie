import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the message to verify ownership
    const { data: message } = await supabase
      .from("pm_messages")
      .select("*")
      .eq("id", id)
      .single();

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify user is the recipient
    if (message.to_user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - not recipient" },
        { status: 403 }
      );
    }

    // Mark as read
    const { error: updateError } = await supabase
      .from("pm_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      console.error("Error marking message as read:", updateError);
      return NextResponse.json(
        { error: "Failed to mark as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/tenant/messages/[id]/read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
