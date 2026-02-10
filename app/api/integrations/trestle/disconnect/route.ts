import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Disconnect Trestle Integration
 *
 * Removes the stored credentials and marks the integration as disconnected
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update integration to disconnected state using admin client
    const { error: updateError } = await supabaseAdmin
      .from("integrations")
      .update({
        status: "disconnected",
        config: {},
      })
      .eq("agent_id", userData.user.id)
      .eq("provider", "trestle");

    if (updateError) {
      console.error("Error disconnecting Trestle:", updateError);
      return NextResponse.json(
        { error: "Failed to disconnect" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Trestle disconnected successfully",
    });
  } catch (error) {
    console.error("Error in Trestle disconnect:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
