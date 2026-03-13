/**
 * Social Channels Client
 *
 * Unified interface for sending messages back to leads across
 * Facebook Messenger, Instagram DMs, LinkedIn Messaging,
 * Google Business Messages, and WhatsApp.
 *
 * Each platform requires its own API credentials configured in the
 * agent's `social_channels` integration record.
 */

import { createClient } from "@supabase/supabase-js";
import type { MessageChannel } from "@/lib/ai/channel-assistant";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ─── Types ────────────────────────────────────────────────────

export interface SocialChannelConfig {
  facebook?: {
    page_id: string;
    page_access_token: string;
    app_secret: string;
    verify_token: string;
    enabled: boolean;
  };
  instagram?: {
    page_id: string;
    page_access_token: string;
    app_secret: string;
    enabled: boolean;
  };
  linkedin?: {
    organization_id: string;
    access_token: string;
    enabled: boolean;
  };
  google_business?: {
    agent_id: string; // GBM agent ID
    service_account_key: string; // JSON key as string
    enabled: boolean;
  };
  whatsapp?: {
    phone_number_id: string;
    access_token: string;
    verify_token: string;
    waba_id: string; // WhatsApp Business Account ID
    enabled: boolean;
  };
}

export interface SendMessageParams {
  channel: MessageChannel;
  recipientId: string; // Platform-specific user/sender ID
  message: string;
  config: SocialChannelConfig;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Platform Senders ─────────────────────────────────────────

/**
 * Facebook Messenger — Send via Graph API
 * https://developers.facebook.com/docs/messenger-platform/send-messages
 */
async function sendFacebookMessage(
  recipientId: string,
  message: string,
  config: NonNullable<SocialChannelConfig["facebook"]>
): Promise<SendMessageResult> {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${config.page_id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.page_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        messaging_type: "RESPONSE",
        message: { text: message },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return { success: false, error: `Facebook API error: ${err}` };
  }

  const data = await response.json();
  return { success: true, messageId: data.message_id };
}

/**
 * Instagram DM — Send via Instagram Messaging API (Graph API)
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging
 */
async function sendInstagramMessage(
  recipientId: string,
  message: string,
  config: NonNullable<SocialChannelConfig["instagram"]>
): Promise<SendMessageResult> {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${config.page_id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.page_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        messaging_type: "RESPONSE",
        message: { text: message },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return { success: false, error: `Instagram API error: ${err}` };
  }

  const data = await response.json();
  return { success: true, messageId: data.message_id };
}

/**
 * LinkedIn — Send via LinkedIn Marketing/Messaging API
 * Uses the organization messaging endpoint for page-to-user DMs.
 */
async function sendLinkedInMessage(
  recipientId: string,
  message: string,
  config: NonNullable<SocialChannelConfig["linkedin"]>
): Promise<SendMessageResult> {
  // LinkedIn Messaging API for organization pages
  const response = await fetch(
    "https://api.linkedin.com/v2/messages",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        recipients: [recipientId],
        body: message,
        messageType: "MEMBER_TO_MEMBER",
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return { success: false, error: `LinkedIn API error: ${err}` };
  }

  const messageId = response.headers.get("x-restli-id") || undefined;
  return { success: true, messageId };
}

/**
 * Google Business Messages — Send via Business Messages API
 * https://developers.google.com/business-communications/business-messages/reference/rest
 */
async function sendGoogleBusinessMessage(
  conversationId: string,
  message: string,
  config: NonNullable<SocialChannelConfig["google_business"]>
): Promise<SendMessageResult> {
  // Google Business Messages requires a service account JWT
  // For now we use the access token approach; production should use google-auth-library
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const response = await fetch(
    `https://businessmessages.googleapis.com/v1/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.service_account_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messageId,
        representative: {
          representativeType: "BOT",
        },
        text: message,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return { success: false, error: `Google Business Messages API error: ${err}` };
  }

  return { success: true, messageId };
}

/**
 * WhatsApp — Send via WhatsApp Cloud API (Meta)
 * https://developers.facebook.com/docs/whatsapp/cloud-api/messages/text-messages
 */
async function sendWhatsAppMessage(
  recipientPhone: string,
  message: string,
  config: NonNullable<SocialChannelConfig["whatsapp"]>
): Promise<SendMessageResult> {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${config.phone_number_id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "text",
        text: { body: message },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return { success: false, error: `WhatsApp API error: ${err}` };
  }

  const data = await response.json();
  const msgId = data.messages?.[0]?.id;
  return { success: true, messageId: msgId };
}

// ─── Unified Sender ───────────────────────────────────────────

/**
 * Send a message to a lead on any supported social channel.
 */
export async function sendChannelMessage(
  params: SendMessageParams
): Promise<SendMessageResult> {
  const { channel, recipientId, message, config } = params;

  switch (channel) {
    case "facebook": {
      if (!config.facebook?.enabled) {
        return { success: false, error: "Facebook Messenger not configured" };
      }
      return sendFacebookMessage(recipientId, message, config.facebook);
    }
    case "instagram": {
      if (!config.instagram?.enabled) {
        return { success: false, error: "Instagram DM not configured" };
      }
      return sendInstagramMessage(recipientId, message, config.instagram);
    }
    case "linkedin": {
      if (!config.linkedin?.enabled) {
        return { success: false, error: "LinkedIn messaging not configured" };
      }
      return sendLinkedInMessage(recipientId, message, config.linkedin);
    }
    case "google_business": {
      if (!config.google_business?.enabled) {
        return { success: false, error: "Google Business Messages not configured" };
      }
      return sendGoogleBusinessMessage(
        recipientId,
        message,
        config.google_business
      );
    }
    case "whatsapp": {
      if (!config.whatsapp?.enabled) {
        return { success: false, error: "WhatsApp not configured" };
      }
      return sendWhatsAppMessage(recipientId, message, config.whatsapp);
    }
    case "sms":
      return { success: false, error: "SMS uses GHL — route through ghl-service" };
    default:
      return { success: false, error: `Unsupported channel: ${channel}` };
  }
}

// ─── Config Helpers ───────────────────────────────────────────

/**
 * Load social channel config for an agent.
 */
export async function getSocialChannelConfig(
  agentId: string
): Promise<SocialChannelConfig | null> {
  const { data } = await admin
    .from("integrations")
    .select("config")
    .eq("agent_id", agentId)
    .eq("provider", "social_channels")
    .eq("status", "connected")
    .single();

  return (data?.config as SocialChannelConfig) || null;
}

/**
 * Check which channels are enabled for an agent.
 */
export async function getEnabledChannels(
  agentId: string
): Promise<MessageChannel[]> {
  const config = await getSocialChannelConfig(agentId);
  if (!config) return [];

  const channels: MessageChannel[] = [];
  if (config.facebook?.enabled) channels.push("facebook");
  if (config.instagram?.enabled) channels.push("instagram");
  if (config.linkedin?.enabled) channels.push("linkedin");
  if (config.google_business?.enabled) channels.push("google_business");
  if (config.whatsapp?.enabled) channels.push("whatsapp");
  return channels;
}

/**
 * Verify a webhook signature from Facebook/Instagram/WhatsApp.
 * All three use the same HMAC-SHA256 scheme with the app secret.
 */
export function verifyFacebookSignature(
  payload: string,
  signature: string,
  appSecret: string
): boolean {
  const crypto = require("crypto");
  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(payload).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
