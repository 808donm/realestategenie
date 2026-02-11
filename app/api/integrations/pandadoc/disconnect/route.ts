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

    console.log('[PandaDoc] Disconnecting for user:', userData.user.id);

    // First, check if integration exists
    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("agent_id", userData.user.id)
      .eq("provider", "pandadoc")
      .maybeSingle();

    if (!existing) {
      console.log('[PandaDoc] No integration found, nothing to disconnect');
      return NextResponse.json({
        success: true,
        message: "No PandaDoc integration found to disconnect",
      });
    }

    console.log('[PandaDoc] Found integration:', existing.id);

    // Update integration to disconnected state
    const { error } = await supabase
      .from("integrations")
      .update({
        config: {},
        status: "disconnected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("[PandaDoc] Error disconnecting:", error);
      return NextResponse.json(
        { error: `Failed to disconnect: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[PandaDoc] Successfully disconnected');

    return NextResponse.json({
      success: true,
      message: "PandaDoc disconnected successfully",
    });
  } catch (error: any) {
    console.error("[PandaDoc] Error in disconnect:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
