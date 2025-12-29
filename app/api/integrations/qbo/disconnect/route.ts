import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * QuickBooks Disconnect Endpoint
 * Removes QuickBooks integration
 */
export async function POST() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[QBO Disconnect] Disconnecting QuickBooks for agent:", user.id);

    // Update integration status to disconnected
    const { error } = await supabase
      .from("integrations")
      .update({
        status: "disconnected",
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", user.id)
      .eq("provider", "qbo");

    if (error) {
      console.error("[QBO Disconnect] Failed to disconnect:", error);
      throw error;
    }

    console.log("[QBO Disconnect] QuickBooks disconnected successfully");

    return NextResponse.json({
      success: true,
      message: "QuickBooks disconnected successfully",
    });
  } catch (error: any) {
    console.error("[QBO Disconnect] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to disconnect QuickBooks" },
      { status: 500 }
    );
  }
}
