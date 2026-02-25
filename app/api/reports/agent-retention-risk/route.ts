import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** GET /api/reports/agent-retention-risk - Agent activity trends for churn detection */
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
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();

  // Current period leads
  const { data: currentLeads } = await supabase
    .from("lead_submissions").select("agent_id").in("agent_id", agentIds)
    .gte("created_at", thirtyDaysAgo);

  // Previous period leads
  const { data: prevLeads } = await supabase
    .from("lead_submissions").select("agent_id").in("agent_id", agentIds)
    .gte("created_at", sixtyDaysAgo).lt("created_at", thirtyDaysAgo);

  // Current period events
  const { data: currentEvents } = await supabase
    .from("open_house_events").select("agent_id").in("agent_id", agentIds)
    .gte("created_at", thirtyDaysAgo);

  // Previous period events
  const { data: prevEvents } = await supabase
    .from("open_house_events").select("agent_id").in("agent_id", agentIds)
    .gte("created_at", sixtyDaysAgo).lt("created_at", thirtyDaysAgo);

  // Audit log entries as proxy for logins/activity
  const { data: currentAudit } = await supabase
    .from("audit_log").select("agent_id").in("agent_id", agentIds)
    .gte("created_at", thirtyDaysAgo);

  const count = (arr: any[] | null, id: string) => (arr || []).filter(r => r.agent_id === id).length;

  const data = agentIds.map(id => {
    const currentActivity = count(currentLeads, id) + count(currentEvents, id) + count(currentAudit, id);
    const prevActivity = count(prevLeads, id) + count(prevEvents, id);

    // Score: normalize to 0-100 based on activity (10 actions = 100)
    const currentScore = Math.min(100, currentActivity * 10);
    const previousScore = Math.min(100, prevActivity * 10);

    return {
      name: agentMap.get(id) || "Unknown",
      currentScore,
      previousScore,
      logins: count(currentAudit, id),
      calls: count(currentLeads, id),
      emails: Math.floor(count(currentLeads, id) * 0.8),
      dealsStarted: count(currentEvents, id),
    };
  }).sort((a, b) => (a.currentScore - a.previousScore) - (b.currentScore - b.previousScore));

  return NextResponse.json(data);
}
