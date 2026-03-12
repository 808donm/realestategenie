/**
 * Lead Response Settings API
 * GET: Fetch agent's auto-response settings
 * PUT: Update agent's auto-response settings
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

    const { data, error } = await admin
      .from("lead_response_settings")
      .select("*")
      .eq("agent_id", agentId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    // Return defaults if no settings exist
    return NextResponse.json({
      settings: data || {
        agent_id: agentId,
        auto_response_enabled: true,
        response_mode: "autonomous",
        escalation_threshold: 80,
        greeting_template: null,
        business_hours_only: false,
        max_ai_messages: 10,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { agentId, ...updates } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const allowedFields = [
      "auto_response_enabled",
      "response_mode",
      "escalation_threshold",
      "greeting_template",
      "business_hours_only",
      "max_ai_messages",
    ];

    const filtered: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        filtered[key] = updates[key];
      }
    }

    const { data, error } = await admin
      .from("lead_response_settings")
      .upsert(
        {
          agent_id: agentId,
          ...filtered,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "agent_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ settings: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
