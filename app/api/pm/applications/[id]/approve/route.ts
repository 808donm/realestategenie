import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, reason } = body;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (action === "approve") {
      updateData.approved_date = new Date().toISOString();
      updateData.credit_check_result = "approved";
    }

    if (action === "reject" && reason) {
      updateData.application_data = {
        ...updateData.application_data,
        rejection_reason: reason,
      };
    }

    // Update application
    const { data, error } = await supabase
      .from("pm_applications")
      .update(updateData)
      .eq("id", params.id)
      .eq("agent_id", userData.user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating application:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Sync to GHL - update contact tags based on approval/rejection
    // Tag approved: "rental-application-approved"
    // Tag rejected: "rental-application-rejected"

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in approve route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
