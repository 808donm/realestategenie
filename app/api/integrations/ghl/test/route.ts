import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";

/**
 * Test GHL connection by fetching locations
 * POST /api/integrations/ghl/test
 */
export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get agent's own GHL config (with token refresh if needed)
    const ghlConfig = await getValidGHLConfig(user.id);

    if (!ghlConfig) {
      return NextResponse.json(
        { error: "GHL not connected. Please connect your own GHL account in Integrations." },
        { status: 404 },
      );
    }

    const client = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

    // Test by fetching pipelines for the connected location
    const pipelines = await client.getPipelines(ghlConfig.location_id);

    // Update integration status
    try {
      await supabase
        .from("integrations")
        .update({
          status: "connected",
          last_error: null,
          last_sync_at: new Date().toISOString(),
        })
        .eq("agent_id", user.id)
        .eq("provider", "ghl");
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      locationId: ghlConfig.location_id,
      pipelines: pipelines.pipelines?.length || 0,
      message: "GHL connection successful",
    });
  } catch (error: any) {
    console.error("GHL test error:", error);

    // Update error status
    try {
      await supabase
        .from("integrations")
        .update({
          status: "error",
          last_error: error.message,
        })
        .eq("agent_id", user.id)
        .eq("provider", "ghl");
    } catch {
      // Non-critical
    }

    return NextResponse.json({ error: error.message || "GHL test failed" }, { status: 500 });
  }
}
