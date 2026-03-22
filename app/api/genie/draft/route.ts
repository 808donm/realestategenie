import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { generateDraft, draftOpenHouseReminder } from "@/lib/genie/draft-generator";
import { PIPELINE_STAGE_LABELS } from "@/lib/pipeline-stages";

/**
 * POST /api/genie/draft
 *
 * Generate an AI draft (email or SMS) for a specific action item.
 *
 * Body:
 *   actionType: string
 *   channel: "email" | "sms"
 *   leadId?: string (for lead-based actions)
 *   metadata?: object (event info for open house reminders)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { actionType, channel, leadId, metadata } = body;

    if (!actionType || !channel) {
      return NextResponse.json({ error: "actionType and channel are required" }, { status: 400 });
    }

    // Get agent name
    const { data: agent } = await supabase
      .from("agents")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const agentName = agent?.display_name || "Agent";

    // Open house reminder — special case, no lead needed
    if (actionType === "open_house_reminder") {
      const startAt = metadata?.startAt ? new Date(metadata.startAt) : new Date();
      const draft = await draftOpenHouseReminder({
        agentName,
        address: metadata?.address || "the property",
        date: startAt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
        time: startAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      });
      return NextResponse.json({ draft: { body: draft.body }, channel: "sms" });
    }

    // Lead-based actions — fetch lead data
    if (!leadId) {
      return NextResponse.json({ error: "leadId is required for this action type" }, { status: 400 });
    }

    const { data: lead, error: leadErr } = await supabase
      .from("lead_submissions")
      .select("*, open_house_events!inner(address, start_at)")
      .eq("id", leadId)
      .eq("agent_id", user.id)
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const payload = lead.payload || {};
    const stageLabel = (PIPELINE_STAGE_LABELS as Record<string, string>)[lead.pipeline_stage] || lead.pipeline_stage;

    const draft = await generateDraft(channel, {
      agentName,
      leadName: payload.name || "there",
      leadEmail: payload.email || null,
      pipelineStage: lead.pipeline_stage || "new_lead",
      pipelineStageLabel: stageLabel,
      heatScore: lead.heat_score || 50,
      property: lead.open_house_events?.address || "your property inquiry",
      timeline: payload.timeline || null,
      financing: payload.financing || null,
      recentOpenHouse: !!lead.event_id,
      openHouseDate: lead.open_house_events?.start_at
        ? new Date(lead.open_house_events.start_at).toLocaleDateString()
        : null,
    });

    return NextResponse.json({ draft, channel });
  } catch (error: any) {
    console.error("[Genie Draft] Error:", error);
    return NextResponse.json({ error: error.message || "Draft generation failed" }, { status: 500 });
  }
}
