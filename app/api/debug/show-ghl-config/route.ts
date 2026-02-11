import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Diagnostic endpoint to show exactly what's stored in the GHL integration config
 * GET /api/debug/show-ghl-config?agentId=xxx
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let agentId = searchParams.get('agentId');

    if (!agentId) {
      // Try to get first agent
      const { data: agent } = await admin
        .from("agents")
        .select("id, email")
        .limit(1)
        .single();

      if (agent) {
        agentId = agent.id;
      }
    }

    if (!agentId) {
      return NextResponse.json({
        error: "No agent found. Provide agentId parameter."
      }, { status: 400 });
    }

    // Fetch integration
    const { data: integration, error } = await admin
      .from("integrations")
      .select("*")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .single();

    if (error || !integration) {
      return NextResponse.json({
        error: "No GHL integration found",
        details: error?.message,
        recommendation: "Reconnect GHL at /app/integrations"
      }, { status: 404 });
    }

    const config = integration.config as any;

    // Mask sensitive tokens for security
    const maskedConfig = {
      ...config,
      ghl_access_token: config.ghl_access_token ? `${config.ghl_access_token.substring(0, 10)}...` : undefined,
      ghl_refresh_token: config.ghl_refresh_token ? `${config.ghl_refresh_token.substring(0, 10)}...` : undefined,
    };

    return NextResponse.json({
      success: true,
      agentId,
      integration: {
        id: integration.id,
        status: integration.status,
        created_at: integration.created_at,
        updated_at: integration.updated_at,
      },
      config: maskedConfig,
      configKeys: Object.keys(config),
      validation: {
        hasAccessToken: !!config.ghl_access_token,
        hasRefreshToken: !!config.ghl_refresh_token,
        hasExpiresAt: !!config.ghl_expires_at,
        hasLocationId: !!config.ghl_location_id,
        hasPipelineId: !!config.ghl_pipeline_id,
        hasNewLeadStage: !!config.ghl_new_lead_stage,
      },
      diagnosis: {
        tokenValid: config.ghl_access_token && config.ghl_refresh_token && config.ghl_expires_at,
        expiresAt: config.ghl_expires_at,
        isExpired: config.ghl_expires_at ? new Date(config.ghl_expires_at) < new Date() : null,
        missingFields: [
          !config.ghl_access_token && 'ghl_access_token',
          !config.ghl_refresh_token && 'ghl_refresh_token',
          !config.ghl_expires_at && 'ghl_expires_at',
          !config.ghl_location_id && 'ghl_location_id',
        ].filter(Boolean),
      },
      recommendation: (!config.ghl_access_token || !config.ghl_refresh_token || !config.ghl_expires_at)
        ? "Token data is incomplete. Try reconnecting GHL at /app/integrations"
        : "Token data looks good. If scopes are still failing, check GHL marketplace app settings.",
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
