import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Debug: Check GHL Token Scopes
 * GET /api/debug/check-my-ghl-scopes
 *
 * Checks the current user's GHL integration scopes
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get GHL integration
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    if (!integration?.config?.ghl_access_token) {
      return NextResponse.json({ error: "No GHL integration found" }, { status: 404 });
    }

    // Decode the JWT token to check scopes
    const token = integration.config.ghl_access_token;
    const parts = token.split('.');

    if (parts.length !== 3) {
      return NextResponse.json({ error: "Invalid JWT format" }, { status: 400 });
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    return NextResponse.json({
      success: true,
      scopes: payload.oauthMeta?.scopes || [],
      scopeCount: payload.oauthMeta?.scopes?.length || 0,
      hasInvoicesRead: payload.oauthMeta?.scopes?.includes('invoices.readonly') || false,
      hasInvoicesWrite: payload.oauthMeta?.scopes?.includes('invoices.write') || false,
      locationId: integration.config.ghl_location_id,
      userId: payload.oauthMeta?.userId,
      companyId: payload.oauthMeta?.companyId,
      allScopes: payload.oauthMeta?.scopes || []
    });
  } catch (error) {
    console.error("Error checking scopes:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
