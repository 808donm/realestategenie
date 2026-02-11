import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";

/**
 * GHL Webhook Handler - Invoice Paid
 *
 * Triggered when an invoice is paid in GoHighLevel.
 * Updates the rent payment record in our database.
 *
 * GHL Webhook Payload Example:
 * {
 *   "type": "invoice.paid",
 *   "locationId": "...",
 *   "invoiceId": "...",
 *   "contactId": "...",
 *   "amount": 1500.00,
 *   "paidAt": "2024-01-15T10:30:00Z",
 *   "paymentMethod": "card" // or "ach", "cash", "check"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log("📨 GHL Invoice Paid Webhook received:", payload);

    const { type, invoiceId, contactId, amount, paidAt, paymentMethod } = payload;

    // Validate webhook type
    if (type !== "invoice.paid") {
      return NextResponse.json(
        { error: "Invalid webhook type" },
        { status: 400 }
      );
    }

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Missing invoiceId in payload" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // Find the rent payment by GHL invoice ID
    const { data: payment, error: paymentError } = await supabase
      .from("pm_rent_payments")
      .select(`
        *,
        pm_leases (
          id,
          pm_properties (address),
          pm_units (unit_number)
        )
      `)
      .eq("ghl_invoice_id", invoiceId)
      .single();

    if (paymentError || !payment) {
      console.error("❌ Payment not found for invoice:", invoiceId);
      return NextResponse.json(
        { error: "Payment not found for this invoice" },
        { status: 404 }
      );
    }

    // Check if payment is already marked as paid
    if (payment.status === "paid") {
      console.log("ℹ️ Payment already marked as paid, skipping");
      return NextResponse.json({
        success: true,
        message: "Payment already recorded",
      });
    }

    // Update payment status to paid
    const { error: updateError } = await supabase
      .from("pm_rent_payments")
      .update({
        status: "paid",
        paid_at: paidAt || new Date().toISOString(),
        payment_method: mapGHLPaymentMethod(paymentMethod),
        payment_reference: invoiceId, // GHL invoice ID as reference
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (updateError) {
      console.error("❌ Error updating payment status:", updateError);
      return NextResponse.json(
        { error: "Failed to update payment status" },
        { status: 500 }
      );
    }

    console.log(`✅ Payment ${payment.id} marked as paid`);

    // Sync payment to QuickBooks if integrated
    if (payment.qbo_invoice_id) {
      try {
        const { data: qboIntegration } = await supabase
          .from("integrations")
          .select("*")
          .eq("agent_id", payment.agent_id)
          .eq("provider", "qbo")
          .eq("status", "connected")
          .single();

        if (qboIntegration?.config?.access_token) {
          const { QBOClient, syncPaymentToQBO } = await import("@/lib/integrations/qbo-client");

          const qboClient = new QBOClient({
            access_token: qboIntegration.config.access_token,
            refresh_token: qboIntegration.config.refresh_token,
            realmId: qboIntegration.config.realmId,
            expires_at: qboIntegration.config.expires_at,
            refresh_expires_at: qboIntegration.config.refresh_expires_at,
          });

          // Get lease for QBO customer ID
          const { data: lease } = await supabase
            .from("pm_leases")
            .select("qbo_customer_id")
            .eq("id", payment.lease_id)
            .single();

          if (lease?.qbo_customer_id) {
            const { qbo_payment_id } = await syncPaymentToQBO(qboClient, {
              qbo_customer_id: lease.qbo_customer_id,
              qbo_invoice_id: payment.qbo_invoice_id,
              amount: payment.amount,
              payment_date: paidAt ? new Date(paidAt).toISOString().split("T")[0] : undefined,
            });

            // Store QBO payment ID
            await supabase
              .from("pm_rent_payments")
              .update({ qbo_payment_id })
              .eq("id", payment.id);

            console.log(`✅ Payment synced to QuickBooks: ${qbo_payment_id}`);
          }
        }
      } catch (qboError) {
        console.error("❌ Error syncing payment to QuickBooks:", qboError);
        // Don't fail the webhook - QBO sync is optional
      }
    }

    // Send confirmation email to tenant (optional)
    // This could trigger a separate email service or GHL workflow

    // Add note to GHL contact
    try {
      // Get agent's GHL credentials
      const { data: integration } = await supabase
        .from("integrations")
        .select("ghl_access_token")
        .eq("agent_id", payment.agent_id)
        .single();

      if (integration?.ghl_access_token) {
        const ghlClient = new GHLClient(integration.ghl_access_token);

        const fullAddress = payment.pm_leases?.pm_units?.unit_number
          ? `${payment.pm_leases.pm_properties?.address}, Unit ${payment.pm_leases.pm_units.unit_number}`
          : payment.pm_leases?.pm_properties?.address || "property";

        await ghlClient.addNote({
          contactId: payment.tenant_contact_id,
          body: `Rent payment received for ${fullAddress}. Amount: $${payment.amount}. Payment method: ${payment.payment_method || "unknown"}. Thank you!`,
        });

        console.log(`✅ Confirmation note added to tenant contact`);
      }
    } catch (noteError) {
      console.error("⚠️ Error adding note to contact:", noteError);
      // Don't fail the webhook, payment is already recorded
    }

    // Check if this payment was overdue and had late fees
    if (payment.late_fee_amount && payment.late_fee_amount > 0) {
      console.log(`ℹ️ Payment included late fee of $${payment.late_fee_amount}`);
      // Could trigger a separate process to waive or apply late fee
    }

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      payment_id: payment.id,
    });
  } catch (error) {
    console.error("❌ Error in invoice paid webhook:", error);
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
 * Map GHL payment method to our internal format
 */
function mapGHLPaymentMethod(ghlMethod: string | undefined): string {
  if (!ghlMethod) return "other";

  const methodMap: Record<string, string> = {
    card: "stripe",
    credit_card: "stripe",
    ach: "bank_transfer",
    bank_account: "bank_transfer",
    check: "check",
    cash: "cash",
    paypal: "paypal",
  };

  return methodMap[ghlMethod.toLowerCase()] || "other";
}
