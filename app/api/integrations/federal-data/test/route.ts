import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { FederalDataClient } from "@/lib/integrations/federal-data-client";

/**
 * Test Federal Data Integration Connection
 *
 * Tests connectivity to all federal data sources.
 * Any authenticated user can check if federal data is available.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look for any Federal Data integration (platform-wide)
    const { data: integration, error: fetchError } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("provider", "federal_data")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching Federal Data integration:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch integration" },
        { status: 500 }
      );
    }

    let clientConfig: any = {};

    if (integration?.config) {
      const config =
        typeof integration.config === "string"
          ? JSON.parse(integration.config)
          : integration.config;

      clientConfig = {
        uspsClientId: config.usps_client_id,
        uspsClientSecret: config.usps_client_secret,
        hudToken: config.hud_api_token,
        censusApiKey: config.census_api_key,
        blsApiKey: config.bls_api_key,
      };
    }

    // Also check env vars as fallback
    const client = new FederalDataClient({
      uspsClientId: clientConfig.uspsClientId || process.env.USPS_CLIENT_ID,
      uspsClientSecret: clientConfig.uspsClientSecret || process.env.USPS_CLIENT_SECRET,
      hudToken: clientConfig.hudToken || process.env.HUD_API_TOKEN,
      censusApiKey: clientConfig.censusApiKey || process.env.CENSUS_API_KEY,
      blsApiKey: clientConfig.blsApiKey || process.env.BLS_API_KEY,
    });

    const testResult = await client.testConnection();

    if (integration) {
      // Update last sync time and status
      await supabaseAdmin
        .from("integrations")
        .update({
          status: testResult.success ? "connected" : "error",
          last_sync_at: new Date().toISOString(),
          last_error: testResult.success ? null : testResult.message,
        })
        .eq("id", integration.id);
    }

    return NextResponse.json({
      connected: testResult.success,
      message: testResult.message,
      sources: testResult.sources,
      source: integration ? "database" : "environment",
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in Federal Data test:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
