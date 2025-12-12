import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";

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
    // Get GHL integration
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: "GHL not connected" },
        { status: 404 }
      );
    }

    const config = integration.config as any;
    const client = new GHLClient(config.access_token);

    // Test by fetching pipelines for the connected location
    // This works with location-scoped tokens (unlike getLocations which needs agency token)
    const pipelines = await client.getPipelines(config.location_id);

    // Update integration status (skip last_sync_at if column doesn't exist)
    const updateData: any = {
      status: "connected",
      last_error: null,
    };

    // Try to update last_sync_at if the column exists
    try {
      await supabase
        .from("integrations")
        .update({
          ...updateData,
          last_sync_at: new Date().toISOString(),
        })
        .eq("id", integration.id);
    } catch {
      // Fall back to update without last_sync_at
      await supabase
        .from("integrations")
        .update(updateData)
        .eq("id", integration.id);
    }

    return NextResponse.json({
      success: true,
      locationId: config.location_id,
      pipelines: pipelines.pipelines?.length || 0,
      message: "GHL connection successful",
    });
  } catch (error: any) {
    console.error("GHL test error:", error);

    // Update error status (handle missing last_error column gracefully)
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
      // If last_error column doesn't exist, just update status
      await supabase
        .from("integrations")
        .update({ status: "error" })
        .eq("agent_id", user.id)
        .eq("provider", "ghl");
    }

    return NextResponse.json(
      { error: error.message || "GHL test failed" },
      { status: 500 }
    );
  }
}
