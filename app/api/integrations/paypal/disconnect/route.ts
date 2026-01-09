import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update connection status to disconnected
    const { error: updateError } = await supabaseAdmin
      .from("integration_connections")
      .update({
        connection_status: "disconnected",
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", userData.user.id)
      .eq("integration_type", "paypal");

    if (updateError) {
      console.error("Error disconnecting PayPal:", updateError);
      return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
    }

    return NextResponse.json({ message: "PayPal disconnected successfully" });
  } catch (error) {
    console.error("PayPal disconnect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
