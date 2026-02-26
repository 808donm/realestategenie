import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getDirectDb } from "@/lib/supabase/db";
import { AttomClient } from "@/lib/integrations/attom-client";

/**
 * Connect ATTOM Data Integration (Platform-wide)
 *
 * Admin-only: stores the API key for the entire platform.
 * All agents benefit from ATTOM data once connected.
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
        { error: "Only platform admins can configure ATTOM" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { api_key } = body;

    if (!api_key?.trim()) {
      return NextResponse.json(
        { error: "API Key is required" },
        { status: 400 }
      );
    }

    // Test the credentials
    const client = new AttomClient({ apiKey: api_key.trim() });
    const testResult = await client.testConnection();

    if (!testResult.success) {
      return NextResponse.json(
        { error: testResult.message || "Invalid API key or connection failed" },
        { status: 400 }
      );
    }

    // Store as platform-level integration (agent_id = admin who configured it)
    const config = {
      api_key: api_key.trim(),
      connected_at: new Date().toISOString(),
      configured_by: userData.user.id,
    };

    try {
      const sql = getDirectDb();
      await sql`
        INSERT INTO integrations (agent_id, provider, config, status, last_sync_at)
        VALUES (${userData.user.id}, 'attom', ${sql.json(config)}, 'connected', NOW())
        ON CONFLICT (agent_id, provider)
        DO UPDATE SET
          config = EXCLUDED.config,
          status = EXCLUDED.status,
          last_sync_at = EXCLUDED.last_sync_at
      `;
    } catch (dbError: any) {
      console.error("Error saving ATTOM integration:", dbError);
      return NextResponse.json(
        { error: "Failed to save integration: " + (dbError.message || "Database error") },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "ATTOM Data API connected successfully",
    });
  } catch (error) {
    console.error("Error in ATTOM connect:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
