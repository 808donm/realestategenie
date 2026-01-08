import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient, refreshGHLToken } from "@/lib/integrations/ghl-client";
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
        { error: "GHL integration not found or not connected. Please reconnect GHL in Settings → Integrations." },
        { status: 400 }
      );
    }

    // Check if token needs refresh (if expires_at is in the past)
    let accessToken = ghlIntegration.config.ghl_access_token;
    const expiresAt = ghlIntegration.config.expires_at;

    if (expiresAt && new Date(expiresAt) < new Date()) {
      console.log("🔄 GHL token expired, refreshing...");

      if (!ghlIntegration.config.ghl_refresh_token) {
        return NextResponse.json(
          { error: "GHL token expired and no refresh token available. Please reconnect GHL in Settings → Integrations." },
          { status: 401 }
        );
      }

      try {
        const refreshed = await refreshGHLToken(ghlIntegration.config.ghl_refresh_token);
        accessToken = refreshed.access_token;

        // Update integration with new tokens
        await supabase
          .from("integrations")
          .update({
            config: {
              ...ghlIntegration.config,
              ghl_access_token: refreshed.access_token,
              ghl_refresh_token: refreshed.refresh_token,
              expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            },
          })
          .eq("agent_id", user.id)
          .eq("provider", "ghl");

        console.log("✅ GHL token refreshed successfully");
      } catch (refreshError) {
        console.error("❌ Failed to refresh GHL token:", refreshError);
        return NextResponse.json(
          { error: "Failed to refresh GHL token. Please reconnect GHL in Settings → Integrations." },
          { status: 401 }
        );
      }
    }

    const ghlClient = new GHLClient(
      accessToken,
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

    // Create invoice in GHL
    const monthName = new Date(year, month - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const { id: ghlInvoiceId, invoice } = await ghlClient.createInvoice({
      locationId: ghlIntegration.config.ghl_location_id,
      contactId: tenantContactId,
      title: `${monthName} Rent - ${fullAddress}`,
      currency: "USD",
      dueDate: dueDate.toISOString().split("T")[0],
      items: [
        {
          name: "Monthly Rent",
          description: `Rent for ${fullAddress}`,
          price: parseFloat(lease.monthly_rent.toString()),
          quantity: 1,
        },
      ],
    });

    console.log(`✅ GHL Invoice created: ${ghlInvoiceId}`);

    // Send the invoice to the tenant
    await ghlClient.sendInvoice(ghlInvoiceId);
    console.log(`✅ Invoice sent to tenant via GHL`);

    // GHL invoice URL format
    const paymentUrl = `https://payments.msgsndr.com/invoice/${ghlInvoiceId}`;

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
        ghl_invoice_id: ghlInvoiceId,
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
          ghl_invoice_id: ghlInvoiceId,
          invoice_type: "monthly_rent",
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

    // Revalidate invoices page
    revalidatePath("/app/pm/invoices");

    return NextResponse.json({
      success: true,
      message: "Monthly rent invoice created successfully",
      invoice_id: newPayment.id,
      ghl_invoice_id: ghlInvoiceId,
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
