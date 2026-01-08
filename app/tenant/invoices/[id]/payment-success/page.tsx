import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import TenantNav from "@/app/tenant/components/tenant-nav";
import { createPayPalClient } from "@/lib/integrations/paypal-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PaymentSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    redirect(`/tenant/invoices/${id}/pay?error=no_token`);
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
  if (invoice.status === "paid" && invoice.paypal_payment_id) {
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
                Payment ID: {invoice.paypal_payment_id}
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
    // Get agent's PayPal integration
    const { data: paypalIntegration } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", invoice.pm_leases.agent_id)
      .eq("provider", "paypal")
      .eq("status", "connected")
      .single();

    if (!paypalIntegration?.config) {
      throw new Error("PayPal not configured");
    }

    const paypalClient = createPayPalClient(paypalIntegration.config);

    // Capture the order
    const capturedOrder = await paypalClient.captureOrder(token);

    // Update invoice as paid
    await supabase
      .from("pm_rent_payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: "paypal",
        paypal_payment_id: capturedOrder.id,
      })
      .eq("id", id);

    console.log("✅ Payment captured and invoice updated:", id);

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
              <p>Your payment of ${parseFloat(invoice.amount.toString()).toFixed(2)} has been processed successfully.</p>
              <p className="text-sm text-muted-foreground">
                Payment ID: {capturedOrder.id}
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
