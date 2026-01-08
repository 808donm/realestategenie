import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Disconnect PayPal Integration
 * POST /api/integrations/paypal/disconnect
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete PayPal integration
    const { error } = await supabase
      .from("integrations")
      .delete()
      .eq("agent_id", user.id)
      .eq("provider", "paypal");

    if (error) {
      console.error("PayPal disconnect error:", error);
      return NextResponse.json(
        { error: "Failed to disconnect PayPal" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "PayPal disconnected successfully",
    });
  } catch (error) {
    console.error("PayPal disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect PayPal" },
      { status: 500 }
    );
  }
}
