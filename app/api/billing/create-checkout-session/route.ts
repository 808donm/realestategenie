import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-12-15.clover",
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan_id, billing_cycle } = await request.json();

    if (!plan_id) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    const isYearly = billing_cycle === "yearly";

    // Get the selected plan
    const { data: selectedPlan } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (!selectedPlan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Get agent details
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("email, display_name")
      .eq("id", userData.user.id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get or create Stripe customer
    const { data: existingSubscription } = await supabaseAdmin
      .from("agent_subscriptions")
      .select("stripe_customer_id")
      .eq("agent_id", userData.user.id)
      .single();

    let customerId = existingSubscription?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: agent.email,
        name: agent.display_name || agent.email,
        metadata: {
          agent_id: userData.user.id,
        },
      });
      customerId = customer.id;
    }

    // Resolve the Stripe price ID
    // Priority: 1) Cached price ID  2) Look up from product ID  3) Create new price
    let priceId = isYearly ? selectedPlan.stripe_yearly_price_id : selectedPlan.stripe_price_id;

    if (!priceId) {
      // Try to look up price from the Stripe product ID
      const productId = isYearly
        ? selectedPlan.stripe_yearly_product_id
        : selectedPlan.stripe_monthly_product_id;

      if (productId) {
        const prices = await stripe.prices.list({
          product: productId,
          active: true,
          type: "recurring",
          limit: 1,
        });
        if (prices.data.length > 0) {
          priceId = prices.data[0].id;
          // Cache the resolved price ID
          const updateField = isYearly ? "stripe_yearly_price_id" : "stripe_price_id";
          await supabaseAdmin
            .from("subscription_plans")
            .update({ [updateField]: priceId })
            .eq("id", plan_id);
        }
      }
    }

    if (!priceId) {
      // Fallback: create a new price (legacy behavior)
      const price = await stripe.prices.create({
        currency: "usd",
        unit_amount: Math.round(
          (isYearly ? (selectedPlan.annual_price || selectedPlan.monthly_price * 12) : selectedPlan.monthly_price) * 100
        ),
        recurring: { interval: isYearly ? "year" : "month" },
        product_data: {
          name: selectedPlan.name,
          metadata: { plan_id: selectedPlan.id, tier_level: selectedPlan.tier_level.toString() },
        },
      });
      priceId = price.id;
      const updateField = isYearly ? "stripe_yearly_price_id" : "stripe_price_id";
      await supabaseAdmin
        .from("subscription_plans")
        .update({ [updateField]: priceId })
        .eq("id", plan_id);
    }

    // Check if customer already has an active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    let mode: "subscription" | "payment" = "subscription";
    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (subscriptions.data.length > 0) {
      // Customer has existing subscription - update it
      const existingStripeSubscription = subscriptions.data[0];

      // Create checkout session for subscription update
      sessionParams = {
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            agent_id: userData.user.id,
            plan_id: selectedPlan.id,
          },
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing/checkout?plan=${plan_id}&canceled=true`,
        metadata: {
          agent_id: userData.user.id,
          plan_id: selectedPlan.id,
          action: "update",
          existing_subscription_id: existingStripeSubscription.id,
        },
      };
    } else {
      // New subscription
      sessionParams = {
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            agent_id: userData.user.id,
            plan_id: selectedPlan.id,
          },
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing/checkout?plan=${plan_id}&canceled=true`,
        metadata: {
          agent_id: userData.user.id,
          plan_id: selectedPlan.id,
          action: "create",
        },
      };
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
