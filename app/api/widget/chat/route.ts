/**
 * Widget Chat API — Streaming chat endpoint for the embeddable widget
 * POST: Send a message and receive a streaming AI response
 *
 * Public endpoint — authenticated via session token, not cookies
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { handleWidgetMessageStreaming, handleInboundLeadMessage } from "@/lib/lead-response/engine";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, sessionToken } = body;

    if (!message || !sessionToken) {
      return NextResponse.json(
        { error: "message and sessionToken required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Validate session
    const { data: session, error: sessionError } = await admin
      .from("widget_sessions")
      .select("*")
      .eq("session_token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Rate limiting: max 30 messages per hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    if (
      session.hour_window_start &&
      session.hour_window_start > hourAgo &&
      session.messages_this_hour >= 30
    ) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    // Reset rate limit window if needed
    const updates: Record<string, any> = {
      last_message_at: new Date().toISOString(),
    };

    if (!session.hour_window_start || session.hour_window_start <= hourAgo) {
      updates.messages_this_hour = 1;
      updates.hour_window_start = new Date().toISOString();
    } else {
      updates.messages_this_hour = (session.messages_this_hour || 0) + 1;
    }

    await admin
      .from("widget_sessions")
      .update(updates)
      .eq("id", session.id);

    // Check if streaming is requested (default: yes)
    const wantsStream = req.headers.get("Accept")?.includes("text/event-stream") !== false;

    if (wantsStream) {
      // Streaming response
      const result = await handleWidgetMessageStreaming({
        agentId: session.agent_id,
        message,
        source: "widget",
        widgetSessionId: session.session_token,
      });

      if (!result) {
        return NextResponse.json(
          { error: "Auto-response not available" },
          { status: 503, headers: CORS_HEADERS }
        );
      }

      // Link session to conversation if not already linked
      if (!session.conversation_id) {
        await admin
          .from("widget_sessions")
          .update({ conversation_id: result.conversationId })
          .eq("id", session.id);
      }

      // Return streaming response
      const response = result.streamResult.toTextStreamResponse();

      // Add CORS headers to the streaming response
      const headers = new Headers(response.headers);
      headers.set("Access-Control-Allow-Origin", "*");

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    } else {
      // Non-streaming fallback
      const result = await handleInboundLeadMessage({
        agentId: session.agent_id,
        message,
        source: "widget",
        widgetSessionId: session.session_token,
      });

      if (!session.conversation_id && result.conversationId) {
        await admin
          .from("widget_sessions")
          .update({ conversation_id: result.conversationId })
          .eq("id", session.id);
      }

      return NextResponse.json(
        {
          response: result.response,
          conversationId: result.conversationId,
          phase: result.phase,
          heatScore: result.heatScore,
        },
        { headers: CORS_HEADERS }
      );
    }
  } catch (error: any) {
    console.error("[Widget Chat] Error:", error.message);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
