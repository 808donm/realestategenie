import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAllSkipTraceUsage } from "@/lib/billing/skip-trace-billing";

export async function GET(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check global admin
  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("admin_level, is_admin")
    .eq("id", user.id)
    .single();

  const level = agent?.admin_level || (agent?.is_admin ? "global" : "none");
  if (level !== "global") return NextResponse.json({ error: "Global admin required" }, { status: 403 });

  const month = request.nextUrl.searchParams.get("month") || undefined;
  const usage = await getAllSkipTraceUsage(month);

  return NextResponse.json({ usage });
}
