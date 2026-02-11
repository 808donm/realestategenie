import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Rate Completed Work Order
 *
 * POST /api/tenant/work-orders/[id]/rate
 * Body: { rating: number (1-5), feedback?: string }
 */
export async function POST(
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

    const { rating, feedback } = await request.json();

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Get work order
    const { data: workOrder } = await supabase
      .from("pm_work_orders")
      .select("*, pm_leases(id)")
      .eq("id", id)
      .single();

    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }

    // Verify tenant owns this work order
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("lease_id")
      .eq("id", userData.user.id)
      .single();

    if (!tenantUser || tenantUser.lease_id !== workOrder.lease_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if work order is completed
    if (workOrder.status !== "completed") {
      return NextResponse.json(
        { error: "Can only rate completed work orders" },
        { status: 400 }
      );
    }

    // Check if already rated
    if (workOrder.tenant_rating) {
      return NextResponse.json(
        { error: "Work order already rated" },
        { status: 400 }
      );
    }

    // Update work order with rating
    const { error: updateError } = await supabase
      .from("pm_work_orders")
      .update({
        tenant_rating: rating,
        tenant_feedback: feedback || null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating work order rating:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Rating submitted successfully",
    });
  } catch (error) {
    console.error("Error in work order rating:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
