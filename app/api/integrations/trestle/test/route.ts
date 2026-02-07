import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
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

    // Get the integration
    const { data: integration, error: fetchError } = await supabase
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

    if (integration.status !== "connected" || !integration.config?.client_id) {
      return NextResponse.json({
        connected: false,
        message: "Trestle credentials not configured",
      });
    }

    // Test the connection
    const client = createTrestleClient(integration.config);
    const testResult = await client.testConnection();

    if (!testResult.success) {
      // Update integration status to error
      await supabase
        .from("integrations")
        .update({
          status: "error",
          last_error: testResult.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      return NextResponse.json({
        connected: false,
        message: testResult.message,
      });
    }

    // Update last sync time
    await supabase
      .from("integrations")
      .update({
        status: "connected",
        last_sync_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
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
