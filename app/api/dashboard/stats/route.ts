import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Get dashboard statistics
 * GET /api/dashboard/stats
 */
export async function GET() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get lead statistics
    const { data: allLeads, error: leadsError } = await supabase
      .from("lead_submissions")
      .select("heat_score, created_at")
      .eq("agent_id", user.id);

    if (leadsError) throw leadsError;

    // Calculate lead metrics
    const totalLeads = allLeads?.length || 0;
    const hotLeads = allLeads?.filter((l) => l.heat_score >= 80).length || 0;
    const warmLeads = allLeads?.filter((l) => l.heat_score >= 50 && l.heat_score < 80).length || 0;
    const coldLeads = allLeads?.filter((l) => l.heat_score < 50).length || 0;

    // Get leads from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const leadsThisWeek =
      allLeads?.filter((l) => new Date(l.created_at) >= sevenDaysAgo).length || 0;

    // Get open house statistics
    const { data: openHouses, error: ohError } = await supabase
      .from("open_house_events")
      .select("status, start_at, end_at")
      .eq("agent_id", user.id);

    if (ohError) throw ohError;

    const totalOpenHouses = openHouses?.length || 0;
    const publishedOpenHouses = openHouses?.filter((oh) => oh.status === "published").length || 0;

    // Active open houses (published and not ended)
    const now = new Date();
    const activeOpenHouses =
      openHouses?.filter(
        (oh) => oh.status === "published" && new Date(oh.end_at) > now
      ).length || 0;

    // Get integration health
    const { data: integrations, error: intError } = await supabase
      .from("integrations")
      .select("provider, status, updated_at")
      .eq("agent_id", user.id);

    if (intError) throw intError;

    const ghlIntegration = integrations?.find((i) => i.provider === "ghl");
    const qboIntegration = integrations?.find((i) => i.provider === "qbo");

    return NextResponse.json({
      leads: {
        total: totalLeads,
        hot: hotLeads,
        warm: warmLeads,
        cold: coldLeads,
        thisWeek: leadsThisWeek,
      },
      openHouses: {
        total: totalOpenHouses,
        published: publishedOpenHouses,
        active: activeOpenHouses,
      },
      integrations: {
        ghl: {
          connected: ghlIntegration?.status === "connected",
          lastUpdated: ghlIntegration?.updated_at || null,
        },
        qbo: {
          connected: qboIntegration?.status === "connected",
          lastUpdated: qboIntegration?.updated_at || null,
        },
      },
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
