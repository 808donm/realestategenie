import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** POST /api/tasks/bulk — bulk complete or snooze tasks */
export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, task_ids, snoozed_until } = await req.json();

    if (!task_ids?.length) {
      return NextResponse.json({ error: "No task IDs provided" }, { status: 400 });
    }

    if (action === "complete") {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .in("id", task_ids)
        .or(`agent_id.eq.${user.id},assigned_to.eq.${user.id}`);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, action: "completed", count: task_ids.length });
    }

    if (action === "snooze") {
      if (!snoozed_until) {
        return NextResponse.json({ error: "snoozed_until is required for snooze" }, { status: 400 });
      }
      const { error } = await supabase
        .from("tasks")
        .update({ status: "snoozed", snoozed_until, updated_at: new Date().toISOString() })
        .in("id", task_ids)
        .or(`agent_id.eq.${user.id},assigned_to.eq.${user.id}`);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, action: "snoozed", count: task_ids.length });
    }

    if (action === "delete") {
      const { error } = await supabase.from("tasks").delete().in("id", task_ids).eq("agent_id", user.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, action: "deleted", count: task_ids.length });
    }

    return NextResponse.json({ error: "Invalid action. Use 'complete', 'snooze', or 'delete'" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
