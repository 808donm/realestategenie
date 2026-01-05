import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Pay Rent with Saved Payment Method
 *
 * Charges the tenant's saved payment method (Stripe or PayPal)
 * and updates the rent payment status.
 *
 * POST /api/tenant/payments/pay
 * Body: { payment_id: string, payment_method_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payment_id, payment_method_id } = await request.json();

    if (!payment_id || !payment_method_id) {
      return NextResponse.json(
        { error: "payment_id and payment_method_id are required" },
        { status: 400 }
      );
    }

    // Get payment details
    const { data: payment } = await supabase
      .from("pm_rent_payments")
      .select("*, pm_leases(id, agent_id)")
      .eq("id", payment_id)
      .single();

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verify tenant owns this payment
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("lease_id")
      .eq("id", userData.user.id)
      .single();

    if (!tenantUser || tenantUser.lease_id !== payment.lease_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if already paid
    if (payment.status === "paid") {
      return NextResponse.json({ error: "Payment already processed" }, { status: 400 });
    }

    // Get payment method
    const { data: paymentMethod } = await supabase
      .from("tenant_payment_methods")
      .select("*")
      .eq("id", payment_method_id)
      .eq("tenant_user_id", userData.user.id)
      .single();

    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    // Calculate total amount (rent + late fee)
    const totalAmount = parseFloat(payment.amount.toString()) + parseFloat((payment.late_fee_amount || 0).toString());

    let paymentReference = "";
    let paymentStatus = "paid";

    // Process payment based on provider
    if (paymentMethod.provider === "stripe") {
      // Process Stripe payment
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100), // Convert to cents
          currency: "usd",
          customer: paymentMethod.stripe_customer_id,
          payment_method: paymentMethod.stripe_payment_method_id,
          confirm: true,
          automatic_payment_methods: { enabled: true, allow_redirects: "never" },
          metadata: {
            payment_id: payment.id,
            lease_id: payment.lease_id,
          },
        });

        if (paymentIntent.status === "succeeded") {
          paymentReference = paymentIntent.id;
        } else {
          return NextResponse.json(
            { error: "Payment failed. Please try again or use a different payment method." },
            { status: 400 }
          );
        }
      } catch (stripeError: any) {
        console.error("Stripe payment error:", stripeError);
        return NextResponse.json(
          { error: stripeError.message || "Payment failed" },
          { status: 400 }
        );
      }
    } else if (paymentMethod.provider === "paypal") {
      // Process PayPal payment using billing agreement
      // Note: This requires PayPal Reference Transactions to be enabled
      return NextResponse.json(
        { error: "PayPal saved payments not yet implemented. Please use PayPal checkout." },
        { status: 400 }
      );
    }

    // Update payment status in database
    const { error: updateError } = await supabase
      .from("pm_rent_payments")
      .update({
        status: paymentStatus,
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod.provider,
        payment_reference: paymentReference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment_id);

    if (updateError) {
      console.error("Error updating payment:", updateError);
      return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 });
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
            paymentMethod: paymentMethod.provider,
            transactionId: paymentReference,
          });
        }
      }
    } catch (ghlError) {
      console.error("Error updating GHL invoice:", ghlError);
      // Don't fail the payment, just log
    }

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
      payment_id: payment.id,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
