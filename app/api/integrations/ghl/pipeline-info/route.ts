import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Get pipeline information including stages
 * GET /api/integrations/ghl/pipeline-info?pipelineId=xxx
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pipelineId = searchParams.get("pipelineId");

  if (!pipelineId) {
    return NextResponse.json({ error: "pipelineId required" }, { status: 400 });
  }

  // Get any GHL integration
  const { data: integrations, error: queryError } = await supabaseAdmin
    .from("integrations")
    .select("agent_id, provider, status")
    .eq("provider", "ghl");

  console.log('[Pipeline Info] Integrations found:', integrations);

  if (queryError) {
    return NextResponse.json({
      error: `Database error: ${queryError.message}`
    }, { status: 500 });
  }

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({
      error: "No GHL integration found. Please connect GHL in the Integrations page first."
    }, { status: 400 });
  }

  // Use first integration (prefer connected status)
  const integration = integrations.find(i => i.status === 'connected') || integrations[0];

  console.log('[Pipeline Info] Using integration:', integration);

  // Use token refresh function to get valid (possibly refreshed) token
  const ghlConfig = await getValidGHLConfig(integration.agent_id);

  if (!ghlConfig) {
    return NextResponse.json({
      error: "Unable to get valid GHL credentials. Please reconnect GHL."
    }, { status: 400 });
  }

  const accessToken = ghlConfig.access_token;
  const locationId = ghlConfig.location_id;

  try {
    // Fetch all pipelines for the location
    const response = await fetch(
      `https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${locationId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `GHL API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const pipelines = data.pipelines || [];

    // Find the specific pipeline
    const pipeline = pipelines.find((p: any) => p.id === pipelineId);

    if (!pipeline) {
      return NextResponse.json({
        error: `Pipeline ${pipelineId} not found`,
        availablePipelines: pipelines.map((p: any) => ({
          id: p.id,
          name: p.name
        }))
      }, { status: 404 });
    }

    // Extract stage information
    const stages = pipeline.stages?.map((stage: any) => ({
      id: stage.id,
      name: stage.name,
      position: stage.position,
    })) || [];

    return NextResponse.json({
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      stages: stages,
      message: "Copy the stage IDs below and use them to update your integration",
    });
  } catch (error: any) {
    console.error("Error fetching pipeline info:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
