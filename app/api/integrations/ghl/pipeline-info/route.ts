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

  // Get any connected GHL integration agent
  const { data: integration, error: queryError } = await supabaseAdmin
    .from("integrations")
    .select("agent_id, provider, status")
    .eq("provider", "ghl")
    .eq("status", "connected")
    .single();

  if (queryError || !integration) {
    return NextResponse.json({
      error: "No connected GHL integration found. Please connect GHL first."
    }, { status: 400 });
  }

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
