/**
 * GHL Workflow Webhook Service
 * Sends data TO GHL webhooks to trigger workflows
 */

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export interface GHLWebhookPayload {
  // Event details
  event_id: string;
  property_address: string;
  flyer_url: string;
  event_start_time: string;
  event_end_time: string;

  // Contact info (for workflow to create/update contact)
  contact_id?: string; // GHL contact ID if already exists
  first_name: string;
  last_name: string;
  email: string;
  phone: string;

  // Property details
  beds?: number;
  baths?: number;
  sqft?: number;
  price?: number;

  // Lead qualification data
  representation?: string;
  timeline?: string;
  financing?: string;
  neighborhoods?: string;
  must_haves?: string;
  wants_agent_reach_out?: boolean;

  // Agent info
  agent_name: string;
  agent_email: string;
  agent_phone: string;
  agent_license?: string;
}

/**
 * Send open house registration data to GHL workflow webhook
 * This triggers GHL's native workflow automation
 */
export async function sendToGHLWorkflow(
  agentId: string,
  payload: GHLWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get GHL integration to find workflow webhook URL
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("config")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    if (!integration) {
      console.log("GHL integration not found for agent:", agentId);
      return { success: false, error: "GHL integration not found" };
    }

    const config = integration.config as any;

    // Try agent-specific webhook URL first, fall back to global
    const webhookUrl =
      config.workflow_webhook_url || process.env.GHL_WORKFLOW_WEBHOOK_URL;

    if (!webhookUrl) {
      console.log("GHL workflow webhook URL not configured");
      return {
        success: false,
        error: "GHL workflow webhook URL not configured",
      };
    }

    console.log("Sending to GHL workflow webhook:", {
      event_id: payload.event_id,
      property: payload.property_address,
      contact: `${payload.first_name} ${payload.last_name}`,
    });

    // Send to GHL webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("GHL webhook failed:", {
        status: response.status,
        error,
      });
      throw new Error(`GHL webhook failed: ${response.status} ${error}`);
    }

    const responseData = await response.json().catch(() => ({}));
    console.log("GHL workflow triggered successfully:", responseData);

    // Log to audit
    await supabaseAdmin.from("audit_log").insert({
      agent_id: agentId,
      event_id: payload.event_id,
      action: "ghl_workflow.triggered",
      details: {
        webhook_url: webhookUrl.substring(0, 50) + "...", // Don't log full URL
        contact: `${payload.first_name} ${payload.last_name}`,
        property: payload.property_address,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to send to GHL workflow:", error);

    // Log error to audit
    await supabaseAdmin.from("audit_log").insert({
      agent_id: agentId,
      event_id: payload.event_id,
      action: "ghl_workflow.error",
      details: {
        error: error.message,
        contact: `${payload.first_name} ${payload.last_name}`,
      },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Test GHL workflow webhook connection
 */
export async function testGHLWorkflowWebhook(
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const testPayload: GHLWebhookPayload = {
      event_id: "test-event-id",
      property_address: "123 Test Street, Test City, TS 12345",
      flyer_url: "https://example.com/test-flyer.pdf",
      event_start_time: new Date().toISOString(),
      event_end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),

      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
      phone: "+15555551234",

      beds: 3,
      baths: 2,
      sqft: 1500,
      price: 500000,

      representation: "test",
      timeline: "test",
      financing: "test",

      agent_name: "Test Agent",
      agent_email: "agent@example.com",
      agent_phone: "+15555555678",
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Webhook test failed: ${response.status} ${error}`);
    }

    console.log("GHL workflow webhook test successful");
    return { success: true };
  } catch (error: any) {
    console.error("GHL workflow webhook test failed:", error);
    return { success: false, error: error.message };
  }
}
