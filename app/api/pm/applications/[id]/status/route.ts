import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Application Status Update API
 *
 * PATCH: Update application status (approve/reject)
 */

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Verify application belongs to this agent
    const { data: application, error: fetchError } = await supabase
      .from("pm_applications")
      .select("id, agent_id, status")
      .eq("id", id)
      .eq("agent_id", user.id)
      .single();

    if (fetchError || !application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Update the application status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // If approving, record approval timestamp
    if (status === "approved") {
      updateData.approved_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from("pm_applications")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating application:", updateError);
      return NextResponse.json(
        { error: "Failed to update application" },
        { status: 500 }
      );
    }

    console.log(`✅ Application ${id} status updated to: ${status}`);

    return NextResponse.json({
      success: true,
      application: updated,
    });
  } catch (error) {
    console.error("Error in application status update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
