/**
 * Escalation Manager
 * Handles hot lead detection, agent notification, and conversation handoff
 */

import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";
import {
  logEscalationSummary,
  sendSMSReply,
  getGHLClientForAgent,
} from "./ghl-sync";
import {
  transitionPhase,
  type LeadConversation,
  type ExtractedData,
} from "./conversation-state";

function getModel() {
  return gateway(process.env.LEAD_RESPONSE_AI_MODEL || "openai/gpt-4o-mini");
}

/**
 * Check if a conversation should be escalated and perform the escalation
 * Returns true if escalation was triggered
 */
export async function checkAndEscalate(
  convo: LeadConversation
): Promise<boolean> {
  if (convo.current_phase === "escalated" || convo.current_phase === "handed_off") {
    return false;
  }

  if (convo.current_heat_score < convo.escalation_threshold) {
    return false;
  }

  console.log(
    `[Escalation] Triggering escalation for conversation ${convo.id} (score: ${convo.current_heat_score}, threshold: ${convo.escalation_threshold})`
  );

  // Generate summary card
  const summaryCard = await generateLeadSummary(convo);

  // Transition to escalated phase
  await transitionPhase(convo.id, "escalated");

  // Log escalation summary to GHL contact
  if (convo.contact_id) {
    await logEscalationSummary(
      convo.agent_id,
      convo.contact_id,
      convo,
      summaryCard
    );
  }

  // Notify the agent
  await notifyAgent(convo, summaryCard);

  // Dispatch webhook event
  await dispatchWebhook(convo.agent_id, "lead.hot_scored", {
    conversation_id: convo.id,
    contact_id: convo.contact_id,
    heat_score: convo.current_heat_score,
    extracted_data: convo.extracted_data,
    summary: summaryCard,
    source: convo.source,
  });

  return true;
}

/**
 * Generate a one-paragraph AI summary of the lead
 */
async function generateLeadSummary(convo: LeadConversation): Promise<string> {
  const data = convo.extracted_data as ExtractedData;
  const messageHistory = (convo.messages || [])
    .map((m) => `${m.role === "lead" ? "Lead" : "AI"}: ${m.content}`)
    .join("\n");

  const { text } = await generateText({
    model: getModel(),
    system: `Write a brief 2-3 sentence summary of this real estate lead for the agent.
Include: who they are, what they're looking for, their timeline, financing status, and readiness level.
Be concise and actionable — the agent should be able to read this in 10 seconds and know exactly what to do.`,
    prompt: `Lead Name: ${data.name || convo.contact_name || "Unknown"}
Phone: ${convo.contact_phone || "Unknown"}
Email: ${data.email || convo.contact_email || "Unknown"}
Timeline: ${data.timeline || "Unknown"}
Financing: ${data.financing || "Unknown"}
Budget: ${data.budget || "Unknown"}
Pre-approval: ${data.preapproval_amount || "Unknown"}
Areas: ${data.neighborhoods || "Unknown"}
Must-haves: ${data.must_haves || "Unknown"}
Motivation: ${data.motivation || "Unknown"}
Heat Score: ${convo.current_heat_score}
Source: ${convo.source}

Conversation:
${messageHistory}`,
    temperature: 0.5,
  });

  return text.trim();
}

/**
 * Notify the agent about a hot lead via available channels
 */
async function notifyAgent(
  convo: LeadConversation,
  summaryCard: string
): Promise<void> {
  // Fetch agent details
  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("display_name, email, phone_e164, user_id")
    .eq("id", convo.agent_id)
    .single();

  if (!agent) {
    console.error("[Escalation] Agent not found:", convo.agent_id);
    return;
  }

  const data = convo.extracted_data as ExtractedData;
  const leadName = data.name || convo.contact_name || "Unknown Lead";

  // Try to send SMS notification to agent
  if (agent.phone_e164) {
    const ghl = await getGHLClientForAgent(convo.agent_id);
    if (ghl) {
      // Find or create the agent as a contact to send them an SMS
      // For now, log the alert — agent notification via SMS requires agent to be a GHL contact
      console.log(
        `[Escalation] HOT LEAD ALERT for ${agent.display_name}:`,
        `${leadName} | Score: ${convo.current_heat_score} | ${data.timeline || "Timeline unknown"} | ${data.financing || "Financing unknown"}`
      );
    }
  }

  // Store notification in database for dashboard display
  try {
    await supabaseAdmin.from("inbound_messages").insert({
      contact_id: convo.contact_id,
      contact_name: leadName,
      contact_phone: convo.contact_phone,
      contact_email: convo.contact_email,
      message_type: "ai_escalation",
      message_body: `HOT LEAD ALERT (Score: ${convo.current_heat_score})\n${summaryCard}`,
      conversation_id: convo.conversation_id,
      location_id: null,
      raw_payload: {
        type: "ai_escalation",
        conversation_id: convo.id,
        heat_score: convo.current_heat_score,
        extracted_data: convo.extracted_data,
        summary: summaryCard,
      },
      received_at: new Date().toISOString(),
      read: false,
    });
  } catch (err: any) {
    console.error("[Escalation] Failed to store notification:", err.message);
  }
}
