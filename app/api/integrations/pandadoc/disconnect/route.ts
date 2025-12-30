import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Disconnect PandaDoc Integration
 *
 * Removes the API key and marks integration as disconnected
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find and update integration
    const { error } = await supabase
      .from("integrations")
      .update({
        config: {},
        status: "disconnected",
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", userData.user.id)
      .eq("provider", "pandadoc");

    if (error) {
      console.error("Error disconnecting PandaDoc:", error);
      return NextResponse.json(
        { error: "Failed to disconnect" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "PandaDoc disconnected successfully",
    });
  } catch (error) {
    console.error("Error in PandaDoc disconnect:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
