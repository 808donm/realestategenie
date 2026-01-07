import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Update Lease Status
 *
 * PATCH /api/pm/leases/:id/status
 * Body: { status: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const validStatuses = [
      "draft",
      "pending-signature",
      "pending_start",
      "active",
      "month_to_month",
      "terminating",
      "ended",
      "terminated",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify lease belongs to this agent
    const { data: lease, error: fetchError } = await supabase
      .from("pm_leases")
      .select("id, pm_property_id, pm_unit_id")
      .eq("id", id)
      .eq("agent_id", user.id)
      .single();

    if (fetchError || !lease) {
      return NextResponse.json(
        { error: "Lease not found" },
        { status: 404 }
      );
    }

    // Update lease status
    const { error: updateError } = await supabase
      .from("pm_leases")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating lease status:", updateError);
      return NextResponse.json(
        { error: "Failed to update lease status" },
        { status: 500 }
      );
    }

    // If changing to "active", mark property/unit as rented
    if (status === "active") {
      if (lease.pm_unit_id) {
        await supabase
          .from("pm_units")
          .update({ status: "rented" })
          .eq("id", lease.pm_unit_id);
      } else if (lease.pm_property_id) {
        await supabase
          .from("pm_properties")
          .update({ status: "rented" })
          .eq("id", lease.pm_property_id);
      }
    }

    // If changing to "ended" or "terminated", mark property/unit as available
    if (status === "ended" || status === "terminated") {
      if (lease.pm_unit_id) {
        await supabase
          .from("pm_units")
          .update({ status: "available" })
          .eq("id", lease.pm_unit_id);
      } else if (lease.pm_property_id) {
        await supabase
          .from("pm_properties")
          .update({ status: "available" })
          .eq("id", lease.pm_property_id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Lease status updated to ${status}`,
    });
  } catch (error) {
    console.error("Error in lease status update route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
