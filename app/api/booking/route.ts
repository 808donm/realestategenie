import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/booking - Create an appointment and sync to calendar
 * Body: { contactId?, contactName, contactEmail?, contactPhone?, title, startAt, endAt, location?, notes?, source? }
 *
 * GET /api/booking - List upcoming appointments
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contactId, contactName, contactEmail, contactPhone, title, startAt, endAt, location, notes, source } = body;

    if (!title || !startAt || !endAt) {
      return NextResponse.json({ error: "title, startAt, and endAt are required" }, { status: 400 });
    }

    // Create calendar event
    const { data: event, error: eventError } = await supabase
      .from("calendar_events")
      .insert({
        agent_id: userData.user.id,
        title,
        description: notes
          ? `Contact: ${contactName || "Unknown"}\n${contactPhone ? `Phone: ${contactPhone}\n` : ""}${contactEmail ? `Email: ${contactEmail}\n` : ""}\n${notes}`
          : `Appointment with ${contactName || "Unknown"}`,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        location: location || null,
        source: source || "local",
        status: "confirmed",
        pending_sync: source && source !== "local",
        attendees: contactEmail
          ? [{ name: contactName || contactEmail, email: contactEmail, responseStatus: "needsAction" }]
          : [],
        metadata: {
          booking: true,
          contactId: contactId || null,
          contactName: contactName || null,
          contactPhone: contactPhone || null,
        },
      })
      .select("id")
      .single();

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    // Also create a task for the appointment
    await supabase
      .from("tasks")
      .insert({
        agent_id: userData.user.id,
        title: `Appointment: ${title}`,
        description: `${contactName ? `With ${contactName}` : ""}${location ? ` at ${location}` : ""}`,
        due_date: new Date(startAt).toISOString(),
        priority: "high",
        status: "pending",
        linked_entity_type: contactId ? "contact" : null,
        linked_entity_id: contactId || null,
      })
      .then(({ error }) => {
        if (error) console.log("Could not create appointment task:", error.message);
      });

    return NextResponse.json({
      success: true,
      eventId: event.id,
      message:
        source && source !== "local"
          ? `Appointment booked. Will sync to ${source} calendar on next sync.`
          : "Appointment booked successfully.",
    });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to book appointment" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: events, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("agent_id", userData.user.id)
      .gte("start_at", new Date().toISOString())
      .not("metadata->booking", "is", null)
      .order("start_at", { ascending: true })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointments: events || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load appointments" },
      { status: 500 },
    );
  }
}
