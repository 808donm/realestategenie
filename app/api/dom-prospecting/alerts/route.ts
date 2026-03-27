import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * DOM Tier Change Alerts
 *
 * GET   — Fetch DOM tier change alerts for the current agent
 * PATCH — Mark alerts as viewed/acted/dismissed
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get("status"); // filter by status
    const limit = Number(request.nextUrl.searchParams.get("limit")) || 50;

    let query = supabase
      .from("mls_watchdog_alerts")
      .select("*")
      .eq("agent_id", user.id)
      .eq("alert_type", "dom_tier_change")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: alerts, error } = await query;
    if (error) throw error;

    // Count unread
    const { count: unreadCount } = await supabase
      .from("mls_watchdog_alerts")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", user.id)
      .eq("alert_type", "dom_tier_change")
      .eq("status", "new");

    return NextResponse.json({
      alerts: alerts || [],
      unreadCount: unreadCount || 0,
    });
  } catch (error: any) {
    console.error("[DomAlerts] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.markAllRead) {
      // Mark all DOM alerts as viewed
      const { error } = await supabase
        .from("mls_watchdog_alerts")
        .update({ status: "viewed" })
        .eq("agent_id", user.id)
        .eq("alert_type", "dom_tier_change")
        .eq("status", "new");

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (!body.id || !body.status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    if (!["new", "viewed", "acted", "dismissed"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { error } = await supabase
      .from("mls_watchdog_alerts")
      .update({ status: body.status })
      .eq("id", body.id)
      .eq("agent_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DomAlerts] PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
