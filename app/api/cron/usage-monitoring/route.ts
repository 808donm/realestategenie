import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkUsageAndCreateAlerts } from "@/lib/subscriptions/utils";

/**
 * Cron job to monitor usage and create alerts
 * Should run daily to check all active subscriptions
 *
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/usage-monitoring",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all agents with active subscriptions
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from("agents")
      .select(`
        id,
        email,
        display_name,
        agent_subscriptions!inner (
          id,
          status
        )
      `)
      .eq("is_active", true)
      .eq("agent_subscriptions.status", "active");

    if (agentsError) {
      console.error("Error fetching agents:", agentsError);
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    const results = {
      total: agents?.length || 0,
      processed: 0,
      errors: [] as string[],
      alertsCreated: 0
    };

    // Process each agent
    for (const agent of agents || []) {
      try {
        // Check usage and create alerts if needed
        await checkUsageAndCreateAlerts(agent.id);
        results.processed++;
      } catch (error) {
        console.error(`Error processing agent ${agent.id}:`, error);
        results.errors.push(`${agent.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Get count of new unprocessed alerts (created in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: newAlerts } = await supabaseAdmin
      .from("usage_alerts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneHourAgo)
      .eq("email_sent", false);

    results.alertsCreated = newAlerts || 0;

    console.log("Usage monitoring complete:", results);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Usage monitoring error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
