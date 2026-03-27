import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-check";
import { getDirectDb } from "@/lib/supabase/db";
import { createTrestleClient } from "@/lib/integrations/trestle-client";

/**
 * Admin: Test the stored Trestle integration for a specific user
 * POST /api/admin/users/[userId]/integrations/trestle/test
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await requireAdmin();
    const { userId } = await params;

    const sql = getDirectDb();
    const rows = await sql<{ config: any }[]>`
      SELECT config FROM integrations
      WHERE agent_id = ${userId} AND provider = 'trestle' AND status = 'connected'
      LIMIT 1
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "No connected Trestle integration found for this user" }, { status: 404 });
    }

    const config = rows[0].config;
    const client = createTrestleClient(config);
    const result = await client.testConnection();

    return NextResponse.json({
      success: result.success,
      message: result.message,
      storedConfig: {
        api_url: config.api_url,
        auth_method: config.auth_method,
        client_id: config.client_id,
        username: config.username,
        connected_at: config.connected_at,
        total_listings: config.total_listings,
      },
      data: result.data,
    });
  } catch (error: any) {
    console.error("Admin Trestle test error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
