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

/**
 * PM Add-on Checkout API
 *
 * POST: Creates a Stripe checkout session for a PM add-on plan
 *
 * Body: { pm_addon_plan_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pm_addon_plan_id } = await request.json();

    if (!pm_addon_plan_id) {
      return NextResponse.json(
        { error: "PM add-on plan ID is required" },
        { status: 400 }
      );
    }

    // Get the selected PM add-on plan
    const { data: addonPlan } = await supabaseAdmin
      .from("pm_addon_plans")
      .select("*")
      .eq("id", pm_addon_plan_id)
      .single();

    if (!addonPlan) {
      return NextResponse.json(
        { error: "PM add-on plan not found" },
        { status: 404 }
      );
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

    // Check if agent already has an active PM add-on
    const { data: existingAddon } = await supabaseAdmin
      .from("pm_addon_subscriptions")
      .select("id, pm_addon_plan_id, status")
      .eq("agent_id", userData.user.id)
      .eq("status", "active")
      .maybeSingle();

    // Get or create Stripe customer
    const { data: existingSubscription } = await supabaseAdmin
      .from("agent_subscriptions")
      .select("stripe_customer_id")
      .eq("agent_id", userData.user.id)
      .single();

    let customerId = existingSubscription?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: agent.email,
        name: agent.display_name || agent.email,
        metadata: { agent_id: userData.user.id },
      });
      customerId = customer.id;
    }

    // Resolve the Stripe price from the product ID
    let priceId = addonPlan.stripe_price_id;

    if (!priceId && addonPlan.stripe_product_id) {
      // Look up the default price from the Stripe product
      const prices = await stripe.prices.list({
        product: addonPlan.stripe_product_id,
        active: true,
        type: "recurring",
        limit: 1,
      });

      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
        // Cache the price ID for future use
        await supabaseAdmin
          .from("pm_addon_plans")
          .update({ stripe_price_id: priceId })
          .eq("id", pm_addon_plan_id);
      } else {
        return NextResponse.json(
          { error: "No active price found for this PM plan. Please contact support." },
          { status: 500 }
        );
      }
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured for this PM plan" },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          agent_id: userData.user.id,
          pm_addon_plan_id: addonPlan.id,
          type: "pm_addon",
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing?pm_addon=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing?pm_addon=canceled`,
      metadata: {
        agent_id: userData.user.id,
        pm_addon_plan_id: addonPlan.id,
        type: "pm_addon",
        existing_addon_id: existingAddon?.id || "",
      },
    });

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error: any) {
    console.error("Error creating PM add-on checkout session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
