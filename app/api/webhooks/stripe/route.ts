import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for payment processing
 * Events: checkout.session.completed, payment_intent.succeeded
 *
 * POST /api/webhooks/stripe
 */

// Use service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Get the signature from headers
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Get raw body
    const body = await request.text();

    let event;

    // Verify webhook signature
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log("Stripe webhook event:", event.type);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const paymentId = session.metadata?.payment_id;

        if (!paymentId) {
          console.error("No payment_id in session metadata");
          break;
        }

        // Get payment details
        const { data: payment } = await supabase
          .from("pm_rent_payments")
          .select("*, pm_leases(agent_id)")
          .eq("id", paymentId)
          .single();

        if (!payment) {
          console.error("Payment not found:", paymentId);
          break;
        }

        // Update payment status
        const { error: updateError } = await supabase
          .from("pm_rent_payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            payment_method: "stripe",
            payment_reference: session.payment_intent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentId);

        if (updateError) {
          console.error("Error updating payment:", updateError);
          break;
        }

        console.log(`✅ Payment ${paymentId} marked as paid via Stripe Checkout`);

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
                paymentMethod: "stripe",
                transactionId: session.payment_intent,
              });

              console.log(`✅ GHL invoice ${payment.ghl_invoice_id} marked as paid`);
            }
          }
        } catch (ghlError) {
          console.error("Error updating GHL invoice:", ghlError);
        }

        break;
      }

      case "payment_intent.succeeded": {
        // Handle direct payment intent success (for saved payment methods)
        const paymentIntent = event.data.object;
        const paymentId = paymentIntent.metadata?.payment_id;

        if (paymentId) {
          console.log(`✅ Payment Intent succeeded for payment ${paymentId}`);
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const paymentId = paymentIntent.metadata?.payment_id;

        if (paymentId) {
          console.log(`❌ Payment Intent failed for payment ${paymentId}`);
          // Could add logic to notify tenant of failed payment
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Stripe webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
