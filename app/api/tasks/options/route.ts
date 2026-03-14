import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** GET /api/tasks/options — fetch entity options for task linking dropdowns */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [{ data: leads }, { data: openHouses }, { data: teamMembers }] = await Promise.all([
      supabase
        .from("lead_submissions")
        .select("id, payload, heat_score")
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("open_house_events")
        .select("id, address, start_at")
        .eq("agent_id", user.id)
        .order("start_at", { ascending: false })
        .limit(50),
      supabase
        .from("agents")
        .select("id, display_name")
        .eq("is_active", true)
        .limit(50),
    ]);

    return NextResponse.json({
      leads: (leads || []).map((l) => ({
        id: l.id,
        label: (l.payload as any)?.name || (l.payload as any)?.email || "Unknown Lead",
        heat_score: l.heat_score,
      })),
      openHouses: (openHouses || []).map((oh) => ({
        id: oh.id,
        label: oh.address || "Unknown Address",
        date: oh.start_at,
      })),
      teamMembers: (teamMembers || []).map((tm) => ({
        id: tm.id,
        label: tm.display_name || "Agent",
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
