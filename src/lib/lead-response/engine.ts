/**
 * Lead Auto-Response Engine
 * Main orchestrator — channel-agnostic processing of inbound lead messages
 *
 * Flow:
 * 1. Load/create conversation state
 * 2. Check if we should respond (not handed off, not over message cap)
 * 3. Extract qualification data from the lead's message
 * 4. Update heat score
 * 5. Generate AI response
 * 6. Send response via appropriate channel (GHL SMS or return for widget)
 * 7. Log exchange to GHL as a note
 * 8. Check escalation threshold
 * 9. Save state
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getOrCreateConversation,
  addMessage,
  updateQualificationData,
  setContactId,
  shouldStopResponding,
  hasExceededMessageCap,
  determineNextPhase,
  transitionPhase,
  type ConversationSource,
  type LeadConversation,
} from "./conversation-state";
import { extractQualificationData } from "./qualification-extractor";
import { generateResponse, generateStreamingResponse } from "./ai-responder";
import { calculateDynamicHeatScore } from "./dynamic-scoring";
import {
  createGHLContactFromConversation,
  logExchangeAsNote,
  sendSMSReply,
} from "./ghl-sync";
import { checkAndEscalate } from "./escalation";

export type EngineResult = {
  responded: boolean;
  response?: string;
  conversationId: string;
  phase: string;
  heatScore: number;
  escalated: boolean;
  reason?: string;
};

export type InboundMessageParams = {
  agentId: string;
  message: string;
  source: ConversationSource;
  // GHL channel fields
  contactId?: string;
  contactPhone?: string;
  contactName?: string;
  contactEmail?: string;
  ghlConversationId?: string;
  // Widget channel fields
  widgetSessionId?: string;
};

/**
 * Handle an inbound lead message (main entry point)
 * Works for both GHL SMS and widget chat channels
 */
export async function handleInboundLeadMessage(
  params: InboundMessageParams
): Promise<EngineResult> {
  const { agentId, message, source } = params;

  // 1. Check if auto-response is enabled for this agent
  const settings = await getAgentSettings(agentId);
  if (!settings.auto_response_enabled || settings.response_mode === "disabled") {
    return {
      responded: false,
      conversationId: "",
      phase: "greeting",
      heatScore: 0,
      escalated: false,
      reason: "Auto-response disabled for this agent",
    };
  }

  // 2. Load or create conversation
  const convo = await getOrCreateConversation({
    agentId,
    contactId: params.contactId,
    contactPhone: params.contactPhone,
    contactName: params.contactName,
    contactEmail: params.contactEmail,
    conversationId: params.ghlConversationId,
    source,
    widgetSessionId: params.widgetSessionId,
    escalationThreshold: settings.escalation_threshold,
  });

  // 3. Check if we should respond
  if (shouldStopResponding(convo)) {
    return {
      responded: false,
      conversationId: convo.id,
      phase: convo.current_phase,
      heatScore: convo.current_heat_score,
      escalated: convo.current_phase === "escalated",
      reason: `Conversation is ${convo.current_phase}`,
    };
  }

  if (hasExceededMessageCap(convo, settings.max_ai_messages)) {
    // Auto-escalate if we've hit the cap
    await transitionPhase(convo.id, "escalated");
    return {
      responded: false,
      conversationId: convo.id,
      phase: "escalated",
      heatScore: convo.current_heat_score,
      escalated: true,
      reason: "Message cap exceeded — auto-escalated",
    };
  }

  // 4. Add lead's message to conversation
  const convoWithMessage = await addMessage(convo.id, "lead", message);

  // 5. Extract qualification data
  const newData = await extractQualificationData(message, convo.extracted_data);

  // 6. Update heat score
  const previousScore = convo.current_heat_score;
  const newHeatScore = calculateDynamicHeatScore(
    { ...convo.extracted_data, ...newData },
    0 // recalculate from scratch with all data
  );

  const updatedConvo = await updateQualificationData(convo.id, newData, newHeatScore);

  // 7. Determine phase transition
  const nextPhase = determineNextPhase(
    updatedConvo.current_phase,
    newHeatScore,
    settings.escalation_threshold,
    { ...convo.extracted_data, ...newData }
  );

  if (nextPhase !== updatedConvo.current_phase) {
    await transitionPhase(updatedConvo.id, nextPhase);
  }

  // 8. Check escalation before generating response
  const escalated = await checkAndEscalate({
    ...updatedConvo,
    current_heat_score: newHeatScore,
    current_phase: nextPhase,
    extracted_data: { ...convo.extracted_data, ...newData },
  });

  // 9. Fetch agent info for AI context
  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("display_name, agency_name")
    .eq("id", agentId)
    .single();

  // 10. Generate AI response
  const aiResponse = await generateResponse({
    agentName: agent?.display_name || "Your Agent",
    brokerageName: agent?.agency_name || undefined,
    currentPhase: escalated ? "escalated" : nextPhase,
    messages: convoWithMessage.messages,
    extractedData: { ...convo.extracted_data, ...newData },
    heatScore: newHeatScore,
    greetingTemplate: settings.greeting_template || undefined,
    isEscalating: escalated,
  });

  // 11. Add AI response to conversation
  await addMessage(updatedConvo.id, "ai", aiResponse);

  // 12. Ensure GHL contact exists and send via appropriate channel
  if (source === "ghl" && params.contactId) {
    // Send SMS reply through GHL
    const messageId = await sendSMSReply(agentId, params.contactId, aiResponse);

    // Log exchange as note
    await logExchangeAsNote(
      agentId,
      params.contactId,
      message,
      aiResponse,
      nextPhase
    );
  } else if (source === "widget" || !params.contactId) {
    // For widget: create GHL contact if we have enough info
    if (!updatedConvo.contact_id && (newData.email || newData.phone || params.contactPhone)) {
      const newContactId = await createGHLContactFromConversation(agentId, {
        ...updatedConvo,
        contact_phone: newData.phone || params.contactPhone || updatedConvo.contact_phone,
        contact_name: newData.name || params.contactName || updatedConvo.contact_name,
        contact_email: newData.email || params.contactEmail || updatedConvo.contact_email,
      });

      if (newContactId) {
        await setContactId(updatedConvo.id, newContactId);

        // Log the exchange to the new contact
        await logExchangeAsNote(agentId, newContactId, message, aiResponse, nextPhase);
      }
    } else if (updatedConvo.contact_id) {
      await logExchangeAsNote(agentId, updatedConvo.contact_id, message, aiResponse, nextPhase);
    }
  }

  // 13. Log to audit trail
  await logToAuditTrail(updatedConvo.id, message, aiResponse, {
    heatScoreBefore: previousScore,
    heatScoreAfter: newHeatScore,
    qualificationExtracted: newData,
    sentVia: source,
  });

  return {
    responded: true,
    response: aiResponse,
    conversationId: updatedConvo.id,
    phase: escalated ? "escalated" : nextPhase,
    heatScore: newHeatScore,
    escalated,
  };
}

/**
 * Handle widget message with streaming response
 * Returns the stream result for SSE delivery
 */
export async function handleWidgetMessageStreaming(
  params: InboundMessageParams
) {
  const { agentId, message, source } = params;

  const settings = await getAgentSettings(agentId);
  if (!settings.auto_response_enabled || settings.response_mode === "disabled") {
    return null;
  }

  const convo = await getOrCreateConversation({
    agentId,
    source,
    widgetSessionId: params.widgetSessionId,
    contactPhone: params.contactPhone,
    contactName: params.contactName,
    contactEmail: params.contactEmail,
    escalationThreshold: settings.escalation_threshold,
  });

  if (shouldStopResponding(convo) || hasExceededMessageCap(convo, settings.max_ai_messages)) {
    return null;
  }

  const convoWithMessage = await addMessage(convo.id, "lead", message);
  const newData = await extractQualificationData(message, convo.extracted_data);
  const newHeatScore = calculateDynamicHeatScore({ ...convo.extracted_data, ...newData }, 0);
  await updateQualificationData(convo.id, newData, newHeatScore);

  const nextPhase = determineNextPhase(
    convo.current_phase,
    newHeatScore,
    settings.escalation_threshold,
    { ...convo.extracted_data, ...newData }
  );

  if (nextPhase !== convo.current_phase) {
    await transitionPhase(convo.id, nextPhase);
  }

  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("display_name, agency_name")
    .eq("id", agentId)
    .single();

  const streamResult = generateStreamingResponse({
    agentName: agent?.display_name || "Your Agent",
    brokerageName: agent?.agency_name || undefined,
    currentPhase: nextPhase,
    messages: convoWithMessage.messages,
    extractedData: { ...convo.extracted_data, ...newData },
    heatScore: newHeatScore,
    greetingTemplate: settings.greeting_template || undefined,
  });

  // Post-stream: save message, check escalation (done after stream completes)
  streamResult.text.then(async (fullText) => {
    await addMessage(convo.id, "ai", fullText);

    const escalated = await checkAndEscalate({
      ...convo,
      current_heat_score: newHeatScore,
      current_phase: nextPhase,
      extracted_data: { ...convo.extracted_data, ...newData },
    });

    // Create GHL contact if we have enough data
    if (!convo.contact_id && (newData.email || newData.phone || params.contactPhone)) {
      const newContactId = await createGHLContactFromConversation(agentId, {
        ...convo,
        contact_phone: newData.phone || params.contactPhone || convo.contact_phone,
        contact_name: newData.name || params.contactName || convo.contact_name,
        contact_email: newData.email || params.contactEmail || convo.contact_email,
      });

      if (newContactId) {
        await setContactId(convo.id, newContactId);
        await logExchangeAsNote(agentId, newContactId, message, fullText, nextPhase);
      }
    } else if (convo.contact_id) {
      await logExchangeAsNote(agentId, convo.contact_id, message, fullText, nextPhase);
    }

    await logToAuditTrail(convo.id, message, fullText, {
      heatScoreBefore: convo.current_heat_score,
      heatScoreAfter: newHeatScore,
      qualificationExtracted: newData,
      sentVia: "widget",
    });
  });

  return { streamResult, conversationId: convo.id };
}

/**
 * Get agent settings (with defaults)
 */
async function getAgentSettings(agentId: string) {
  const { data } = await supabaseAdmin
    .from("lead_response_settings")
    .select("*")
    .eq("agent_id", agentId)
    .single();

  return {
    auto_response_enabled: data?.auto_response_enabled ?? true,
    response_mode: data?.response_mode ?? "autonomous",
    escalation_threshold: data?.escalation_threshold ?? 80,
    greeting_template: data?.greeting_template ?? null,
    business_hours_only: data?.business_hours_only ?? false,
    max_ai_messages: data?.max_ai_messages ?? 10,
  };
}

/**
 * Log message exchange to ai_message_log table
 */
async function logToAuditTrail(
  conversationId: string,
  inboundMessage: string,
  outboundMessage: string,
  metadata: {
    heatScoreBefore: number;
    heatScoreAfter: number;
    qualificationExtracted: any;
    sentVia: string;
  }
): Promise<void> {
  try {
    await supabaseAdmin.from("ai_message_log").insert([
      {
        conversation_id: conversationId,
        direction: "inbound",
        message_body: inboundMessage,
        heat_score_before: metadata.heatScoreBefore,
        heat_score_after: metadata.heatScoreAfter,
        qualification_extracted: metadata.qualificationExtracted,
        sent_via: metadata.sentVia,
      },
      {
        conversation_id: conversationId,
        direction: "outbound",
        message_body: outboundMessage,
        ai_model: process.env.LEAD_RESPONSE_AI_MODEL || "openai/gpt-4o-mini",
        heat_score_before: metadata.heatScoreBefore,
        heat_score_after: metadata.heatScoreAfter,
        sent_via: metadata.sentVia,
      },
    ]);
  } catch (err: any) {
    console.error("[Engine] Failed to log to audit trail:", err.message);
  }
}
