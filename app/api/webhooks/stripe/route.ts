import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`Received Stripe webhook: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const agentId = session.metadata?.agent_id;
  const planId = session.metadata?.plan_id;

  if (!agentId || !planId) {
    console.error("Missing metadata in checkout session");
    return;
  }

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  // Get plan details
  const { data: plan } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (!plan) {
    console.error("Plan not found:", planId);
    return;
  }

  // Get or create subscription record
  const { data: existingSubscription } = await supabaseAdmin
    .from("agent_subscriptions")
    .select("id")
    .eq("agent_id", agentId)
    .single();

  const subscriptionData = {
    agent_id: agentId,
    subscription_plan_id: planId,
    status: "active" as const,
    monthly_price: plan.monthly_price,
    billing_cycle: "monthly" as const,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  if (existingSubscription) {
    // Update existing subscription
    await supabaseAdmin
      .from("agent_subscriptions")
      .update({
        ...subscriptionData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingSubscription.id);
  } else {
    // Create new subscription
    await supabaseAdmin
      .from("agent_subscriptions")
      .insert(subscriptionData);
  }

  console.log(`Subscription activated for agent ${agentId} on plan ${plan.name}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const agentId = subscription.metadata?.agent_id;

  if (!agentId) {
    console.error("Missing agent_id in subscription metadata");
    return;
  }

  const status = subscription.status;

  // In Stripe API 2025-12-15.clover, period dates are in billing_cycle_anchor
  const subAny = subscription as any;
  const currentPeriodEnd = subAny.current_period_end
    ? new Date(subAny.current_period_end * 1000)
    : subAny.current_billing_cycle_end_at
    ? new Date(subAny.current_billing_cycle_end_at)
    : new Date();
  const currentPeriodStart = subAny.current_period_start
    ? new Date(subAny.current_period_start * 1000)
    : subAny.current_billing_cycle_start_at
    ? new Date(subAny.current_billing_cycle_start_at)
    : new Date();

  await supabaseAdmin
    .from("agent_subscriptions")
    .update({
      status: mapStripeStatus(status),
      stripe_subscription_id: subscription.id,
      current_period_start: currentPeriodStart.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      next_billing_date: currentPeriodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("agent_id", agentId)
    .eq("stripe_subscription_id", subscription.id);

  console.log(`Subscription updated for agent ${agentId}: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const agentId = subscription.metadata?.agent_id;

  if (!agentId) {
    console.error("Missing agent_id in subscription metadata");
    return;
  }

  await supabaseAdmin
    .from("agent_subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("agent_id", agentId)
    .eq("stripe_subscription_id", subscription.id);

  console.log(`Subscription canceled for agent ${agentId}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const invoiceAny = invoice as any;
  const subscriptionId = invoiceAny.subscription as string;
  const invoiceId = invoice.id;

  if (!subscriptionId) return;

  // Update latest invoice ID
  await supabaseAdmin
    .from("agent_subscriptions")
    .update({
      stripe_latest_invoice_id: invoiceId,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  console.log(`Invoice paid successfully: ${invoiceId}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const invoiceAny = invoice as any;
  const subscriptionId = invoiceAny.subscription as string;

  if (!subscriptionId) return;

  // Mark subscription as past_due
  await supabaseAdmin
    .from("agent_subscriptions")
    .update({
      status: "past_due",
      stripe_latest_invoice_id: invoice.id,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  console.log(`Invoice payment failed: ${invoice.id}`);
}

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    unpaid: "past_due",
    canceled: "canceled",
    incomplete: "pending",
    incomplete_expired: "canceled",
    trialing: "active",
    paused: "paused",
  };

  return statusMap[stripeStatus] || "active";
}
