import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateChannelResponse, type MessageChannel } from "@/lib/ai/channel-assistant";
import {
  sendChannelMessage,
  getSocialChannelConfig,
  verifyFacebookSignature,
  type SocialChannelConfig,
} from "@/lib/integrations/social-channels-client";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// ─── Normalized Inbound Message ───────────────────────────────

interface NormalizedMessage {
  channel: MessageChannel;
  senderId: string;
  senderName?: string;
  messageText: string;
  messageId?: string;
  timestamp: string;
  rawPayload: any;
}

// ─── Facebook / Instagram Webhook Parser ──────────────────────

function parseFacebookPayload(body: any): NormalizedMessage[] {
  const messages: NormalizedMessage[] = [];

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (event.message?.text) {
        const isInstagram = body.object === "instagram";
        messages.push({
          channel: isInstagram ? "instagram" : "facebook",
          senderId: event.sender.id,
          messageText: event.message.text,
          messageId: event.message.mid,
          timestamp: new Date(event.timestamp).toISOString(),
          rawPayload: event,
        });
      }
    }
  }

  return messages;
}

// ─── WhatsApp Webhook Parser ──────────────────────────────────

function parseWhatsAppPayload(body: any): NormalizedMessage[] {
  const messages: NormalizedMessage[] = [];

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === "messages") {
        for (const msg of change.value?.messages || []) {
          if (msg.type === "text") {
            const contact = change.value.contacts?.[0];
            messages.push({
              channel: "whatsapp",
              senderId: msg.from,
              senderName: contact?.profile?.name,
              messageText: msg.text.body,
              messageId: msg.id,
              timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
              rawPayload: msg,
            });
          }
        }
      }
    }
  }

  return messages;
}

// ─── Google Business Messages Parser ──────────────────────────

function parseGoogleBusinessPayload(body: any): NormalizedMessage[] {
  if (!body.message?.text || !body.conversationId) return [];

  return [
    {
      channel: "google_business",
      senderId: body.conversationId,
      senderName: body.context?.userInfo?.displayName,
      messageText: body.message.text,
      messageId: body.message.messageId,
      timestamp: body.message.createTime || new Date().toISOString(),
      rawPayload: body,
    },
  ];
}

// ─── LinkedIn Webhook Parser ──────────────────────────────────

function parseLinkedInPayload(body: any): NormalizedMessage[] {
  // LinkedIn uses Organization Messaging webhook events
  if (!body.eventBody?.body || !body.eventBody?.from) return [];

  return [
    {
      channel: "linkedin",
      senderId: body.eventBody.from,
      messageText: body.eventBody.body,
      messageId: body.eventBody.messageId,
      timestamp: body.eventBody.createdAt ? new Date(body.eventBody.createdAt).toISOString() : new Date().toISOString(),
      rawPayload: body,
    },
  ];
}

// ─── Core Handler ─────────────────────────────────────────────

async function handleInboundSocialMessage(msg: NormalizedMessage) {
  console.log(`📨 [Social/${msg.channel}] Inbound from ${msg.senderId}: "${msg.messageText.slice(0, 80)}"`);

  // Store in inbound_messages
  await admin.from("inbound_messages").insert({
    contact_id: msg.senderId,
    contact_name: msg.senderName || null,
    message_type: msg.channel,
    message_body: msg.messageText,
    ghl_message_id: msg.messageId || null,
    raw_payload: msg.rawPayload,
    received_at: msg.timestamp,
    read: false,
  });

  // Find agent integration with this social channel enabled
  const { data: integrations } = await admin
    .from("integrations")
    .select("agent_id, config")
    .eq("provider", "social_channels")
    .eq("status", "connected");

  if (!integrations || integrations.length === 0) {
    console.log("[Social] No social channel integrations found");
    return;
  }

  // Find the integration that has this channel enabled
  // For multi-tenant, you'd match by page_id/phone_number_id; for single-agent, take the first
  const integration = integrations.find((i) => {
    const config = i.config as SocialChannelConfig;
    const channelConfig = config[msg.channel as keyof SocialChannelConfig] as any;
    return channelConfig?.enabled;
  });

  if (!integration) {
    console.log(`[Social] No agent has ${msg.channel} enabled`);
    return;
  }

  const agentId = integration.agent_id;
  const config = integration.config as SocialChannelConfig;

  // Check if AI auto-response is enabled
  const channelConfig = config[msg.channel as keyof SocialChannelConfig] as any;
  if (!channelConfig?.enabled) {
    console.log(`[Social] ${msg.channel} auto-response disabled`);
    return;
  }

  // Get agent name
  const { data: agent } = await admin.from("agents").select("full_name").eq("id", agentId).single();

  const agentName = agent?.full_name || "your agent";

  // Generate AI response
  const { reply, conversationId } = await generateChannelResponse({
    externalContactId: msg.senderId,
    agentId,
    agentName,
    inboundMessage: msg.messageText,
    channel: msg.channel,
  });

  // Send reply back through the same channel
  const sendResult = await sendChannelMessage({
    channel: msg.channel,
    recipientId: msg.senderId,
    message: reply,
    config,
  });

  if (sendResult.success) {
    console.log(`✅ [Social/${msg.channel}] AI reply sent (conversation: ${conversationId})`);
  } else {
    console.error(`❌ [Social/${msg.channel}] Failed to send reply: ${sendResult.error}`);
  }

  // Log to audit trail
  await admin
    .from("audit_log")
    .insert({
      agent_id: agentId,
      action: "social.ai_reply",
      details: {
        channel: msg.channel,
        sender_id: msg.senderId,
        conversation_id: conversationId,
        send_success: sendResult.success,
      },
    })
    .then(({ error }) => {
      if (error) console.log("⚠️ Could not log audit:", error.message);
    });
}

// ─── POST Handler ─────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get("platform");
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // Log webhook event
    await admin
      .from("webhook_events")
      .insert({
        provider: `social_${platform || "unknown"}`,
        event_type: body.object || body.type || "message",
        payload: body,
        received_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.log("[Social] Could not store webhook event:", error.message);
      });

    let messages: NormalizedMessage[] = [];

    switch (platform) {
      case "facebook":
      case "instagram":
        // Verify signature for Facebook/Instagram
        const fbSignature = req.headers.get("x-hub-signature-256");
        if (fbSignature) {
          // Load app secret from first connected integration
          const { data: int } = await admin
            .from("integrations")
            .select("config")
            .eq("provider", "social_channels")
            .eq("status", "connected")
            .limit(1)
            .single();

          const cfg = int?.config as SocialChannelConfig;
          const secret = platform === "instagram" ? cfg?.instagram?.app_secret : cfg?.facebook?.app_secret;

          if (secret && !verifyFacebookSignature(rawBody, fbSignature, secret)) {
            console.error(`[Social/${platform}] Invalid webhook signature`);
            return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
          }
        }
        messages = parseFacebookPayload(body);
        break;

      case "whatsapp":
        messages = parseWhatsAppPayload(body);
        break;

      case "google_business":
        messages = parseGoogleBusinessPayload(body);
        break;

      case "linkedin":
        messages = parseLinkedInPayload(body);
        break;

      default:
        console.log(`[Social] Unknown platform: ${platform}`);
        return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
    }

    // Process all parsed messages
    for (const msg of messages) {
      await handleInboundSocialMessage(msg);
    }

    return NextResponse.json({ success: true, processed: messages.length });
  } catch (error: any) {
    console.error("[Social Webhook] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}

// ─── GET Handler (Webhook Verification) ───────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const platform = url.searchParams.get("platform");

  // Facebook, Instagram, and WhatsApp use the same verification scheme
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge) {
    // Verify against stored verify_token
    const { data: int } = await admin
      .from("integrations")
      .select("config")
      .eq("provider", "social_channels")
      .eq("status", "connected")
      .limit(1)
      .single();

    const cfg = int?.config as SocialChannelConfig;
    let expectedToken: string | undefined;

    if (platform === "facebook") expectedToken = cfg?.facebook?.verify_token;
    else if (platform === "instagram") expectedToken = cfg?.facebook?.verify_token;
    else if (platform === "whatsapp") expectedToken = cfg?.whatsapp?.verify_token;

    if (token === expectedToken) {
      console.log(`[Social/${platform}] Webhook verified successfully`);
      return new Response(challenge, { status: 200 });
    }

    return NextResponse.json({ error: "Token mismatch" }, { status: 403 });
  }

  return NextResponse.json({
    service: "Real Estate Genie - Social Channel Webhook Receiver",
    status: "active",
    endpoint: "/api/webhooks/social?platform={facebook|instagram|whatsapp|google_business|linkedin}",
    methods: ["POST", "GET"],
  });
}
