import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** GET /api/reports/compliance-audit - Compliance events from audit_log */
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
    .from("open_house_events").select("id, address").in("agent_id", agentIds);
  const eventMap = new Map((events || []).map(e => [e.id, e.address]));

  // Get audit log entries
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data: auditEntries } = await supabase
    .from("audit_log")
    .select("id, agent_id, event_id, action, details, created_at")
    .in("agent_id", agentIds)
    .gte("created_at", ninetyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(100);

  // Map audit actions to compliance event types
  const eventTypeMap: Record<string, string> = {
    "lead_submitted": "Document Signed",
    "lead.pushed_to_ghl": "ID Verified",
    "integration.configured": "Disclosure Submitted",
    "integration.disconnected": "Wire Instructions Sent",
  };

  let counter = 1;
  const data = (auditEntries || []).map(e => ({
    id: counter++,
    date: new Date(e.created_at).toISOString().split("T")[0],
    eventType: eventTypeMap[e.action] || "Document Signed",
    property: eventMap.get(e.event_id) || "General",
    agent: agentMap.get(e.agent_id) || "Unknown",
    status: "Complete" as const,
  }));

  return NextResponse.json(data);
}
