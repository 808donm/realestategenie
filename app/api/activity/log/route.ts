import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/activity/log
 *
 * Logs an agent action for agency-level reporting.
 * Lightweight fire-and-forget endpoint -- callers should not await the response.
 *
 * Body: { action: string, details?: object }
 *
 * Valid actions:
 *   login, mls_search, property_viewed, report_generated, report_downloaded,
 *   cma_generated, lead_contacted, open_house_created, lead_captured
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, details } = body;

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // Insert activity log entry -- ignore errors (non-critical, fire-and-forget)
    await supabase.from("agent_activity_log").insert({
      agent_id: user.id,
      action,
      details: details || {},
    });

    return NextResponse.json({ success: true });
  } catch {
    // Silently fail -- activity logging should never break the user's workflow
    return NextResponse.json({ success: true });
  }
}
