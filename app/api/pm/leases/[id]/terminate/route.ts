import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Terminate Lease Endpoint
 *
 * Terminates a lease and stops recurring invoices
 *
 * POST /api/pm/leases/[id]/terminate
 * Body: { terminationDate, noticeDate?, reason? }
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

    const body = await request.json();
    const { terminationDate, noticeDate, reason } = body;

    if (!terminationDate) {
      return NextResponse.json(
        { error: "terminationDate is required" },
        { status: 400 }
      );
    }

    // Verify lease ownership
    const { data: lease, error: leaseError } = await supabase
      .from("pm_leases")
      .select("*, pm_properties(address), pm_units(unit_number)")
      .eq("id", id)
      .eq("agent_id", userData.user.id)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    // Check if lease is already terminated
    if (lease.status === "ended") {
      return NextResponse.json(
        { error: "Lease is already ended" },
        { status: 400 }
      );
    }

    const terminationDateObj = new Date(terminationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Determine status based on termination date
    const newStatus = terminationDateObj > today ? "terminating" : "ended";

    // Update lease
    const { error: updateError } = await supabase
      .from("pm_leases")
      .update({
        status: newStatus,
        termination_date: terminationDate,
        termination_notice_date: noticeDate || new Date().toISOString().split("T")[0],
        auto_invoice_enabled: false, // Stop recurring invoices
        termination_reason: reason || null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error terminating lease:", updateError);
      return NextResponse.json(
        { error: "Failed to terminate lease" },
        { status: 500 }
      );
    }

    const property = Array.isArray(lease.pm_properties)
      ? lease.pm_properties[0]
      : lease.pm_properties;
    const unit = Array.isArray(lease.pm_units) ? lease.pm_units[0] : lease.pm_units;

    console.log(
      `✅ Lease ${id} terminated. Status: ${newStatus}. Property: ${property?.address}${unit ? ` Unit ${unit.unit_number}` : ""}`
    );

    // If GHL integration exists, add note to contact
    const { data: ghlIntegration } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", userData.user.id)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    if (ghlIntegration?.config?.ghl_access_token && lease.ghl_contact_id) {
      try {
        const { GHLClient } = await import("@/lib/integrations/ghl-client");
        const ghlClient = new GHLClient(ghlIntegration.config.ghl_access_token);

        await ghlClient.addNote({
          contactId: lease.ghl_contact_id,
          body: `Lease termination notice received. Termination date: ${terminationDate}. ${reason ? `Reason: ${reason}` : ""} Recurring invoices stopped.`,
        });
      } catch (ghlError) {
        console.error("Error adding GHL note:", ghlError);
        // Don't fail the request
      }
    }

    return NextResponse.json({
      success: true,
      lease: {
        id: lease.id,
        status: newStatus,
        termination_date: terminationDate,
        auto_invoice_enabled: false,
      },
      message: `Lease ${newStatus === "terminating" ? "will be terminated" : "terminated"} successfully. Recurring invoices have been stopped.`,
    });
  } catch (error) {
    console.error("Error in lease termination:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
