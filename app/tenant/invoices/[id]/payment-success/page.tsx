import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import TenantNav from "../../../components/tenant-nav";
import { createPayPalClient } from "@/lib/integrations/paypal-client";
import { createStripeClient } from "@/lib/integrations/stripe-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PaymentSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; session_id?: string; payment_type?: string }>;
}) {
  const { id } = await params;
  const { token, session_id, payment_type } = await searchParams;

  // Determine payment method
  const isStripePayment = payment_type === "stripe" || session_id;
  const isPayPalPayment = token;

  if (!isStripePayment && !isPayPalPayment) {
    redirect(`/tenant/invoices/${id}/pay?error=no_payment_data`);
  }

  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/tenant/login");
  }

  // Get invoice
  const { data: invoice } = await supabase
    .from("pm_rent_payments")
    .select("*, pm_leases (agent_id)")
    .eq("id", id)
    .single();

  if (!invoice) {
    redirect("/tenant/invoices");
  }

  // If already processed, show success
  if (invoice.status === "paid" && (invoice.paypal_payment_id || invoice.stripe_payment_intent_id)) {
    const paymentId = invoice.paypal_payment_id || invoice.stripe_payment_intent_id;
    return (
      <div className="min-h-screen bg-gray-50">
        <TenantNav />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
                Payment Successful!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Your payment has been processed successfully.</p>
              <p className="text-sm text-muted-foreground">
                Payment ID: {paymentId}
              </p>
              <Link href="/tenant/invoices">
                <Button className="w-full">View All Invoices</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Capture the payment
  try {
    let paymentId = "";
    let paymentAmount = invoice.amount;

    if (isStripePayment && session_id) {
      // Handle Stripe payment (using admin client to bypass RLS)
      const leaseData = Array.isArray(invoice.pm_leases) ? invoice.pm_leases[0] : invoice.pm_leases;
      const { data: stripeIntegration } = await supabaseAdmin
        .from("integrations")
        .select("config")
        .eq("agent_id", leaseData.agent_id)
        .eq("provider", "stripe")
        .eq("status", "connected")
        .single();

      if (!stripeIntegration?.config) {
        throw new Error("Stripe not configured");
      }

      const stripeClient = createStripeClient(stripeIntegration.config);

      // Retrieve the session to confirm payment
      const session = await stripeClient.getCheckoutSession(session_id);

      if (session.payment_status !== "paid") {
        throw new Error("Payment not completed");
      }

      paymentId = session.payment_intent;

      // Update invoice as paid (using admin client to bypass RLS)
      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from("pm_rent_payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "stripe",
          stripe_payment_intent_id: session.payment_intent,
        })
        .eq("id", id)
        .select();

      if (updateError) {
        console.error("❌ Error updating invoice:", updateError);
        throw new Error(`Failed to update invoice: ${updateError.message}`);
      }

      console.log("✅ Stripe payment captured and invoice updated:", id, updateResult);
    } else if (isPayPalPayment && token) {
      // Handle PayPal payment (using admin client to bypass RLS)
      const leaseData = Array.isArray(invoice.pm_leases) ? invoice.pm_leases[0] : invoice.pm_leases;
      const { data: paypalIntegration } = await supabaseAdmin
        .from("integrations")
        .select("config")
        .eq("agent_id", leaseData.agent_id)
        .eq("provider", "paypal")
        .eq("status", "connected")
        .single();

      if (!paypalIntegration?.config) {
        throw new Error("PayPal not configured");
      }

      const paypalClient = createPayPalClient(paypalIntegration.config);

      // Capture the order
      const capturedOrder = await paypalClient.captureOrder(token);
      paymentId = capturedOrder.id;

      // Update invoice as paid (using admin client to bypass RLS)
      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from("pm_rent_payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "paypal",
          paypal_payment_id: capturedOrder.id,
        })
        .eq("id", id)
        .select();

      if (updateError) {
        console.error("❌ Error updating invoice:", updateError);
        throw new Error(`Failed to update invoice: ${updateError.message}`);
      }

      console.log("✅ PayPal payment captured and invoice updated:", id, updateResult);
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <TenantNav />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
                Payment Successful!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Your payment of ${parseFloat(paymentAmount.toString()).toFixed(2)} has been processed successfully.</p>
              <p className="text-sm text-muted-foreground">
                Payment ID: {paymentId}
              </p>
              <p className="text-sm text-muted-foreground">
                Thank you for your payment. You will receive a confirmation email shortly.
              </p>
              <Link href="/tenant/invoices">
                <Button className="w-full">View All Invoices</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Payment capture error:", error);

    return (
      <div className="min-h-screen bg-gray-50">
        <TenantNav />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Payment Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>There was an error processing your payment. Please try again or contact support.</p>
              <Link href={`/tenant/invoices/${id}/pay`}>
                <Button className="w-full">Try Again</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
}
