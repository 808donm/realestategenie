import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getPmLimits } from "@/lib/subscriptions/server-utils";

/**
 * PM Limits API
 *
 * GET: Returns the current agent's PM property/tenant limits and usage
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limits = await getPmLimits(user.id);

    return NextResponse.json({ limits });
  } catch (error) {
    console.error("Error fetching PM limits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
