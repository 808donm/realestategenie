import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { testGHLWorkflowWebhook } from "@/lib/integrations/ghl-webhook";

/**
 * Save GHL workflow webhook URL
 * POST /api/integrations/ghl/webhook-url
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { webhookUrl, test } = await request.json();

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Webhook URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(webhookUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook URL format" },
        { status: 400 }
      );
    }

    // Test webhook if requested
    if (test) {
      console.log("Testing GHL workflow webhook:", webhookUrl);
      const testResult = await testGHLWorkflowWebhook(webhookUrl);

      if (!testResult.success) {
        return NextResponse.json(
          {
            error: "Webhook test failed",
            details: testResult.error,
          },
          { status: 400 }
        );
      }
    }

    // Get existing GHL integration
    const { data: integration, error: fetchError } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: "GHL integration not found. Please connect GHL first." },
        { status: 404 }
      );
    }

    // Update config with webhook URL
    const updatedConfig = {
      ...integration.config,
      workflow_webhook_url: webhookUrl,
    };

    const { error: updateError } = await supabase
      .from("integrations")
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    if (updateError) {
      console.error("Failed to update webhook URL:", updateError);
      return NextResponse.json(
        { error: "Failed to save webhook URL" },
        { status: 500 }
      );
    }

    // Log to audit
    await supabase.from("audit_log").insert({
      agent_id: user.id,
      action: "integration.webhook_url_updated",
      details: {
        provider: "ghl",
        webhook_url: webhookUrl.substring(0, 50) + "...",
      },
    });

    return NextResponse.json({
      success: true,
      message: test
        ? "Webhook URL saved and tested successfully"
        : "Webhook URL saved successfully",
    });
  } catch (error: any) {
    console.error("Save webhook URL error:", error);
    return NextResponse.json(
      { error: "Failed to save webhook URL", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get GHL workflow webhook URL
 * GET /api/integrations/ghl/webhook-url
 */
export async function GET(request: NextRequest) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get GHL integration
    const { data: integration, error } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    if (error || !integration) {
      return NextResponse.json({ webhookUrl: null });
    }

    const config = integration.config as any;
    return NextResponse.json({
      webhookUrl: config.workflow_webhook_url || null,
    });
  } catch (error: any) {
    console.error("Get webhook URL error:", error);
    return NextResponse.json(
      { error: "Failed to get webhook URL" },
      { status: 500 }
    );
  }
}
