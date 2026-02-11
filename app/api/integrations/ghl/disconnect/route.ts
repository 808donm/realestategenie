import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Disconnect GHL integration
 * POST /api/integrations/ghl/disconnect
 */
export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete integration record
    const { error } = await supabase
      .from("integrations")
      .delete()
      .eq("agent_id", user.id)
      .eq("provider", "ghl");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log to audit log
    await supabase.from("audit_log").insert({
      agent_id: user.id,
      action: "integration.disconnected",
      details: { provider: "ghl" },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
