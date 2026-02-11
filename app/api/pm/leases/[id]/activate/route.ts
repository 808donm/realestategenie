import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Manual Lease Activation Endpoint
 * POST /api/pm/leases/[id]/activate
 *
 * Manually activates a lease that's in pending-signature status.
 * This is a workaround for when GHL webhook isn't configured or fails.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the lease
    const { data: lease, error: fetchError } = await supabase
      .from("pm_leases")
      .select("*")
      .eq("id", id)
      .eq("agent_id", user.id)
      .single();

    if (fetchError || !lease) {
      return NextResponse.json(
        { error: "Lease not found" },
        { status: 404 }
      );
    }

    if (lease.status === "active") {
      return NextResponse.json(
        { message: "Lease is already active" },
        { status: 200 }
      );
    }

    console.log(`📝 Manually activating lease: ${id}`);

    // Update lease status to active
    const { error: updateError } = await supabase
      .from("pm_leases")
      .update({
        status: "active",
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating lease:", updateError);
      return NextResponse.json(
        { error: "Failed to activate lease" },
        { status: 500 }
      );
    }

    console.log(`✅ Lease ${id} activated`);

    // Mark property or unit as rented
    if (lease.pm_unit_id) {
      await supabase
        .from("pm_units")
        .update({ status: "rented" })
        .eq("id", lease.pm_unit_id);
      console.log(`✅ Unit ${lease.pm_unit_id} marked as rented`);
    } else if (lease.pm_property_id) {
      await supabase
        .from("pm_properties")
        .update({ status: "rented" })
        .eq("id", lease.pm_property_id);
      console.log(`✅ Property ${lease.pm_property_id} marked as rented`);
    }

    // Send tenant portal invitation
    try {
      const inviteResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/tenant/invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lease_id: id }),
        }
      );

      if (inviteResponse.ok) {
        console.log(`✅ Tenant portal invitation sent for lease ${id}`);
      } else {
        const error = await inviteResponse.text();
        console.error(`⚠️ Failed to send tenant invitation: ${error}`);
      }
    } catch (inviteError) {
      console.error("❌ Error sending tenant invitation:", inviteError);
    }

    // Update application status if applicable
    if (lease.pm_application_id) {
      await supabase
        .from("pm_applications")
        .update({ status: "leased" })
        .eq("id", lease.pm_application_id);
      console.log(`✅ Application ${lease.pm_application_id} marked as leased`);
    }

    return NextResponse.json({
      success: true,
      message: "Lease activated successfully",
    });
  } catch (error) {
    console.error("❌ Error activating lease:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
