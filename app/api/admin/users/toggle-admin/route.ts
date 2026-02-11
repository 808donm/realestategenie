import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { logError } from "@/lib/error-logging";

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Check admin authorization
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: admin } = await supabase
      .from("agents")
      .select("is_admin, account_status")
      .eq("id", user.id)
      .single();

    if (!admin?.is_admin || admin.account_status !== "active") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, isAdmin } = await request.json();

    if (!userId || typeof isAdmin !== "boolean") {
      return NextResponse.json(
        { error: "Missing userId or isAdmin" },
        { status: 400 }
      );
    }

    // Prevent admins from removing their own admin status
    if (userId === user.id && !isAdmin) {
      return NextResponse.json(
        { error: "You cannot remove your own admin status" },
        { status: 400 }
      );
    }

    // Update admin status
    const { error: updateError } = await supabase
      .from("agents")
      .update({ is_admin: isAdmin })
      .eq("id", userId);

    if (updateError) {
      await logError({
        agentId: user.id,
        endpoint: "/api/admin/users/toggle-admin",
        errorMessage: updateError.message,
        severity: "error",
      });
      return NextResponse.json(
        { error: "Failed to update admin status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await logError({
      endpoint: "/api/admin/users/toggle-admin",
      errorMessage: error.message,
      stackTrace: error.stack,
      severity: "error",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
