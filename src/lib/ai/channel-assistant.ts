import { trackedGenerateText } from "@/lib/ai/ai-call-logger";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type MessageChannel =
  | "sms"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "google_business"
  | "whatsapp";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const CHANNEL_DISPLAY_NAMES: Record<MessageChannel, string> = {
  sms: "SMS",
  facebook: "Facebook Messenger",
  instagram: "Instagram DM",
  linkedin: "LinkedIn",
  google_business: "Google Business",
  whatsapp: "WhatsApp",
};

/**
 * Channel-specific prompt adjustments.
 * Social channels can be longer than SMS; LinkedIn should be more professional.
 */
function getChannelGuidance(channel: MessageChannel): string {
  switch (channel) {
    case "sms":
      return `You are communicating via SMS, so keep your responses concise (under 300 characters when possible). 1-3 sentences max.`;
    case "linkedin":
      return `You are communicating via LinkedIn. Use a polished, professional tone. You may write 2-4 sentences since this is a professional platform.`;
    case "facebook":
    case "instagram":
      return `You are communicating via ${CHANNEL_DISPLAY_NAMES[channel]}. Be friendly and conversational. You may write 2-4 sentences.`;
    case "google_business":
      return `You are communicating via Google Business Messages. Be professional and helpful. Respond promptly with 2-4 sentences. Include a clear call to action.`;
    case "whatsapp":
      return `You are communicating via WhatsApp. Be friendly and conversational. You may write 2-4 sentences. WhatsApp supports rich formatting.`;
  }
}

function getMaxTokens(channel: MessageChannel): number {
  return channel === "sms" ? 200 : 400;
}

/**
 * System prompt for the AI Channel Assistant.
 */
function getSystemPrompt(
  agentName: string,
  channel: MessageChannel,
  propertyAddress?: string,
  leadSource?: string
): string {
  const channelGuidance = getChannelGuidance(channel);
  const sourceContext = leadSource
    ? `\n- The lead came from: ${leadSource} (e.g. an ad, a post, or a listing).`
    : "";

  return `You are a friendly and professional real estate assistant messaging on behalf of ${agentName}. ${channelGuidance}

CONTEXT:
- The lead reached out${propertyAddress ? ` about a property at ${propertyAddress}` : ""} via ${CHANNEL_DISPLAY_NAMES[channel]}.${sourceContext}
- You are continuing (or starting) the conversation.

GUIDELINES:
1. Be warm, helpful, and professional.
2. Answer questions about properties or the buying/selling process in general terms.
3. If asked about specific pricing, financing details, or legal matters, offer to connect them with ${agentName} directly.
4. Try to qualify the lead naturally: understand their timeline, budget range, and what they're looking for.
5. If the lead expresses strong interest, suggest scheduling a showing or a call with ${agentName}.
6. NEVER make up property details you don't know. Say "Let me check with ${agentName} and get back to you" instead.
7. NEVER discuss Fair Housing protected classes or make discriminatory statements.
8. Do NOT use emojis excessively. One per message at most, if appropriate.
9. Always be honest that you are an AI assistant working with ${agentName} if directly asked.`;
}

/**
 * Generate an AI response for an inbound message on any channel.
 */
export async function generateChannelResponse(params: {
  externalContactId: string;
  agentId: string;
  agentName: string;
  inboundMessage: string;
  channel: MessageChannel;
  propertyAddress?: string;
  leadSource?: string;
}): Promise<{ reply: string; conversationId: string }> {
  const {
    externalContactId,
    agentId,
    agentName,
    inboundMessage,
    channel,
    propertyAddress,
    leadSource,
  } = params;

  // Load or create conversation thread
  const { data: existingConvo } = await admin
    .from("ai_channel_conversations")
    .select("id, messages")
    .eq("external_contact_id", externalContactId)
    .eq("agent_id", agentId)
    .eq("channel", channel)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  let conversationId: string;
  let history: ConversationMessage[] = [];

  if (existingConvo) {
    conversationId = existingConvo.id;
    history = (existingConvo.messages as ConversationMessage[]) || [];
  } else {
    const { data: newConvo, error } = await admin
      .from("ai_channel_conversations")
      .insert({
        external_contact_id: externalContactId,
        agent_id: agentId,
        channel,
        property_address: propertyAddress,
        lead_source: leadSource,
        status: "active",
        messages: [],
      })
      .select("id")
      .single();

    if (error || !newConvo) {
      throw new Error(`Failed to create conversation: ${error?.message}`);
    }
    conversationId = newConvo.id;
  }

  // Append the inbound message
  history.push({
    role: "user",
    content: inboundMessage,
    timestamp: new Date().toISOString(),
  });

  // Keep only the last 20 messages for context window efficiency
  const recentHistory = history.slice(-20);

  const aiMessages = recentHistory.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Generate response via tracked AI call
  const { text } = await trackedGenerateText({
    model: "openai/gpt-4o-mini",
    source: "channel-assistant",
    agentId,
    system: getSystemPrompt(agentName, channel, propertyAddress, leadSource),
    messages: aiMessages,
    temperature: 0.7,
    maxOutputTokens: getMaxTokens(channel),
  });

  const reply =
    text?.trim() ||
    "Thanks for your message! Let me get back to you shortly.";

  // Append assistant reply to history
  history.push({
    role: "assistant",
    content: reply,
    timestamp: new Date().toISOString(),
  });

  // Persist updated conversation
  await admin
    .from("ai_channel_conversations")
    .update({
      messages: history,
      message_count: history.length,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  return { reply, conversationId };
}

/**
 * Mark a conversation as handed off to the human agent.
 */
export async function handoffChannelConversation(
  conversationId: string,
  reason: string
): Promise<void> {
  await admin
    .from("ai_channel_conversations")
    .update({
      status: "handed_off",
      handoff_reason: reason,
      handed_off_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
}
