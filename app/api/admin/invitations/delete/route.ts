import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@/lib/error-logging";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

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

    const { data: adminUser } = await supabase
      .from("agents")
      .select("is_admin, account_status")
      .eq("id", user.id)
      .single();

    if (!adminUser?.is_admin || adminUser.account_status !== "active") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { invitationId } = await request.json();

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    // Delete the invitation
    const { error: deleteError } = await admin
      .from("user_invitations")
      .delete()
      .eq("id", invitationId);

    if (deleteError) {
      await logError({
        agentId: user.id,
        endpoint: "/api/admin/invitations/delete",
        errorMessage: deleteError.message,
        severity: "error",
      });
      return NextResponse.json(
        { error: "Failed to delete invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await logError({
      endpoint: "/api/admin/invitations/delete",
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
