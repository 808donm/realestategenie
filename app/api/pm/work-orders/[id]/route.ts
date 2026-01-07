import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * PM Work Order Update API
 * PATCH: Update work order status, priority, and notes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, priority, notes } = body;

    // Verify the work order belongs to this agent
    const { data: workOrder } = await supabase
      .from("pm_work_orders")
      .select("id")
      .eq("id", id)
      .eq("agent_id", userData.user.id)
      .single();

    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      updateData.status = status;

      // Set completed_at when status changes to completed
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
    }

    if (priority !== undefined) {
      updateData.priority = priority;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update the work order
    const { data: updatedWorkOrder, error: updateError } = await supabase
      .from("pm_work_orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating work order:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      work_order: updatedWorkOrder,
    });
  } catch (error) {
    console.error("Error in work order PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
