import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Create Stripe Checkout Session
 *
 * Creates a Stripe Checkout session for rent payment
 * Redirects tenant to Stripe's hosted payment page
 *
 * POST /api/tenant/payments/create-checkout-session
 * Body: { payment_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payment_id } = await request.json();

    if (!payment_id) {
      return NextResponse.json({ error: "payment_id is required" }, { status: 400 });
    }

    // Get payment details
    const { data: payment } = await supabase
      .from("pm_rent_payments")
      .select(`
        *,
        pm_leases (
          id,
          pm_properties (address),
          pm_units (unit_number)
        )
      `)
      .eq("id", payment_id)
      .single();

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verify tenant owns this payment
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("lease_id, email")
      .eq("id", userData.user.id)
      .single();

    if (!tenantUser || tenantUser.lease_id !== payment.lease_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if already paid
    if (payment.status === "paid") {
      return NextResponse.json({ error: "Payment already processed" }, { status: 400 });
    }

    // Calculate total amount
    const totalAmount = parseFloat(payment.amount.toString()) + parseFloat((payment.late_fee_amount || 0).toString());

    // Build property description
    const property = payment.pm_leases?.pm_properties;
    const unit = payment.pm_leases?.pm_units;
    const fullAddress = unit?.unit_number
      ? `${property?.address}, Unit ${unit.unit_number}`
      : property?.address;

    const description = `${new Date(payment.due_date).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })} Rent - ${fullAddress}`;

    // Initialize Stripe
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: tenantUser.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Monthly Rent",
              description: description,
            },
            unit_amount: Math.round(payment.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
        ...(payment.late_fee_amount && payment.late_fee_amount > 0
          ? [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Late Fee",
                    description: "Late payment fee",
                  },
                  unit_amount: Math.round(payment.late_fee_amount * 100),
                },
                quantity: 1,
              },
            ]
          : []),
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices/${payment_id}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices/${payment_id}/pay`,
      metadata: {
        payment_id: payment.id,
        lease_id: payment.lease_id,
        tenant_user_id: userData.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error("Error creating Stripe Checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
