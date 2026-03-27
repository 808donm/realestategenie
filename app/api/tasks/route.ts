import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** GET /api/tasks — list tasks for the current agent */
export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const due = url.searchParams.get("due"); // "today", "overdue", "upcoming", "all"
    const linkedLeadId = url.searchParams.get("lead_id");
    const linkedContactId = url.searchParams.get("contact_id");
    const linkedOpenHouseId = url.searchParams.get("open_house_id");

    let query = supabase
      .from("tasks")
      .select("*")
      .or(`agent_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("priority", { ascending: true })
      .limit(200);

    if (status && status !== "all") {
      query = query.eq("status", status);
    } else if (!status) {
      query = query.in("status", ["pending", "in_progress", "snoozed"]);
    }

    if (linkedLeadId) query = query.eq("linked_lead_id", linkedLeadId);
    if (linkedContactId) query = query.eq("linked_contact_id", linkedContactId);
    if (linkedOpenHouseId) query = query.eq("linked_open_house_id", linkedOpenHouseId);

    const today = new Date().toISOString().slice(0, 10);
    if (due === "today") {
      query = query.eq("due_date", today);
    } else if (due === "overdue") {
      query = query.lt("due_date", today).in("status", ["pending", "in_progress"]);
    } else if (due === "upcoming") {
      query = query.gt("due_date", today);
    }

    const { data: tasks, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ tasks: tasks || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST /api/tasks — create a new task */
export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      title,
      description,
      priority,
      due_date,
      due_time,
      task_type,
      linked_lead_id,
      linked_contact_id,
      linked_open_house_id,
      linked_transaction_id,
      assigned_to,
      is_recurring,
      recurrence_rule,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        agent_id: user.id,
        title: title.trim(),
        description: description || null,
        priority: priority || "medium",
        due_date: due_date || null,
        due_time: due_time || null,
        task_type: task_type || "general",
        linked_lead_id: linked_lead_id || null,
        linked_contact_id: linked_contact_id || null,
        linked_open_house_id: linked_open_house_id || null,
        linked_transaction_id: linked_transaction_id || null,
        assigned_to: assigned_to || user.id,
        is_recurring: is_recurring || false,
        recurrence_rule: recurrence_rule || null,
        next_recurrence_date: is_recurring && due_date ? due_date : null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
