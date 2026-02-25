import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** GET /api/reports/lead-assignment - Lead distribution fairness across agents */
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

  const { data: agents } = await supabase
    .from("agents").select("id, display_name, email").in("id", agentIds);
  const agentMap = new Map((agents || []).map(a => [a.id, a.display_name || a.email || "Unknown"]));

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: leads } = await supabase
    .from("lead_submissions")
    .select("id, agent_id, pipeline_stage, created_at, updated_at")
    .in("agent_id", agentIds)
    .gte("created_at", thirtyDaysAgo);

  const closedStages = ["closed_and_followup", "review_request"];

  const perAgent = new Map<string, { received: number; contacted: number; converted: number; responseMins: number[] }>();
  agentIds.forEach(id => perAgent.set(id, { received: 0, contacted: 0, converted: 0, responseMins: [] }));

  (leads || []).forEach(l => {
    const entry = perAgent.get(l.agent_id);
    if (!entry) return;
    entry.received++;
    if (l.pipeline_stage !== "new_lead") {
      entry.contacted++;
      if (l.updated_at && l.created_at) {
        entry.responseMins.push(Math.max(0, (new Date(l.updated_at).getTime() - new Date(l.created_at).getTime()) / 60000));
      }
    }
    if (closedStages.includes(l.pipeline_stage)) entry.converted++;
  });

  const data = agentIds.map(id => {
    const e = perAgent.get(id)!;
    const avgResp = e.responseMins.length > 0
      ? Math.round(e.responseMins.reduce((a, b) => a + b, 0) / e.responseMins.length)
      : 0;
    return {
      name: agentMap.get(id) || "Unknown",
      leadsReceived: e.received,
      leadsContacted: e.contacted,
      leadsConverted: e.converted,
      avgResponseTime: avgResp,
    };
  }).sort((a, b) => b.leadsReceived - a.leadsReceived);

  return NextResponse.json(data);
}
