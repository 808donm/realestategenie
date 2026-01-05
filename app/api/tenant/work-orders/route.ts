import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Tenant Work Orders API
 *
 * GET: List all work orders for tenant's lease
 * POST: Create new work order
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get tenant's lease
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("lease_id")
      .eq("id", userData.user.id)
      .single();

    if (!tenantUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get all work orders for this lease
    const { data: workOrders, error } = await supabase
      .from("pm_work_orders")
      .select("*")
      .eq("lease_id", tenantUser.lease_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching work orders:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ work_orders: workOrders });
  } catch (error) {
    console.error("Error in work orders GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, priority, location, tenant_availability, photos } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    // Get tenant's lease and property info
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select(`
        lease_id,
        pm_leases (
          id,
          agent_id,
          pm_property_id,
          pm_unit_id
        )
      `)
      .eq("id", userData.user.id)
      .single();

    if (!tenantUser || !tenantUser.pm_leases) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    // Handle Supabase joins that may return arrays
    const lease = Array.isArray(tenantUser.pm_leases)
      ? tenantUser.pm_leases[0]
      : tenantUser.pm_leases;

    // Create work order
    const { data: workOrder, error: createError } = await supabase
      .from("pm_work_orders")
      .insert({
        agent_id: lease.agent_id,
        pm_property_id: lease.pm_property_id,
        pm_unit_id: lease.pm_unit_id,
        lease_id: lease.id,
        title,
        description,
        category: category || "other",
        priority: priority || "normal",
        location,
        status: "new",
        tenant_availability,
        photos: photos || [],
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating work order:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // TODO: Send notification to property manager
    // TODO: Create task in GHL

    return NextResponse.json({
      success: true,
      id: workOrder.id,
      work_order: workOrder,
    });
  } catch (error) {
    console.error("Error in work orders POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
