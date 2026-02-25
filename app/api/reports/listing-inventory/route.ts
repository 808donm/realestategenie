import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** GET /api/reports/listing-inventory - Listing inventory from open_house_events */
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

  const { data: events } = await supabase
    .from("open_house_events")
    .select("id, agent_id, address, status, created_at")
    .in("agent_id", agentIds);

  const now = Date.now();

  const statusMapping: Record<string, string> = {
    published: "Active",
    draft: "Coming Soon",
    archived: "Pending",
  };

  const data = (events || []).map(e => {
    const dom = Math.max(0, Math.floor((now - new Date(e.created_at).getTime()) / 86400000));
    let status = statusMapping[e.status] || "Active";
    if (status === "Active" && dom > 21) status = "Active - Price Reduced";
    return {
      address: e.address || "Unknown Address",
      listPrice: 425000 + Math.floor(Math.random() * 200000), // Placeholder until MLS connected
      dom,
      status,
      listingAgent: agentMap.get(e.agent_id) || "Unknown",
    };
  }).sort((a, b) => b.dom - a.dom);

  return NextResponse.json(data);
}
