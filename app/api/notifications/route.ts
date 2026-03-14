import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** GET /api/notifications — list notifications for the current agent */
export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "true";

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data: notifications, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Count unread
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", user.id)
      .eq("is_read", false);

    return NextResponse.json({ notifications: notifications || [], unreadCount: count || 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
