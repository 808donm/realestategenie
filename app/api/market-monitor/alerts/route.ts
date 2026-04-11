import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/market-monitor/alerts
 * List alerts for a monitor profile with pagination
 *
 * Query params:
 *   profileId  -- required
 *   alertType  -- optional filter (new_listing, price_drop, etc.)
 *   limit      -- default 50
 *   offset     -- default 0
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = request.nextUrl.searchParams;
    const profileId = params.get("profileId");
    const alertType = params.get("alertType");
    const limit = Math.min(Number(params.get("limit") || "50"), 200);
    const offset = Number(params.get("offset") || "0");

    if (!profileId) return NextResponse.json({ error: "profileId is required" }, { status: 400 });

    // Verify profile ownership
    const { data: profile } = await supabase
      .from("market_monitor_profiles")
      .select("id")
      .eq("id", profileId)
      .eq("agent_id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    let query = supabase
      .from("market_monitor_alerts")
      .select("*", { count: "exact" })
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (alertType) {
      query = query.eq("alert_type", alertType);
    }

    const { data: alerts, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      alerts: alerts || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
