import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RealieClient } from "@/lib/integrations/realie-client";

/**
 * Test Realie.ai Integration Connection
 *
 * Tests the stored API key and returns connection status.
 * Any authenticated user can check if Realie is available.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look for any Realie integration (platform-wide)
    const { data: integration, error: fetchError } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("provider", "realie")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching Realie integration:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch integration" },
        { status: 500 }
      );
    }

    if (!integration) {
      // Check env var fallback
      if (process.env.REALIE_API_KEY) {
        const client = new RealieClient({ apiKey: process.env.REALIE_API_KEY });
        const testResult = await client.testConnection();
        return NextResponse.json({
          connected: testResult.success,
          message: testResult.message,
          source: "environment",
        });
      }

      return NextResponse.json({
        connected: false,
        message: "Realie.ai integration not configured",
      });
    }

    const config =
      typeof integration.config === "string"
        ? JSON.parse(integration.config)
        : integration.config;

    if (!config.api_key) {
      return NextResponse.json({
        connected: false,
        message: "Realie.ai API key not configured",
      });
    }

    // Test the connection
    const client = new RealieClient({ apiKey: config.api_key });
    const testResult = await client.testConnection();

    if (!testResult.success) {
      // If the service is just temporarily down (network/deployment issue),
      // keep the status as "connected" so getRealieClient() still finds it
      // and can retry when the service comes back. Only mark as "error" for
      // actual auth/key problems.
      if (testResult.serviceDown) {
        return NextResponse.json({
          connected: true,
          serviceDown: true,
          message: testResult.message,
        });
      }

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
      message: "Realie.ai connection is active",
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in Realie test:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
