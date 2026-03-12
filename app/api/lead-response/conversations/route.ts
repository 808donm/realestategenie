/**
 * Lead Conversations API
 * GET: List active AI conversations for an agent
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
    const phase = url.searchParams.get("phase");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    let query = admin
      .from("lead_conversations")
      .select("*")
      .eq("agent_id", agentId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (phase) {
      query = query.eq("current_phase", phase);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      conversations: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
