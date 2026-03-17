import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { getValidGHLConfig, resolveGHLAgentId } from "@/lib/integrations/ghl-token-refresh";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

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
    // Resolve agent ID (falls back to team owner if needed)
    const ghlAgentId = await resolveGHLAgentId(user.id);

    // Get valid GHL config (uses admin client to bypass RLS for team members)
    const ghlConfig = await getValidGHLConfig(ghlAgentId);

    if (!ghlConfig) {
      return NextResponse.json(
        { error: "GHL not connected" },
        { status: 404 }
      );
    }

    const client = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

    // Test by fetching pipelines for the connected location
    const pipelines = await client.getPipelines(ghlConfig.location_id);

    // Update integration status using admin client (bypasses RLS)
    try {
      await supabaseAdmin
        .from("integrations")
        .update({
          status: "connected",
          last_error: null,
          last_sync_at: new Date().toISOString(),
        })
        .eq("agent_id", ghlAgentId)
        .eq("provider", "ghl");
    } catch {
      // Non-critical - just log
    }

    return NextResponse.json({
      success: true,
      locationId: ghlConfig.location_id,
      pipelines: pipelines.pipelines?.length || 0,
      message: "GHL connection successful",
    });
  } catch (error: any) {
    console.error("GHL test error:", error);

    return NextResponse.json(
      { error: error.message || "GHL test failed" },
      { status: 500 }
    );
  }
}
