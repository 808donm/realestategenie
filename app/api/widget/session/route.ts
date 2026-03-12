/**
 * Widget Session API
 * GET: Resume existing session (load conversation history)
 * POST: Create new session
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionToken = url.searchParams.get("token") || req.headers.get("X-Session-Token");

    if (!sessionToken) {
      return NextResponse.json({ error: "Session token required" }, { status: 400 });
    }

    // Find session
    const { data: session, error } = await admin
      .from("widget_sessions")
      .select("*, lead_conversations(*)")
      .eq("session_token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !session) {
      return NextResponse.json({ error: "Session expired or not found" }, { status: 404 });
    }

    // Get conversation messages if exists
    const conversation = session.lead_conversations;

    return NextResponse.json(
      {
        sessionId: session.id,
        conversationId: conversation?.id || null,
        messages: conversation?.messages || [],
        phase: conversation?.current_phase || null,
        expiresAt: session.expires_at,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
