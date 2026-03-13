import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSalesChatResponse } from "@/lib/ai/sales-chat";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const ALLOWED_ORIGINS = [
  "https://huliausoftware.com",
  "https://www.huliausoftware.com",
  "https://www.realestategenie.app",
  "https://realestategenie.app",
  "http://localhost:3000",
];

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/**
 * Handle CORS preflight requests.
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

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
  const corsHeaders = getCorsHeaders(req);

  try {
    const { sessionId, message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Limit message length
    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message too long" },
        { status: 400, headers: corsHeaders }
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

    return NextResponse.json(
      { reply, sessionId: newSessionId },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Sales chat API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}
