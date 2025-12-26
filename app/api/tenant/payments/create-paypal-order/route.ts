import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Create PayPal Order
 *
 * Creates a PayPal order for rent payment
 * Returns approval URL for redirect to PayPal
 *
 * POST /api/tenant/payments/create-paypal-order
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

    // Initialize PayPal
    const paypal = require("@paypal/checkout-server-sdk");

    // Configure PayPal environment
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const environment =
      process.env.PAYPAL_MODE === "live"
        ? new paypal.core.LiveEnvironment(clientId, clientSecret)
        : new paypal.core.SandboxEnvironment(clientId, clientSecret);

    const client = new paypal.core.PayPalHttpClient(environment);

    // Create PayPal order
    const orderRequest = new paypal.orders.OrdersCreateRequest();
    orderRequest.prefer("return=representation");
    orderRequest.requestBody({
      intent: "CAPTURE",
      application_context: {
        brand_name: "Real Estate Genie",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/tenant/payments/paypal-capture?payment_id=${payment_id}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/tenant/invoices/${payment_id}/pay`,
      },
      purchase_units: [
        {
          reference_id: payment.id,
          description: description,
          amount: {
            currency_code: "USD",
            value: totalAmount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: totalAmount.toFixed(2),
              },
            },
          },
          items: [
            {
              name: "Monthly Rent",
              description: description,
              unit_amount: {
                currency_code: "USD",
                value: payment.amount.toFixed(2),
              },
              quantity: "1",
            },
            ...(payment.late_fee_amount && payment.late_fee_amount > 0
              ? [
                  {
                    name: "Late Fee",
                    description: "Late payment fee",
                    unit_amount: {
                      currency_code: "USD",
                      value: payment.late_fee_amount.toFixed(2),
                    },
                    quantity: "1",
                  },
                ]
              : []),
          ],
        },
      ],
    });

    const orderResponse = await client.execute(orderRequest);
    const orderId = orderResponse.result.id;

    // Find approval URL
    const approvalUrl = orderResponse.result.links.find(
      (link: any) => link.rel === "approve"
    )?.href;

    if (!approvalUrl) {
      throw new Error("PayPal approval URL not found");
    }

    return NextResponse.json({
      success: true,
      order_id: orderId,
      approval_url: approvalUrl,
    });
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    return NextResponse.json(
      { error: "Failed to create PayPal order", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
