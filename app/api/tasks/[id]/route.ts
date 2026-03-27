import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** PATCH /api/tasks/:id — update a task */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "due_date",
      "due_time",
      "task_type",
      "assigned_to",
      "linked_lead_id",
      "linked_contact_id",
      "linked_open_house_id",
      "snoozed_until",
      "is_recurring",
      "recurrence_rule",
    ];
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    // Handle status transitions
    if (body.status === "completed") {
      updates.completed_at = new Date().toISOString();

      // Check if recurring — create next occurrence
      const { data: existingTask } = await supabase
        .from("tasks")
        .select(
          "is_recurring, recurrence_rule, due_date, title, description, priority, task_type, linked_lead_id, linked_contact_id, linked_open_house_id, agent_id, assigned_to",
        )
        .eq("id", id)
        .single();

      if (existingTask?.is_recurring && existingTask.recurrence_rule && existingTask.due_date) {
        const nextDate = calculateNextRecurrence(existingTask.due_date, existingTask.recurrence_rule);
        if (nextDate) {
          await supabase.from("tasks").insert({
            agent_id: existingTask.agent_id,
            assigned_to: existingTask.assigned_to,
            title: existingTask.title,
            description: existingTask.description,
            priority: existingTask.priority,
            task_type: existingTask.task_type,
            due_date: nextDate,
            linked_lead_id: existingTask.linked_lead_id,
            linked_contact_id: existingTask.linked_contact_id,
            linked_open_house_id: existingTask.linked_open_house_id,
            is_recurring: true,
            recurrence_rule: existingTask.recurrence_rule,
            recurrence_parent_id: id,
            next_recurrence_date: nextDate,
          });
        }
      }
    }

    if (body.status === "snoozed" && body.snoozed_until) {
      updates.snoozed_until = body.snoozed_until;
    }

    const { data: task, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE /api/tasks/:id — delete a task */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function calculateNextRecurrence(currentDate: string, rule: string): string | null {
  const date = new Date(currentDate);
  const parts = rule.split(";").reduce(
    (acc, part) => {
      const [key, val] = part.split("=");
      acc[key] = val;
      return acc;
    },
    {} as Record<string, string>,
  );

  const freq = parts["FREQ"];
  const interval = parseInt(parts["INTERVAL"] || "1", 10);

  switch (freq) {
    case "DAILY":
      date.setDate(date.getDate() + interval);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7 * interval);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + interval);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + interval);
      break;
    default:
      return null;
  }

  return date.toISOString().slice(0, 10);
}
