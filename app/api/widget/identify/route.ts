/**
 * Widget Identify API
 * GET: Returns agent config for the chat widget (public endpoint)
 * Creates a session token for the visitor
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    // Fetch agent info
    const { data: agent, error } = await admin
      .from("agents")
      .select("id, display_name, agency_name, company_logo_url")
      .eq("id", agentId)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Fetch greeting template
    const { data: settings } = await admin
      .from("lead_response_settings")
      .select("greeting_template, auto_response_enabled")
      .eq("agent_id", agentId)
      .single();

    // Generate session token
    const sessionToken = crypto.randomUUID();

    // Create widget session
    await admin.from("widget_sessions").insert({
      agent_id: agentId,
      session_token: sessionToken,
      visitor_metadata: {},
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    // CORS headers for cross-origin widget embedding
    return NextResponse.json(
      {
        agentName: agent.display_name,
        brokerageName: agent.agency_name || null,
        logoUrl: agent.company_logo_url || null,
        greeting:
          settings?.greeting_template ||
          `Hi! I'm the AI assistant for ${agent.display_name}. How can I help you today?`,
        sessionToken,
        enabled: settings?.auto_response_enabled ?? true,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
