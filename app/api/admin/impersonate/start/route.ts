import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { startImpersonation } from "@/lib/auth/impersonation";

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status using service role (bypasses RLS)
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    const { data: agent } = await admin.from("agents").select("is_admin, account_status").eq("id", user.id).single();

    if (!agent?.is_admin || agent.account_status !== "active") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Verify the target user exists
    const { data: targetAgent } = await admin
      .from("agents")
      .select("id, display_name, email")
      .eq("id", userId)
      .single();

    if (!targetAgent) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    await startImpersonation(user.id, userId);

    return NextResponse.json({
      success: true,
      impersonating: {
        userId: targetAgent.id,
        displayName: targetAgent.display_name,
        email: targetAgent.email,
      },
    });
  } catch (error: any) {
    console.error("Impersonation start error:", error);
    return NextResponse.json({ error: "Failed to start impersonation" }, { status: 500 });
  }
}
