import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";

const WEBHOOK_EVENTS = ["InboundMessage", "OutboundMessage"];

/**
 * Register GHL webhooks for pipeline advancement and AI SMS assistant.
 *
 * POST /api/integrations/ghl/register-webhooks
 *
 * Registers InboundMessage and OutboundMessage webhook subscriptions
 * pointing to /api/webhooks/ghl on this app.
 *
 * GET /api/integrations/ghl/register-webhooks
 *
 * Lists currently registered webhooks for this location.
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
    // Get GHL integration
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({ error: "CRM not connected. Please connect your CRM first." }, { status: 404 });
    }

    const config = integration.config as any;
    const accessToken = config.ghl_access_token;
    const locationId = config.ghl_location_id;

    if (!accessToken || !locationId) {
      return NextResponse.json({ error: "CRM integration is missing access token or location ID." }, { status: 400 });
    }

    const client = new GHLClient(accessToken, locationId);

    // Determine the webhook URL for this deployment
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;

    if (!appUrl) {
      return NextResponse.json(
        {
          error: "Cannot determine app URL. Set NEXT_PUBLIC_APP_URL in environment variables.",
        },
        { status: 500 },
      );
    }

    const webhookUrl = `${appUrl}/api/webhooks/ghl`;

    // Check existing webhooks to avoid duplicates
    let existingWebhooks: any[] = [];
    try {
      const result = await client.listWebhooks(locationId);
      existingWebhooks = result.webhooks || [];
    } catch (err: any) {
      console.log("Could not list existing webhooks:", err.message);
    }

    // Find any existing webhook pointing to our URL
    const existingMatch = existingWebhooks.find((wh: any) => wh.url === webhookUrl);

    if (existingMatch) {
      // Check if it already has all the events we need
      const existingEvents: string[] = existingMatch.events || [];
      const missingEvents = WEBHOOK_EVENTS.filter((e) => !existingEvents.includes(e));

      if (missingEvents.length === 0) {
        return NextResponse.json({
          success: true,
          message: "Webhooks already registered",
          webhookId: existingMatch.id,
          url: webhookUrl,
          events: existingMatch.events,
          status: "already_exists",
        });
      }

      // Delete the old one and recreate with all events
      try {
        await client.deleteWebhook(existingMatch.id);
      } catch (err: any) {
        console.log("Could not delete existing webhook:", err.message);
      }
    }

    // Register the webhook
    const result = await client.createWebhook(locationId, webhookUrl, WEBHOOK_EVENTS);

    // Store the webhook ID in integration config for future management
    await supabase
      .from("integrations")
      .update({
        config: {
          ...config,
          ghl_webhook_id: result.id || result.webhookId,
          ghl_webhook_url: webhookUrl,
          ghl_webhook_events: WEBHOOK_EVENTS,
        },
      })
      .eq("id", integration.id);

    return NextResponse.json({
      success: true,
      message: "Webhooks registered successfully",
      webhookId: result.id || result.webhookId,
      url: webhookUrl,
      events: WEBHOOK_EVENTS,
      status: "created",
    });
  } catch (error: any) {
    console.error("Webhook registration error:", error);
    return NextResponse.json({ error: error.message || "Failed to register webhooks" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: integration } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    if (!integration) {
      return NextResponse.json({ error: "CRM not connected" }, { status: 404 });
    }

    const config = integration.config as any;
    const client = new GHLClient(config.ghl_access_token, config.ghl_location_id);

    const result = await client.listWebhooks(config.ghl_location_id);

    return NextResponse.json({
      webhooks: result.webhooks || [],
      registeredWebhookId: config.ghl_webhook_id || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to list webhooks" }, { status: 500 });
  }
}
