/**
 * Conversation State Machine
 * Manages multi-turn AI conversation phases with leads
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

export type ConversationPhase =
  | "greeting"
  | "qualifying"
  | "scheduling"
  | "escalated"
  | "handed_off";

export type ConversationMessage = {
  role: "lead" | "ai";
  content: string;
  timestamp: string;
};

export type ExtractedData = {
  timeline?: string;
  financing?: string;
  neighborhoods?: string;
  must_haves?: string;
  budget?: number;
  property_type?: string;
  representation?: string;
  name?: string;
  email?: string;
  phone?: string;
  motivation?: string;
  preapproval_amount?: number;
};

export type ConversationSource = "ghl" | "widget" | "web_form";

export type LeadConversation = {
  id: string;
  agent_id: string;
  contact_id: string | null;
  conversation_id: string | null;
  lead_submission_id: string | null;
  source: ConversationSource;
  widget_session_id: string | null;
  current_phase: ConversationPhase;
  messages: ConversationMessage[];
  extracted_data: ExtractedData;
  contact_phone: string | null;
  contact_name: string | null;
  contact_email: string | null;
  heat_score_at_start: number;
  current_heat_score: number;
  escalated_at: string | null;
  handed_off_at: string | null;
  last_ai_response_at: string | null;
  last_lead_message_at: string | null;
  ai_message_count: number;
  escalation_threshold: number;
  created_at: string;
  updated_at: string;
};

/**
 * Valid phase transitions
 */
const PHASE_TRANSITIONS: Record<ConversationPhase, ConversationPhase[]> = {
  greeting: ["qualifying", "escalated"],
  qualifying: ["scheduling", "escalated"],
  scheduling: ["escalated", "handed_off"],
  escalated: ["handed_off"],
  handed_off: [],
};

/**
 * Load or create a conversation for a contact/session
 */
export async function getOrCreateConversation(params: {
  agentId: string;
  contactId?: string;
  contactPhone?: string;
  contactName?: string;
  contactEmail?: string;
  conversationId?: string;
  source: ConversationSource;
  widgetSessionId?: string;
  escalationThreshold?: number;
}): Promise<LeadConversation> {
  // Try to find existing active conversation
  let query = supabaseAdmin
    .from("lead_conversations")
    .select("*")
    .eq("agent_id", params.agentId)
    .not("current_phase", "in", '("handed_off")');

  if (params.contactId) {
    query = query.eq("contact_id", params.contactId);
  } else if (params.widgetSessionId) {
    query = query.eq("widget_session_id", params.widgetSessionId);
  } else if (params.contactPhone) {
    query = query.eq("contact_phone", params.contactPhone);
  }

  const { data: existing } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return existing as LeadConversation;
  }

  // Create new conversation
  const { data: newConvo, error } = await supabaseAdmin
    .from("lead_conversations")
    .insert({
      agent_id: params.agentId,
      contact_id: params.contactId || null,
      conversation_id: params.conversationId || null,
      source: params.source,
      widget_session_id: params.widgetSessionId || null,
      contact_phone: params.contactPhone || null,
      contact_name: params.contactName || null,
      contact_email: params.contactEmail || null,
      current_phase: "greeting",
      messages: [],
      extracted_data: {},
      escalation_threshold: params.escalationThreshold || 80,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return newConvo as LeadConversation;
}

/**
 * Add a message to the conversation and update timestamps
 */
export async function addMessage(
  conversationId: string,
  role: "lead" | "ai",
  content: string
): Promise<LeadConversation> {
  const { data: convo, error: fetchError } = await supabaseAdmin
    .from("lead_conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (fetchError || !convo) throw new Error("Conversation not found");

  const messages = [...(convo.messages as ConversationMessage[]), {
    role,
    content,
    timestamp: new Date().toISOString(),
  }];

  const updates: Record<string, any> = {
    messages,
    updated_at: new Date().toISOString(),
  };

  if (role === "lead") {
    updates.last_lead_message_at = new Date().toISOString();
  } else {
    updates.last_ai_response_at = new Date().toISOString();
    updates.ai_message_count = (convo.ai_message_count || 0) + 1;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("lead_conversations")
    .update(updates)
    .eq("id", conversationId)
    .select()
    .single();

  if (error) throw new Error(`Failed to add message: ${error.message}`);
  return updated as LeadConversation;
}

/**
 * Transition to a new phase (validates allowed transitions)
 */
export async function transitionPhase(
  conversationId: string,
  newPhase: ConversationPhase
): Promise<LeadConversation> {
  const { data: convo, error: fetchError } = await supabaseAdmin
    .from("lead_conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (fetchError || !convo) throw new Error("Conversation not found");

  const currentPhase = convo.current_phase as ConversationPhase;
  const allowed = PHASE_TRANSITIONS[currentPhase];

  if (!allowed.includes(newPhase)) {
    throw new Error(`Cannot transition from ${currentPhase} to ${newPhase}`);
  }

  const updates: Record<string, any> = {
    current_phase: newPhase,
    updated_at: new Date().toISOString(),
  };

  if (newPhase === "escalated") {
    updates.escalated_at = new Date().toISOString();
  } else if (newPhase === "handed_off") {
    updates.handed_off_at = new Date().toISOString();
  }

  const { data: updated, error } = await supabaseAdmin
    .from("lead_conversations")
    .update(updates)
    .eq("id", conversationId)
    .select()
    .single();

  if (error) throw new Error(`Failed to transition phase: ${error.message}`);
  return updated as LeadConversation;
}

/**
 * Update extracted qualification data and heat score
 */
export async function updateQualificationData(
  conversationId: string,
  newData: Partial<ExtractedData>,
  newHeatScore: number
): Promise<LeadConversation> {
  const { data: convo, error: fetchError } = await supabaseAdmin
    .from("lead_conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (fetchError || !convo) throw new Error("Conversation not found");

  const mergedData = { ...(convo.extracted_data as ExtractedData), ...newData };

  const { data: updated, error } = await supabaseAdmin
    .from("lead_conversations")
    .update({
      extracted_data: mergedData,
      current_heat_score: newHeatScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update qualification: ${error.message}`);
  return updated as LeadConversation;
}

/**
 * Update the GHL contact ID on a conversation (e.g. after contact creation)
 */
export async function setContactId(
  conversationId: string,
  contactId: string
): Promise<void> {
  await supabaseAdmin
    .from("lead_conversations")
    .update({ contact_id: contactId, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

/**
 * Check if a conversation should stop auto-responding
 */
export function shouldStopResponding(convo: LeadConversation): boolean {
  if (convo.current_phase === "escalated") return true;
  if (convo.current_phase === "handed_off") return true;
  return false;
}

/**
 * Determine if the AI message count has exceeded the safety cap
 */
export function hasExceededMessageCap(convo: LeadConversation, maxMessages: number): boolean {
  return convo.ai_message_count >= maxMessages;
}

/**
 * Determine the appropriate next phase based on conversation state
 */
export function determineNextPhase(
  currentPhase: ConversationPhase,
  heatScore: number,
  escalationThreshold: number,
  extractedData: ExtractedData
): ConversationPhase {
  // Hot lead — escalate regardless of phase
  if (heatScore >= escalationThreshold) {
    return "escalated";
  }

  // Progress through phases based on data completeness
  if (currentPhase === "greeting") {
    // Move to qualifying once we have any data point
    if (extractedData.timeline || extractedData.financing || extractedData.neighborhoods) {
      return "qualifying";
    }
  }

  if (currentPhase === "qualifying") {
    // Move to scheduling once we have enough qualification data
    const qualifiedFields = [
      extractedData.timeline,
      extractedData.financing,
      extractedData.neighborhoods || extractedData.must_haves,
    ].filter(Boolean).length;

    if (qualifiedFields >= 2) {
      return "scheduling";
    }
  }

  return currentPhase;
}
