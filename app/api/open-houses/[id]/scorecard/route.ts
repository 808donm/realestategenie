import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// PATCH - Mark a lead as contacted
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await supabaseServer();

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { leadId, contacted_at, contact_method, contact_notes } = body;

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    // Verify the lead belongs to this event and the user owns it
    const { data: lead, error: leadError } = await supabase
      .from("lead_submissions")
      .select("id,event_id,agent_id")
      .eq("id", leadId)
      .eq("event_id", eventId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (lead.agent_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update the lead with contact info
    const { error: updateError } = await supabase
      .from("lead_submissions")
      .update({
        contacted_at: contacted_at || new Date().toISOString(),
        contact_method: contact_method || null,
        contact_notes: contact_notes || null,
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update lead" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Scorecard API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get scorecard metrics for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await supabaseServer();

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all leads for this event
    const { data: leads, error: leadsError } = await supabase
      .from("lead_submissions")
      .select("id,created_at,payload,contacted_at,contact_method")
      .eq("event_id", eventId)
      .eq("agent_id", user.id);

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    // Calculate metrics
    const totalSignIns = leads?.length || 0;
    const contacted = leads?.filter((l) => l.contacted_at) || [];
    const contactedWithin5Min =
      leads?.filter((l) => {
        if (!l.contacted_at) return false;
        const signInTime = new Date(l.created_at).getTime();
        const contactTime = new Date(l.contacted_at).getTime();
        const diffMinutes = (contactTime - signInTime) / (1000 * 60);
        return diffMinutes <= 5;
      }) || [];

    const hasRealtor =
      leads?.filter((l) => {
        const rep = ((l.payload as Record<string, unknown>)?.representation as string || "").toLowerCase();
        return rep.includes("have") || rep.includes("yes") || rep.includes("working");
      }) || [];

    const lookingForAgent =
      leads?.filter((l) => {
        const rep = ((l.payload as Record<string, unknown>)?.representation as string || "").toLowerCase();
        return (
          !rep ||
          rep.includes("no") ||
          rep.includes("looking") ||
          rep.includes("need") ||
          rep === "" ||
          rep === "none"
        );
      }) || [];

    return NextResponse.json({
      totalSignIns,
      totalContacted: contacted.length,
      contactedWithin5Min: contactedWithin5Min.length,
      hasRealtor: hasRealtor.length,
      lookingForAgent: lookingForAgent.length,
      percentContacted: totalSignIns > 0 ? Math.round((contacted.length / totalSignIns) * 100) : 0,
      percentWithin5Min: totalSignIns > 0 ? Math.round((contactedWithin5Min.length / totalSignIns) * 100) : 0,
      percentHasRealtor: totalSignIns > 0 ? Math.round((hasRealtor.length / totalSignIns) * 100) : 0,
      percentLookingForAgent: totalSignIns > 0 ? Math.round((lookingForAgent.length / totalSignIns) * 100) : 0,
    });
  } catch (error: unknown) {
    console.error("Scorecard API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
