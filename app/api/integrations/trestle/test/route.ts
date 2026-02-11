import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createTrestleClient } from "@/lib/integrations/trestle-client";

/**
 * Test Trestle Integration Connection
 *
 * Tests the stored credentials and returns connection status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the integration using admin client
    const { data: integration, error: fetchError } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("agent_id", userData.user.id)
      .eq("provider", "trestle")
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching Trestle integration:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch integration" },
        { status: 500 }
      );
    }

    if (!integration) {
      return NextResponse.json({
        connected: false,
        message: "Trestle integration not configured",
      });
    }

    // Ensure config is parsed as an object (direct SQL may store it as a JSON string)
    const config =
      typeof integration.config === "string"
        ? JSON.parse(integration.config)
        : integration.config;

    if (integration.status !== "connected" || !config.api_url) {
      return NextResponse.json({
        connected: false,
        message: "Trestle credentials not configured",
      });
    }

    // Test the connection
    const client = createTrestleClient(config);
    const testResult = await client.testConnection();

    if (!testResult.success) {
      // Update integration status to error
      await supabaseAdmin
        .from("integrations")
        .update({
          status: "error",
        })
        .eq("id", integration.id);

      return NextResponse.json({
        connected: false,
        message: testResult.message,
      });
    }

    // Update last sync time
    await supabaseAdmin
      .from("integrations")
      .update({
        status: "connected",
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    return NextResponse.json({
      connected: true,
      message: "Trestle connection is active",
      totalListings: testResult.data?.totalListings || 0,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in Trestle test:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
