import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Disconnect Federal Data Integration (Admin-only)
 *
 * Removes stored API keys and marks the integration as disconnected.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is platform admin
    const { data: agent } = await supabase
      .from("agents")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (agent?.role !== "admin") {
      return NextResponse.json(
        { error: "Only platform admins can disconnect Federal Data" },
        { status: 403 }
      );
    }

    // Disconnect the integration
    const { error: updateError } = await supabaseAdmin
      .from("integrations")
      .update({
        status: "disconnected",
        config: {},
      })
      .eq("agent_id", userData.user.id)
      .eq("provider", "federal_data");

    if (updateError) {
      console.error("Error disconnecting Federal Data:", updateError);
      return NextResponse.json(
        { error: "Failed to disconnect" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Federal Data disconnected successfully",
    });
  } catch (error) {
    console.error("Error in Federal Data disconnect:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
