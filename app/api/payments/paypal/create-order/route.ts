import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createPayPalClient } from "@/lib/integrations/paypal-client";

/**
 * Create PayPal Order for Invoice Payment
 * POST /api/payments/paypal/create-order
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
      .select("lease_id")
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

    // Get agent's PayPal integration (using admin client to bypass RLS)
    const leaseData = Array.isArray(invoice.pm_leases) ? invoice.pm_leases[0] : invoice.pm_leases;

    console.log("Looking for PayPal integration for agent_id:", leaseData?.agent_id);

    const { data: paypalIntegration, error: integrationError } = await supabaseAdmin
      .from("integrations")
      .select("config")
      .eq("agent_id", leaseData.agent_id)
      .eq("provider", "paypal")
      .eq("status", "connected")
      .single();

    console.log("PayPal integration found:", !!paypalIntegration, "Error:", integrationError);

    if (!paypalIntegration?.config) {
      return NextResponse.json(
        { error: "PayPal not configured. Please contact your property manager." },
        { status: 400 }
      );
    }

    // Create PayPal client
    const paypalClient = createPayPalClient(paypalIntegration.config);

    // Create PayPal order
    const order = await paypalClient.createOrder({
      amount: parseFloat(amount.toString()),
      reference_id: invoice_id,
      description: description || `Invoice ${invoice_id}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices/${invoice_id}/payment-success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices/${invoice_id}/pay?cancelled=true`,
    });

    // Store PayPal order ID in invoice
    await supabase
      .from("pm_rent_payments")
      .update({ paypal_order_id: order.id })
      .eq("id", invoice_id);

    // Get approval URL
    const approvalUrl = paypalClient.getApprovalUrl(order);

    if (!approvalUrl) {
      throw new Error("No approval URL returned from PayPal");
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      approval_url: approvalUrl,
    });
  } catch (error) {
    console.error("PayPal order creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create PayPal order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
