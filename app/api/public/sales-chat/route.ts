import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSalesChatResponse } from "@/lib/ai/sales-chat";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Public sales chat endpoint for the Real Estate Genie marketing site.
 * No authentication required.
 *
 * POST /api/public/sales-chat
 *
 * Body:
 *   sessionId?: string  — Resume an existing chat session
 *   message: string     — The visitor's message
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // Limit message length
    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message too long" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";

    const { reply, sessionId: newSessionId } =
      await generateSalesChatResponse({
        sessionId,
        message: message.trim(),
      });

    // Update visitor IP on session
    if (newSessionId) {
      await admin
        .from("sales_chat_sessions")
        .update({ visitor_ip: ip })
        .eq("id", newSessionId)
        .is("visitor_ip", null);
    }

    return NextResponse.json({
      reply,
      sessionId: newSessionId,
    });
  } catch (error: any) {
    console.error("Sales chat API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
