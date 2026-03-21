import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-check";
import { getDirectDb } from "@/lib/supabase/db";
import { TrestleClient, TrestleAuthMethod } from "@/lib/integrations/trestle-client";

/**
 * Admin: Connect or update Trestle integration for any user
 * POST /api/admin/users/[userId]/integrations/trestle
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
    const { userId } = await params;
    const body = await request.json();
    const { auth_method, username, password, client_id, client_secret, api_url, token_url } = body;

    if (!api_url) {
      return NextResponse.json({ error: "WebAPI URL is required" }, { status: 400 });
    }

    let method: TrestleAuthMethod = auth_method || "basic";
    if (username && password) method = "basic";
    else if (client_id && client_secret) method = "oauth2";
    else {
      return NextResponse.json(
        { error: "Provide either username/password or client_id/client_secret" },
        { status: 400 }
      );
    }

    // Test credentials before saving
    const client = new TrestleClient({
      method,
      username,
      password,
      clientId: client_id,
      clientSecret: client_secret,
      apiUrl: api_url,
      tokenUrl: token_url,
    });

    const testResult = await client.testConnection();
    if (!testResult.success) {
      return NextResponse.json(
        { error: testResult.message || "Connection test failed" },
        { status: 400 }
      );
    }

    const config: Record<string, any> = {
      auth_method: method,
      api_url,
      connected_at: new Date().toISOString(),
      total_listings: testResult.data?.totalListings || 0,
    };
    if (method === "basic") {
      config.username = username;
      config.password = password;
    } else {
      config.client_id = client_id;
      config.client_secret = client_secret;
      if (token_url) config.token_url = token_url;
    }

    const sql = getDirectDb();
    await sql`
      INSERT INTO integrations (agent_id, provider, config, status, last_sync_at)
      VALUES (${userId}, 'trestle', ${sql.json(config)}, 'connected', NOW())
      ON CONFLICT (agent_id, provider)
      DO UPDATE SET config = EXCLUDED.config, status = EXCLUDED.status, last_sync_at = EXCLUDED.last_sync_at
    `;

    return NextResponse.json({
      success: true,
      message: "Trestle connected successfully",
      totalListings: testResult.data?.totalListings || 0,
    });
  } catch (error: any) {
    console.error("Admin Trestle connect error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * Admin: Disconnect Trestle integration for a user
 * DELETE /api/admin/users/[userId]/integrations/trestle
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
    const { userId } = await params;

    const sql = getDirectDb();
    await sql`
      UPDATE integrations SET status = 'disconnected'
      WHERE agent_id = ${userId} AND provider = 'trestle'
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin Trestle disconnect error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
