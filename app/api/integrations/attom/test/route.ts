import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AttomClient } from "@/lib/integrations/attom-client";

/**
 * Test ATTOM Integration Connection
 *
 * Tests the stored API key and returns connection status.
 * Any authenticated user can check if ATTOM is available.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look for any ATTOM integration (platform-wide — could be stored under any admin)
    const { data: integration, error: fetchError } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("provider", "attom")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching ATTOM integration:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch integration" },
        { status: 500 }
      );
    }

    if (!integration) {
      // Check env var fallback
      if (process.env.ATTOM_API_KEY) {
        const client = new AttomClient({ apiKey: process.env.ATTOM_API_KEY });
        const testResult = await client.testConnection();
        return NextResponse.json({
          connected: testResult.success,
          message: testResult.message,
          source: "environment",
        });
      }

      return NextResponse.json({
        connected: false,
        message: "ATTOM integration not configured",
      });
    }

    const config =
      typeof integration.config === "string"
        ? JSON.parse(integration.config)
        : integration.config;

    if (!config.api_key) {
      return NextResponse.json({
        connected: false,
        message: "ATTOM API key not configured",
      });
    }

    // Test the connection
    const client = new AttomClient({ apiKey: config.api_key });
    const testResult = await client.testConnection();

    if (!testResult.success) {
      await supabaseAdmin
        .from("integrations")
        .update({ status: "error", last_error: testResult.message })
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
        last_error: null,
      })
      .eq("id", integration.id);

    return NextResponse.json({
      connected: true,
      message: "ATTOM connection is active",
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in ATTOM test:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
