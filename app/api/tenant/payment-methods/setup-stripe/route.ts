import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify this is a tenant account
    const userMetadata = user.user_metadata;
    if (userMetadata?.role !== "tenant") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Implement Stripe SetupIntent creation
    // This is a placeholder for the actual Stripe integration
    //
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    //
    // // Create or retrieve Stripe customer
    // const customer = await stripe.customers.create({
    //   email: user.email,
    //   metadata: {
    //     tenant_user_id: user.id,
    //   },
    // });
    //
    // // Create SetupIntent
    // const setupIntent = await stripe.setupIntents.create({
    //   customer: customer.id,
    //   payment_method_types: ['card'],
    // });
    //
    // return NextResponse.json({
    //   clientSecret: setupIntent.client_secret,
    //   setupIntentId: setupIntent.id,
    // });

    return NextResponse.json(
      {
        error: "Stripe integration not configured. Please set up STRIPE_SECRET_KEY in environment variables."
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error in POST /api/tenant/payment-methods/setup-stripe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
