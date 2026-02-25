import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { PIPELINE_STAGE_LABELS, type PipelineStage } from "@/lib/pipeline-stages";
import { draftFollowUpEmail } from "@/lib/briefing/ai-briefing";

/**
 * POST /api/leads/[id]/draft-followup
 *
 * Uses AI to draft a stage-aware follow-up email for a lead.
 * Returns { subject, body } that the agent can review and send.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from("lead_submissions")
      .select("id, event_id, agent_id, payload, heat_score, pipeline_stage, created_at, updated_at")
      .eq("id", leadId)
      .eq("agent_id", user.id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Fetch agent name
    const { data: agent } = await supabase
      .from("agents")
      .select("display_name")
      .eq("id", user.id)
      .single();

    // Fetch event for property address + open house date
    const { data: event } = await supabase
      .from("open_house_events")
      .select("address, start_at")
      .eq("id", lead.event_id)
      .single();

    const now = new Date();
    const ohDate = event?.start_at ? new Date(event.start_at) : null;
    const recentOpenHouse =
      ohDate !== null && now.getTime() - ohDate.getTime() < 7 * 86400000;

    const draft = await draftFollowUpEmail({
      agentName: agent?.display_name || "Your Agent",
      leadName: lead.payload?.name || "there",
      leadEmail: lead.payload?.email || null,
      pipelineStage: lead.pipeline_stage,
      pipelineStageLabel:
        PIPELINE_STAGE_LABELS[lead.pipeline_stage as PipelineStage] ||
        lead.pipeline_stage,
      heatScore: lead.heat_score,
      property: event?.address || "the property",
      timeline: lead.payload?.timeline || null,
      financing: lead.payload?.financing || null,
      recentOpenHouse,
      openHouseDate: event?.start_at || null,
    });

    return NextResponse.json(draft);
  } catch (error: any) {
    console.error("Error drafting follow-up:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
