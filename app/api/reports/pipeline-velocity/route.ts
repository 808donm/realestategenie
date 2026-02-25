import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS, type PipelineStage } from "@/lib/pipeline-stages";

/** GET /api/reports/pipeline-velocity - Pipeline stage durations & stuck deals */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("account_members").select("account_id").eq("user_id", user.id).single();
  const { data: members } = membership
    ? await supabase.from("account_members").select("user_id").eq("account_id", membership.account_id)
    : { data: null };
  const agentIds = members ? members.map(m => m.user_id) : [user.id];

  const { data: leads } = await supabase
    .from("lead_submissions")
    .select("id, payload, pipeline_stage, heat_score, event_id, created_at, updated_at")
    .in("agent_id", agentIds);

  const { data: events } = await supabase
    .from("open_house_events").select("id, address").in("agent_id", agentIds);
  const eventMap = new Map((events || []).map(e => [e.id, e.address]));

  const now = Date.now();

  // Count per stage and compute avg days in stage
  const stageCounts = new Map<string, number>();
  const stageDays = new Map<string, number[]>();

  (leads || []).forEach(l => {
    const stage = l.pipeline_stage;
    stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
    const days = Math.max(1, Math.floor((now - new Date(l.updated_at || l.created_at).getTime()) / 86400000));
    const arr = stageDays.get(stage) || [];
    arr.push(days);
    stageDays.set(stage, arr);
  });

  const totalLeads = (leads || []).length || 1;
  let remaining = totalLeads;

  const stages = PIPELINE_STAGES.map(key => {
    const count = stageCounts.get(key) || 0;
    const days = stageDays.get(key) || [];
    const avgDays = days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0;
    const conversion = remaining > 0 ? Math.round(((remaining - count) / remaining) * 100) : 0;
    remaining = Math.max(0, remaining - count);
    return {
      name: PIPELINE_STAGE_LABELS[key],
      avgDays,
      currentCount: count,
      conversionToNext: count > 0 ? conversion : 100,
    };
  });

  // Stuck deals: leads sitting 2x+ the average for their stage
  const stuckDeals = (leads || [])
    .map(l => {
      const days = Math.max(1, Math.floor((now - new Date(l.updated_at || l.created_at).getTime()) / 86400000));
      const stageAvgArr = stageDays.get(l.pipeline_stage) || [1];
      const avgForStage = Math.round(stageAvgArr.reduce((a, b) => a + b, 0) / stageAvgArr.length);
      if (days >= avgForStage * 2 && avgForStage > 0) {
        return {
          name: l.payload?.name || "Unknown",
          stage: PIPELINE_STAGE_LABELS[l.pipeline_stage as PipelineStage] || l.pipeline_stage,
          daysInStage: days,
          avgForStage,
          source: eventMap.get(l.event_id) || "Unknown",
          value: 0,
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.daysInStage - a.daysInStage);

  return NextResponse.json({ stages, stuckDeals });
}
