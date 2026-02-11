import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";
import { GHLClient } from "@/lib/integrations/ghl-client";

/**
 * Get pipeline breakdown with stages and opportunities
 * GET /api/ghl/pipeline-breakdown?pipelineId=yGkdoIRAz83GmWQ74HOw
 *
 * Defaults to the Real Estate Pipeline (ID: yGkdoIRAz83GmWQ74HOw)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    // Use the specific Real Estate Pipeline ID
    const pipelineId = searchParams.get("pipelineId") || "yGkdoIRAz83GmWQ74HOw";

    // Get GHL integration for this agent
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({
        error: "No connected GHL integration found for this agent",
        details: integrationError?.message
      }, { status: 404 });
    }

    // Get valid GHL config (with token refresh if needed)
    const ghlConfig = await getValidGHLConfig(user.id);

    if (!ghlConfig) {
      return NextResponse.json({
        error: "Unable to get valid GHL credentials. Please reconnect GHL."
      }, { status: 400 });
    }

    const client = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

    // Fetch all pipelines to get the pipeline details
    const { pipelines } = await client.getPipelines(ghlConfig.location_id);

    // Find the specified pipeline by ID
    const pipeline = pipelines.find(p => p.id === pipelineId);

    if (!pipeline) {
      return NextResponse.json({
        error: `Pipeline with ID "${pipelineId}" not found`,
        availablePipelines: pipelines.map(p => ({ id: p.id, name: p.name }))
      }, { status: 404 });
    }

    // Sort stages by position
    const sortedStages = [...pipeline.stages].sort((a, b) => a.position - b.position);

    console.log('[Pipeline Breakdown] ========================================');
    console.log('[Pipeline Breakdown] Fetching opportunities for pipeline:', pipeline.name);
    console.log('[Pipeline Breakdown] Pipeline ID:', pipeline.id);
    console.log('[Pipeline Breakdown] Number of stages:', sortedStages.length);
    console.log('[Pipeline Breakdown] Stages:', sortedStages.map(s => `${s.name} (${s.id})`));
    console.log('[Pipeline Breakdown] ========================================');

    // Fetch opportunities for each stage
    const stagesWithOpportunities = await Promise.all(
      sortedStages.map(async (stage) => {
        try {
          console.log(`[Pipeline Breakdown] Fetching opportunities for stage: ${stage.name} (${stage.id})`);

          const { opportunities } = await client.searchOpportunities({
            locationId: ghlConfig.location_id,
            pipelineId: pipeline.id,
            pipelineStageId: stage.id,
            status: "open", // Only show open opportunities
            limit: 100, // Limit to 100 opportunities per stage
          });

          console.log(`[Pipeline Breakdown] Stage "${stage.name}" returned ${opportunities?.length || 0} opportunities`);

          // Extract relevant opportunity data
          const formattedOpportunities = opportunities.map((opp: any) => ({
            id: opp.id,
            name: opp.name,
            monetaryValue: opp.monetaryValue || 0,
            contactId: opp.contactId,
            contactName: opp.contact?.name || opp.contact?.firstName + ' ' + opp.contact?.lastName || 'Unknown',
            status: opp.status,
            createdAt: opp.createdAt,
          }));

          return {
            stageId: stage.id,
            stageName: stage.name,
            position: stage.position,
            opportunityCount: formattedOpportunities.length,
            totalValue: formattedOpportunities.reduce((sum: number, opp: any) => sum + (opp.monetaryValue || 0), 0),
            opportunities: formattedOpportunities,
          };
        } catch (error: any) {
          console.error(`Error fetching opportunities for stage ${stage.name}:`, error);
          return {
            stageId: stage.id,
            stageName: stage.name,
            position: stage.position,
            opportunityCount: 0,
            totalValue: 0,
            opportunities: [],
            error: error.message,
          };
        }
      })
    );

    return NextResponse.json({
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      stages: stagesWithOpportunities,
      totalOpportunities: stagesWithOpportunities.reduce((sum, stage) => sum + stage.opportunityCount, 0),
      totalValue: stagesWithOpportunities.reduce((sum, stage) => sum + stage.totalValue, 0),
    });

  } catch (error: any) {
    console.error("Error fetching pipeline breakdown:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
