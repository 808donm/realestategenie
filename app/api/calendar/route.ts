/**
 * Calendar Events API
 *
 * CRUD operations for calendar events in the merged view.
 * GET: list events in a time range (from all connected sources)
 * POST: create a new event (local or targeted at a source calendar)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createEvent } from "@/lib/calendar/sync-engine";
import type { CalendarEvent } from "@/lib/calendar/types";

export async function GET(request: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");
  const source = searchParams.get("source"); // optional filter

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "start and end query params are required" }, { status: 400 });
  }

  let query = supabase
    .from("calendar_events")
    .select("*")
    .eq("agent_id", user.id)
    .neq("status", "cancelled")
    .gte("end_at", startDate)
    .lte("start_at", endDate)
    .order("start_at", { ascending: true });

  if (source) {
    query = query.eq("source", source);
  }

  const { data: events, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: events || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.title || !body.start_at || !body.end_at) {
    return NextResponse.json({ error: "title, start_at, and end_at are required" }, { status: 400 });
  }

  const event: CalendarEvent = {
    agent_id: user.id,
    source: body.source || "local",
    title: body.title,
    description: body.description || null,
    location: body.location || null,
    start_at: body.start_at,
    end_at: body.end_at,
    all_day: body.all_day || false,
    status: body.status || "confirmed",
    attendees: body.attendees || [],
    recurrence: body.recurrence || null,
    reminder_minutes: body.reminder_minutes ?? null,
    color: body.color || null,
    calendar_id: body.calendar_id || null,
  };

  const result = await createEvent(event);

  if (!result) {
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: result.id });
}
