import { trackedGenerateText } from "@/lib/ai/ai-call-logger";

/**
 * Qualification data extracted from the AI conversation.
 * Maps to the LeadPayload fields used by the heat score calculator.
 */
export interface QualificationData {
  name?: string;
  email?: string;
  phone?: string;
  timeline?: "0-3 months" | "3-6 months" | "6+ months" | "just browsing";
  financing?: "pre-approved" | "cash" | "need lender" | "not sure";
  representation?: "yes" | "no" | "unsure";
  neighborhoods?: string;
  must_haves?: string;
  buying_or_selling?: "buying" | "selling" | "both" | "unknown";
  ready_to_connect?: boolean;
  consent_sms?: boolean;
  consent_email?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function getSystemPrompt(agentName: string, agentContext?: string): string {
  return `You are a friendly real estate assistant on ${agentName}'s website. Your job is to have a natural, helpful conversation with visitors and prequalify them as potential leads.

CONVERSATION GOALS (in order of priority):
1. Greet warmly and ask how you can help
2. Understand if they're buying, selling, or both
3. Collect their name naturally during conversation
4. Learn their timeline (when they want to buy/sell)
5. Understand their financing situation (pre-approved, cash, need a lender, not sure)
6. Ask if they're currently working with an agent
7. Learn what areas/neighborhoods they're interested in
8. Learn their must-haves (bedrooms, budget range, features)
9. Get their contact info (email and/or phone) to connect them with ${agentName}
10. Ask if they'd like ${agentName} to reach out via text or email

RULES:
- Be conversational and warm, NOT robotic. This is a chat, not a form.
- Ask ONE question at a time. Never bombard with multiple questions.
- Keep responses under 150 words. Website chat should be snappy.
- Adapt to what the visitor says — if they volunteer info, don't re-ask.
- If they seem like they're just browsing, be helpful but still try to learn their interests.
- NEVER pressure for contact info. Offer it naturally: "Would you like me to have ${agentName} reach out with some options?"
- If they share their situation, be empathetic and helpful.
- NEVER make up property listings, prices, or market data.
- NEVER discuss Fair Housing protected classes.
- If they ask about a specific property, suggest connecting with ${agentName} for details.
${agentContext ? `\nAGENT CONTEXT:\n${agentContext}` : ""}

IMPORTANT — STRUCTURED DATA EXTRACTION:
After EVERY response, you MUST include a JSON block with any qualification data you've learned so far. Format it as:
<qualification>{"field": "value"}</qualification>

Valid fields: name, email, phone, timeline, financing, representation, neighborhoods, must_haves, buying_or_selling, ready_to_connect, consent_sms, consent_email

Only include fields where the visitor has clearly stated or implied a value. Use exact enum values where applicable:
- timeline: "0-3 months", "3-6 months", "6+ months", "just browsing"
- financing: "pre-approved", "cash", "need lender", "not sure"
- representation: "yes", "no", "unsure"
- buying_or_selling: "buying", "selling", "both", "unknown"
- ready_to_connect, consent_sms, consent_email: true or false

Example response:
"That's exciting that you're looking to buy in the next couple months! Are you already pre-approved for a mortgage, or is that something you'd like help with?
<qualification>{"name": "Sarah", "buying_or_selling": "buying", "timeline": "0-3 months"}</qualification>"`;
}

/**
 * Generate a chat response and extract qualification data.
 */
export async function generateChatResponse(params: {
  agentName: string;
  agentContext?: string;
  messages: ChatMessage[];
}): Promise<{ reply: string; qualification: QualificationData }> {
  const { agentName, agentContext, messages } = params;

  const aiMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const { text } = await trackedGenerateText({
    model: "openai/gpt-4o-mini",
    system: getSystemPrompt(agentName, agentContext),
    messages: aiMessages,
    temperature: 0.7,
    maxOutputTokens: 300,
    source: "chat-prequalifier",
  });

  const raw = text?.trim() || "Thanks for visiting! How can I help you today?";

  // Extract qualification data from the response
  let qualification: QualificationData = {};
  const qualMatch = raw.match(/<qualification>([\s\S]*?)<\/qualification>/);
  if (qualMatch) {
    try {
      qualification = JSON.parse(qualMatch[1]);
    } catch {
      // Ignore parse errors
    }
  }

  // Strip the qualification tag from the visible reply
  const reply = raw.replace(/<qualification>[\s\S]*?<\/qualification>/, "").trim();

  return { reply, qualification };
}
