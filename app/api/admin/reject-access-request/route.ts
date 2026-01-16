import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logError } from "@/lib/error-logging";

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Check if user is authenticated and is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: agent } = await supabase
      .from("agents")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (!agent || agent.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { requestId, adminNotes } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    // Get the access request
    const { data: accessRequest, error: fetchError } = await admin
      .from("access_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !accessRequest) {
      return NextResponse.json(
        { error: "Access request not found" },
        { status: 404 }
      );
    }

    if (accessRequest.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 400 }
      );
    }

    // Update access request
    await admin
      .from("access_requests")
      .update({
        status: "rejected",
        admin_notes: adminNotes || null,
        reviewed_by: agent.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    // TODO: Send email to user notifying rejection (optional)

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Error rejecting access request:", error);
    await logError({
      endpoint: "/api/admin/reject-access-request",
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
