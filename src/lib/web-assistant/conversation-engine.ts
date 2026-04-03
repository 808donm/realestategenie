/**
 * Hoku Web Assistant -- Conversation Engine
 *
 * Pre-qualifies website visitors through a guided conversation flow.
 * Supports both buyer and seller flows with property lookup for sellers.
 *
 * Buyer Flow:
 *   Greeting → Buy/Sell → Has Agent? → Want Reach Out? → Name → Email → Phone
 *   → Timeline → Pre-Approval → Neighborhoods → Must-Haves → Property Search
 *
 * Seller Flow:
 *   Greeting → Buy/Sell → Has Agent? → Want Reach Out? → Property Address
 *   → (lookup property in RentCast/Realie) → Name → Email → Phone → Done
 *
 * All flows create a lead in the system with heat score and CRM contact.
 */

// ── Conversation State ──

export type ConversationStep =
  | "greeting"
  | "buy_or_sell"
  | "has_agent"
  | "has_agent_yes"
  | "want_reach_out"
  // Buyer flow
  | "buyer_get_name"
  | "buyer_get_email"
  | "buyer_get_phone"
  | "buyer_get_timeline"
  | "buyer_get_preapproval"
  | "buyer_get_neighborhoods"
  | "buyer_get_musthaves"
  | "buyer_offer_search"
  | "buyer_searching"
  | "buyer_results_sent"
  // Seller flow
  | "seller_get_address"
  | "seller_looking_up"
  | "seller_property_found"
  | "seller_get_name"
  | "seller_get_email"
  | "seller_get_phone"
  | "seller_done"
  // General
  | "general_chat";

export type VisitorIntent = "buyer" | "seller" | "unknown";

export interface VisitorProfile {
  intent?: VisitorIntent;
  hasAgent?: boolean;
  wantReachOut?: boolean;
  // Contact info
  name?: string;
  email?: string;
  phone?: string;
  // Buyer fields
  timeline?: string;
  preApproved?: string;
  neighborhoods?: string;
  mustHaves?: string;
  wantsPropertySearch?: boolean;
  // Seller fields
  propertyAddress?: string;
  propertyData?: any; // Enriched property data from RentCast/Realie
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

// ── Agent Customization ──

export interface WebAssistantConfig {
  greeting?: string; // Custom greeting (default: "Aloha! I'm Hoku, {agentName}'s assistant.")
  agentName: string;
  agentFirstName?: string;
  locale?: string; // "hawaii" for Aloha greeting, "standard" for Hi
}

// ── Step Response ──

export interface StepResponse {
  reply: string;
  nextStep: ConversationStep;
  actions?: Array<{
    type: "create_lead" | "search_mls" | "lookup_property" | "send_properties";
    data?: any;
  }>;
}

/**
 * Process a visitor's message and return Hoku's response.
 */
export function processMessage(
  state: ConversationState,
  visitorMessage: string,
  config?: WebAssistantConfig,
): StepResponse {
  const msg = visitorMessage.trim().toLowerCase();
  const agentName = config?.agentName || state.agentName || "the agent";
  const firstName = config?.agentFirstName || agentName.split(" ")[0];
  const isHawaii = config?.locale === "hawaii";

  switch (state.step) {
    // ═══════════════════════════════════════════════════════════
    // GREETING
    // ═══════════════════════════════════════════════════════════
    case "greeting": {
      const greeting = config?.greeting || (isHawaii
        ? `Aloha! I'm Hoku, ${firstName}'s assistant. Welcome to the website!`
        : `Hi there! I'm Hoku, ${firstName}'s AI assistant. Welcome!`);
      return {
        reply: `${greeting}\n\nAre you interested in buying or selling a property today?`,
        nextStep: "buy_or_sell",
      };
    }

    // ═══════════════════════════════════════════════════════════
    // BUY OR SELL?
    // ═══════════════════════════════════════════════════════════
    case "buy_or_sell":
      if (msg.includes("buy") || msg.includes("looking") || msg.includes("search") || msg.includes("find") || msg.includes("home") || msg.includes("house")) {
        state.profile.intent = "buyer";
        return {
          reply: `Great! I'd love to help you find your perfect property.\n\nAre you currently working with a real estate agent?`,
          nextStep: "has_agent",
        };
      }
      if (msg.includes("sell") || msg.includes("list") || msg.includes("value") || msg.includes("worth")) {
        state.profile.intent = "seller";
        return {
          reply: `I'd be happy to help! ${firstName} specializes in helping sellers get the best value for their property.\n\nAre you currently working with a real estate agent?`,
          nextStep: "has_agent",
        };
      }
      if (msg.includes("both") || msg.includes("buy and sell")) {
        state.profile.intent = "buyer"; // Start with buyer flow, seller can follow
        return {
          reply: `Exciting! Let's start with finding your new home, and we can also discuss selling your current property.\n\nAre you currently working with a real estate agent?`,
          nextStep: "has_agent",
        };
      }
      return {
        reply: `No problem! Are you looking to buy a property, or are you thinking about selling? I can help with either!`,
        nextStep: "buy_or_sell",
      };

    // ═══════════════════════════════════════════════════════════
    // HAS AGENT?
    // ═══════════════════════════════════════════════════════════
    case "has_agent":
      if (isYes(msg)) {
        state.profile.hasAgent = true;
        return {
          reply: `That's wonderful! I hope you're having a great experience with your agent. If you ever need anything in the future, ${firstName} would love to help. Have a wonderful day!`,
          nextStep: "has_agent_yes",
        };
      }
      if (isNo(msg) || msg.includes("not sure") || msg.includes("looking") || msg.includes("not yet")) {
        state.profile.hasAgent = false;
        return {
          reply: `No problem at all! Would you like ${firstName} to reach out to you? ${firstName} would love to help you with your real estate ${state.profile.intent === "seller" ? "sale" : "search"}.`,
          nextStep: "want_reach_out",
        };
      }
      return {
        reply: `Just want to make sure I direct you properly. Are you currently working with a real estate agent? (yes or no)`,
        nextStep: "has_agent",
      };

    // ═══════════════════════════════════════════════════════════
    // WANT REACH OUT?
    // ═══════════════════════════════════════════════════════════
    case "want_reach_out":
      if (isYes(msg)) {
        state.profile.wantReachOut = true;
        if (state.profile.intent === "seller") {
          return {
            reply: `Wonderful! First, what is the address of the property you're looking to sell?`,
            nextStep: "seller_get_address",
          };
        }
        return {
          reply: `Wonderful! I'd love to connect you with ${firstName}. May I have your name?`,
          nextStep: "buyer_get_name",
        };
      }
      if (isNo(msg)) {
        if (state.profile.intent === "buyer") {
          return {
            reply: `No worries! Would you like me to search for properties for you? I can find listings that match your criteria.`,
            nextStep: "buyer_offer_search",
          };
        }
        return {
          reply: `No problem! If you change your mind, feel free to come back. ${isHawaii ? "Mahalo" : "Thank you"} for visiting!`,
          nextStep: "general_chat",
        };
      }
      return {
        reply: `Would you like ${firstName} to reach out to you? (yes or no)`,
        nextStep: "want_reach_out",
      };

    // ═══════════════════════════════════════════════════════════
    // SELLER FLOW
    // ═══════════════════════════════════════════════════════════
    case "seller_get_address":
      if (msg.length < 5) {
        return { reply: "Could you share the full address of the property? For example: 123 Main Street, Honolulu, HI 96822", nextStep: "seller_get_address" };
      }
      state.profile.propertyAddress = visitorMessage.trim();
      return {
        reply: `Thank you! Let me look up some information on ${visitorMessage.trim()}...`,
        nextStep: "seller_looking_up",
        actions: [{ type: "lookup_property", data: { address: visitorMessage.trim() } }],
      };

    case "seller_looking_up":
      // This state is set after property lookup completes
      return {
        reply: `I'm still looking that up. Just a moment...`,
        nextStep: "seller_looking_up",
      };

    case "seller_property_found": {
      const pd = state.profile.propertyData;
      let propertyInfo = "";
      if (pd) {
        const parts = [];
        if (pd.beds) parts.push(`${pd.beds} bed`);
        if (pd.baths) parts.push(`${pd.baths} bath`);
        if (pd.sqft) parts.push(`${pd.sqft.toLocaleString()} sqft`);
        if (pd.yearBuilt) parts.push(`built ${pd.yearBuilt}`);
        if (pd.avmValue) parts.push(`estimated value: $${pd.avmValue.toLocaleString()}`);
        propertyInfo = parts.length > 0 ? `\n\nHere's what I found: ${parts.join(", ")}.` : "";
      }
      return {
        reply: `I found the property at ${state.profile.propertyAddress}.${propertyInfo}\n\n${firstName} can provide a detailed market analysis and help you get the best price. May I have your name so ${firstName} can reach out?`,
        nextStep: "seller_get_name",
      };
    }

    case "seller_get_name":
      if (msg.length < 2) {
        return { reply: "Could you share your name?", nextStep: "seller_get_name" };
      }
      state.profile.name = toTitleCase(visitorMessage.trim());
      return {
        reply: `Nice to meet you, ${state.profile.name}! What's the best email address to reach you at?`,
        nextStep: "seller_get_email",
      };

    case "seller_get_email": {
      const emailMatch = visitorMessage.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      if (!emailMatch) {
        return { reply: "I didn't catch a valid email address. Could you type it again?", nextStep: "seller_get_email" };
      }
      state.profile.email = emailMatch[0].toLowerCase();
      return {
        reply: `Got it! And what's a good phone number to reach you at?`,
        nextStep: "seller_get_phone",
      };
    }

    case "seller_get_phone": {
      const digits = visitorMessage.replace(/\D/g, "");
      if (digits.length < 7) {
        return { reply: "Could you share a phone number?", nextStep: "seller_get_phone" };
      }
      state.profile.phone = formatPhone(digits);
      return {
        reply: `Thank you, ${state.profile.name}! I've passed all your information along to ${firstName}, who will be reaching out to you soon to discuss ${state.profile.propertyAddress || "your property"}.\n\n${isHawaii ? "Mahalo" : "Thank you"} for visiting! Is there anything else I can help with?`,
        nextStep: "seller_done",
        actions: [{ type: "create_lead" }],
      };
    }

    case "seller_done":
      return {
        reply: `${firstName} will be in touch soon, ${state.profile.name || ""}! Is there anything else I can help with?`,
        nextStep: "general_chat",
      };

    // ═══════════════════════════════════════════════════════════
    // BUYER FLOW
    // ═══════════════════════════════════════════════════════════
    case "buyer_get_name":
      if (msg.length < 2) {
        return { reply: "Could you share your name?", nextStep: "buyer_get_name" };
      }
      state.profile.name = toTitleCase(visitorMessage.trim());
      return {
        reply: `Nice to meet you, ${state.profile.name}! What's the best email address to reach you at?`,
        nextStep: "buyer_get_email",
      };

    case "buyer_get_email": {
      const emailMatch = visitorMessage.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      if (!emailMatch) {
        return { reply: "I didn't catch a valid email address. Could you type it again?", nextStep: "buyer_get_email" };
      }
      state.profile.email = emailMatch[0].toLowerCase();
      return {
        reply: `Got it! And what's a good phone number to reach you at?`,
        nextStep: "buyer_get_phone",
      };
    }

    case "buyer_get_phone": {
      const digits = visitorMessage.replace(/\D/g, "");
      if (digits.length < 7) {
        return { reply: "Could you share a phone number?", nextStep: "buyer_get_phone" };
      }
      state.profile.phone = formatPhone(digits);
      return {
        reply: `Thank you, ${state.profile.name}! Just a few quick questions so ${firstName} can be best prepared.\n\nWhat is your timeframe for buying? (e.g., 0-3 months, 3-6 months, 6+ months, just browsing)`,
        nextStep: "buyer_get_timeline",
      };
    }

    case "buyer_get_timeline":
      state.profile.timeline = visitorMessage.trim();
      return {
        reply: `Are you pre-approved for a mortgage? (yes, no, paying cash, or not sure)`,
        nextStep: "buyer_get_preapproval",
      };

    case "buyer_get_preapproval":
      state.profile.preApproved = visitorMessage.trim();
      return {
        reply: `Which neighborhoods or areas are you interested in?`,
        nextStep: "buyer_get_neighborhoods",
      };

    case "buyer_get_neighborhoods":
      state.profile.neighborhoods = visitorMessage.trim();
      return {
        reply: `Do you have any must-have features? (e.g., number of bedrooms, parking, pool, updated kitchen, ocean view, etc.)`,
        nextStep: "buyer_get_musthaves",
      };

    case "buyer_get_musthaves":
      state.profile.mustHaves = visitorMessage.trim();
      return {
        reply: `Thank you for all that great information, ${state.profile.name}! I've passed everything along to ${firstName} who will be reaching out to you soon.\n\nWould you like me to find some properties that match your criteria right now?`,
        nextStep: "buyer_offer_search",
        actions: [{ type: "create_lead" }],
      };

    case "buyer_offer_search":
      if (isYes(msg)) {
        state.profile.wantsPropertySearch = true;
        return {
          reply: `Great! Let me search for properties for you. This will just take a moment...`,
          nextStep: "buyer_searching",
          actions: [{ type: "search_mls" }],
        };
      }
      if (isNo(msg)) {
        return {
          reply: `No problem! ${state.profile.name ? `${firstName} will be in touch soon, ${state.profile.name}` : "Feel free to come back anytime"}. ${isHawaii ? "Mahalo" : "Thank you"} for visiting! Is there anything else I can help with?`,
          nextStep: "general_chat",
        };
      }
      return {
        reply: `Would you like me to search for properties? I can find listings that match your preferences. (yes or no)`,
        nextStep: "buyer_offer_search",
      };

    case "buyer_searching":
      return { reply: `I'm still searching. Just a moment...`, nextStep: "buyer_searching" };

    case "buyer_results_sent":
      return {
        reply: `Is there anything else I can help you with? I'm happy to search for more properties or answer any questions.`,
        nextStep: "general_chat",
      };

    // ═══════════════════════════════════════════════════════════
    // GENERAL / END STATES
    // ═══════════════════════════════════════════════════════════
    case "general_chat":
      return {
        reply: `That's a great question! I'd recommend discussing that with ${firstName} who can give you personalized advice. Is there anything else I can help with?`,
        nextStep: "general_chat",
      };

    case "has_agent_yes":
      return {
        reply: `If you ever need anything in the future, feel free to come back. ${isHawaii ? "A hui hou!" : "Have a great day!"}`,
        nextStep: "has_agent_yes",
      };

    default:
      return {
        reply: `I'm here to help! Are you looking to buy or sell a property?`,
        nextStep: "buy_or_sell",
      };
  }
}

/**
 * Create the initial conversation state.
 */
export function createConversation(agentId: string, agentName: string): ConversationState {
  return {
    step: "greeting",
    profile: {},
    messages: [],
    agentId,
    agentName,
    sessionId: `hoku-web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Format the visitor profile as a CRM note.
 */
export function formatProfileAsNote(state: ConversationState): string {
  const p = state.profile;
  const lines = [
    `--- Website Visitor (Hoku Web Assistant) ---`,
    `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
    `Source: Website Chat`,
    `Intent: ${p.intent === "seller" ? "Seller" : p.intent === "buyer" ? "Buyer" : "Unknown"}`,
    `Session ID: ${state.sessionId}`,
    "",
    "--- Qualification ---",
    `Working with agent: ${p.hasAgent ? "Yes" : "No"}`,
    `Wants agent to reach out: ${p.wantReachOut ? "Yes" : "No"}`,
  ];

  if (p.intent === "seller") {
    if (p.propertyAddress) lines.push(`Property Address: ${p.propertyAddress}`);
    if (p.propertyData) {
      const pd = p.propertyData;
      if (pd.avmValue) lines.push(`Estimated Value (AVM): $${pd.avmValue.toLocaleString()}`);
      if (pd.beds) lines.push(`Beds: ${pd.beds}`);
      if (pd.baths) lines.push(`Baths: ${pd.baths}`);
      if (pd.sqft) lines.push(`Sqft: ${pd.sqft.toLocaleString()}`);
      if (pd.yearBuilt) lines.push(`Year Built: ${pd.yearBuilt}`);
      if (pd.lastSalePrice) lines.push(`Last Sale: $${pd.lastSalePrice.toLocaleString()}`);
    }
  } else {
    if (p.timeline) lines.push(`Timeline: ${p.timeline}`);
    if (p.preApproved) lines.push(`Pre-approved: ${p.preApproved}`);
    if (p.neighborhoods) lines.push(`Neighborhoods: ${p.neighborhoods}`);
    if (p.mustHaves) lines.push(`Must-haves: ${p.mustHaves}`);
    if (p.wantsPropertySearch) lines.push(`Requested property search: Yes`);
  }

  lines.push("", "--- Conversation ---");
  state.messages.forEach((m) => {
    lines.push(`${m.role === "assistant" ? "Hoku" : "Visitor"}: ${m.content}`);
  });

  return lines.join("\n");
}

/**
 * Extract MLS search criteria from buyer profile.
 */
export function extractSearchCriteria(profile: VisitorProfile): Record<string, any> {
  const criteria: Record<string, any> = {};
  if (profile.neighborhoods) {
    const zipMatch = profile.neighborhoods.match(/\d{5}/);
    if (zipMatch) criteria.postalCode = zipMatch[0];
    else criteria.q = profile.neighborhoods;
  }
  if (profile.mustHaves) {
    const bedMatch = profile.mustHaves.match(/(\d+)\s*(?:bed|br|bedroom)/i);
    if (bedMatch) criteria.minBeds = parseInt(bedMatch[1]);
    const bathMatch = profile.mustHaves.match(/(\d+)\s*(?:bath|ba|bathroom)/i);
    if (bathMatch) criteria.minBaths = parseInt(bathMatch[1]);
  }
  return criteria;
}

/**
 * Calculate heat score for a web chat lead.
 */
export function calculateWebChatHeatScore(p: VisitorProfile): number {
  let score = 0;
  if (p.email) score += 10;
  if (p.phone) score += 10;
  if (p.name) score += 5;
  if (!p.hasAgent) score += 20;
  if (p.wantReachOut) score += 15;
  if (p.intent === "seller") score += 10; // Sellers are high-value leads
  if (p.propertyAddress) score += 5;
  if (p.timeline) {
    const tl = p.timeline.toLowerCase();
    if (tl.includes("0-3") || tl.includes("immediate") || tl.includes("asap")) score += 20;
    else if (tl.includes("3-6")) score += 15;
    else if (tl.includes("6")) score += 10;
    else score += 5;
  }
  if (p.preApproved) {
    const pa = p.preApproved.toLowerCase();
    if (pa.includes("yes") || pa.includes("pre-approved") || pa.includes("cash")) score += 15;
    else if (pa.includes("lender")) score += 10;
    else score += 5;
  }
  return Math.min(score, 100);
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
