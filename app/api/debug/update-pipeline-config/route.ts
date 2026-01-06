import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Update pipeline configuration in GHL integration
 * POST /api/debug/update-pipeline-config
 * Body: { agentId, pipelineId, newLeadStageId }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agentId, pipelineId, newLeadStageId } = body;

    if (!agentId || !pipelineId || !newLeadStageId) {
      return NextResponse.json({
        error: "Missing required fields",
        required: ["agentId", "pipelineId", "newLeadStageId"],
      }, { status: 400 });
    }

    // Get integration
    const { data: integration, error: fetchError } = await admin
      .from("integrations")
      .select("*")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .single();

    if (fetchError || !integration) {
      return NextResponse.json({
        error: "No GHL integration found",
        details: fetchError?.message,
      }, { status: 404 });
    }

    const config = integration.config as any;

    // Update config with pipeline settings
    const updatedConfig = {
      ...config,
      ghl_pipeline_id: pipelineId,
      ghl_new_lead_stage: newLeadStageId,
    };

    // Save to database
    const { error: updateError } = await admin
      .from("integrations")
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    if (updateError) {
      return NextResponse.json({
        error: "Failed to update config",
        details: updateError.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Pipeline configuration updated successfully",
      config: {
        pipelineId,
        newLeadStageId,
      },
      nextSteps: [
        "✅ Pipeline configuration saved",
        "🎯 New registrations will now create Opportunities in your pipeline",
        "📊 Opportunities will start in the configured 'New Lead' stage",
        "🔥 Heat tags (Hot Lead, Warm Lead, Cold Lead) will be applied based on registration behavior",
      ],
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
