/**
 * Calendar Event API — Single Event Operations
 *
 * GET: fetch a single event
 * PATCH: update an event (marks as pending_sync if synced to external source)
 * DELETE: delete an event (synced events get deleted from source too)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { updateEvent, deleteEvent } from "@/lib/calendar/sync-engine";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: event, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("id", id)
    .eq("agent_id", user.id)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("id", id)
    .eq("agent_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await request.json();
  const allowedFields = [
    "title",
    "description",
    "location",
    "start_at",
    "end_at",
    "all_day",
    "status",
    "attendees",
    "recurrence",
    "reminder_minutes",
    "color",
  ];

  const updates: Record<string, any> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const success = await updateEvent(id, updates);

  if (!success) {
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("id", id)
    .eq("agent_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const success = await deleteEvent(id);

  if (!success) {
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
