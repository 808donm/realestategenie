import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/tenant/login");
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
    .eq("id", id)
    .single();

  if (!payment) {
    redirect("/tenant/invoices");
  }

  // Verify tenant owns this payment
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("lease_id")
    .eq("id", userData.user.id)
    .single();

  if (!tenantUser || tenantUser.lease_id !== payment.lease_id) {
    redirect("/tenant/invoices");
  }

  const property = payment.pm_leases?.pm_properties;
  const unit = payment.pm_leases?.pm_units;
  const fullAddress = unit?.unit_number
    ? `${property?.address}, Unit ${unit.unit_number}`
    : property?.address;

  const totalAmount = parseFloat(payment.amount.toString()) + parseFloat((payment.late_fee_amount || 0).toString());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Payment Confirmation</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-muted-foreground">
              Your rent payment has been processed successfully.
            </div>

            <div className="border-t border-b py-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Property</span>
                <span className="font-medium">{fullAddress}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Period</span>
                <span className="font-medium">
                  {new Date(payment.due_date).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-bold text-lg">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Date</span>
                <span className="font-medium">
                  {payment.paid_at
                    ? new Date(payment.paid_at).toLocaleDateString()
                    : new Date().toLocaleDateString()}
                </span>
              </div>
              {payment.payment_method && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="font-medium capitalize">{payment.payment_method}</span>
                </div>
              )}
              {payment.payment_reference && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-xs">{payment.payment_reference}</span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg text-sm text-left">
              <strong>What's next?</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>A receipt has been sent to your email</li>
                <li>Your property manager has been notified</li>
                <li>This payment is now reflected in your payment history</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-center">
              <Link href="/tenant/dashboard">
                <Button>Return to Dashboard</Button>
              </Link>
              <Link href="/tenant/invoices">
                <Button variant="outline">View Payment History</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
