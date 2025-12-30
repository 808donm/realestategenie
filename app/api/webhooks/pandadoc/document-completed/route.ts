import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * PandaDoc Webhook Handler - Document Events
 *
 * Handles PandaDoc webhook events for lease documents:
 * - document_state_changed: Document status changed
 * - document_updated: Document was updated
 * - recipient_completed: All recipients have signed
 *
 * PandaDoc Webhook Payload:
 * {
 *   "event": "recipient_completed",
 *   "data": {
 *     "id": "document_id",
 *     "status": "document.completed",
 *     "name": "Lease Agreement - 123 Main St",
 *     "date_completed": "2024-01-15T10:30:00Z",
 *     "recipients": [...],
 *     "metadata": {
 *       "lease_id": "...",
 *       "property_address": "...",
 *       "tenant_email": "..."
 *     },
 *     "fields": [...]
 *   }
 * }
 *
 * Configure webhook URL in PandaDoc:
 * https://your-domain.com/api/webhooks/pandadoc/document-completed
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log("📨 PandaDoc Webhook received:", {
      event: payload.event,
      documentId: payload.data?.id,
      status: payload.data?.status,
    });

    const { event, data } = payload;

    // Handle different webhook events
    const validEvents = ["document_state_changed", "document_updated", "recipient_completed"];
    if (!validEvents.includes(event)) {
      console.log(`⚠️ Ignoring unhandled event: ${event}`);
      return NextResponse.json({ success: true, message: "Event ignored" });
    }

    const documentId = data?.id;
    const documentStatus = data?.status;
    const completedAt = data?.date_completed;
    const metadata = data?.metadata;

    if (!documentId) {
      return NextResponse.json(
        { error: "Missing document ID in payload" },
        { status: 400 }
      );
    }

    // Only process if document is completed (all parties signed)
    // PandaDoc status: "document.completed"
    const isCompleted = documentStatus === "document.completed" || event === "recipient_completed";

    if (!isCompleted) {
      console.log(`ℹ️ Document ${documentId} not yet completed (status: ${documentStatus}), skipping activation`);
      return NextResponse.json({
        success: true,
        message: "Document not yet completed",
      });
    }

    const supabase = await supabaseServer();

    // Find the lease by PandaDoc document ID
    const { data: lease, error: leaseError } = await supabase
      .from("pm_leases")
      .select(`
        *,
        pm_properties (address),
        pm_units (unit_number),
        agents (display_name, email),
        pm_contacts (*)
      `)
      .eq("pandadoc_document_id", documentId)
      .single();

    if (leaseError || !lease) {
      console.error("❌ Lease not found for PandaDoc document:", documentId);
      return NextResponse.json(
        { error: "Lease not found for this document" },
        { status: 404 }
      );
    }

    // Check if lease is already active
    if (lease.status === "active") {
      console.log("ℹ️ Lease already active, skipping activation");
      return NextResponse.json({
        success: true,
        message: "Lease already active",
      });
    }

    // Update lease status to active
    const { error: updateError } = await supabase
      .from("pm_leases")
      .update({
        status: "active",
        contract_signed_at: completedAt || new Date().toISOString(),
      })
      .eq("id", lease.id);

    if (updateError) {
      console.error("❌ Error updating lease status:", updateError);
      return NextResponse.json(
        { error: "Failed to update lease status" },
        { status: 500 }
      );
    }

    console.log(`✅ Lease ${lease.id} activated via PandaDoc`);

    // Update application status if this lease was created from an application
    if (lease.pm_application_id) {
      await supabase
        .from("pm_applications")
        .update({
          status: "lease-active",
          lease_signed_at: completedAt || new Date().toISOString(),
        })
        .eq("id", lease.pm_application_id);
    }

    // Send tenant portal invitation
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
        console.error("⚠️ Failed to send tenant invitation:", await inviteResponse.text());
      }
    } catch (inviteError) {
      console.error("❌ Error sending tenant invitation:", inviteError);
      // Don't fail the webhook - invitation can be resent manually
    }

    // If GHL integration exists, create first month invoice and add note
    const { data: ghlIntegration } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", lease.agent_id)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    if (ghlIntegration?.config?.ghl_access_token) {
      try {
        const { GHLClient } = await import("@/lib/integrations/ghl-client");
        const { prepareFirstMonthInvoice } = await import("@/lib/integrations/lease-to-ghl-contract");

        const ghlClient = new GHLClient(ghlIntegration.config.ghl_access_token);

        // Get contact's GHL ID
        const contact = Array.isArray(lease.pm_contacts) ? lease.pm_contacts[0] : lease.pm_contacts;
        const ghlContactId = contact?.ghl_contact_id;

        if (ghlContactId) {
          // Create first month invoice
          const property = Array.isArray(lease.pm_properties) ? lease.pm_properties[0] : lease.pm_properties;
          const unit = Array.isArray(lease.pm_units) ? lease.pm_units[0] : lease.pm_units;
          const agent = Array.isArray(lease.agents) ? lease.agents[0] : lease.agents;

          const invoiceData = prepareFirstMonthInvoice(
            {
              id: lease.id,
              agent_id: lease.agent_id,
              pm_property_id: lease.pm_property_id,
              pm_unit_id: lease.pm_unit_id,
              tenant_name: contact.full_name || "",
              tenant_email: contact.email || "",
              tenant_phone: contact.phone,
              lease_start_date: lease.lease_start_date,
              lease_end_date: lease.lease_end_date,
              monthly_rent: lease.monthly_rent,
              security_deposit: lease.security_deposit,
              pet_deposit: lease.pet_deposit,
              rent_due_day: lease.rent_due_day,
              notice_period_days: lease.notice_period_days,
              requires_professional_carpet_cleaning: lease.requires_professional_carpet_cleaning,
              requires_professional_house_cleaning: lease.requires_professional_house_cleaning,
              custom_requirements: lease.move_out_requirements?.custom,
              lease_document_type: lease.lease_document_type,
              lease_document_url: lease.lease_document_url,
              property_address: property?.address || "",
              unit_number: unit?.unit_number,
              agent_name: agent?.display_name || "",
              agent_email: agent?.email || "",
            },
            ghlIntegration.config.ghl_location_id,
            ghlContactId
          );

          const { id: invoiceId } = await ghlClient.createInvoice(invoiceData);
          await ghlClient.sendInvoice(invoiceId);

          // Store invoice ID in lease record
          await supabase
            .from("pm_leases")
            .update({
              first_invoice_id: invoiceId,
              first_invoice_sent_at: new Date().toISOString(),
            })
            .eq("id", lease.id);

          console.log(`✅ First month GHL invoice created and sent: ${invoiceId}`);

          // Add note to contact
          await ghlClient.addNote({
            contactId: ghlContactId,
            body: `Lease agreement signed via PandaDoc for ${property?.address || "property"}. Move-in invoice sent. Lease term: ${new Date(lease.lease_start_date).toLocaleDateString()} - ${new Date(lease.lease_end_date).toLocaleDateString()}`,
          });
        }
      } catch (ghlError) {
        console.error("❌ Error creating GHL invoice:", ghlError);
        // Don't fail the webhook
      }
    }

    return NextResponse.json({
      success: true,
      message: "Lease activated successfully",
      lease_id: lease.id,
    });
  } catch (error) {
    console.error("❌ Error in PandaDoc webhook:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
