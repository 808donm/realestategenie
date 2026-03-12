import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  generateChatResponse,
  type ChatMessage,
  type QualificationData,
} from "@/lib/ai/chat-prequalifier";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { calculateHeatScore, getHeatLevel } from "@/lib/lead-scoring";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Public chat endpoint for website prequalification widget.
 * No authentication required — uses agentId to scope the conversation.
 *
 * POST /api/public/chat
 *
 * Body:
 *   agentId: string          — The agent whose website this is embedded on
 *   sessionId?: string       — Resume an existing chat session
 *   message: string          — The visitor's message
 */
export async function POST(req: NextRequest) {
  try {
    const { agentId, sessionId, message } = await req.json();

    if (!agentId || !message) {
      return NextResponse.json(
        { error: "agentId and message are required" },
        { status: 400 }
      );
    }

    // Rate limit: simple per-IP check (10 messages per minute)
    // In production, use a proper rate limiter like Upstash
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    // Get agent info
    const { data: agent } = await admin
      .from("agents")
      .select("id, display_name, email")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    const agentName = agent.display_name || "your agent";

    // Get agent's custom chat context if configured
    const { data: integration } = await admin
      .from("integrations")
      .select("config")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    const config = (integration?.config as any) || {};
    const agentContext = config.chat_widget_context || undefined;

    // Load or create session
    let session: any = null;
    let messages: ChatMessage[] = [];
    let qualificationData: QualificationData = {};

    if (sessionId) {
      const { data } = await admin
        .from("chat_widget_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("agent_id", agentId)
        .single();

      if (data) {
        session = data;
        messages = (data.messages as ChatMessage[]) || [];
        qualificationData = (data.qualification_data as QualificationData) || {};
      }
    }

    // Append the visitor's message
    messages.push({ role: "user", content: message });

    // Generate AI response
    const { reply, qualification: newQualification } =
      await generateChatResponse({
        agentName,
        agentContext,
        messages,
      });

    // Merge qualification data (new data overwrites old)
    qualificationData = { ...qualificationData, ...newQualification };

    // Append assistant reply (store clean version without tags)
    messages.push({ role: "assistant", content: reply });

    // Determine if we should create a GHL contact
    let contactCreated = false;
    let ghlContactId: string | undefined;

    const hasContactInfo =
      qualificationData.email || qualificationData.phone;
    const hasName = qualificationData.name;
    const wantsToConnect = qualificationData.ready_to_connect;

    // Create contact when we have name + contact info + they want to connect
    if (
      hasName &&
      hasContactInfo &&
      wantsToConnect &&
      !session?.ghl_contact_id
    ) {
      try {
        const result = await createGHLContact(
          agentId,
          config,
          qualificationData
        );
        if (result) {
          ghlContactId = result.contactId;
          contactCreated = true;
        }
      } catch (err: any) {
        console.error("Failed to create GHL contact from chat:", err.message);
      }
    }

    // Calculate heat score from qualification data
    const heatScore = calculateHeatScore({
      name: qualificationData.name || "",
      email: qualificationData.email,
      phone_e164: qualificationData.phone,
      representation: qualificationData.representation,
      wants_agent_reach_out: qualificationData.ready_to_connect,
      timeline: qualificationData.timeline,
      financing: qualificationData.financing,
      neighborhoods: qualificationData.neighborhoods,
      must_haves: qualificationData.must_haves,
      consent: {
        sms: qualificationData.consent_sms || false,
        email: qualificationData.consent_email || false,
      },
    });

    // Save or update session
    const sessionData = {
      agent_id: agentId,
      messages,
      qualification_data: qualificationData,
      heat_score: heatScore,
      heat_level: getHeatLevel(heatScore),
      message_count: messages.length,
      last_message_at: new Date().toISOString(),
      visitor_ip: ip,
      ghl_contact_id: ghlContactId || session?.ghl_contact_id || null,
      contact_created: contactCreated || session?.contact_created || false,
      updated_at: new Date().toISOString(),
    };

    let currentSessionId = sessionId;

    if (session) {
      await admin
        .from("chat_widget_sessions")
        .update(sessionData)
        .eq("id", session.id);
    } else {
      const { data: newSession } = await admin
        .from("chat_widget_sessions")
        .insert(sessionData)
        .select("id")
        .single();
      currentSessionId = newSession?.id;
    }

    return NextResponse.json({
      reply,
      sessionId: currentSessionId,
      qualification: {
        score: heatScore,
        level: getHeatLevel(heatScore),
        contactCreated,
      },
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Create a contact in GHL from qualification data.
 */
async function createGHLContact(
  agentId: string,
  config: any,
  qual: QualificationData
): Promise<{ contactId: string } | null> {
  const accessToken = config.ghl_access_token;
  const locationId = config.ghl_location_id;

  if (!accessToken || !locationId) {
    console.log("No GHL config for contact creation");
    return null;
  }

  const client = new GHLClient(accessToken, locationId);

  // Split name into first/last
  const nameParts = (qual.name || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const tags = ["website-chat"];
  if (qual.buying_or_selling) tags.push(qual.buying_or_selling);
  if (qual.timeline) tags.push(`timeline:${qual.timeline}`);
  if (qual.financing) tags.push(`financing:${qual.financing}`);

  const contact = await client.createContact({
    locationId,
    firstName,
    lastName,
    email: qual.email,
    phone: qual.phone,
    tags,
    source: "Website Chat Widget",
  });

  if (!contact.id) return null;

  // Add a note with qualification details
  const noteLines = [
    "📋 Website Chat Prequalification",
    "",
    qual.buying_or_selling ? `Intent: ${qual.buying_or_selling}` : "",
    qual.timeline ? `Timeline: ${qual.timeline}` : "",
    qual.financing ? `Financing: ${qual.financing}` : "",
    qual.representation !== undefined
      ? `Has agent: ${qual.representation}`
      : "",
    qual.neighborhoods ? `Areas: ${qual.neighborhoods}` : "",
    qual.must_haves ? `Must-haves: ${qual.must_haves}` : "",
    qual.consent_sms ? "✅ SMS consent" : "",
    qual.consent_email ? "✅ Email consent" : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await client.addNote({ contactId: contact.id, body: noteLines });
  } catch {
    // Note is nice-to-have, don't fail
  }

  // Create opportunity if pipeline is configured
  if (config.ghl_pipeline_id && config.ghl_new_lead_stage) {
    try {
      await client.createOpportunity({
        pipelineId: config.ghl_pipeline_id,
        pipelineStageId: config.ghl_new_lead_stage,
        name: qual.name || "Website Chat Lead",
        status: "open",
        contactId: contact.id,
      });
    } catch {
      // Opportunity is nice-to-have
    }
  }

  return { contactId: contact.id };
}
