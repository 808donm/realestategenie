import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Update Property Status
 *
 * PATCH /api/pm/properties/:id/status
 * Body: { status: "available" | "rented" | "maintenance" | "unavailable" }
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

    const validStatuses = ["available", "rented", "maintenance", "unavailable"];
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

    // Verify property belongs to this agent
    const { data: property, error: fetchError } = await supabase
      .from("pm_properties")
      .select("id")
      .eq("id", id)
      .eq("agent_id", user.id)
      .single();

    if (fetchError || !property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Update property status
    const { error: updateError } = await supabase
      .from("pm_properties")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating property status:", updateError);
      return NextResponse.json(
        { error: "Failed to update property status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Property status updated to ${status}`,
    });
  } catch (error) {
    console.error("Error in property status update route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
