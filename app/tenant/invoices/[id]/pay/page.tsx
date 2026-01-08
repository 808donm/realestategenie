import { supabaseServer } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import TenantNav from "@/app/tenant/components/tenant-nav";
import PayPalPaymentButton from "./paypal-payment-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TenantPaymentPage({
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

  // Get tenant user
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("*, pm_leases (id)")
    .eq("id", userData.user.id)
    .single();

  if (!tenantUser) {
    redirect("/tenant/dashboard");
  }

  // Get invoice details
  const { data: payment, error } = await supabase
    .from("pm_rent_payments")
    .select(\`
      *,
      pm_leases (
        id,
        tenant_name,
        pm_properties (address, city, state_province),
        pm_units (unit_number)
      )
    \`)
    .eq("id", id)
    .eq("lease_id", tenantUser.pm_leases.id)
    .single();

  if (error || !payment) {
    notFound();
  }

  // Check if already paid
  if (payment.status === "paid") {
    redirect("/tenant/invoices");
  }

  const lease = payment.pm_leases;
  const property = Array.isArray(lease?.pm_properties) ? lease.pm_properties[0] : lease?.pm_properties;
  const unit = Array.isArray(lease?.pm_units) ? lease.pm_units[0] : lease?.pm_units;
  const propertyAddress = property?.address || "Property";
  const fullAddress = unit ? \`\${propertyAddress}, Unit \${unit.unit_number}\` : propertyAddress;

  const dueDate = new Date(payment.due_date);
  const isOverdue = payment.status === "pending" && dueDate < new Date();
  const totalAmount = parseFloat(payment.amount.toString()) + parseFloat((payment.late_fee_amount || 0).toString());

  const paymentTypeLabels = {
    monthly: "Monthly Rent",
    move_in: "Move-In Charges",
    late_fee: "Late Fee",
    other: "Other",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TenantNav />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Back Button */}
        <Link href="/tenant/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>

        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold">Pay Invoice</h1>
          <p className="text-muted-foreground">Complete your payment securely via PayPal</p>
        </div>

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Invoice Details</span>
              {isOverdue && (
                <Badge variant="destructive">Overdue</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Property</div>
              <div className="font-medium">{fullAddress}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Type</div>
              <div className="font-medium">
                {paymentTypeLabels[payment.payment_type as keyof typeof paymentTypeLabels] || payment.payment_type}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Period</div>
              <div className="font-medium">
                {new Date(payment.year, payment.month - 1).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Due Date</div>
              <div className={\`font-medium \${isOverdue ? "text-red-600" : ""}\`}>
                {dueDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                {isOverdue && " (Overdue)"}
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rent Amount</span>
                <span className="font-medium">\${parseFloat(payment.amount.toString()).toFixed(2)}</span>
              </div>
              {payment.late_fee_amount && payment.late_fee_amount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Late Fee</span>
                  <span className="font-medium">\${parseFloat(payment.late_fee_amount.toString()).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total Due</span>
                <span>\${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PayPalPaymentButton
              invoiceId={payment.id}
              amount={totalAmount}
              description={\`\${paymentTypeLabels[payment.payment_type as keyof typeof paymentTypeLabels]} - \${fullAddress}\`}
            />
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-sm text-muted-foreground text-center">
          <p>🔒 Your payment is processed securely through PayPal</p>
        </div>
      </div>
    </div>
  );
}
