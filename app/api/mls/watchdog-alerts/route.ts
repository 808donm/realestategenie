import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Watchdog Alerts API
 *
 * GET   — List alerts for the current agent
 * PATCH — Update alert status (viewed, acted, dismissed)
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status"); // new, viewed, acted, dismissed
    const farmAreaId = searchParams.get("farmAreaId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("mls_watchdog_alerts")
      .select("*", { count: "exact" })
      .eq("agent_id", userData.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (farmAreaId) query = query.eq("farm_area_id", farmAreaId);

    const { data: alerts, count, error } = await query;

    if (error) throw error;

    // Get unread count
    const { count: unreadCount } = await supabase
      .from("mls_watchdog_alerts")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", userData.user.id)
      .eq("status", "new");

    return NextResponse.json({
      alerts: alerts || [],
      totalCount: count || 0,
      unreadCount: unreadCount || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Watchdog alerts GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load alerts" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids, status } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }
    if (!["viewed", "acted", "dismissed"].includes(status)) {
      return NextResponse.json({ error: "status must be viewed, acted, or dismissed" }, { status: 400 });
    }

    const updates: Record<string, any> = { status };
    if (status === "acted") updates.acted_at = new Date().toISOString();

    const { error } = await supabase
      .from("mls_watchdog_alerts")
      .update(updates)
      .in("id", ids)
      .eq("agent_id", userData.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watchdog alerts PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update alerts" },
      { status: 500 }
    );
  }
}
