/**
 * Genie Draft Generator — AI-powered email and SMS drafts
 *
 * Wraps existing draftFollowUpEmail() for email channel.
 * Adds SMS draft and open house reminder generation.
 * All use GPT-4o-mini via Vercel AI Gateway.
 */

import { trackedGenerateText } from "@/lib/ai/ai-call-logger";
import { draftFollowUpEmail } from "@/lib/briefing/ai-briefing";
import type { DraftChannel } from "./types";

const BRIEFING_MODEL = process.env.BRIEFING_AI_MODEL || "openai/gpt-4o-mini";

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

// ── Email Draft ──────────────────────────────────────────────────────────────

export async function draftEmail(params: {
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
  // Delegate to existing draftFollowUpEmail — already stage-aware
  return draftFollowUpEmail(params);
}

// ── SMS Draft ────────────────────────────────────────────────────────────────

export async function draftSMS(params: {
  agentName: string;
  leadName: string;
  pipelineStage: string;
  pipelineStageLabel: string;
  heatScore: number;
  property: string;
  timeline: string | null;
  financing: string | null;
  recentOpenHouse: boolean;
}): Promise<{ body: string }> {
  const { text } = await trackedGenerateText({
    model: BRIEFING_MODEL,
    source: "draft-generator",
    system: `You are a real estate agent's SMS assistant. Draft a brief, warm follow-up text message.

RULES:
- Keep it under 280 characters
- Conversational, SMS-appropriate tone (not formal email language)
- Match tone to pipeline stage:
  - "new_lead"/"initial_contact": Thank for visiting, offer to help, light touch
  - "qualification"/"initial_consultation": Reference their needs, offer to meet
  - Mid-pipeline: Share next steps, be action-oriented
  - Post-close: Thank them, ask for referral
- Use agent's first name
- NEVER be pushy
- No emojis unless the tone calls for it

Return ONLY valid JSON: { "body": "sms text" }`,
    prompt: `Agent: ${params.agentName}
Lead: ${params.leadName}
Stage: ${params.pipelineStageLabel}
Heat Score: ${params.heatScore}
Property: ${params.property}
Timeline: ${params.timeline || "not specified"}
Financing: ${params.financing || "not specified"}
Recent Open House: ${params.recentOpenHouse ? "yes" : "no"}

Draft the SMS.`,
    temperature: 0.7,
  });

  return JSON.parse(extractJSON(text));
}

// ── Open House Reminder SMS ──────────────────────────────────────────────────

export async function draftOpenHouseReminder(params: {
  agentName: string;
  address: string;
  date: string;
  time: string;
}): Promise<{ body: string }> {
  const { text } = await trackedGenerateText({
    model: BRIEFING_MODEL,
    source: "draft-generator",
    system: `Draft a brief, friendly SMS reminder for an open house event.

RULES:
- Under 250 characters
- Include the address and time
- Warm, inviting tone
- No emojis
- Use agent's first name

Return ONLY valid JSON: { "body": "sms text" }`,
    prompt: `Agent: ${params.agentName}
Address: ${params.address}
Date: ${params.date}
Time: ${params.time}

Draft the reminder SMS.`,
    temperature: 0.7,
  });

  return JSON.parse(extractJSON(text));
}

// ── Unified Draft Function ───────────────────────────────────────────────────

export async function generateDraft(
  channel: DraftChannel,
  params: {
    agentName: string;
    leadName: string;
    leadEmail?: string | null;
    pipelineStage: string;
    pipelineStageLabel: string;
    heatScore: number;
    property: string;
    timeline?: string | null;
    financing?: string | null;
    recentOpenHouse?: boolean;
    openHouseDate?: string | null;
  },
): Promise<{ subject?: string; body: string }> {
  if (channel === "email") {
    return draftEmail({
      ...params,
      leadEmail: params.leadEmail || null,
      timeline: params.timeline || null,
      financing: params.financing || null,
      recentOpenHouse: params.recentOpenHouse ?? false,
      openHouseDate: params.openHouseDate || null,
    });
  }

  return draftSMS({
    ...params,
    timeline: params.timeline || null,
    financing: params.financing || null,
    recentOpenHouse: params.recentOpenHouse ?? false,
  });
}
