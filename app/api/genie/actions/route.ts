import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { aggregateAgentData } from "@/lib/briefing/report-data";
import { analyzeActions } from "@/lib/genie/action-analyzer";

/**
 * POST /api/genie/actions
 *
 * Returns prioritized action items for the authenticated agent.
 * Uses deterministic rule engine (no AI call — instant response).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get agent briefing data (same source as daily briefing email)
    const briefingData = await aggregateAgentData(supabase, user.id);
    if (!briefingData) {
      return NextResponse.json({ actions: [], ghlConnected: false, generatedAt: new Date().toISOString() });
    }

    // Check for tomorrow's events
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = tomorrow.toISOString().split("T")[0] + "T00:00:00";
    const tomorrowEnd = tomorrow.toISOString().split("T")[0] + "T23:59:59";

    const { data: tomorrowEvents } = await supabase
      .from("open_house_events")
      .select("id, address, start_at")
      .eq("agent_id", user.id)
      .eq("status", "published")
      .gte("start_at", tomorrowStart)
      .lte("start_at", tomorrowEnd);

    // Count upcoming events (next 14 days)
    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    const { count: upcomingEventCount } = await supabase
      .from("open_house_events")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", user.id)
      .eq("status", "published")
      .gte("start_at", new Date().toISOString())
      .lte("start_at", twoWeeks.toISOString());

    // Count DOM alerts
    const { count: domAlertCount } = await supabase
      .from("mls_watchdog_alerts")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", user.id)
      .eq("alert_type", "dom_tier_change")
      .eq("status", "new");

    // Check GHL connection
    const { data: ghlInteg } = await supabase
      .from("integrations")
      .select("status")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .maybeSingle();

    // Run the deterministic rule engine
    const actions = analyzeActions({
      briefingData,
      tomorrowEvents: (tomorrowEvents || []).map(e => ({
        id: e.id,
        address: e.address,
        start_at: e.start_at,
      })),
      upcomingEventCount: upcomingEventCount || 0,
      domAlertCount: domAlertCount || 0,
    });

    return NextResponse.json({
      actions,
      ghlConnected: ghlInteg?.status === "connected",
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Genie Actions] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
