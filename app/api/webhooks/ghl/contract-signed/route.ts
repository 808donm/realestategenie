import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { prepareFirstMonthInvoice } from "@/lib/integrations/lease-to-ghl-contract";

/**
 * GHL Webhook Handler - Contract Signed
 *
 * Triggered when a contract is fully executed (all parties have signed)
 * This activates the lease and creates the first month's invoice
 *
 * GHL Webhook Payload Example:
 * {
 *   "type": "contract.signed",
 *   "locationId": "...",
 *   "contractId": "...",
 *   "contactId": "...",
 *   "signedAt": "2024-01-15T10:30:00Z"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log("📨 GHL Contract Signed Webhook received:", payload);

    const { type, contractId, locationId, contactId, signedAt } = payload;

    // Validate webhook type
    if (type !== "contract.signed") {
      return NextResponse.json(
        { error: "Invalid webhook type" },
        { status: 400 }
      );
    }

    if (!contractId) {
      return NextResponse.json(
        { error: "Missing contractId in payload" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // Find the lease by GHL contract ID
    const { data: lease, error: leaseError } = await supabase
      .from("pm_leases")
      .select(`
        *,
        pm_properties (address),
        pm_units (unit_number),
        agents (display_name, email)
      `)
      .eq("ghl_contract_id", contractId)
      .single();

    if (leaseError || !lease) {
      console.error("❌ Lease not found for contract:", contractId);
      return NextResponse.json(
        { error: "Lease not found for this contract" },
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

    // Get agent's GHL credentials
    const { data: integration } = await supabase
      .from("integrations")
      .select("ghl_access_token, ghl_location_id")
      .eq("agent_id", lease.agent_id)
      .single();

    if (!integration?.ghl_access_token) {
      console.error("❌ GHL integration not found for agent:", lease.agent_id);
      return NextResponse.json(
        { error: "GHL integration not found" },
        { status: 500 }
      );
    }

    const ghlClient = new GHLClient(integration.ghl_access_token);

    // Prepare update data
    const updateData: any = {
      status: "active",
      contract_signed_at: signedAt || new Date().toISOString(),
    };

    // If lease doesn't have ghl_contact_id yet, set it now
    if (!lease.ghl_contact_id && contactId) {
      updateData.ghl_contact_id = contactId;
      console.log(`✅ Setting ghl_contact_id on lease: ${contactId}`);
    }

    // Update lease status to active
    const { error: updateError } = await supabase
      .from("pm_leases")
      .update(updateData)
      .eq("id", lease.id);

    if (updateError) {
      console.error("❌ Error updating lease status:", updateError);
      return NextResponse.json(
        { error: "Failed to update lease status" },
        { status: 500 }
      );
    }

    console.log(`✅ Lease ${lease.id} activated`);

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

    // Fetch the signed contract document URL from GHL
    try {
      const contract = await ghlClient.getContract(contractId);
      if (contract) {
        // GHL contracts may have various URL fields - check the actual response
        // Store the contract URL in the lease
        await supabase
          .from("pm_leases")
          .update({
            ghl_contract_url: contract.id ? `https://app.gohighlevel.com/v2/location/${integration.ghl_location_id}/contracts/${contract.id}` : null,
          })
          .eq("id", lease.id);
        console.log(`✅ Contract URL stored for lease ${lease.id}`);
      }
    } catch (contractError) {
      console.error("⚠️ Could not fetch contract details:", contractError);
      // Don't fail - this is optional
    }

    // Create first month's invoice (move-in charges)
    try {
      const invoiceData = prepareFirstMonthInvoice(
        {
          id: lease.id,
          agent_id: lease.agent_id,
          pm_property_id: lease.pm_property_id,
          pm_unit_id: lease.pm_unit_id,
          tenant_name: lease.tenant_name || "",
          tenant_email: lease.tenant_email || "",
          tenant_phone: lease.tenant_phone,
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
          property_address: lease.pm_properties?.address || "",
          unit_number: lease.pm_units?.unit_number,
          agent_name: lease.agents?.display_name || "",
          agent_email: lease.agents?.email || "",
        },
        integration.ghl_location_id,
        lease.tenant_contact_id
      );

      const { id: invoiceId } = await ghlClient.createInvoice(invoiceData);

      // Send invoice to tenant
      await ghlClient.sendInvoice(invoiceId);

      // Store invoice ID in lease record
      await supabase
        .from("pm_leases")
        .update({
          first_invoice_id: invoiceId,
          first_invoice_sent_at: new Date().toISOString(),
        })
        .eq("id", lease.id);

      console.log(`✅ First month invoice created and sent: ${invoiceId}`);

      // Add note to tenant contact
      await ghlClient.addNote({
        contactId: lease.tenant_contact_id,
        body: `Lease agreement signed for ${lease.pm_properties?.address || "property"}. Move-in invoice sent. Lease term: ${new Date(lease.lease_start_date).toLocaleDateString()} - ${new Date(lease.lease_end_date).toLocaleDateString()}`,
      });
    } catch (invoiceError) {
      console.error("❌ Error creating first month invoice:", invoiceError);
      // Don't fail the webhook - lease is already activated
      // Agent can manually create invoice from lease detail page
    }

    // Update application status if this lease was created from an application
    if (lease.pm_application_id) {
      await supabase
        .from("pm_applications")
        .update({
          status: "lease-active",
          lease_signed_at: signedAt || new Date().toISOString(),
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

    return NextResponse.json({
      success: true,
      message: "Lease activated and first invoice sent",
      lease_id: lease.id,
    });
  } catch (error) {
    console.error("❌ Error in contract signed webhook:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Verify GHL webhook signature (if configured)
 * GHL signs webhooks with HMAC-SHA256
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // TODO: Implement HMAC verification when GHL webhook secret is configured
  // const crypto = require('crypto');
  // const hmac = crypto.createHmac('sha256', secret);
  // hmac.update(payload);
  // const digest = hmac.digest('hex');
  // return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  return true;
}
