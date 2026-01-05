/**
 * Webhook Event Dispatcher for n8n and other webhook integrations
 * Sends events to configured webhook URLs with retry logic
 */

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type WebhookEventType =
  | "lead.submitted"
  | "lead.hot_scored"
  | "open_house.published"
  | "open_house.ended"
  | "consent.captured"
  | "integration.connected";

export type WebhookPayload = {
  event: WebhookEventType;
  timestamp: string;
  data: any;
};

/**
 * Dispatch webhook event to n8n or other configured endpoints
 */
export async function dispatchWebhook(
  agentId: string,
  event: WebhookEventType,
  data: any
): Promise<void> {
  try {
    // Fetch n8n integration
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("agent_id", agentId)
      .eq("provider", "n8n")
      .single();

    if (!integration || integration.status !== "connected") {
      // No n8n integration configured, skip
      return;
    }

    const config = integration.config as any;
    const webhookUrl = config.webhook_url;

    if (!webhookUrl) {
      return;
    }

    // Check if this event type is enabled
    const enabledEvents = config.enabled_events || [];
    if (!enabledEvents.includes(event)) {
      // Event type not enabled, skip
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Send webhook with retry logic
    const result = await sendWebhookWithRetry(webhookUrl, payload, config.secret_key);

    // Log to webhook_logs table
    await supabaseAdmin.from("webhook_logs").insert({
      agent_id: agentId,
      event_type: event,
      payload,
      webhook_url: webhookUrl,
      status_code: result.statusCode,
      response_body: result.responseBody,
      error: result.error,
      attempts: result.attempts,
      delivered_at: result.success ? new Date().toISOString() : null,
    });

    if (result.success) {
      // Update last_sync_at
      await supabaseAdmin
        .from("integrations")
        .update({
          last_sync_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", integration.id);
    } else {
      // Update error status
      await supabaseAdmin
        .from("integrations")
        .update({
          status: "error",
          last_error: result.error || "Webhook delivery failed",
        })
        .eq("id", integration.id);
    }
  } catch (error: any) {
    console.error("Webhook dispatch error:", error);
  }
}

/**
 * Send webhook with exponential backoff retry (3 attempts)
 */
async function sendWebhookWithRetry(
  url: string,
  payload: WebhookPayload,
  secretKey?: string
): Promise<{
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  attempts: number;
}> {
  const maxAttempts = 3;
  const delays = [1000, 5000, 15000]; // 1s, 5s, 15s

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "RealEstateGenie-Webhook/1.0",
      };

      // Add signature if secret key is provided
      if (secretKey) {
        const signature = await generateSignature(JSON.stringify(payload), secretKey);
        headers["X-Webhook-Signature"] = signature;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const responseBody = await response.text();

      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          responseBody: responseBody.slice(0, 500), // Limit response size
          attempts: attempt,
        };
      }

      // Non-2xx response
      if (attempt === maxAttempts) {
        return {
          success: false,
          statusCode: response.status,
          responseBody: responseBody.slice(0, 500),
          error: `HTTP ${response.status}: ${response.statusText}`,
          attempts: attempt,
        };
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1]));
    } catch (error: any) {
      if (attempt === maxAttempts) {
        return {
          success: false,
          error: error.message || "Network error",
          attempts: attempt,
        };
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1]));
    }
  }

  return {
    success: false,
    error: "Max retries exceeded",
    attempts: maxAttempts,
  };
}

/**
 * Generate HMAC-SHA256 signature for webhook verification
 */
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
