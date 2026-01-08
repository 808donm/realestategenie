import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { QBOClient, syncInvoiceToQBO } from "@/lib/integrations/qbo-client";

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

    // Ensure we have a contact ID
    const tenantContactId = lease.ghl_contact_id || lease.tenant_contact_id;
    if (!tenantContactId) {
      return NextResponse.json(
        { error: "No tenant contact ID found. Please send tenant invitation first to create the GHL contact." },
        { status: 400 }
      );
    }

    // Get property address
    const property = Array.isArray(lease.pm_properties) ? lease.pm_properties[0] : lease.pm_properties;
    const unit = Array.isArray(lease.pm_units) ? lease.pm_units[0] : lease.pm_units;
    const propertyAddress = property?.address || "Property";
    const fullAddress = unit ? `${propertyAddress}, Unit ${unit.unit_number}` : propertyAddress;

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

    // Create payment link in GHL (simpler alternative to invoices)
    const itemsList = items.map(item => `${item.name}: $${item.price.toLocaleString()}`).join(', ');

    const { id: paymentLinkId, url: paymentUrl } = await ghlClient.createPaymentLink({
      locationId: ghlIntegration.config.ghl_location_id,
      contactId: tenantContactId,
      amount: totalAmount,
      name: `Move-In Charges - ${propertyAddress}`,
      description: `Payment for move-in charges: ${itemsList}. Due: ${new Date(lease.lease_start_date).toLocaleDateString()}`,
    });

    console.log(`✅ Move-in payment link created in GHL: ${paymentLinkId}`);

    // Create or update rent payment record
    if (existingPayment) {
      // Update existing record
      await supabase
        .from("pm_rent_payments")
        .update({
          ghl_invoice_id: paymentLinkId,
          ghl_payment_url: paymentUrl,
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
          ghl_invoice_id: paymentLinkId,
          ghl_payment_url: paymentUrl,
        });
    }

    console.log(`✅ Rent payment record created/updated for lease ${id}`);

    // Sync to QuickBooks if integrated
    let qboInvoiceId = null;
    try {
      const { data: qboIntegration } = await supabase
        .from("integrations")
        .select("config")
        .eq("agent_id", user.id)
        .eq("provider", "qbo")
        .eq("status", "connected")
        .single();

      if (qboIntegration?.config?.access_token) {
        console.log("📊 Syncing invoice to QuickBooks...");

        const qboClient = new QBOClient({
          access_token: qboIntegration.config.access_token,
          refresh_token: qboIntegration.config.refresh_token,
          realmId: qboIntegration.config.realmId,
          expires_at: qboIntegration.config.expires_at,
          refresh_expires_at: qboIntegration.config.refresh_expires_at,
        });

        const { qbo_customer_id, qbo_invoice_id } = await syncInvoiceToQBO(qboClient, {
          tenant_name: lease.tenant_name,
          tenant_email: lease.tenant_email,
          tenant_phone: lease.tenant_phone,
          property_address: fullAddress,
          monthly_rent: parseFloat(lease.monthly_rent.toString()),
          security_deposit: parseFloat(lease.security_deposit.toString()),
          pet_deposit: lease.pet_deposit ? parseFloat(lease.pet_deposit.toString()) : 0,
          due_date: lease.lease_start_date,
          ghl_invoice_id: paymentLinkId,
          invoice_type: "move_in",
        });

        // Update payment record with QBO IDs
        const paymentId = existingPayment?.id || (await supabase
          .from("pm_rent_payments")
          .select("id")
          .eq("lease_id", id)
          .eq("payment_type", "move_in")
          .single()).data?.id;

        if (paymentId) {
          await supabase
            .from("pm_rent_payments")
            .update({ qbo_invoice_id: qbo_invoice_id })
            .eq("id", paymentId);
        }

        // Update lease with QBO customer ID if not set
        if (!lease.qbo_customer_id) {
          await supabase
            .from("pm_leases")
            .update({ qbo_customer_id })
            .eq("id", id);
        }

        qboInvoiceId = qbo_invoice_id;
        console.log(`✅ Invoice synced to QuickBooks: ${qbo_invoice_id}`);
      }
    } catch (qboError) {
      console.error("⚠️ Error syncing to QuickBooks:", qboError);
      // Don't fail the request - invoice is created even if QBO sync fails
    }

    // Send payment link to tenant via GHL email
    try {
      await ghlClient.sendEmail({
        contactId: tenantContactId,
        subject: `Move-In Payment Required - ${propertyAddress}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Move-In Charges Ready</h2>
            <p>Your move-in charges for ${propertyAddress} are ready for payment.</p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${items.map(item => `<div style="display: flex; justify-content: space-between; margin: 10px 0;">
                <span>${item.name}</span>
                <strong>$${item.price.toLocaleString()}</strong>
              </div>`).join('')}
              <div style="border-top: 2px solid #ddd; margin-top: 15px; padding-top: 15px; display: flex; justify-content: space-between;">
                <strong>Total Due:</strong>
                <strong style="font-size: 1.2em;">$${totalAmount.toLocaleString()}</strong>
              </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentUrl}" style="background: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Pay Now with PayPal</a>
            </div>
            <p style="color: #666; font-size: 14px;">Payment is due by ${new Date(lease.lease_start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
          </div>
        `,
      });
      console.log(`✅ Payment link email sent to tenant`);
    } catch (emailError) {
      console.error("⚠️ Failed to send payment link email:", emailError);
      // Don't fail the request - payment link is created
    }

    return NextResponse.json({
      success: true,
      message: "Move-in payment link created successfully",
      ghl_invoice_id: paymentLinkId,
      payment_url: paymentUrl,
      qbo_invoice_id: qboInvoiceId,
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
