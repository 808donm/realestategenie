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

    // Deduplicate leads: same person + same event should only appear once.
    // Use email or phone as primary identity (more reliable than name).
    // Keep the entry with the most advanced pipeline stage (or most recently updated).
    const stageOrder: Record<string, number> = {};
    PIPELINE_STAGES.forEach((s, i) => {
      stageOrder[s] = i;
    });

    const dedupeMap = new Map<string, (typeof leads)[0]>();
    for (const lead of leads || []) {
      const email = (lead.payload?.email || "").trim().toLowerCase();
      const phone = (lead.payload?.phone_e164 || "").trim();
      const name = (lead.payload?.name || "").trim().toLowerCase();
      // Use email as primary dedup key, fall back to phone, then name
      const identity = email || phone || name;
      const key = `${identity}::${lead.event_id}`;
      const existing = dedupeMap.get(key);
      if (!existing) {
        dedupeMap.set(key, lead);
      } else {
        // Keep the one with the more advanced stage, or if same stage, most recently updated
        const existingStageIdx = stageOrder[existing.pipeline_stage] ?? 0;
        const newStageIdx = stageOrder[lead.pipeline_stage] ?? 0;
        if (
          newStageIdx > existingStageIdx ||
          (newStageIdx === existingStageIdx &&
            (lead.updated_at || lead.created_at) > (existing.updated_at || existing.created_at))
        ) {
          dedupeMap.set(key, lead);
        }
      }
    }
    const dedupedLeads = Array.from(dedupeMap.values());

    // Fetch event addresses for display
    const eventIds = [...new Set(dedupedLeads.map((l) => l.event_id))];
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
      const stageLeads = dedupedLeads.filter((l) => l.pipeline_stage === stageKey);
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
          // Qualification context
          buyerType: l.payload?.buyer_type || l.payload?.buyerType || null,
          priceRange: l.payload?.price_range || l.payload?.priceRange || l.payload?.budget || null,
          preApproved: l.payload?.pre_approved || l.payload?.preApproved || null,
          agent: l.payload?.current_agent || l.payload?.hasAgent || null,
          motivation: l.payload?.motivation || l.payload?.reason || null,
          notes: l.payload?.notes || l.payload?.comments || null,
          areas: l.payload?.areas_of_interest || l.payload?.areasOfInterest || null,
          bedsBaths: l.payload?.beds_baths || null,
          updatedAt: l.updated_at,
        })),
      };
    });

    return NextResponse.json({ stages });
  } catch (error: any) {
    console.error("Error fetching pipeline:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
