import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** POST /api/notifications/mark-read — mark notifications as read */
export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { notification_ids, mark_all } = await req.json();

    if (mark_all) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("agent_id", user.id)
        .eq("is_read", false);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (notification_ids?.length) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", notification_ids)
        .eq("agent_id", user.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Provide notification_ids or mark_all" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
