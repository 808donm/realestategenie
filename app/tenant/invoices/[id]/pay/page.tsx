import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PaymentForm from "./payment-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PayInvoicePage({
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
  const { data: payment, error } = await supabase
    .from("pm_rent_payments")
    .select(`
      *,
      pm_leases (
        id,
        pm_properties (address),
        pm_units (unit_number),
        agent_id
      )
    `)
    .eq("id", id)
    .single();

  if (error || !payment) {
    redirect("/tenant/invoices");
  }

  // Verify this is the tenant's payment
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("lease_id")
    .eq("id", userData.user.id)
    .single();

  if (!tenantUser || tenantUser.lease_id !== payment.lease_id) {
    redirect("/tenant/invoices");
  }

  // Check if already paid
  if (payment.status === "paid") {
    redirect("/tenant/invoices");
  }

  const totalAmount = parseFloat(payment.amount.toString()) + parseFloat((payment.late_fee_amount || 0).toString());

  // Get saved payment methods
  const { data: paymentMethods } = await supabase
    .from("tenant_payment_methods")
    .select("*")
    .eq("tenant_user_id", userData.user.id)
    .order("is_default", { ascending: false });

  const property = payment.pm_leases?.pm_properties;
  const unit = payment.pm_leases?.pm_units;
  const fullAddress = unit?.unit_number
    ? `${property?.address}, Unit ${unit.unit_number}`
    : property?.address;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/tenant/invoices">
              <Button variant="ghost" size="sm">
                ← Back to Invoices
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Pay Rent</h1>
              <p className="text-muted-foreground text-sm">{fullAddress}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(payment.due_date).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Rent</span>
                  <span className="font-semibold">${payment.amount.toFixed(2)}</span>
                </div>
                {payment.late_fee_amount && payment.late_fee_amount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Late Fee</span>
                    <span className="font-semibold">
                      ${payment.late_fee_amount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>Total Due</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Due: {new Date(payment.due_date).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-2">
            <PaymentForm
              paymentId={payment.id}
              amount={totalAmount}
              savedPaymentMethods={paymentMethods || []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
