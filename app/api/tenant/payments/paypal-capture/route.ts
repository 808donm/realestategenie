import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * PayPal Order Capture
 *
 * Handles the return from PayPal after user approves payment
 * Captures the payment and updates the rent payment status
 *
 * GET /api/tenant/payments/paypal-capture?payment_id=xxx&token=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const payment_id = searchParams.get("payment_id");
    const paypalToken = searchParams.get("token"); // PayPal order ID

    if (!payment_id || !paypalToken) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices?error=missing_params`);
    }

    const supabase = await supabaseServer();

    // Get payment details
    const { data: payment } = await supabase
      .from("pm_rent_payments")
      .select("*, pm_leases(agent_id)")
      .eq("id", payment_id)
      .single();

    if (!payment) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices?error=payment_not_found`);
    }

    // Check if already paid
    if (payment.status === "paid") {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices/${payment_id}/success`);
    }

    // Initialize PayPal
    const paypal = require("@paypal/checkout-server-sdk");

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const environment =
      process.env.PAYPAL_MODE === "live"
        ? new paypal.core.LiveEnvironment(clientId, clientSecret)
        : new paypal.core.SandboxEnvironment(clientId, clientSecret);

    const client = new paypal.core.PayPalHttpClient(environment);

    // Capture the order
    const captureRequest = new paypal.orders.OrdersCaptureRequest(paypalToken);
    captureRequest.requestBody({});

    const captureResponse = await client.execute(captureRequest);
    const captureResult = captureResponse.result;

    // Verify capture was successful
    if (captureResult.status !== "COMPLETED") {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices/${payment_id}/pay?error=payment_failed`
      );
    }

    // Get transaction ID from capture
    const captureId = captureResult.purchase_units[0]?.payments?.captures?.[0]?.id || paypalToken;

    // Update payment status in database
    const { error: updateError } = await supabase
      .from("pm_rent_payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: "paypal",
        payment_reference: captureId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment_id);

    if (updateError) {
      console.error("Error updating payment:", updateError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices/${payment_id}/pay?error=update_failed`
      );
    }

    // Mark invoice as paid in GHL
    try {
      if (payment.ghl_invoice_id) {
        const { data: integration } = await supabase
          .from("integrations")
          .select("ghl_access_token")
          .eq("agent_id", payment.pm_leases.agent_id)
          .single();

        if (integration?.ghl_access_token) {
          const { GHLClient } = require("@/lib/integrations/ghl-client");
          const ghlClient = new GHLClient(integration.ghl_access_token);

          await ghlClient.markInvoicePaid(payment.ghl_invoice_id, {
            paymentMethod: "paypal",
            transactionId: captureId,
          });
        }
      }
    } catch (ghlError) {
      console.error("Error updating GHL invoice:", ghlError);
      // Don't fail the payment, just log
    }

    // Redirect to success page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices/${payment_id}/success`);
  } catch (error) {
    console.error("Error capturing PayPal payment:", error);
    const payment_id = request.nextUrl.searchParams.get("payment_id");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices/${payment_id}/pay?error=capture_failed`
    );
  }
}
