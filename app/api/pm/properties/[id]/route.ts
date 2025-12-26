import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * PM Property Individual API
 *
 * GET: Get property details
 * PATCH: Update property
 * DELETE: Delete property
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data: property, error } = await supabase
      .from("pm_properties")
      .select("*")
      .eq("id", id)
      .eq("agent_id", user.id)
      .single();

    if (error || !property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ property });
  } catch (error) {
    console.error("Error in property GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify property ownership
    const { data: existingProperty } = await supabase
      .from("pm_properties")
      .select("id")
      .eq("id", id)
      .eq("agent_id", user.id)
      .single();

    if (!existingProperty) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Validate property_type if provided
    if (body.property_type && !["single_family", "condo", "townhome", "duplex", "multi_unit"].includes(body.property_type)) {
      return NextResponse.json(
        { error: "Invalid property type" },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (body.status && !["available", "rented", "maintenance", "unavailable"].includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Update property
    const { data: property, error: updateError } = await supabase
      .from("pm_properties")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("agent_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating property:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ property });
  } catch (error) {
    console.error("Error in property PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check for active leases before deleting
    const { data: activeLeases } = await supabase
      .from("pm_leases")
      .select("id")
      .eq("pm_property_id", id)
      .eq("status", "active")
      .limit(1);

    if (activeLeases && activeLeases.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete property with active leases" },
        { status: 400 }
      );
    }

    // Delete property
    const { error: deleteError } = await supabase
      .from("pm_properties")
      .delete()
      .eq("id", id)
      .eq("agent_id", user.id);

    if (deleteError) {
      console.error("Error deleting property:", deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in property DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
