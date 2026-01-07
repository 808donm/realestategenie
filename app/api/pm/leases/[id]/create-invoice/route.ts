import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";

/**
 * Create Move-In Invoice for Lease
 *
 * POST /api/pm/leases/:id/create-invoice
 * Creates the first month invoice (move-in charges) in GHL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get lease details
    const { data: lease, error: leaseError } = await supabase
      .from("pm_leases")
      .select(`
        *,
        pm_properties (address),
        pm_units (unit_number)
      `)
      .eq("id", id)
      .eq("agent_id", user.id)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json(
        { error: "Lease not found" },
        { status: 404 }
      );
    }

    // Check if invoice already exists
    const { data: existingPayment } = await supabase
      .from("pm_rent_payments")
      .select("id, ghl_invoice_id")
      .eq("lease_id", id)
      .eq("payment_type", "move_in")
      .single();

    if (existingPayment?.ghl_invoice_id) {
      return NextResponse.json(
        {
          error: "Move-in invoice already exists",
          ghl_invoice_id: existingPayment.ghl_invoice_id
        },
        { status: 400 }
      );
    }

    // Get GHL integration
    const { data: ghlIntegration } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    if (!ghlIntegration?.config?.ghl_access_token) {
      return NextResponse.json(
        { error: "GHL integration not found or not connected" },
        { status: 400 }
      );
    }

    const ghlClient = new GHLClient(
      ghlIntegration.config.ghl_access_token,
      ghlIntegration.config.ghl_location_id
    );

    // Get property address
    const property = Array.isArray(lease.pm_properties) ? lease.pm_properties[0] : lease.pm_properties;
    const unit = Array.isArray(lease.pm_units) ? lease.pm_units[0] : lease.pm_units;
    const propertyAddress = property?.address || "Property";

    // Calculate invoice amount
    const items = [
      {
        name: "First Month Rent",
        description: `Rent for ${propertyAddress}${unit ? ` - Unit ${unit.unit_number}` : ""}`,
        price: parseFloat(lease.monthly_rent.toString()),
        quantity: 1,
      },
      {
        name: "Security Deposit",
        description: "Refundable security deposit",
        price: parseFloat(lease.security_deposit.toString()),
        quantity: 1,
      },
    ];

    // Add pet deposit if applicable
    if (lease.pet_deposit && parseFloat(lease.pet_deposit.toString()) > 0) {
      items.push({
        name: "Pet Deposit",
        description: "Refundable pet deposit",
        price: parseFloat(lease.pet_deposit.toString()),
        quantity: 1,
      });
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create invoice in GHL
    const { id: invoiceId } = await ghlClient.createInvoice({
      locationId: ghlIntegration.config.ghl_location_id,
      contactId: lease.ghl_contact_id || lease.tenant_contact_id,
      title: `Move-In Charges - ${propertyAddress}`,
      currency: "USD",
      dueDate: lease.lease_start_date,
      items,
    });

    console.log(`✅ Move-in invoice created in GHL: ${invoiceId}`);

    // Send the invoice to the tenant
    await ghlClient.sendInvoice(invoiceId);

    // Create or update rent payment record
    if (existingPayment) {
      // Update existing record
      await supabase
        .from("pm_rent_payments")
        .update({
          ghl_invoice_id: invoiceId,
          amount: totalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPayment.id);
    } else {
      // Create new record
      await supabase
        .from("pm_rent_payments")
        .insert({
          lease_id: id,
          agent_id: user.id,
          month: new Date(lease.lease_start_date).getMonth() + 1,
          year: new Date(lease.lease_start_date).getFullYear(),
          amount: totalAmount,
          due_date: lease.lease_start_date,
          status: "pending",
          payment_type: "move_in",
          ghl_invoice_id: invoiceId,
        });
    }

    console.log(`✅ Rent payment record created/updated for lease ${id}`);

    return NextResponse.json({
      success: true,
      message: "Move-in invoice created successfully",
      ghl_invoice_id: invoiceId,
      amount: totalAmount,
    });
  } catch (error) {
    console.error("Error creating move-in invoice:", error);
    return NextResponse.json(
      {
        error: "Failed to create invoice",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
