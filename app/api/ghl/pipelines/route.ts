import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getValidGHLConfig, resolveGHLAgentId } from "@/lib/integrations/ghl-token-refresh";
import { GHLClient } from "@/lib/integrations/ghl-client";

/**
 * Get all available pipelines for the current user
 * GET /api/ghl/pipelines
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve the correct agent ID (falls back to team owner if needed)
    const ghlAgentId = await resolveGHLAgentId(user.id);

    // Get valid GHL config (with token refresh if needed)
    const ghlConfig = await getValidGHLConfig(ghlAgentId);

    if (!ghlConfig) {
      return NextResponse.json(
        {
          error: "Unable to get valid GHL credentials. Please reconnect GHL.",
          pipelines: [],
        },
        { status: 400 },
      );
    }

    const client = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

    // Fetch all pipelines
    const { pipelines } = await client.getPipelines(ghlConfig.location_id);

    // Return simplified pipeline list
    return NextResponse.json({
      pipelines: pipelines.map((p) => ({
        id: p.id,
        name: p.name,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching pipelines:", error);
    return NextResponse.json({ error: error.message, pipelines: [] }, { status: 500 });
  }
}
