/**
 * AI Briefing Generator
 *
 * Uses the Vercel AI SDK to analyze report data and produce:
 *   1. Daily priority emails for agents, team leads, and brokers
 *   2. Stage-aware follow-up email drafts for individual leads
 *
 * Model is configurable via BRIEFING_AI_MODEL env var.
 * Default: gpt-4o-mini (60x cheaper than gpt-4-turbo, excellent for structured output).
 * Set to "claude" to use Claude Haiku via @ai-sdk/anthropic.
 */

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { AgentBriefingData, TeamBriefingData, BrokerBriefingData } from "./report-data";

/** Resolve the AI model to use for briefings. Cheap and fast by default. */
function getBriefingModel() {
  const modelEnv = process.env.BRIEFING_AI_MODEL || "gpt-4o-mini";
  // Vercel AI SDK: openai("model-id") works for any OpenAI-compatible model
  return openai(modelEnv);
}

// ─── Agent daily briefing ────────────────────────────────────────────────────

export async function generateAgentBriefing(data: AgentBriefingData): Promise<{
  subject: string;
  priorities: { title: string; description: string; leadId?: string }[];
  htmlBody: string;
}> {
  const followUpSummary = data.followUps.slice(0, 15).map((f) =>
    `- ${f.name} | Score: ${f.heatScore} | Stage: ${f.pipelineStageLabel} | Property: ${f.property} | Days since touch: ${f.daysSinceLastTouch} | Timeline: ${f.timeline || "unknown"} | Financing: ${f.financing || "unknown"} | Recent OH: ${f.recentOpenHouse ? "yes (" + f.openHouseDate + ")" : "no"}`
  ).join("\n");

  const pipelineSummary = data.pipelineSnapshot
    .filter((s) => s.count > 0)
    .map((s) => `${s.label}: ${s.count}`)
    .join(", ");

  const speedSummary = `New leads this week: ${data.speedToLead.totalNewLeadsThisWeek}, Leads with no response yet: ${data.speedToLead.leadsWithNoResponse}`;

  const { text } = await generateText({
    model: getBriefingModel(),
    system: `You are a real estate coach and revenue optimization AI. Analyze the agent's lead data and produce EXACTLY 3 top priority actions for today, ranked by which will create the MOST revenue opportunity.

Focus heavily on lead follow-up. Leads from recent open houses are especially time-sensitive — the agent should thank them, offer to answer questions, and keep the conversation warm.

For each priority, explain WHY this action matters for revenue and WHAT specifically to do.

Return ONLY valid JSON:
{
  "subject": "short email subject line (under 60 chars)",
  "priorities": [
    { "title": "short action title", "description": "2-3 sentence explanation with specific lead names and actions", "leadId": "optional lead ID if applicable" },
    { "title": "...", "description": "...", "leadId": "..." },
    { "title": "...", "description": "..." }
  ]
}`,
    prompt: `Agent: ${data.agentName}
Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

TOP LEADS NEEDING FOLLOW-UP:
${followUpSummary || "No leads currently."}

PIPELINE SNAPSHOT:
${pipelineSummary || "Empty pipeline."}

SPEED-TO-LEAD:
${speedSummary}

TOP LEAD SOURCES:
${data.leadSourceBreakdown.map((s) => `${s.source}: ${s.count} leads`).join(", ") || "No data."}

MLS LISTING MATCHES FOR YOUR LEADS:
${data.mlsMatches.length > 0
  ? data.mlsMatches.map((m) =>
      `- ${m.leadName}: ${m.matchCount} new listing${m.matchCount !== 1 ? "s" : ""} match their criteria${
        m.topMatch ? ` (top: ${m.topMatch.address} at $${m.topMatch.listPrice.toLocaleString()}, ${m.topMatch.matchScore}% match)` : ""
      }`
    ).join("\n")
  : "No MLS matches (Trestle not connected or no matching listings)."}

Generate the 3 highest-revenue-impact priorities for today. If there are MLS matches, one priority should be about sending matched listings to the appropriate leads — this is a high-conversion activity.`,
    temperature: 0.7,
  });

  const parsed = JSON.parse(extractJSON(text));

  // Build HTML email
  const htmlBody = buildAgentBriefingHtml(data.agentName, parsed.priorities);

  return {
    subject: parsed.subject,
    priorities: parsed.priorities,
    htmlBody,
  };
}

// ─── Team Lead daily briefing ────────────────────────────────────────────────

export async function generateTeamBriefing(data: TeamBriefingData): Promise<{
  subject: string;
  agentEmails: { agentName: string; agentEmail: string; message: string; isTopAgent: boolean }[];
  htmlBody: string;
}> {
  const leaderboardSummary = data.leaderboard
    .map((a, i) =>
      `${i + 1}. ${a.name} — ${a.leadsCount} leads, ${a.hotLeads} hot, ${a.pipelineAdvances} advances`
    )
    .join("\n");

  const fairnessSummary = data.fairness
    .map((f) => `${f.agentName}: ${f.leadsReceived} leads (${f.deviationFromAvg > 0 ? "+" : ""}${f.deviationFromAvg}% from avg)`)
    .join("\n");

  const { text } = await generateText({
    model: getBriefingModel(),
    system: `You are a real estate team performance coach. Analyze team performance data and create personalized coaching messages for each agent.

For the TOP agent: Write a congratulatory message with 2-3 specific actions to maintain their edge.
For EVERY other agent: Write an encouraging, competitive-but-supportive message with 2-3 specific actions to climb the leaderboard. Reference their specific numbers and what the top agent is doing differently. Keep the competitive spirit alive.

Return ONLY valid JSON:
{
  "subject": "short email subject for the team lead summary (under 60 chars)",
  "agents": [
    { "name": "Agent Name", "message": "personalized coaching message (3-4 sentences)", "isTopAgent": true/false }
  ]
}`,
    prompt: `Team Lead: ${data.teamLeadName}
Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

LEADERBOARD (last 30 days):
${leaderboardSummary || "No agent data."}

LEAD DISTRIBUTION FAIRNESS:
${fairnessSummary || "No data."}

LISTING INVENTORY:
Active: ${data.inventoryHealth.totalActive}, Avg DOM: ${data.inventoryHealth.avgDOM}, Stale (21+ days): ${data.inventoryHealth.staleListings}

TOTALS:
Team leads: ${data.totalTeamLeads}, Avg per agent: ${data.avgLeadsPerAgent}

Generate personalized messages for each agent and a summary for the team lead.`,
    temperature: 0.7,
  });

  const parsed = JSON.parse(extractJSON(text));

  // Map agent messages to emails
  const agentEmails = (parsed.agents || []).map((a: any) => {
    const match = data.leaderboard.find(
      (lb) => lb.name.toLowerCase() === a.name.toLowerCase()
    );
    return {
      agentName: a.name,
      agentEmail: match?.email || "",
      message: a.message,
      isTopAgent: a.isTopAgent || false,
    };
  }).filter((a: any) => a.agentEmail);

  const htmlBody = buildTeamBriefingHtml(data.teamLeadName, data.leaderboard, agentEmails);

  return { subject: parsed.subject, agentEmails, htmlBody };
}

// ─── Broker daily briefing ───────────────────────────────────────────────────

export async function generateBrokerBriefing(data: BrokerBriefingData): Promise<{
  subject: string;
  execSummary: string;
  actions: { title: string; description: string }[];
  htmlBody: string;
}> {
  const { text } = await generateText({
    model: getBriefingModel(),
    system: `You are a brokerage strategy advisor. Produce an executive summary and 3 actionable recommendations for the broker focused on:
1. Increasing market share
2. Maintaining healthy margins
3. Preventing agent churn

Be direct and data-driven. Reference specific numbers from the data.

Return ONLY valid JSON:
{
  "subject": "short email subject (under 60 chars)",
  "execSummary": "3-4 sentence executive summary",
  "actions": [
    { "title": "action title", "description": "2-3 sentence explanation" },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ]
}`,
    prompt: `Broker: ${data.brokerName}
Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

COMPANY DOLLAR:
Monthly Gross: $${data.companyDollar.monthlyGross}, Agent Splits: $${data.companyDollar.agentSplits}, OpEx: $${data.companyDollar.operatingExpenses}, Net: $${data.companyDollar.netCompanyDollar}, Margin: ${data.companyDollar.marginPct}%

COMPLIANCE:
${data.compliance.totalEvents} events, ${data.compliance.compliancePct}% complete, ${data.compliance.pendingCount} pending, ${data.compliance.missingCount} missing

AGENT RETENTION:
${data.retentionRisk.totalAgents} agents, ${data.retentionRisk.atRiskCount} at risk
Critical agents: ${data.retentionRisk.criticalAgents.map((a) => `${a.name} (${a.activityDrop}% drop)`).join(", ") || "None"}

MARKET POSITION:
${data.marketPosition.totalTransactions} transactions, ${data.marketPosition.agentCount} agents

Generate an executive summary and 3 strategic actions.`,
    temperature: 0.7,
  });

  const parsed = JSON.parse(extractJSON(text));
  const htmlBody = buildBrokerBriefingHtml(data.brokerName, parsed.execSummary, parsed.actions, data);

  return {
    subject: parsed.subject,
    execSummary: parsed.execSummary,
    actions: parsed.actions,
    htmlBody,
  };
}

// ─── Follow-up email drafter ─────────────────────────────────────────────────

export async function draftFollowUpEmail(params: {
  agentName: string;
  leadName: string;
  leadEmail: string | null;
  pipelineStage: string;
  pipelineStageLabel: string;
  heatScore: number;
  property: string;
  timeline: string | null;
  financing: string | null;
  recentOpenHouse: boolean;
  openHouseDate: string | null;
}): Promise<{ subject: string; body: string }> {
  const { text } = await generateText({
    model: getBriefingModel(),
    system: `You are a real estate agent's email assistant. Draft a professional, warm follow-up email from the agent to the lead.

RULES:
- Keep it concise (under 150 words)
- Match the tone to the pipeline stage
- For "new_lead" or "initial_contact" after an open house: thank them for attending, mention you're available to answer questions free of charge, keep it light and friendly
- For "qualification" or "initial_consultation": reference their timeline/financing situation, offer a no-obligation consultation
- For "property_search_listing_prep" or "open_houses_and_tours": share relevant next steps, offer to schedule showings
- For "offer_and_negotiation" through "closing_coordination": be professional and action-oriented, reference specific next steps
- For "closed_and_followup" or "review_request": thank them, ask for a review or referral
- NEVER be pushy or salesy
- Use the agent's first name in the sign-off

Return ONLY valid JSON:
{ "subject": "email subject", "body": "email body (plain text, use \\n for line breaks)" }`,
    prompt: `Agent Name: ${params.agentName}
Lead Name: ${params.leadName}
Pipeline Stage: ${params.pipelineStageLabel}
Heat Score: ${params.heatScore}
Property: ${params.property}
Timeline: ${params.timeline || "not specified"}
Financing: ${params.financing || "not specified"}
Recent Open House: ${params.recentOpenHouse ? "yes, on " + params.openHouseDate : "no"}

Draft the follow-up email.`,
    temperature: 0.7,
  });

  return JSON.parse(extractJSON(text));
}

// ─── HTML email builders ─────────────────────────────────────────────────────

function buildAgentBriefingHtml(
  agentName: string,
  priorities: { title: string; description: string }[]
): string {
  const priorityRows = priorities
    .map(
      (p, i) => `
      <tr>
        <td style="padding: 20px; border-bottom: 1px solid #f3f4f6;">
          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <div style="min-width: 32px; height: 32px; border-radius: 50%; background: ${
              i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : "#3b82f6"
            }; color: #fff; text-align: center; line-height: 32px; font-weight: 700; font-size: 14px;">
              ${i + 1}
            </div>
            <div>
              <div style="font-weight: 700; font-size: 15px; color: #111827; margin-bottom: 4px;">${p.title}</div>
              <div style="font-size: 14px; line-height: 1.6; color: #4b5563;">${p.description}</div>
            </div>
          </div>
        </td>
      </tr>`
    )
    .join("");

  return emailWrapper(
    `Good Morning, ${agentName.split(" ")[0]}!`,
    "Your Top 3 Priorities Today",
    `<p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
      Here are your highest-impact actions for today, ranked by revenue opportunity:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
      ${priorityRows}
    </table>
    <p style="margin: 20px 0 0; font-size: 14px; color: #6b7280;">
      Log in to your pipeline to take action on these items.
    </p>`
  );
}

function buildTeamBriefingHtml(
  teamLeadName: string,
  leaderboard: { name: string; leadsCount: number; hotLeads: number }[],
  agentEmails: { agentName: string; message: string; isTopAgent: boolean }[]
): string {
  const leaderboardRows = leaderboard
    .slice(0, 5)
    .map(
      (a, i) => `
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid #f3f4f6; font-weight: ${i === 0 ? "700" : "400"}; color: ${i === 0 ? "#059669" : "#374151"};">
          ${i === 0 ? "&#x1F3C6;" : `${i + 1}.`} ${a.name}
        </td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #f3f4f6; text-align: center;">${a.leadsCount}</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #f3f4f6; text-align: center; color: #ef4444; font-weight: 600;">${a.hotLeads}</td>
      </tr>`
    )
    .join("");

  return emailWrapper(
    `Team Update for ${teamLeadName.split(" ")[0]}`,
    "Agent Leaderboard & Coaching",
    `<table width="100%" cellpadding="0" cellspacing="0" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
      <tr style="background: #f9fafb;">
        <td style="padding: 10px 16px; font-weight: 700; font-size: 12px; color: #6b7280;">Agent</td>
        <td style="padding: 10px 16px; font-weight: 700; font-size: 12px; color: #6b7280; text-align: center;">Leads</td>
        <td style="padding: 10px 16px; font-weight: 700; font-size: 12px; color: #6b7280; text-align: center;">Hot</td>
      </tr>
      ${leaderboardRows}
    </table>
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px;">
      Personalized coaching emails have been sent to each agent.
    </p>`
  );
}

function buildBrokerBriefingHtml(
  brokerName: string,
  execSummary: string,
  actions: { title: string; description: string }[],
  data: BrokerBriefingData
): string {
  const actionRows = actions
    .map(
      (a) => `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #f3f4f6;">
          <div style="font-weight: 700; font-size: 14px; color: #111827; margin-bottom: 4px;">${a.title}</div>
          <div style="font-size: 13px; line-height: 1.6; color: #4b5563;">${a.description}</div>
        </td>
      </tr>`
    )
    .join("");

  return emailWrapper(
    `Brokerage Brief for ${brokerName.split(" ")[0]}`,
    "Executive Summary",
    `
    <!-- KPI Strip -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px; background: #f0fdf4; border-radius: 8px; text-align: center; width: 33%;">
          <div style="font-size: 12px; color: #6b7280; font-weight: 600;">Agents</div>
          <div style="font-size: 22px; font-weight: 800; color: #059669;">${data.retentionRisk.totalAgents}</div>
        </td>
        <td style="width: 8px;"></td>
        <td style="padding: 16px; background: ${data.retentionRisk.atRiskCount > 0 ? "#fef2f2" : "#f0fdf4"}; border-radius: 8px; text-align: center; width: 33%;">
          <div style="font-size: 12px; color: #6b7280; font-weight: 600;">At Risk</div>
          <div style="font-size: 22px; font-weight: 800; color: ${data.retentionRisk.atRiskCount > 0 ? "#ef4444" : "#059669"};">${data.retentionRisk.atRiskCount}</div>
        </td>
        <td style="width: 8px;"></td>
        <td style="padding: 16px; background: #eff6ff; border-radius: 8px; text-align: center; width: 33%;">
          <div style="font-size: 12px; color: #6b7280; font-weight: 600;">Compliance</div>
          <div style="font-size: 22px; font-weight: 800; color: #3b82f6;">${data.compliance.compliancePct}%</div>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #374151;">${execSummary}</p>

    <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 700; color: #111827;">Recommended Actions</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
      ${actionRows}
    </table>`
  );
}

// ─── Shared email wrapper ────────────────────────────────────────────────────

function emailWrapper(heading: string, subheading: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 36px 40px 28px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">${heading}</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">${subheading}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px;">
              ${body}
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (match) return match[1].trim();
  return text.trim();
}
