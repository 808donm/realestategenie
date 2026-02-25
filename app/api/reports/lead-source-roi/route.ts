import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { PIPELINE_STAGES } from "@/lib/pipeline-stages";

/** GET /api/reports/lead-source-roi - Lead Source ROI from real lead_submissions + open_house_events */
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

  // Each open house event is a "source"
  const { data: events } = await supabase
    .from("open_house_events").select("id, address").in("agent_id", agentIds);

  const { data: leads } = await supabase
    .from("lead_submissions").select("id, event_id, pipeline_stage, heat_score")
    .in("agent_id", agentIds);

  const closedStages = ["closed_and_followup", "review_request"];

  const sourceMap = new Map<string, { name: string; leads: number; closings: number; totalSpend: number; revenue: number }>();

  // Group leads by event (source)
  (leads || []).forEach(l => {
    const ev = (events || []).find(e => e.id === l.event_id);
    const sourceName = ev?.address || "Direct / Unknown";
    const entry = sourceMap.get(sourceName) || { name: sourceName, leads: 0, closings: 0, totalSpend: 0, revenue: 0 };
    entry.leads++;
    if (closedStages.includes(l.pipeline_stage)) {
      entry.closings++;
      // Estimate revenue per closing ($8,500 avg agent commission for Hawaii market)
      entry.revenue += 8500;
    }
    sourceMap.set(sourceName, entry);
  });

  const data = [...sourceMap.values()].sort((a, b) => b.leads - a.leads);

  return NextResponse.json(data);
}
