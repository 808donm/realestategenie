import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GHL Document Signed Webhook Handler
 *
 * This webhook is triggered by the GHL workflow when a document is completed (signed).
 * The workflow should be configured to send a POST request with the following data:
 * {
 *   "contact_id": "{{contact.id}}",
 *   "contact_email": "{{contact.email}}",
 *   "document_url": "[URL to signed document]", // Manual entry in workflow
 *   "document_type": "lease" // Or "representation", "vendor"
 * }
 *
 * Setup in GHL Workflow:
 * Trigger: Documents & Contracts → Document Completed
 * Filter: Template = "Standard Residential Lease Agreement"
 * Actions:
 * 1. Add Tag → "Lease Signed"
 * 2. Webhook → POST to this endpoint
 * 3. Remove Tag → "trigger-send-lease" (cleanup)
 */

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log("📨 GHL Document Signed webhook received:", JSON.stringify(payload, null, 2));

    const { contact_id, contact_email, document_url, document_type = "lease" } = payload;

    if (!contact_id && !contact_email) {
      console.error("❌ Webhook payload missing both contact_id and contact_email");
      return NextResponse.json(
        { error: "Missing contact_id or contact_email" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // Find lease by GHL contact ID or by tenant email
    let lease;

    if (contact_id) {
      const { data } = await supabase
        .from("pm_leases")
        .select("*")
        .eq("ghl_contact_id", contact_id)
        .eq("status", "pending-signature")
        .single();

      lease = data;
    }

    // Fallback: Search by tenant email if contact_id didn't match
    if (!lease && contact_email) {
      // Get tenant contact by email
      const { data: contact } = await supabase
        .from("pm_contacts")
        .select("id")
        .eq("email", contact_email)
        .eq("contact_type", "tenant")
        .single();

      if (contact) {
        const { data } = await supabase
          .from("pm_leases")
          .select("*")
          .eq("tenant_contact_id", contact.id)
          .eq("status", "pending-signature")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        lease = data;
      }
    }

    if (!lease) {
      console.error("❌ No pending lease found for contact:", { contact_id, contact_email });
      return NextResponse.json(
        { error: "No pending lease found for this contact" },
        { status: 404 }
      );
    }

    console.log(`✅ Found lease: ${lease.id}`);

    // Prepare update data
    const updateData: any = {
      status: "active",
      signed_at: new Date().toISOString(),
      ghl_document_url: document_url || null,
    };

    // If lease doesn't have ghl_contact_id yet, set it now
    if (!lease.ghl_contact_id && contact_id) {
      updateData.ghl_contact_id = contact_id;
      console.log(`✅ Setting ghl_contact_id on lease: ${contact_id}`);
    }

    // Update lease status to active
    await supabase
      .from("pm_leases")
      .update(updateData)
      .eq("id", lease.id);

    console.log(`✅ Lease ${lease.id} marked as active (signed)`);

    // Mark property or unit as rented
    if (lease.pm_unit_id) {
      // Mark the specific unit as rented
      await supabase
        .from("pm_units")
        .update({ status: "rented" })
        .eq("id", lease.pm_unit_id);
      console.log(`✅ Unit ${lease.pm_unit_id} marked as rented`);
    } else if (lease.pm_property_id) {
      // Mark the property as rented (for single-family homes)
      await supabase
        .from("pm_properties")
        .update({ status: "rented" })
        .eq("id", lease.pm_property_id);
      console.log(`✅ Property ${lease.pm_property_id} marked as rented`);
    }

    // Trigger tenant portal invitation
    try {
      const inviteResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/tenant/invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lease_id: lease.id }),
        }
      );

      if (inviteResponse.ok) {
        console.log(`✅ Tenant portal invitation sent for lease ${lease.id}`);
      } else {
        const error = await inviteResponse.text();
        console.error(`⚠️ Failed to send tenant invitation: ${error}`);
      }
    } catch (inviteError) {
      console.error("❌ Error sending tenant invitation:", inviteError);
      // Don't fail the webhook - invitation can be resent manually
    }

    // Create first month invoice (existing logic from PandaDoc webhook)
    try {
      // Get GHL integration
      const { data: ghlIntegration } = await supabase
        .from("integrations")
        .select("*")
        .eq("agent_id", lease.agent_id)
        .eq("provider", "ghl")
        .eq("status", "connected")
        .single();

      if (ghlIntegration?.config?.ghl_access_token) {
        // Get property and contact data
        const { data: property } = await supabase
          .from("pm_properties")
          .select("address")
          .eq("id", lease.pm_property_id)
          .single();

        const { data: contact } = await supabase
          .from("pm_contacts")
          .select("full_name, email, phone")
          .eq("id", lease.tenant_contact_id)
          .single();

        // Import GHL client
        const { GHLClient } = await import("@/lib/integrations/ghl-client");
        const ghlClient = new GHLClient(ghlIntegration.config.ghl_access_token);

        // Calculate first invoice amount (rent + security deposit + pet deposit)
        const invoiceAmount =
          parseFloat(lease.monthly_rent.toString()) +
          parseFloat(lease.security_deposit.toString()) +
          (lease.pet_deposit ? parseFloat(lease.pet_deposit.toString()) : 0);

        // Create invoice in GHL
        const items = [
          {
            name: "First Month Rent",
            description: `Rent for ${property?.address}`,
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

        const invoice = await ghlClient.createInvoice({
          locationId: ghlIntegration.config.ghl_location_id,
          contactId: lease.ghl_contact_id || contact_id,
          title: `Move-In Charges - ${property?.address}`,
          currency: "USD",
          dueDate: lease.lease_start_date,
          items,
        });
        const invoiceId = invoice.id;

        console.log(`✅ First month invoice created in GHL: ${invoiceId}`);

        // Sync to QuickBooks if QBO integration exists
        const { data: qboIntegration } = await supabase
          .from("integrations")
          .select("*")
          .eq("agent_id", lease.agent_id)
          .eq("provider", "qbo")
          .eq("status", "connected")
          .single();

        if (qboIntegration?.config?.access_token) {
          try {
            const { QBOClient, syncInvoiceToQBO } = await import("@/lib/integrations/qbo-client");

            const qboClient = new QBOClient({
              access_token: qboIntegration.config.access_token,
              refresh_token: qboIntegration.config.refresh_token,
              realmId: qboIntegration.config.realmId,
              expires_at: qboIntegration.config.expires_at,
              refresh_expires_at: qboIntegration.config.refresh_expires_at,
            });

            const { qbo_customer_id, qbo_invoice_id } = await syncInvoiceToQBO(qboClient, {
              tenant_name: contact?.full_name || "",
              tenant_email: contact?.email || "",
              tenant_phone: contact?.phone,
              property_address: property?.address || "",
              monthly_rent: lease.monthly_rent,
              security_deposit: lease.security_deposit,
              pet_deposit: lease.pet_deposit,
              due_date: lease.lease_start_date,
              ghl_invoice_id: invoiceId,
              invoice_type: "move_in",
            });

            // Store QBO IDs in lease record
            await supabase
              .from("pm_leases")
              .update({
                qbo_customer_id,
                qbo_invoice_id,
              })
              .eq("id", lease.id);

            console.log(`✅ Invoice synced to QuickBooks: ${qbo_invoice_id}`);
          } catch (qboError) {
            console.error("❌ Error syncing to QuickBooks:", qboError);
            // Don't fail the webhook - QBO sync is optional
          }
        }
      }
    } catch (invoiceError) {
      console.error("❌ Error creating first month invoice:", invoiceError);
      // Don't fail the webhook - invoice can be created manually
    }

    // Update application status if this lease was created from an application
    if (lease.pm_application_id) {
      await supabase
        .from("pm_applications")
        .update({ status: "leased" })
        .eq("id", lease.pm_application_id);

      console.log(`✅ Application ${lease.pm_application_id} marked as leased`);
    }

    return NextResponse.json({
      success: true,
      message: "Lease activated and tenant invitation sent",
      lease_id: lease.id,
    });
  } catch (error) {
    console.error("❌ Error in GHL document signed webhook:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
