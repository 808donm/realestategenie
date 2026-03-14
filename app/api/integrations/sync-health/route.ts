import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** GET /api/integrations/sync-health — sync status for all calendar/CRM integrations */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: integrations } = await supabase
      .from("integrations")
      .select("provider, status, last_sync_at, last_error")
      .eq("agent_id", user.id)
      .in("provider", ["google_calendar", "microsoft_calendar", "ghl"]);

    return NextResponse.json({ integrations: integrations || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
