import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  aggregateAgentData,
  aggregateTeamData,
  aggregateBrokerData,
} from "@/lib/briefing/report-data";
import {
  generateAgentBriefing,
  generateTeamBriefing,
  generateBrokerBriefing,
} from "@/lib/briefing/ai-briefing";

/**
 * Daily AI Briefing Cron Job
 *
 * Runs hourly. At 6:00 AM in each agent's local timezone it:
 *   1. Aggregates report data for the agent
 *   2. Feeds it to the AI to produce top-3 priorities
 *   3. Sends a briefing email via Resend
 *
 * Team leads and brokers receive their own tailored version.
 *
 * Vercel cron schedule: "0 * * * *" (every hour at :00)
 * Required header: Authorization: Bearer [CRON_SECRET]
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting daily briefing cron...");

    const now = new Date();
    const results = {
      agentEmails: 0,
      teamEmails: 0,
      brokerEmails: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get all agents with timezones
    const { data: allAgents, error: agentsError } = await supabase
      .from("agents")
      .select("id, timezone, email");

    if (agentsError || !allAgents) {
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    // Determine which agents are at 6:00 AM local time right now
    const targetAgentIds: string[] = [];

    for (const agent of allAgents) {
      const tz = agent.timezone || "America/New_York";
      try {
        const localTime = new Date(
          now.toLocaleString("en-US", { timeZone: tz })
        );
        if (localTime.getHours() === 6) {
          targetAgentIds.push(agent.id);
        }
      } catch {
        // Invalid timezone, skip
      }
    }

    if (targetAgentIds.length === 0) {
      console.log("No agents at 6 AM right now — skipping.");
      return NextResponse.json({
        success: true,
        message: "No agents at 6 AM target time",
        ...results,
        timestamp: now.toISOString(),
      });
    }

    console.log(
      `${targetAgentIds.length} agent(s) at 6 AM — generating briefings...`
    );

    // Lazy-load Resend
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY!);

    // Look up account roles for each agent
    const { data: memberships } = await supabase
      .from("account_members")
      .select("user_id, account_id, account_role")
      .in("user_id", targetAgentIds);

    const roleMap = new Map<string, string>();
    (memberships || []).forEach((m) =>
      roleMap.set(m.user_id, m.account_role)
    );

    // Process each agent
    for (const agentId of targetAgentIds) {
      try {
        const role = roleMap.get(agentId) || "agent";

        // ── Agent briefing (everyone gets this) ──────────────────────
        const agentData = await aggregateAgentData(supabase, agentId);
        if (!agentData || !agentData.agentEmail) {
          results.skipped++;
          continue;
        }

        const agentBriefing = await generateAgentBriefing(agentData);

        await resend.emails.send({
          from: "Real Estate Genie <support@realestategenie.app>",
          to: [agentData.agentEmail],
          subject: agentBriefing.subject,
          html: agentBriefing.htmlBody,
        });
        results.agentEmails++;

        // ── Team Lead briefing (owners and admins) ───────────────────
        if (role === "owner" || role === "admin") {
          try {
            const teamData = await aggregateTeamData(supabase, agentId);
            if (teamData && teamData.leaderboard.length > 1) {
              const teamBriefing = await generateTeamBriefing(teamData);

              // Send summary to team lead
              await resend.emails.send({
                from: "Real Estate Genie <support@realestategenie.app>",
                to: [teamData.teamLeadEmail],
                subject: teamBriefing.subject,
                html: teamBriefing.htmlBody,
              });
              results.teamEmails++;

              // Send personalized coaching emails to each agent
              for (const ae of teamBriefing.agentEmails) {
                if (!ae.agentEmail) continue;
                const coachSubject = ae.isTopAgent
                  ? "You're on top — here's how to stay there"
                  : "Your path to the top of the leaderboard";

                const coachHtml = buildCoachingEmailHtml(
                  ae.agentName,
                  ae.message,
                  ae.isTopAgent
                );

                await resend.emails.send({
                  from: "Real Estate Genie <support@realestategenie.app>",
                  to: [ae.agentEmail],
                  subject: coachSubject,
                  html: coachHtml,
                });
              }
            }
          } catch (err: any) {
            console.error(`Team briefing error for ${agentId}:`, err.message);
            results.errors.push(`team:${agentId}:${err.message}`);
          }
        }

        // ── Broker briefing (owners only) ────────────────────────────
        if (role === "owner") {
          try {
            const brokerData = await aggregateBrokerData(supabase, agentId);
            if (brokerData) {
              const brokerBriefing = await generateBrokerBriefing(brokerData);

              await resend.emails.send({
                from: "Real Estate Genie <support@realestategenie.app>",
                to: [brokerData.brokerEmail],
                subject: brokerBriefing.subject,
                html: brokerBriefing.htmlBody,
              });
              results.brokerEmails++;
            }
          } catch (err: any) {
            console.error(`Broker briefing error for ${agentId}:`, err.message);
            results.errors.push(`broker:${agentId}:${err.message}`);
          }
        }
      } catch (err: any) {
        console.error(`Briefing error for agent ${agentId}:`, err.message);
        results.errors.push(`agent:${agentId}:${err.message}`);
      }
    }

    console.log("Daily briefing cron complete:", results);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Fatal error in daily briefing cron:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}

// ─── Coaching email HTML ─────────────────────────────────────────────────────

function buildCoachingEmailHtml(
  agentName: string,
  message: string,
  isTopAgent: boolean
): string {
  const headerColor = isTopAgent
    ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  const headerTitle = isTopAgent
    ? `Congrats, ${agentName.split(" ")[0]}!`
    : `Let's Go, ${agentName.split(" ")[0]}!`;
  const headerSub = isTopAgent
    ? "You're the top producer this period"
    : "Here's your playbook to climb the leaderboard";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="background: ${headerColor}; padding: 36px 40px 28px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">${headerTitle}</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">${headerSub}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.8; color: #374151; white-space: pre-wrap;">${message}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} &middot; The Real Estate Genie&trade;
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
