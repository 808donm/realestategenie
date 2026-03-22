import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/genie/log
 *
 * Log non-send Genie actions (draft viewed, link clicked, dismissed).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    await supabase.from("genie_action_log").insert({
      agent_id: user.id,
      lead_id: body.leadId || null,
      action_type: body.actionType || "unknown",
      action_detail: body.actionDetail || {},
      status: body.status || "draft_only",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Genie Log] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
