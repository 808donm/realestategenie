import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getDirectDb } from "@/lib/supabase/db";
import { FederalDataClient } from "@/lib/integrations/federal-data-client";

/**
 * Connect Federal Data Integration (Platform-wide)
 *
 * Admin-only: stores optional API keys for USPS, Census, BLS.
 * Most federal sources (HUD, FEMA, EPA, CFPB) are free with no key.
 * All agents benefit from federal data once connected.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is platform admin
    const { data: agent } = await supabase
      .from("agents")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (agent?.role !== "admin") {
      return NextResponse.json(
        { error: "Only platform admins can configure Federal Data" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      usps_client_id,
      usps_client_secret,
      census_api_key,
      bls_api_key,
    } = body;

    // Test the connections
    const client = new FederalDataClient({
      uspsClientId: usps_client_id?.trim() || undefined,
      uspsClientSecret: usps_client_secret?.trim() || undefined,
      censusApiKey: census_api_key?.trim() || undefined,
      blsApiKey: bls_api_key?.trim() || undefined,
    });

    const testResult = await client.testConnection();

    if (!testResult.success) {
      return NextResponse.json(
        { error: "No federal data sources could be reached" },
        { status: 400 }
      );
    }

    // Store as platform-level integration
    const config = {
      usps_client_id: usps_client_id?.trim() || null,
      usps_client_secret: usps_client_secret?.trim() || null,
      census_api_key: census_api_key?.trim() || null,
      bls_api_key: bls_api_key?.trim() || null,
      connected_at: new Date().toISOString(),
      configured_by: userData.user.id,
      sources: testResult.sources,
    };

    try {
      const sql = getDirectDb();
      await sql`
        INSERT INTO integrations (agent_id, provider, config, status, last_sync_at)
        VALUES (${userData.user.id}, 'federal_data', ${sql.json(config)}, 'connected', NOW())
        ON CONFLICT (agent_id, provider)
        DO UPDATE SET
          config = EXCLUDED.config,
          status = EXCLUDED.status,
          last_sync_at = EXCLUDED.last_sync_at
      `;
    } catch (dbError: any) {
      console.error("Error saving Federal Data integration:", dbError);
      return NextResponse.json(
        { error: "Failed to save integration: " + (dbError.message || "Database error") },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: testResult.message,
      sources: testResult.sources,
    });
  } catch (error) {
    console.error("Error in Federal Data connect:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
