/**
 * Hoku Web Assistant -- Conversation Engine
 *
 * Manages the pre-qualification flow for website visitors:
 * 1. Greet the visitor
 * 2. Ask if they're working with an agent
 *    - Yes → end politely
 *    - No → continue qualification
 * 3. Would you like the agent to reach out?
 *    - No → offer to help with property search only
 *    - Yes → capture contact info
 * 4. Capture: name, email, phone
 * 5. Ask: timeline, pre-approval, neighborhoods, must-haves
 * 6. Offer to search properties
 * 7. Perform MLS search via IDX Broker, email results
 * 8. Create contact in CRM with all conversation data
 */

// ── Conversation State ──

export type ConversationStep =
  | "greeting"
  | "has_agent"
  | "has_agent_yes" // end state
  | "want_reach_out"
  | "get_name"
  | "get_email"
  | "get_phone"
  | "get_timeline"
  | "get_preapproval"
  | "get_neighborhoods"
  | "get_musthaves"
  | "offer_search"
  | "searching"
  | "results_sent"
  | "general_chat"; // free-form after qualification

export interface VisitorProfile {
  hasAgent?: boolean;
  wantReachOut?: boolean;
  name?: string;
  email?: string;
  phone?: string;
  timeline?: string;
  preApproved?: string;
  neighborhoods?: string;
  mustHaves?: string;
  wantsPropertySearch?: boolean;
  searchCriteria?: {
    city?: string;
    postalCode?: string;
    minPrice?: number;
    maxPrice?: number;
    minBeds?: number;
    minBaths?: number;
    propertyType?: string;
  };
}

export interface ConversationMessage {
  role: "assistant" | "visitor";
  content: string;
  timestamp: string;
}

export interface ConversationState {
  step: ConversationStep;
  profile: VisitorProfile;
  messages: ConversationMessage[];
  agentId: string;
  agentName: string;
  sessionId: string;
  createdAt: string;
  leadCreated?: boolean;
  propertiesSent?: boolean;
}

// ── Step Handlers ──

export interface StepResponse {
  reply: string;
  nextStep: ConversationStep;
  actions?: Array<{
    type: "create_lead" | "search_mls" | "send_properties" | "end_conversation";
    data?: any;
  }>;
}

/**
 * Process a visitor's message and return Hoku's response + next step.
 */
export function processMessage(
  state: ConversationState,
  visitorMessage: string,
): StepResponse {
  const msg = visitorMessage.trim().toLowerCase();
  const agentName = state.agentName || "the agent";

  switch (state.step) {
    // ── GREETING ──
    case "greeting":
      return {
        reply: `Hi there! Welcome! I'm Hoku, ${agentName}'s AI assistant. I'd love to help you with your real estate needs.\n\nAre you currently working with a real estate agent?`,
        nextStep: "has_agent",
      };

    // ── HAS AGENT? ──
    case "has_agent":
      if (isYes(msg)) {
        return {
          reply: `That's great! I hope you're having a wonderful experience with your agent. If you ever need anything in the future, don't hesitate to reach out. Have a wonderful day!`,
          nextStep: "has_agent_yes",
        };
      }
      if (isNo(msg) || msg.includes("not sure") || msg.includes("looking")) {
        return {
          reply: `No problem! Would you like ${agentName} to reach out to you? ${agentName} would love to help you with your real estate journey.`,
          nextStep: "want_reach_out",
        };
      }
      return {
        reply: `I just want to make sure I can help you the right way. Are you currently working with a real estate agent? (yes or no)`,
        nextStep: "has_agent",
      };

    // ── WANT REACH OUT? ──
    case "want_reach_out":
      if (isYes(msg)) {
        return {
          reply: `Wonderful! I'd love to connect you with ${agentName}. To get started, may I have your name?`,
          nextStep: "get_name",
        };
      }
      if (isNo(msg)) {
        return {
          reply: `No worries at all! I'm still here to help. Would you like me to search for properties for you? I can find listings that match your criteria.`,
          nextStep: "offer_search",
        };
      }
      return {
        reply: `Would you like ${agentName} to reach out to you? (yes or no)`,
        nextStep: "want_reach_out",
      };

    // ── CAPTURE NAME ──
    case "get_name":
      if (msg.length < 2) {
        return { reply: "Could you please share your name so I can let the agent know who to contact?", nextStep: "get_name" };
      }
      state.profile.name = toTitleCase(visitorMessage.trim());
      return {
        reply: `Nice to meet you, ${state.profile.name}! What's the best email address to reach you at?`,
        nextStep: "get_email",
      };

    // ── CAPTURE EMAIL ──
    case "get_email": {
      const emailMatch = visitorMessage.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      if (!emailMatch) {
        return { reply: "I didn't catch a valid email address. Could you type it again?", nextStep: "get_email" };
      }
      state.profile.email = emailMatch[0].toLowerCase();
      return {
        reply: `Got it! And what's a good phone number to reach you at?`,
        nextStep: "get_phone",
      };
    }

    // ── CAPTURE PHONE ──
    case "get_phone": {
      const digits = visitorMessage.replace(/\D/g, "");
      if (digits.length < 7) {
        return { reply: "Could you share a phone number? It helps the agent connect with you quickly.", nextStep: "get_phone" };
      }
      state.profile.phone = formatPhone(digits);
      return {
        reply: `Thank you, ${state.profile.name}! Just a few quick questions so ${agentName} can be best prepared.\n\nWhat is your timeframe for buying or selling? (e.g., 0-3 months, 3-6 months, 6+ months, just browsing)`,
        nextStep: "get_timeline",
      };
    }

    // ── TIMELINE ──
    case "get_timeline":
      state.profile.timeline = visitorMessage.trim();
      return {
        reply: `Are you pre-approved for a mortgage? (yes, no, paying cash, or not sure)`,
        nextStep: "get_preapproval",
      };

    // ── PRE-APPROVAL ──
    case "get_preapproval":
      state.profile.preApproved = visitorMessage.trim();
      return {
        reply: `Which neighborhoods or areas are you interested in?`,
        nextStep: "get_neighborhoods",
      };

    // ── NEIGHBORHOODS ──
    case "get_neighborhoods":
      state.profile.neighborhoods = visitorMessage.trim();
      return {
        reply: `Do you have any must-have features? (e.g., number of bedrooms, parking, pool, updated kitchen, etc.)`,
        nextStep: "get_musthaves",
      };

    // ── MUST-HAVES ──
    case "get_musthaves":
      state.profile.mustHaves = visitorMessage.trim();
      return {
        reply: `Thank you for all that great information, ${state.profile.name}! I've passed everything along to ${agentName} who will be reaching out to you soon.\n\nWould you like me to find some properties that match your criteria right now?`,
        nextStep: "offer_search",
        actions: [{ type: "create_lead" }],
      };

    // ── OFFER SEARCH ──
    case "offer_search":
      if (isYes(msg)) {
        state.profile.wantsPropertySearch = true;
        return {
          reply: `Great! Let me search for properties for you. This will just take a moment...`,
          nextStep: "searching",
          actions: [{ type: "search_mls" }],
        };
      }
      if (isNo(msg)) {
        return {
          reply: `No problem! ${state.profile.name ? `${agentName} will be in touch soon, ${state.profile.name}` : "Feel free to come back anytime"}. Is there anything else I can help you with?`,
          nextStep: "general_chat",
        };
      }
      return {
        reply: `Would you like me to search for properties? I can find listings that match your preferences. (yes or no)`,
        nextStep: "offer_search",
      };

    // ── SEARCHING ──
    case "searching":
      return {
        reply: `I'm still searching for properties. Give me just a moment...`,
        nextStep: "searching",
      };

    // ── RESULTS SENT ──
    case "results_sent":
      return {
        reply: `Is there anything else I can help you with? I'm happy to search for more properties or answer any questions about the area.`,
        nextStep: "general_chat",
      };

    // ── GENERAL CHAT ──
    case "general_chat":
      // Free-form -- could integrate with AI for general real estate questions
      return {
        reply: `That's a great question! I'd recommend discussing that with ${agentName} who can give you personalized advice. Is there anything else I can help with?`,
        nextStep: "general_chat",
      };

    // ── END STATE ──
    case "has_agent_yes":
      return {
        reply: `If you ever need anything in the future, feel free to come back. Have a great day!`,
        nextStep: "has_agent_yes",
      };

    default:
      return {
        reply: `I'm here to help! Would you like to search for properties or connect with ${agentName}?`,
        nextStep: "general_chat",
      };
  }
}

/**
 * Create the initial conversation state.
 */
export function createConversation(agentId: string, agentName: string): ConversationState {
  const sessionId = generateSessionId();
  return {
    step: "greeting",
    profile: {},
    messages: [],
    agentId,
    agentName,
    sessionId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Format the visitor profile into a CRM note.
 */
export function formatProfileAsNote(state: ConversationState): string {
  const p = state.profile;
  const lines = [
    `--- Website Visitor (Hoku Web Assistant) ---`,
    `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
    `Source: Website Chat`,
    `Session ID: ${state.sessionId}`,
    "",
    "--- Qualification ---",
    `Working with agent: ${p.hasAgent ? "Yes" : "No"}`,
    `Wants agent to reach out: ${p.wantReachOut ? "Yes" : "No"}`,
    p.timeline ? `Timeline: ${p.timeline}` : null,
    p.preApproved ? `Pre-approved: ${p.preApproved}` : null,
    p.neighborhoods ? `Neighborhoods: ${p.neighborhoods}` : null,
    p.mustHaves ? `Must-haves: ${p.mustHaves}` : null,
    p.wantsPropertySearch ? `Requested property search: Yes` : null,
    "",
    "--- Conversation ---",
    ...state.messages.map((m) => `${m.role === "assistant" ? "Hoku" : "Visitor"}: ${m.content}`),
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * Extract search criteria from visitor profile.
 */
export function extractSearchCriteria(profile: VisitorProfile): Record<string, any> {
  const criteria: Record<string, any> = {};

  // Parse neighborhoods for city/zip
  if (profile.neighborhoods) {
    const zipMatch = profile.neighborhoods.match(/\d{5}/);
    if (zipMatch) criteria.postalCode = zipMatch[0];
    else criteria.q = profile.neighborhoods;
  }

  // Parse must-haves for beds/baths
  if (profile.mustHaves) {
    const bedMatch = profile.mustHaves.match(/(\d+)\s*(?:bed|br|bedroom)/i);
    if (bedMatch) criteria.minBeds = parseInt(bedMatch[1]);
    const bathMatch = profile.mustHaves.match(/(\d+)\s*(?:bath|ba|bathroom)/i);
    if (bathMatch) criteria.minBaths = parseInt(bathMatch[1]);
  }

  return criteria;
}

// ── Helpers ──

function isYes(msg: string): boolean {
  return /^(yes|yeah|yep|sure|ok|okay|absolutely|definitely|please|ya|yea|y)[\s!.]*$/i.test(msg);
}

function isNo(msg: string): boolean {
  return /^(no|nah|nope|not|n)[\s!.]*$/i.test(msg);
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

function formatPhone(digits: string): string {
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return digits;
}

function generateSessionId(): string {
  return `hoku-web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
