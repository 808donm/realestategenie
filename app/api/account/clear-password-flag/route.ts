import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from("agents")
    .update({ must_change_password: false })
    .eq("id", data.user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to clear flag" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
