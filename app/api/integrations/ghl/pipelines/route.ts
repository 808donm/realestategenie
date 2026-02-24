import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";

/**
 * Fetch available GHL pipelines and their stages for the current user
 * GET /api/integrations/ghl/pipelines
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ghlConfig = await getValidGHLConfig(user.id);

    if (!ghlConfig) {
      return NextResponse.json(
        { error: "GHL integration not found or credentials invalid. Please reconnect GHL." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${ghlConfig.location_id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ghlConfig.access_token}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GHL Pipelines] API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch pipelines from GHL" },
        { status: response.status }
      );
    }

    const data = await response.json();

    const pipelines = (data.pipelines || []).map((pipeline: any) => ({
      id: pipeline.id,
      name: pipeline.name,
      stages: (pipeline.stages || []).map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        position: stage.position,
      })),
    }));

    return NextResponse.json({
      success: true,
      pipelines,
      currentConfig: {
        pipelineId: ghlConfig.ghl_pipeline_id || null,
        newLeadStage: ghlConfig.ghl_new_lead_stage || null,
      },
    });
  } catch (error: any) {
    console.error("[GHL Pipelines] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
