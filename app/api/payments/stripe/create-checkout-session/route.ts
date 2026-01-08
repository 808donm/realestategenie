import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createStripeClient } from "@/lib/integrations/stripe-client";

/**
 * Create Stripe Checkout Session for Invoice Payment
 * POST /api/payments/stripe/create-checkout-session
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { invoice_id, amount, description } = body;

    if (!invoice_id || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: invoice_id, amount" },
        { status: 400 }
      );
    }

    // Verify tenant has access to this invoice
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("lease_id, email")
      .eq("id", user.id)
      .single();

    if (!tenantUser?.lease_id) {
      return NextResponse.json({ error: "Not a tenant user" }, { status: 403 });
    }

    // Get invoice and verify ownership
    const { data: invoice, error: invoiceError } = await supabase
      .from("pm_rent_payments")
      .select("*, pm_leases!inner (agent_id)")
      .eq("id", invoice_id)
      .eq("lease_id", tenantUser.lease_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
    }

    // Get agent's Stripe integration (using admin client to bypass RLS)
    const leaseData = Array.isArray(invoice.pm_leases) ? invoice.pm_leases[0] : invoice.pm_leases;

    console.log("Looking for Stripe integration for agent_id:", leaseData?.agent_id);

    const { data: stripeIntegration, error: integrationError } = await supabaseAdmin
      .from("integrations")
      .select("config")
      .eq("agent_id", leaseData.agent_id)
      .eq("provider", "stripe")
      .eq("status", "connected")
      .single();

    console.log("Stripe integration found:", !!stripeIntegration, "Error:", integrationError);

    if (!stripeIntegration?.config) {
      return NextResponse.json(
        { error: "Stripe not configured. Please contact your property manager." },
        { status: 400 }
      );
    }

    // Create Stripe client
    const stripeClient = createStripeClient(stripeIntegration.config);

    // Create Stripe Checkout Session
    const session = await stripeClient.createCheckoutSession({
      amount: parseFloat(amount.toString()),
      reference_id: invoice_id,
      description: description || `Invoice ${invoice_id}`,
      customer_email: tenantUser.email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices/${invoice_id}/payment-success?session_id={CHECKOUT_SESSION_ID}&payment_type=stripe`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices/${invoice_id}/pay?cancelled=true`,
    });

    // Store Stripe session ID in invoice
    await supabase
      .from("pm_rent_payments")
      .update({ stripe_session_id: session.id })
      .eq("id", invoice_id);

    return NextResponse.json({
      success: true,
      session_id: session.id,
      checkout_url: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout session creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create Stripe checkout session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
