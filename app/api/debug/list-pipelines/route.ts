import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Fetch available pipelines and stages from GHL
 * GET /api/debug/list-pipelines?agentId=xxx
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let agentId = searchParams.get('agentId');

    if (!agentId) {
      const { data: agent } = await admin
        .from("agents")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (agent) agentId = agent.id;
    }

    if (!agentId) {
      return NextResponse.json({ error: "No agent found" }, { status: 400 });
    }

    // Get integration
    const { data: integration } = await admin
      .from("integrations")
      .select("*")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .single();

    if (!integration) {
      return NextResponse.json({ error: "No GHL integration" }, { status: 404 });
    }

    const config = integration.config as any;
    const accessToken = config.ghl_access_token || config.access_token;
    const locationId = config.ghl_location_id || config.location_id;

    // Fetch pipelines
    console.log('[Pipelines] Fetching pipelines for location:', locationId);
    const pipelinesResponse = await fetch(
      `https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${locationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (!pipelinesResponse.ok) {
      const errorText = await pipelinesResponse.text();
      return NextResponse.json({
        error: "Failed to fetch pipelines",
        status: pipelinesResponse.status,
        details: errorText,
      }, { status: pipelinesResponse.status });
    }

    const pipelinesData = await pipelinesResponse.json();

    // Format for easy selection
    const formattedPipelines = pipelinesData.pipelines?.map((pipeline: any) => ({
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      stages: pipeline.stages?.map((stage: any) => ({
        stageId: stage.id,
        stageName: stage.name,
        position: stage.position,
      })) || [],
    })) || [];

    return NextResponse.json({
      success: true,
      locationId,
      currentConfig: {
        pipelineId: config.ghl_pipeline_id || null,
        newLeadStage: config.ghl_new_lead_stage || null,
      },
      pipelines: formattedPipelines,
      instructions: {
        step1: "Choose a pipeline from the list below",
        step2: "Choose the stage where new leads should start (typically 'New Lead' or 'Prospect')",
        step3: "Use the Update Pipeline Config endpoint to save these IDs",
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
