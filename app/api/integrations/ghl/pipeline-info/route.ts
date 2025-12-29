import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";

/**
 * Get pipeline information including stages
 * GET /api/integrations/ghl/pipeline-info?pipelineId=xxx
 */
export async function GET(req: NextRequest) {
  const supabase = await supabaseServer();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's agent profile
  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "Agent profile not found" }, { status: 404 });
  }

  // Get GHL config
  const ghlConfig = await getValidGHLConfig(agent.id);

  if (!ghlConfig) {
    return NextResponse.json({ error: "GHL not connected" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const pipelineId = searchParams.get("pipelineId");

  if (!pipelineId) {
    return NextResponse.json({ error: "pipelineId required" }, { status: 400 });
  }

  try {
    // Fetch pipeline details from GHL
    const response = await fetch(
      `https://services.leadconnectorhq.com/opportunities/pipelines/${pipelineId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ghlConfig.access_token}`,
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

    const pipelineData = await response.json();

    // Extract stage information
    const stages = pipelineData.stages?.map((stage: any) => ({
      id: stage.id,
      name: stage.name,
      position: stage.position,
    })) || [];

    return NextResponse.json({
      pipelineId: pipelineData.id,
      pipelineName: pipelineData.name,
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
