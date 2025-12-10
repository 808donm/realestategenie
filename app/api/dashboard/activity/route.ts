import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type Activity = {
  id: string;
  type: "lead" | "open_house" | "integration" | "webhook";
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
};

/**
 * Get recent activity feed
 * GET /api/dashboard/activity
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
    const activities: Activity[] = [];

    // Get recent leads
    const { data: leads } = await supabase
      .from("lead_submissions")
      .select("id, created_at, heat_score, payload")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (leads) {
      leads.forEach((lead) => {
        const payload: any = lead.payload || {};
        activities.push({
          id: `lead-${lead.id}`,
          type: "lead",
          title: `New lead: ${payload.name || "Anonymous"}`,
          description: `Heat score: ${lead.heat_score}/100${
            payload.email ? ` • ${payload.email}` : ""
          }`,
          timestamp: lead.created_at,
          metadata: {
            heatScore: lead.heat_score,
            email: payload.email,
          },
        });
      });
    }

    // Get recent open houses
    const { data: openHouses } = await supabase
      .from("open_house_events")
      .select("id, created_at, address, status")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (openHouses) {
      openHouses.forEach((oh) => {
        activities.push({
          id: `oh-${oh.id}`,
          type: "open_house",
          title: `Open house ${oh.status}: ${oh.address}`,
          description: `Status: ${oh.status}`,
          timestamp: oh.created_at,
          metadata: {
            status: oh.status,
          },
        });
      });
    }

    // Get recent audit log entries (integrations)
    const { data: auditLogs } = await supabase
      .from("audit_log")
      .select("id, created_at, action, details")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (auditLogs) {
      auditLogs.forEach((log) => {
        const details: any = log.details || {};
        if (log.action === "integration.configured") {
          activities.push({
            id: `audit-${log.id}`,
            type: "integration",
            title: `${details.provider?.toUpperCase()} integration configured`,
            description: "Successfully connected",
            timestamp: log.created_at,
            metadata: {
              provider: details.provider,
            },
          });
        }
      });
    }

    // Get recent webhook deliveries
    const { data: webhooks } = await supabase
      .from("webhook_logs")
      .select("id, created_at, event_type, status_code, delivered_at")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (webhooks) {
      webhooks.forEach((wh) => {
        if (wh.delivered_at) {
          activities.push({
            id: `webhook-${wh.id}`,
            type: "webhook",
            title: `Webhook delivered: ${wh.event_type}`,
            description: `Status: ${wh.status_code}`,
            timestamp: wh.created_at,
            metadata: {
              eventType: wh.event_type,
              statusCode: wh.status_code,
            },
          });
        }
      });
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Return top 20
    return NextResponse.json({ activities: activities.slice(0, 20) });
  } catch (error: any) {
    console.error("Activity feed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
