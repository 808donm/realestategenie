import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";

/**
 * Test n8n webhook by sending a test event
 * POST /api/integrations/n8n/test
 */
export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get n8n integration
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", user.id)
      .eq("provider", "n8n")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: "n8n not configured" },
        { status: 404 }
      );
    }

    const config = integration.config as any;
    const webhookUrl = config.webhook_url;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Webhook URL not configured" },
        { status: 400 }
      );
    }

    // Send test webhook directly
    const testPayload = {
      event: "test.webhook" as any,
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook from Real Estate Genie",
        agent_id: user.id,
        test: true,
      },
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "RealEstateGenie-Webhook/1.0",
    };

    // Add signature if secret key is provided
    if (config.secret_key) {
      const signature = await generateSignature(
        JSON.stringify(testPayload),
        config.secret_key
      );
      headers["X-Webhook-Signature"] = signature;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(30000),
    });

    const responseBody = await response.text();

    // Log to webhook_logs
    await supabase.from("webhook_logs").insert({
      agent_id: user.id,
      event_type: "test.webhook",
      payload: testPayload,
      webhook_url: webhookUrl,
      status_code: response.status,
      response_body: responseBody.slice(0, 500),
      error: response.ok ? null : `HTTP ${response.status}`,
      attempts: 1,
      delivered_at: response.ok ? new Date().toISOString() : null,
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        status_code: response.status,
        message: "Test webhook sent successfully",
      });
    } else {
      return NextResponse.json(
        {
          error: `Webhook returned ${response.status}`,
          status_code: response.status,
          response_body: responseBody.slice(0, 200),
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("n8n test error:", error);
    return NextResponse.json(
      { error: error.message || "Test failed" },
      { status: 500 }
    );
  }
}

/**
 * Generate HMAC-SHA256 signature
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
