import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Disconnect Realie.ai Integration (Admin-only)
 *
 * Removes the stored API key and marks the integration as disconnected.
 * ATTOM will become the sole property data provider.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is platform admin
    const { data: agent } = await supabase.from("agents").select("role").eq("id", userData.user.id).single();

    if (agent?.role !== "admin") {
      return NextResponse.json({ error: "Only platform admins can disconnect Realie.ai" }, { status: 403 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("integrations")
      .update({
        status: "disconnected",
        config: {},
      })
      .eq("agent_id", userData.user.id)
      .eq("provider", "realie");

    if (updateError) {
      console.error("Error disconnecting Realie:", updateError);
      return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Realie.ai disconnected successfully",
    });
  } catch (error) {
    console.error("Error in Realie disconnect:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
