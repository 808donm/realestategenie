/**
 * AI Responder
 * Generates contextual, phase-appropriate responses for lead conversations
 */

import { generateText, streamText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import type { ConversationPhase, ConversationMessage, ExtractedData } from "./conversation-state";

function getModel() {
  return gateway(process.env.LEAD_RESPONSE_AI_MODEL || "openai/gpt-4o-mini");
}

type ResponderContext = {
  agentName: string;
  brokerageName?: string;
  currentPhase: ConversationPhase;
  messages: ConversationMessage[];
  extractedData: ExtractedData;
  heatScore: number;
  greetingTemplate?: string;
  isEscalating?: boolean;
};

/**
 * Build the system prompt based on conversation phase and context
 */
function buildSystemPrompt(ctx: ResponderContext): string {
  const agentRef = ctx.brokerageName
    ? `${ctx.agentName} at ${ctx.brokerageName}`
    : ctx.agentName;

  const basePrompt = `You are a friendly, professional AI assistant for ${agentRef}, a real estate agent.
You are responding to a potential real estate lead via text message.

RULES:
- Keep responses concise — 2-4 sentences max. This is SMS/chat, not email.
- Be warm, professional, and knowledgeable about real estate.
- NEVER claim to be a real estate agent or licensed professional.
- NEVER provide specific legal, financial, or tax advice.
- NEVER make up property details or pricing you don't know.
- NEVER be pushy or salesy. Be helpful and consultative.
- Use the lead's name if you know it.
- Do NOT use emojis excessively — one per message at most, and only if appropriate.`;

  const phaseInstructions: Record<ConversationPhase, string> = {
    greeting: `CURRENT PHASE: GREETING
Your goal is to welcome the lead, acknowledge what brought them here, and ask ONE qualifying question.
Good first questions: "Are you looking to buy or sell?" or "What brings you to the [area] market?"
${ctx.greetingTemplate ? `Use this greeting style as a guide: "${ctx.greetingTemplate}"` : ""}`,

    qualifying: `CURRENT PHASE: QUALIFYING
Your goal is to learn about the lead's timeline, financing, and property preferences.
Ask ONE question at a time from what you still don't know:
${!ctx.extractedData.timeline ? "- What is their timeline? (When are they looking to buy/sell?)" : ""}
${!ctx.extractedData.financing ? "- What is their financing situation? (Pre-approved? Cash? Need a lender?)" : ""}
${!ctx.extractedData.neighborhoods ? "- What areas/neighborhoods are they interested in?" : ""}
${!ctx.extractedData.must_haves ? "- What are their must-haves? (Bedrooms, features, etc.)" : ""}
Keep it conversational — don't interrogate.`,

    scheduling: `CURRENT PHASE: SCHEDULING
The lead is qualified. Your goal is to suggest connecting them with ${ctx.agentName} for a consultation or showing.
Suggest a meeting or call. Example: "Would you be open to a quick call or meeting with ${ctx.agentName} to discuss your options?"`,

    escalated: `CURRENT PHASE: ESCALATING
This lead is HOT. Write a warm handoff message letting them know ${ctx.agentName} will be reaching out personally very soon.
Be confident and reassuring. Example: "You're in a great position! Let me connect you directly with ${ctx.agentName}, who'll be reaching out shortly."`,

    handed_off: `CURRENT PHASE: HANDED OFF — DO NOT RESPOND. The agent has taken over.`,
  };

  const knownDataStr = Object.entries(ctx.extractedData)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  return `${basePrompt}

${phaseInstructions[ctx.currentPhase]}

WHAT YOU KNOW ABOUT THIS LEAD:
${knownDataStr || "Nothing yet — this may be the first message."}

Heat Score: ${ctx.heatScore}/100`;
}

/**
 * Build the conversation messages for the AI
 */
function buildMessageHistory(messages: ConversationMessage[]): { role: "user" | "assistant"; content: string }[] {
  return messages.map((m) => ({
    role: m.role === "lead" ? "user" as const : "assistant" as const,
    content: m.content,
  }));
}

/**
 * Generate a response (non-streaming, for SMS/webhook channel)
 */
export async function generateResponse(ctx: ResponderContext): Promise<string> {
  if (ctx.currentPhase === "handed_off") {
    throw new Error("Cannot generate response: conversation has been handed off");
  }

  const { text } = await generateText({
    model: getModel(),
    system: buildSystemPrompt(ctx),
    messages: buildMessageHistory(ctx.messages),
    temperature: 0.7,
    // maxTokens handled by model defaults
  });

  return text.trim();
}

/**
 * Generate a streaming response (for widget chat channel)
 * Returns a ReadableStream for SSE delivery
 */
export function generateStreamingResponse(ctx: ResponderContext) {
  if (ctx.currentPhase === "handed_off") {
    throw new Error("Cannot generate response: conversation has been handed off");
  }

  return streamText({
    model: getModel(),
    system: buildSystemPrompt(ctx),
    messages: buildMessageHistory(ctx.messages),
    temperature: 0.7,
    // maxTokens handled by model defaults
  });
}
