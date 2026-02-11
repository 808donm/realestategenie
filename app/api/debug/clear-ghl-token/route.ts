import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Diagnostic endpoint to clear GHL integration and force re-authorization
 * Call with: POST /api/debug/clear-ghl-token
 * Body: { "agentId": "YOUR_AGENT_ID" }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const agentId = body.agentId;

    if (!agentId) {
      return NextResponse.json({
        error: "Missing agentId in request body"
      }, { status: 400 });
    }

    // Fetch current integration
    const { data: integration, error: fetchError } = await admin
      .from("integrations")
      .select("*")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .single();

    if (fetchError || !integration) {
      return NextResponse.json({
        message: "No GHL integration found - nothing to clear",
        agentId,
      });
    }

    const config = integration.config as any;

    // Delete the integration record completely
    const { error: deleteError } = await admin
      .from("integrations")
      .delete()
      .eq("id", integration.id);

    if (deleteError) {
      return NextResponse.json({
        error: "Failed to delete integration",
        details: deleteError.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "GHL integration cleared successfully",
      deletedIntegration: {
        id: integration.id,
        agentId: agentId,
        provider: "ghl",
        tokenExpiry: config?.ghl_expires_at,
        locationId: config?.ghl_location_id,
      },
      nextSteps: [
        "1. Go to /app/integrations in your browser",
        "2. Click 'Connect GoHighLevel' button",
        "3. Complete OAuth authorization (you should see the new scopes being requested)",
        "4. Verify the new token has associations scope",
        "5. Test by registering for an open house",
      ],
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check current integration status
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({
        error: "Missing agentId parameter"
      }, { status: 400 });
    }

    // Fetch current integration
    const { data: integration, error: fetchError } = await admin
      .from("integrations")
      .select("*")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .single();

    if (fetchError || !integration) {
      return NextResponse.json({
        connected: false,
        message: "No GHL integration found",
        agentId,
      });
    }

    const config = integration.config as any;

    return NextResponse.json({
      connected: true,
      integration: {
        id: integration.id,
        status: integration.status,
        createdAt: integration.created_at,
        updatedAt: integration.updated_at,
      },
      token: {
        expiresAt: config?.ghl_expires_at,
        isExpired: new Date(config?.ghl_expires_at) < new Date(),
        expiresIn: config?.ghl_expires_in,
      },
      config: {
        locationId: config?.ghl_location_id,
        hasPipeline: !!config?.ghl_pipeline_id,
        pipelineId: config?.ghl_pipeline_id,
      },
      recommendation: "If you added new scopes to your OAuth app, use POST /api/debug/clear-ghl-token to force re-authorization with new scopes",
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
