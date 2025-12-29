import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  // Get any connected GHL integration (using service role for simplicity)
  const { data: integration, error } = await supabaseAdmin
    .from("integrations")
    .select("access_token, location_id")
    .eq("provider", "ghl")
    .eq("status", "connected")
    .single();

  if (error || !integration) {
    return NextResponse.json({
      error: "No GHL integration found. Please connect GHL first."
    }, { status: 400 });
  }

  try {
    // Fetch pipeline details from GHL
    const response = await fetch(
      `https://services.leadconnectorhq.com/opportunities/pipelines/${pipelineId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
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
