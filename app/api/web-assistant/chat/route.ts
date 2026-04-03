import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createConversation,
  processMessage,
  formatProfileAsNote,
  extractSearchCriteria,
  type ConversationState,
} from "@/lib/web-assistant/conversation-engine";
import { IdxBrokerClient, formatPropertiesForHtmlEmail } from "@/lib/integrations/idx-broker-client";

// Admin client for public endpoint (no user auth required)
function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

// In-memory session store (swap for Redis/DB in production at scale)
const sessions = new Map<string, ConversationState>();

/**
 * POST /api/web-assistant/chat
 *
 * Public endpoint -- no auth required. Handles chat messages from the
 * embeddable Hoku web assistant widget on agent websites.
 *
 * Body: {
 *   agentId: string    -- The agent whose website this is on
 *   sessionId?: string -- Existing session ID (omit to start new)
 *   message: string    -- Visitor's message
 * }
 *
 * Returns: {
 *   reply: string      -- Hoku's response
 *   sessionId: string  -- Session ID to include in next request
 *   step: string       -- Current conversation step (for UI hints)
 *   properties?: any[] -- Properties found (if MLS search was performed)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, sessionId, message } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    // Get agent info
    const admin = getAdmin();
    const { data: agent } = await admin
      .from("agents")
      .select("id, display_name, email, phone_e164, license_number, agency_name")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agentName = agent.display_name || "the agent";

    // Get or create session
    let state: ConversationState;
    if (sessionId && sessions.has(sessionId)) {
      state = sessions.get(sessionId)!;
    } else {
      // New conversation
      state = createConversation(agentId, agentName);
      sessions.set(state.sessionId, state);
    }

    // If this is the first message (greeting), process it to get the greeting
    if (state.step === "greeting" && !message) {
      const response = processMessage(state, "");
      state.step = response.nextStep;
      state.messages.push({
        role: "assistant",
        content: response.reply,
        timestamp: new Date().toISOString(),
      });
      sessions.set(state.sessionId, state);
      return NextResponse.json({
        reply: response.reply,
        sessionId: state.sessionId,
        step: state.step,
      });
    }

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // Record visitor message
    state.messages.push({
      role: "visitor",
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Process the message
    const response = processMessage(state, message);
    state.step = response.nextStep;

    // Record assistant reply
    state.messages.push({
      role: "assistant",
      content: response.reply,
      timestamp: new Date().toISOString(),
    });

    // Process actions
    let properties: any[] | undefined;

    if (response.actions) {
      for (const action of response.actions) {
        if (action.type === "create_lead" && !state.leadCreated) {
          // Create lead in the system
          await createLeadFromChat(admin, state, agent);
          state.leadCreated = true;
        }

        if (action.type === "search_mls") {
          // Search for properties
          const searchResult = await searchPropertiesForVisitor(admin, state, agent);
          if (searchResult.properties.length > 0) {
            properties = searchResult.properties;

            // Send email with properties
            if (state.profile.email) {
              await sendPropertyEmail(admin, state, agent, searchResult.properties);
              state.propertiesSent = true;
            }

            // Update the reply with results
            const count = searchResult.properties.length;
            response.reply = `I found ${count} properties that might interest you! ${state.profile.email ? `I've sent them to ${state.profile.email}.` : ""}\n\nWould you like me to refine the search or is there anything else I can help with?`;
            state.step = "results_sent";

            // Update the last message
            state.messages[state.messages.length - 1].content = response.reply;
          } else {
            response.reply = `I wasn't able to find properties matching your exact criteria right now. ${agentName} will reach out with some options once they review your preferences. Is there anything else I can help with?`;
            state.step = "general_chat";
            state.messages[state.messages.length - 1].content = response.reply;
          }
        }
      }
    }

    // Save session
    sessions.set(state.sessionId, state);

    // Clean up old sessions (older than 24 hours)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, sess] of sessions.entries()) {
      if (new Date(sess.createdAt).getTime() < cutoff) sessions.delete(id);
    }

    return NextResponse.json({
      reply: response.reply,
      sessionId: state.sessionId,
      step: state.step,
      properties,
    });
  } catch (err: any) {
    console.error("[WebAssistant] Error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// ── Helper: Create lead in CRM ──

async function createLeadFromChat(admin: any, state: ConversationState, agent: any) {
  const p = state.profile;
  try {
    // Insert into lead_submissions
    await admin.from("lead_submissions").insert({
      agent_id: state.agentId,
      payload: {
        name: p.name || "Website Visitor",
        email: p.email,
        phone_e164: p.phone,
        representation: p.hasAgent ? "yes" : "no",
        wants_agent_reach_out: p.wantReachOut,
        timeline: p.timeline,
        financing: p.preApproved,
        neighborhoods: p.neighborhoods,
        must_haves: p.mustHaves,
        consent: { sms: true, email: true },
        source: "website_chat",
      },
      heat_score: calculateWebChatHeatScore(p),
      pipeline_stage: "new_lead",
      lead_source: "Website Chat",
    });

    // Try to create contact in CRM via GHL
    const { data: integration } = await admin
      .from("integrations")
      .select("config, status")
      .eq("agent_id", state.agentId)
      .eq("provider", "ghl")
      .maybeSingle();

    if (integration?.status === "connected" && integration.config) {
      try {
        const config = typeof integration.config === "string" ? JSON.parse(integration.config) : integration.config;
        const { GHLClient } = await import("@/lib/integrations/ghl-client");
        const ghl = new GHLClient(config.access_token, config.location_id);

        // Create contact via GHL
        const contactData: any = {
          firstName: p.name?.split(" ")[0],
          lastName: p.name?.split(" ").slice(1).join(" ") || undefined,
          email: p.email,
          phone: p.phone,
          tags: ["Website Chat", "Hoku Web Assistant"],
          source: "Website Chat",
          locationId: config.location_id,
        };
        const contact = await ghl.createContact(contactData);

        // Add conversation as note
        const contactId = (contact as any)?.contact?.id || (contact as any)?.id;
        if (contactId) {
          const note = formatProfileAsNote(state);
          await (ghl as any).addNote?.(contactId, note);
        }
      } catch (ghlErr) {
        console.warn("[WebAssistant] CRM contact creation failed:", ghlErr);
      }
    }

    console.log(`[WebAssistant] Lead created for ${p.name || "visitor"} (agent: ${state.agentId})`);
  } catch (err) {
    console.error("[WebAssistant] Failed to create lead:", err);
  }
}

// ── Helper: Search MLS via IDX Broker ──

async function searchPropertiesForVisitor(admin: any, state: ConversationState, agent: any) {
  try {
    // Check if agent has IDX Broker configured
    const { data: idxIntegration } = await admin
      .from("integrations")
      .select("config")
      .eq("agent_id", state.agentId)
      .eq("provider", "idx_broker")
      .maybeSingle();

    if (!idxIntegration?.config) {
      console.log("[WebAssistant] No IDX Broker configured, skipping MLS search");
      return { properties: [] };
    }

    const config = typeof idxIntegration.config === "string" ? JSON.parse(idxIntegration.config) : idxIntegration.config;
    const client = new IdxBrokerClient(config.api_key);
    const criteria = extractSearchCriteria(state.profile);

    const result = await client.searchProperties({
      city: criteria.q,
      zipcode: criteria.postalCode,
      minBeds: criteria.minBeds,
      minBaths: criteria.minBaths,
      limit: 6,
    });

    return result;
  } catch (err) {
    console.error("[WebAssistant] MLS search failed:", err);
    return { properties: [] };
  }
}

// ── Helper: Send property email ──

async function sendPropertyEmail(admin: any, state: ConversationState, agent: any, properties: any[]) {
  try {
    const html = formatPropertiesForHtmlEmail(
      properties,
      agent.display_name || "Your Agent",
      agent.phone_e164,
      agent.email,
    );

    // Use Resend for email sending
    const resend = await import("@/lib/email/resend");
    const sendFn = (resend as any).sendEmail || (resend as any).default?.sendEmail || (resend as any).send;
    if (sendFn) {
      await sendFn({
        to: state.profile.email!,
        subject: `Properties Selected for You by ${agent.display_name || "Your Agent"}`,
        html,
      });
    }

    console.log(`[WebAssistant] Property email sent to ${state.profile.email}`);
  } catch (err) {
    console.error("[WebAssistant] Failed to send property email:", err);
  }
}

// ── Helper: Calculate heat score for web chat lead ──

function calculateWebChatHeatScore(p: any): number {
  let score = 0;
  if (p.email) score += 10;
  if (p.phone) score += 10;
  if (p.name) score += 5;
  if (!p.hasAgent) score += 20;
  if (p.wantReachOut) score += 15;
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
