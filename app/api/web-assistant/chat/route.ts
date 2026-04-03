import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createConversation,
  processMessage,
  formatProfileAsNote,
  extractSearchCriteria,
  calculateWebChatHeatScore,
  type ConversationState,
  type WebAssistantConfig,
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

    // Build config for conversation engine
    const assistantConfig: WebAssistantConfig = {
      agentName,
      agentFirstName: agentName.split(" ")[0],
      locale: (agent as any).locations_served?.some?.((l: string) => l?.includes("HI") || l?.includes("Hawaii")) ? "hawaii" : "standard",
    };

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
      const response = processMessage(state, "", assistantConfig);
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
    const response = processMessage(state, message, assistantConfig);
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
          await createLeadFromChat(admin, state, agent);
          state.leadCreated = true;
        }

        if (action.type === "lookup_property" && action.data?.address) {
          // Look up seller's property via RentCast/Realie
          const propertyData = await lookupPropertyForSeller(action.data.address);
          state.profile.propertyData = propertyData;
          state.step = "seller_property_found";

          // Update reply with property info
          const pd = propertyData;
          const parts: string[] = [];
          if (pd?.beds) parts.push(`${pd.beds} bed`);
          if (pd?.baths) parts.push(`${pd.baths} bath`);
          if (pd?.sqft) parts.push(`${pd.sqft.toLocaleString()} sqft`);
          if (pd?.yearBuilt) parts.push(`built ${pd.yearBuilt}`);
          if (pd?.avmValue) parts.push(`estimated value: $${pd.avmValue.toLocaleString()}`);

          const propertyInfo = parts.length > 0 ? `\n\nHere's what I found: ${parts.join(", ")}.` : "";
          response.reply = `I found the property at ${action.data.address}.${propertyInfo}\n\n${assistantConfig.agentFirstName} can provide a detailed market analysis and help you get the best price. May I have your name so ${assistantConfig.agentFirstName} can reach out?`;

          // Update the last message
          state.messages[state.messages.length - 1].content = response.reply;
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
            state.step = "buyer_results_sent";

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
    const payload: any = {
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
      intent: p.intent || "buyer",
    };
    // Include seller property data if available
    if (p.intent === "seller" && p.propertyAddress) {
      payload.sellerProperty = {
        address: p.propertyAddress,
        avmValue: p.propertyData?.avmValue,
        beds: p.propertyData?.beds,
        baths: p.propertyData?.baths,
        sqft: p.propertyData?.sqft,
        yearBuilt: p.propertyData?.yearBuilt,
      };
    }
    await admin.from("lead_submissions").insert({
      agent_id: state.agentId,
      payload,
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

          // Create opportunity in CRM pipeline (adds to pipeline as new lead)
          if (config.pipeline_id && config.new_lead_stage_id) {
            try {
              await (ghl as any).createOpportunity?.({
                pipelineId: config.pipeline_id,
                stageId: config.new_lead_stage_id,
                contactId,
                name: `${p.name || "Website Visitor"} - ${p.intent === "seller" ? "Seller" : "Buyer"} (Website Chat)`,
                status: "open",
                source: "Website Chat",
                monetaryValue: p.propertyData?.avmValue || 0,
              });
              console.log(`[WebAssistant] CRM opportunity created for ${p.name}`);
            } catch (oppErr) {
              console.warn("[WebAssistant] CRM opportunity creation failed:", oppErr);
            }
          }
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
  const criteria = extractSearchCriteria(state.profile);

  // Strategy: Try Trestle MLS first (agent's direct MLS connection),
  // then fall back to IDX Broker (agent's website MLS feed).
  // Both Hokus share the same database, so Web Hoku can use the agent's Trestle credentials.

  // 1. Try Trestle MLS (same as App Hoku uses)
  try {
    const { data: trestleIntegration } = await admin
      .from("integrations")
      .select("config, status")
      .eq("agent_id", state.agentId)
      .eq("provider", "trestle")
      .maybeSingle();

    if (trestleIntegration?.status === "connected" && trestleIntegration.config) {
      const config = typeof trestleIntegration.config === "string" ? JSON.parse(trestleIntegration.config) : trestleIntegration.config;
      const { createTrestleClient } = await import("@/lib/integrations/trestle-client");
      const client = createTrestleClient(config);

      const result = await client.searchProperties({
        status: ["Active"],
        city: criteria.q,
        postalCode: criteria.postalCode,
        minBeds: criteria.minBeds,
        minBaths: criteria.minBaths,
        limit: 6,
        includeMedia: true,
      });

      if (result.value?.length > 0) {
        console.log(`[WebAssistant] Trestle MLS returned ${result.value.length} properties`);
        return {
          properties: result.value.map((p: any) => ({
            listingID: p.ListingId || p.ListingKey,
            address: p.UnparsedAddress || [p.StreetNumber, p.StreetName, p.StreetSuffix].filter(Boolean).join(" "),
            cityName: p.City,
            state: p.StateOrProvince || "HI",
            zipcode: p.PostalCode,
            listingPrice: String(p.ListPrice),
            bedrooms: String(p.BedroomsTotal || ""),
            totalBaths: String(p.BathroomsTotalInteger || ""),
            sqFt: String(p.LivingArea || ""),
            yearBuilt: p.YearBuilt ? String(p.YearBuilt) : undefined,
            propertyType: p.PropertyType,
            image: p.Media?.length ? [{ url: p.Media.sort((a: any, b: any) => (a.Order || 0) - (b.Order || 0))[0]?.MediaURL }].filter((i: any) => i.url) : [],
          })),
          totalCount: result.value.length,
        };
      }
    }
  } catch (err) {
    console.warn("[WebAssistant] Trestle MLS search failed:", err);
  }

  // 2. Fall back to IDX Broker (agent's website MLS feed)
  try {
    const { data: idxIntegration } = await admin
      .from("integrations")
      .select("config")
      .eq("agent_id", state.agentId)
      .eq("provider", "idx_broker")
      .maybeSingle();

    if (idxIntegration?.config) {
      const config = typeof idxIntegration.config === "string" ? JSON.parse(idxIntegration.config) : idxIntegration.config;
      const client = new IdxBrokerClient(config.api_key);
      const result = await client.searchProperties({
        city: criteria.q,
        zipcode: criteria.postalCode,
        minBeds: criteria.minBeds,
        minBaths: criteria.minBaths,
        limit: 6,
      });
      if (result.properties.length > 0) {
        console.log(`[WebAssistant] IDX Broker returned ${result.properties.length} properties`);
        return result;
      }
    }
  } catch (err) {
    console.warn("[WebAssistant] IDX Broker search failed:", err);
  }

  console.log("[WebAssistant] No MLS integration available for property search");
  return { properties: [] };
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

// ── Helper: Look up property for seller via RentCast/Realie ──

async function lookupPropertyForSeller(address: string): Promise<any> {
  try {
    // Try RentCast first for property data + AVM
    const { getConfiguredRentcastClient } = await import("@/lib/integrations/property-data-service");
    const rcClient = await getConfiguredRentcastClient();

    if (rcClient) {
      try {
        const results = await rcClient.searchProperties({ address, limit: 1 });
        if (results.length > 0) {
          const rc = results[0];
          // Also get AVM
          const { getPropertyAvm } = await import("@/lib/integrations/avm-service");
          const avm = await getPropertyAvm({
            address,
            bedrooms: rc.bedrooms,
            bathrooms: rc.bathrooms,
            squareFootage: rc.squareFootage,
            propertyType: rc.propertyType,
          });

          return {
            address: rc.formattedAddress || address,
            beds: rc.bedrooms,
            baths: rc.bathrooms,
            sqft: rc.squareFootage,
            yearBuilt: rc.yearBuilt,
            propertyType: rc.propertyType,
            lotSize: rc.lotSize,
            lastSalePrice: rc.lastSalePrice,
            lastSaleDate: rc.lastSaleDate,
            avmValue: avm?.value || null,
            avmLow: avm?.low || null,
            avmHigh: avm?.high || null,
          };
        }
      } catch (err) {
        console.warn("[WebAssistant] RentCast property lookup failed:", err);
      }
    }

    // Fallback: just get AVM
    const { getPropertyAvm } = await import("@/lib/integrations/avm-service");
    const avm = await getPropertyAvm({ address });
    if (avm) {
      return {
        address: avm.subjectProperty?.formattedAddress || address,
        beds: avm.subjectProperty?.bedrooms,
        baths: avm.subjectProperty?.bathrooms,
        sqft: avm.subjectProperty?.squareFootage,
        yearBuilt: avm.subjectProperty?.yearBuilt,
        avmValue: avm.value,
        avmLow: avm.low,
        avmHigh: avm.high,
      };
    }

    return null;
  } catch (err) {
    console.error("[WebAssistant] Property lookup failed:", err);
    return null;
  }
}
