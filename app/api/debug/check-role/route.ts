import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get agent data with role
  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, email, role, display_name, is_active")
    .eq("id", userData.user.id)
    .single();

  return NextResponse.json({
    auth_user_id: userData.user.id,
    auth_user_email: userData.user.email,
    agent_data: agent,
    error: error,
    role_is_admin: agent?.role === "admin",
    role_value: agent?.role,
    role_type: typeof agent?.role,
  });
}
