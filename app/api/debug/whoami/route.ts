import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Diagnostic endpoint to show current logged-in user and their GHL integration
 * GET /api/debug/whoami
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();

    // Get current authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        error: "Not authenticated",
        recommendation: "Log in at /signin",
      }, { status: 401 });
    }

    // Get agent details
    const { data: agent } = await admin
      .from("agents")
      .select("id, email, display_name, created_at")
      .eq("id", user.id)
      .single();

    // Get GHL integration for this user
    const { data: integration } = await admin
      .from("integrations")
      .select("id, status, created_at, updated_at, config")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    const config = integration?.config as any;

    // Get all agents in system (to show which one is "first")
    const { data: allAgents } = await admin
      .from("agents")
      .select("id, email")
      .order("created_at", { ascending: true })
      .limit(5);

    const firstAgentId = allAgents?.[0]?.id;
    const isFirstAgent = user.id === firstAgentId;

    return NextResponse.json({
      success: true,
      currentUser: {
        id: user.id,
        email: user.email,
        agentEmail: agent?.email,
        displayName: agent?.display_name,
        createdAt: agent?.created_at,
      },
      ghlIntegration: integration ? {
        id: integration.id,
        status: integration.status,
        locationId: config?.ghl_location_id,
        createdAt: integration.created_at,
        updatedAt: integration.updated_at,
        hasAccessToken: !!config?.ghl_access_token,
        scopeCount: "Check JWT to see actual scopes",
      } : null,
      systemInfo: {
        isFirstAgent: isFirstAgent,
        firstAgentId: firstAgentId,
        totalAgents: allAgents?.length || 0,
        note: isFirstAgent
          ? "✅ You are the first agent - diagnostic endpoints will show YOUR data by default"
          : "⚠️ You are NOT the first agent - diagnostic endpoints show a different agent's data by default. Use ?agentId=" + user.id + " parameter."
      },
      allAgents: allAgents?.map(a => ({
        id: a.id,
        email: a.email,
        isYou: a.id === user.id,
        isFirst: a.id === firstAgentId,
      })),
      recommendations: integration
        ? [
            config?.ghl_location_id === "gTZBuJqALTmKjETniBEN"
              ? "✅ You have the correct location ID (sub-account)"
              : "❌ Wrong location ID - reconnect OAuth while logged into sub-account",
            integration.created_at?.includes("2026-01-06")
              ? "✅ Integration created today - this is the new one!"
              : "⚠️ Old integration - consider reconnecting",
          ]
        : ["❌ No GHL integration found - connect at /app/integrations"],
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
