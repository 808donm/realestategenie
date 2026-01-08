import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { QBOClient, syncInvoiceToQBO } from "@/lib/integrations/qbo-client";
import { revalidatePath } from "next/cache";

/**
 * Create Monthly Rent Invoice
 *
 * POST /api/pm/invoices/create-monthly
 * Creates a monthly rent invoice with GHL payment link and QBO sync
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lease_id, month, year } = body;

    if (!lease_id || !month || !year) {
      return NextResponse.json(
        { error: "Missing required fields: lease_id, month, year" },
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

    // Get lease details
    const { data: lease, error: leaseError } = await supabase
      .from("pm_leases")
      .select(`
        *,
        pm_properties (id, address, city, state_province),
        pm_units (id, unit_number)
      `)
      .eq("id", lease_id)
      .eq("agent_id", user.id)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json(
        { error: "Lease not found" },
        { status: 404 }
      );
    }

    // Check if invoice already exists for this month
    const { data: existingPayment } = await supabase
      .from("pm_rent_payments")
      .select("id, ghl_invoice_id, status")
      .eq("lease_id", lease_id)
      .eq("month", month)
      .eq("year", year)
      .single();

    if (existingPayment) {
      return NextResponse.json(
        {
          error: `Invoice already exists for ${new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
          invoice_id: existingPayment.id,
          status: existingPayment.status
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

    // Calculate due date (using rent_due_day from lease, or 1st of month as default)
    const dueDay = lease.rent_due_day || 1;
    const dueDate = new Date(year, month - 1, dueDay);

    // Create payment link in GHL
    const monthName = new Date(year, month - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const { id: paymentLinkId, url: paymentUrl } = await ghlClient.createPaymentLink({
      locationId: ghlIntegration.config.ghl_location_id,
      contactId: tenantContactId,
      amount: parseFloat(lease.monthly_rent.toString()),
      name: `${monthName} Rent - ${fullAddress}`,
      description: `Monthly rent payment for ${fullAddress}. Due: ${dueDate.toLocaleDateString()}`,
    });

    console.log(`✅ Monthly rent payment link created in GHL: ${paymentLinkId}`);

    // Create rent payment record
    const { data: newPayment, error: insertError } = await supabase
      .from("pm_rent_payments")
      .insert({
        lease_id: lease_id,
        agent_id: user.id,
        tenant_contact_id: tenantContactId,
        month: month,
        year: year,
        amount: lease.monthly_rent,
        due_date: dueDate.toISOString().split("T")[0],
        status: "pending",
        payment_type: "monthly",
        ghl_invoice_id: paymentLinkId,
        ghl_payment_url: paymentUrl,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating rent payment record:", insertError);
      return NextResponse.json(
        { error: "Failed to create payment record", details: insertError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Rent payment record created for lease ${lease_id}`);

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
          security_deposit: 0,
          pet_deposit: 0,
          due_date: dueDate.toISOString().split("T")[0],
          ghl_invoice_id: paymentLinkId,
          invoice_type: "monthly",
        });

        // Update payment record with QBO IDs
        await supabase
          .from("pm_rent_payments")
          .update({
            qbo_invoice_id: qbo_invoice_id,
          })
          .eq("id", newPayment.id);

        // Update lease with QBO customer ID if not set
        if (!lease.qbo_customer_id) {
          await supabase
            .from("pm_leases")
            .update({ qbo_customer_id })
            .eq("id", lease_id);
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
        subject: `${monthName} Rent Payment - ${fullAddress}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${monthName} Rent Payment</h2>
            <p>Your rent payment for ${fullAddress} is now due.</p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; margin: 10px 0;">
                <span>Monthly Rent</span>
                <strong>$${lease.monthly_rent.toLocaleString()}</strong>
              </div>
              <div style="border-top: 2px solid #ddd; margin-top: 15px; padding-top: 15px; display: flex; justify-content: space-between;">
                <strong>Total Due:</strong>
                <strong style="font-size: 1.2em;">$${lease.monthly_rent.toLocaleString()}</strong>
              </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentUrl}" style="background: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Pay Now with PayPal</a>
            </div>
            <p style="color: #666; font-size: 14px;">Payment is due by ${dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
          </div>
        `,
      });
      console.log(`✅ Payment link email sent to tenant`);
    } catch (emailError) {
      console.error("⚠️ Failed to send payment link email:", emailError);
      // Don't fail the request - payment link is created
    }

    // Revalidate invoices page
    revalidatePath("/app/pm/invoices");

    return NextResponse.json({
      success: true,
      message: "Monthly rent invoice created successfully",
      invoice_id: newPayment.id,
      ghl_invoice_id: paymentLinkId,
      payment_url: paymentUrl,
      qbo_invoice_id: qboInvoiceId,
      amount: lease.monthly_rent,
    });
  } catch (error) {
    console.error("Error creating monthly invoice:", error);
    return NextResponse.json(
      {
        error: "Failed to create invoice",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
