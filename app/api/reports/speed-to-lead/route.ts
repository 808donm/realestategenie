import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** GET /api/reports/speed-to-lead - Response time analysis from lead_submissions */
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

  // Get leads from last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: leads } = await supabase
    .from("lead_submissions")
    .select("id, pipeline_stage, created_at, updated_at")
    .in("agent_id", agentIds)
    .gte("created_at", thirtyDaysAgo);

  if (!leads || leads.length === 0) {
    return NextResponse.json({
      avgResponseMin: 0, medianResponseMin: 0,
      under5min: 0, under15min: 0, under1hr: 0, over1hr: 0,
      totalLeads: 0, noResponse24hr: 0, hourlyBreakdown: [],
    });
  }

  // Response time = time from created_at to updated_at (first stage advance)
  const responseTimes: number[] = [];
  let noResponse = 0;

  leads.forEach(l => {
    if (l.pipeline_stage === "new_lead") {
      noResponse++;
    } else if (l.updated_at && l.created_at) {
      const mins = Math.max(0, (new Date(l.updated_at).getTime() - new Date(l.created_at).getTime()) / 60000);
      responseTimes.push(mins);
    }
  });

  responseTimes.sort((a, b) => a - b);
  const avg = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
  const median = responseTimes.length > 0 ? Math.round(responseTimes[Math.floor(responseTimes.length / 2)]) : 0;

  const under5 = responseTimes.filter(t => t < 5).length;
  const under15 = responseTimes.filter(t => t >= 5 && t < 15).length;
  const under60 = responseTimes.filter(t => t >= 15 && t < 60).length;
  const over60 = responseTimes.filter(t => t >= 60).length;

  // Hourly breakdown of when leads come in
  const hourlyCounts = new Map<number, { total: number; sumMins: number }>();
  leads.forEach(l => {
    const hour = new Date(l.created_at).getHours();
    const entry = hourlyCounts.get(hour) || { total: 0, sumMins: 0 };
    entry.total++;
    if (l.pipeline_stage !== "new_lead" && l.updated_at) {
      entry.sumMins += (new Date(l.updated_at).getTime() - new Date(l.created_at).getTime()) / 60000;
    }
    hourlyCounts.set(hour, entry);
  });

  const hourlyBreakdown = Array.from(hourlyCounts.entries())
    .map(([hour, v]) => ({ hour, avg: v.total > 0 ? Math.round(v.sumMins / v.total) : 0, count: v.total }))
    .sort((a, b) => a.hour - b.hour);

  return NextResponse.json({
    avgResponseMin: avg,
    medianResponseMin: median,
    under5min: under5,
    under15min: under15,
    under1hr: under60,
    over1hr: over60,
    totalLeads: leads.length,
    noResponse24hr: noResponse,
    hourlyBreakdown,
  });
}
