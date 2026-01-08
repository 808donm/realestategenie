import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Disconnect Stripe Integration
 * POST /api/integrations/stripe/disconnect
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete Stripe integration
    const { error } = await supabase
      .from("integrations")
      .delete()
      .eq("agent_id", user.id)
      .eq("provider", "stripe");

    if (error) {
      console.error("Stripe disconnect error:", error);
      return NextResponse.json(
        { error: "Failed to disconnect Stripe" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Stripe disconnected successfully",
    });
  } catch (error) {
    console.error("Stripe disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Stripe" },
      { status: 500 }
    );
  }
}
