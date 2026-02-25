import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** GET /api/reports/tax-savings-reserve - Monthly commission and tax reserve data */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get leads that reached closed stage (proxy for commission events)
  const { data: leads } = await supabase
    .from("lead_submissions")
    .select("id, pipeline_stage, created_at")
    .eq("agent_id", user.id)
    .in("pipeline_stage", ["closed_and_followup", "review_request"]);

  // Group closings by month
  const monthMap = new Map<string, number>();
  const now = new Date();
  // Initialize last 12 months
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, 0);
  }

  (leads || []).forEach(l => {
    const d = new Date(l.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    }
  });

  // Estimate: $8,500 avg commission per closing (Hawaii market)
  // Business expenses ~15% of gross, marketing ~8% of gross
  const data = [...monthMap.entries()].map(([month, closings]) => {
    const gross = closings * 8500;
    return {
      month,
      grossCommission: gross,
      businessExpenses: Math.round(gross * 0.15),
      marketingBudget: Math.round(gross * 0.08),
    };
  });

  return NextResponse.json(data);
}
