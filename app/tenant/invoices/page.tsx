import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TenantInvoicesPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/tenant/login");
  }

  // Get tenant user and lease
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select(`
      *,
      pm_leases (
        id,
        pm_properties (address),
        pm_units (unit_number)
      )
    `)
    .eq("id", userData.user.id)
    .single();

  if (!tenantUser) {
    redirect("/tenant/dashboard");
  }

  const lease = tenantUser.pm_leases;

  // Get all rent payments for this lease
  const { data: payments } = await supabase
    .from("pm_rent_payments")
    .select("*")
    .eq("lease_id", lease.id)
    .order("due_date", { ascending: false });

  const statusColors = {
    paid: "bg-green-100 text-green-800",
    pending: "bg-blue-100 text-blue-800",
    overdue: "bg-red-100 text-red-800",
    void: "bg-gray-100 text-gray-800",
    partial: "bg-yellow-100 text-yellow-800",
  };

  // Calculate totals
  const totalPaid = payments
    ?.filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;

  const totalOutstanding = payments
    ?.filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()) + parseFloat((p.late_fee_amount || 0).toString()), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/tenant/dashboard">
              <Button variant="ghost" size="sm">
                ← Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Payment History</h1>
              <p className="text-muted-foreground text-sm">
                View and pay your rent invoices
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${totalPaid.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ${totalOutstanding.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {payments?.filter((p) => p.status === "pending" || p.status === "overdue").length || 0} unpaid
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invoices List */}
        <Card>
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {!payments || payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invoices yet
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => {
                  const dueDate = new Date(payment.due_date);
                  const isOverdue = payment.status === "pending" && dueDate < new Date();
                  const totalAmount = parseFloat(payment.amount.toString()) + parseFloat((payment.late_fee_amount || 0).toString());

                  return (
                    <div
                      key={payment.id}
                      className={`p-4 border rounded-lg ${
                        isOverdue ? "border-red-200 bg-red-50" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold">
                            {new Date(payment.due_date).toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            })}{" "}
                            Rent
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Due: {dueDate.toLocaleDateString()}
                          </div>
                          {payment.paid_at && (
                            <div className="text-sm text-green-600">
                              Paid: {new Date(payment.paid_at).toLocaleDateString()}
                              {payment.payment_method && ` via ${payment.payment_method}`}
                            </div>
                          )}
                          {payment.late_fee_amount && payment.late_fee_amount > 0 && (
                            <div className="text-sm text-red-600 mt-1">
                              Late fee: ${payment.late_fee_amount.toFixed(2)}
                            </div>
                          )}
                          {payment.ghl_invoice_id && (
                            <div className="text-sm text-blue-600 mt-1">
                              <a
                                href={`https://payments.msgsndr.com/invoice/${payment.ghl_invoice_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                View Invoice →
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            ${totalAmount.toFixed(2)}
                          </div>
                          <Badge className={statusColors[payment.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                            {payment.status.toUpperCase()}
                          </Badge>
                          {payment.status === "pending" || payment.status === "overdue" ? (
                            <>
                              {payment.ghl_invoice_id ? (
                                <a
                                  href={`https://payments.msgsndr.com/invoice/${payment.ghl_invoice_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button size="sm" className="mt-2 w-full">
                                    Pay via PayPal →
                                  </Button>
                                </a>
                              ) : (
                                <Link href={`/tenant/invoices/${payment.id}/pay`}>
                                  <Button size="sm" className="mt-2 w-full">
                                    Pay Now
                                  </Button>
                                </Link>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Link */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Manage Payment Methods</p>
                <p className="text-sm text-muted-foreground">
                  Add credit card, bank account, or PayPal
                </p>
              </div>
              <Link href="/tenant/payment-methods">
                <Button variant="outline">Manage</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
