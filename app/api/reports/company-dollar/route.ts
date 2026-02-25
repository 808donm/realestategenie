import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** GET /api/reports/company-dollar - Company dollar report from closed deals */
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

  // Get all closed leads
  const { data: leads } = await supabase
    .from("lead_submissions")
    .select("id, agent_id, created_at, pipeline_stage")
    .in("agent_id", agentIds)
    .in("pipeline_stage", ["closed_and_followup", "review_request"]);

  const now = new Date();

  // Build monthly data for last 12 months
  const buildMonths = (startOffset: number, count: number) => {
    const months: { month: string; grossRevenue: number; agentSplits: number; fees: number; opEx: number; companyDollar: number }[] = [];
    for (let i = startOffset + count - 1; i >= startOffset; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });

      // Count closings in this month
      const closings = (leads || []).filter(l => {
        const ld = new Date(l.created_at);
        return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth();
      }).length;

      const grossRevenue = closings * 10625; // 2.5% of $425k avg
      const agentSplits = Math.round(grossRevenue * 0.70);
      const fees = Math.round(grossRevenue * 0.05);
      const opEx = closings > 0 ? 2500 : 800; // Base office costs
      const companyDollar = grossRevenue - agentSplits - fees - opEx;

      months.push({ month: monthLabel, grossRevenue, agentSplits, fees, opEx, companyDollar });
    }
    return months;
  };

  return NextResponse.json({
    this_quarter: buildMonths(0, 3),
    this_year: buildMonths(0, 12),
    last_year: buildMonths(12, 12),
  });
}
