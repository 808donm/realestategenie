import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  type PipelineStage,
} from "@/lib/pipeline-stages";

/**
 * POST /api/leads/[id]/advance-stage
 *
 * Moves a lead to a specific pipeline stage, or advances it to the next one.
 *
 * Body:
 *   { "stage": "qualification" }   — move to a specific stage
 *   { "direction": "forward" }     — advance one step forward (default)
 *   { "direction": "backward" }    — move one step backward
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

    // Fetch the lead
    const { data: lead, error: leadError } = await supabase
      .from("lead_submissions")
      .select("id, agent_id, pipeline_stage, payload, heat_score, ghl_opportunity_id")
      .eq("id", leadId)
      .eq("agent_id", user.id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    let newStage: PipelineStage;

    if (body.stage) {
      // Explicit stage move
      if (!PIPELINE_STAGES.includes(body.stage)) {
        return NextResponse.json(
          { error: `Invalid stage: ${body.stage}` },
          { status: 400 }
        );
      }
      newStage = body.stage;
    } else {
      // Direction-based move
      const currentIdx = PIPELINE_STAGES.indexOf(
        lead.pipeline_stage as PipelineStage
      );
      const direction = body.direction || "forward";

      if (direction === "forward") {
        if (currentIdx >= PIPELINE_STAGES.length - 1) {
          return NextResponse.json(
            { error: "Lead is already at the final stage" },
            { status: 400 }
          );
        }
        newStage = PIPELINE_STAGES[currentIdx + 1];
      } else if (direction === "backward") {
        if (currentIdx <= 0) {
          return NextResponse.json(
            { error: "Lead is already at the first stage" },
            { status: 400 }
          );
        }
        newStage = PIPELINE_STAGES[currentIdx - 1];
      } else {
        return NextResponse.json(
          { error: `Invalid direction: ${direction}` },
          { status: 400 }
        );
      }
    }

    // Update the lead's pipeline stage
    const { error: updateError } = await supabase
      .from("lead_submissions")
      .update({
        pipeline_stage: newStage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      leadId,
      previousStage: lead.pipeline_stage,
      newStage,
      newStageLabel: PIPELINE_STAGE_LABELS[newStage],
    });
  } catch (error: any) {
    console.error("Error advancing lead stage:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
