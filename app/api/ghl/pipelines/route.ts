import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";
import { GHLClient } from "@/lib/integrations/ghl-client";

/**
 * Get all available pipelines for the current user
 * GET /api/ghl/pipelines
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        details: integrationError?.message,
        pipelines: []
      }, { status: 404 });
    }

    // Get valid GHL config (with token refresh if needed)
    const ghlConfig = await getValidGHLConfig(user.id);

    if (!ghlConfig) {
      return NextResponse.json({
        error: "Unable to get valid GHL credentials. Please reconnect GHL.",
        pipelines: []
      }, { status: 400 });
    }

    const client = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

    // Fetch all pipelines
    const { pipelines } = await client.getPipelines(ghlConfig.location_id);

    // Return simplified pipeline list
    return NextResponse.json({
      pipelines: pipelines.map(p => ({
        id: p.id,
        name: p.name
      }))
    });

  } catch (error: any) {
    console.error("Error fetching pipelines:", error);
    return NextResponse.json(
      { error: error.message, pipelines: [] },
      { status: 500 }
    );
  }
}
