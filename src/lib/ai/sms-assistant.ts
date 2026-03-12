import { gateway } from "@ai-sdk/gateway";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/**
 * System prompt for the SMS AI Assistant.
 * The assistant helps real estate agents by conversing with leads
 * who replied to open house follow-up SMS messages.
 */
function getSystemPrompt(agentName: string, propertyAddress?: string): string {
  return `You are a friendly and professional real estate assistant texting on behalf of ${agentName}. You are communicating via SMS, so keep your responses concise (under 300 characters when possible).

CONTEXT:
- The lead attended an open house${propertyAddress ? ` at ${propertyAddress}` : ""} and received a follow-up text message.
- They have replied and you are continuing the conversation.

GUIDELINES:
1. Be warm, helpful, and professional. Use a conversational SMS tone.
2. Keep responses SHORT — this is texting, not email. 1-3 sentences max.
3. Answer questions about the property or the buying/selling process in general terms.
4. If asked about specific pricing, financing details, or legal matters, offer to connect them with ${agentName} directly.
5. Try to qualify the lead naturally: understand their timeline, budget range, and what they're looking for.
6. If the lead expresses strong interest, suggest scheduling a showing or a call with ${agentName}.
7. NEVER make up property details you don't know. Say "Let me check with ${agentName} and get back to you" instead.
8. NEVER discuss Fair Housing protected classes or make discriminatory statements.
9. Do NOT use emojis excessively. One per message at most, if appropriate.
10. Always be honest that you are an AI assistant working with ${agentName} if directly asked.`;
}

/**
 * Generate an AI response for an inbound SMS conversation.
 *
 * Loads recent conversation history from the database, appends the new
 * inbound message, generates a reply via GPT-4o-mini through Vercel AI
 * Gateway, stores both messages, and returns the response text.
 */
export async function generateSmsResponse(params: {
  ghlContactId: string;
  agentId: string;
  agentName: string;
  inboundMessage: string;
  propertyAddress?: string;
}): Promise<{ reply: string; conversationId: string }> {
  const { ghlContactId, agentId, agentName, inboundMessage, propertyAddress } =
    params;

  // Load or create conversation thread
  const { data: existingConvo } = await admin
    .from("ai_sms_conversations")
    .select("id, messages")
    .eq("ghl_contact_id", ghlContactId)
    .eq("agent_id", agentId)
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
    // Create new conversation
    const { data: newConvo, error } = await admin
      .from("ai_sms_conversations")
      .insert({
        ghl_contact_id: ghlContactId,
        agent_id: agentId,
        property_address: propertyAddress,
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

  // Build messages array for the AI
  const aiMessages = recentHistory.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Generate response via Vercel AI Gateway
  const { text } = await generateText({
    model: gateway("openai/gpt-4o-mini"),
    system: getSystemPrompt(agentName, propertyAddress),
    messages: aiMessages,
    temperature: 0.7,
    maxTokens: 200, // SMS should be short
  });

  const reply = text?.trim() || "Thanks for your message! Let me get back to you shortly.";

  // Append assistant reply to history
  history.push({
    role: "assistant",
    content: reply,
    timestamp: new Date().toISOString(),
  });

  // Persist updated conversation
  await admin
    .from("ai_sms_conversations")
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
 * Called when the AI determines the lead needs direct human attention.
 */
export async function handoffConversation(
  conversationId: string,
  reason: string
): Promise<void> {
  await admin
    .from("ai_sms_conversations")
    .update({
      status: "handed_off",
      handoff_reason: reason,
      handed_off_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
}
