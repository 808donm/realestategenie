import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS, type PipelineStage } from "@/lib/pipeline-stages";

/**
 * GET /api/leads/pipeline
 *
 * Returns leads grouped by pipeline stage for the logged-in agent.
 * Each stage includes its leads sorted by heat_score descending.
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all non-DNC leads for this agent
    const { data: leads, error } = await supabase
      .from("lead_submissions")
      .select("id, event_id, agent_id, payload, heat_score, pipeline_stage, created_at, updated_at")
      .eq("agent_id", user.id)
      .order("heat_score", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch event addresses for display
    const eventIds = [...new Set((leads || []).map((l) => l.event_id))];
    const { data: events } = await supabase
      .from("open_house_events")
      .select("id, address")
      .in("id", eventIds.length > 0 ? eventIds : ["__none__"]);

    const eventMap: Record<string, string> = {};
    (events || []).forEach((e) => {
      eventMap[e.id] = e.address;
    });

    // Group leads by pipeline stage
    const stages = PIPELINE_STAGES.map((stageKey) => {
      const stageLeads = (leads || []).filter(
        (l) => l.pipeline_stage === stageKey
      );
      return {
        key: stageKey,
        label: PIPELINE_STAGE_LABELS[stageKey as PipelineStage],
        count: stageLeads.length,
        leads: stageLeads.map((l) => ({
          id: l.id,
          name: l.payload?.name || "Unknown",
          email: l.payload?.email || null,
          phone: l.payload?.phone_e164 || null,
          heatScore: l.heat_score,
          timeline: l.payload?.timeline || null,
          financing: l.payload?.financing || null,
          property: eventMap[l.event_id] || l.event_id,
          eventId: l.event_id,
          pipelineStage: l.pipeline_stage,
          createdAt: l.created_at,
        })),
      };
    });

    return NextResponse.json({ stages });
  } catch (error: any) {
    console.error("Error fetching pipeline:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
