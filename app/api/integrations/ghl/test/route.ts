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

    // Test by fetching locations
    const locations = await client.getLocations();

    // Update last_sync_at
    await supabase
      .from("integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        status: "connected",
        last_error: null,
      })
      .eq("id", integration.id);

    return NextResponse.json({
      success: true,
      locations: locations.locations,
      message: "GHL connection successful",
    });
  } catch (error: any) {
    console.error("GHL test error:", error);

    // Update error status
    await supabase
      .from("integrations")
      .update({
        status: "error",
        last_error: error.message,
      })
      .eq("agent_id", user.id)
      .eq("provider", "ghl");

    return NextResponse.json(
      { error: error.message || "GHL test failed" },
      { status: 500 }
    );
  }
}
