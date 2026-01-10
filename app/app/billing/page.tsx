import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreditCard, FileText, DollarSign, Calendar, CheckCircle, Check, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{ success?: string; session_id?: string; canceled?: string }>;
};

export default async function BillingPage({ searchParams }: PageProps) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const showSuccess = params.success === "true";
  const showCanceled = params.canceled === "true";

  // Get agent's subscription
  const { data: subscription } = await supabase
    .from("agent_subscriptions")
    .select("*")
    .eq("agent_id", userData.user.id)
    .single();

  // Get recent invoices
  const { data: invoices } = await supabase
    .from("agent_invoices")
    .select("*")
    .eq("agent_id", userData.user.id)
    .order("invoice_date", { ascending: false })
    .limit(10);

  // Get payment history
  const { data: payments } = await supabase
    .from("agent_payments")
    .select("*, agent_invoices(invoice_number)")
    .eq("agent_id", userData.user.id)
    .order("payment_date", { ascending: false })
    .limit(10);

  // Calculate stats
  const totalPaid = payments
    ?.filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;

  const unpaidInvoices = invoices
    ?.filter((i) => i.status === "pending")
    .reduce((sum, i) => sum + parseFloat(i.total_amount.toString()), 0) || 0;

  const planNames = {
    free: "Free Plan",
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
  };

  const planColors = {
    free: "bg-gray-100 text-gray-800",
    starter: "bg-blue-100 text-blue-800",
    professional: "bg-purple-100 text-purple-800",
    enterprise: "bg-orange-100 text-orange-800",
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
    past_due: "bg-red-100 text-red-800",
    suspended: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold">Billing & Subscription</h2>
        <p className="text-muted-foreground">Manage your subscription and view billing history</p>
      </div>

      {/* Success Notification */}
      {showSuccess && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-900">
                <p className="font-semibold mb-1">Payment Successful!</p>
                <p>
                  Your subscription has been activated. You now have access to all features of your plan.
                  Your subscription will renew automatically each billing period.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Canceled Notification */}
      {showCanceled && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-900">
                <p className="font-semibold mb-1">Checkout Canceled</p>
                <p>
                  You canceled the checkout process. No charges were made to your account.
                  You can try again anytime by selecting a plan below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={planColors[subscription.plan_type as keyof typeof planColors]}>
                      {planNames[subscription.plan_type as keyof typeof planNames]}
                    </Badge>
                    <Badge className={statusColors[subscription.status as keyof typeof statusColors]}>
                      {subscription.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">
                    ${parseFloat(subscription.monthly_price.toString()).toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{subscription.billing_cycle}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  {subscription.next_billing_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Next billing date</p>
                      <p className="font-semibold">
                        {new Date(subscription.next_billing_date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Billing Period</p>
                  <p className="font-medium">
                    {new Date(subscription.current_period_start).toLocaleDateString()} -{" "}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
                {subscription.trial_end_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Trial Ends</p>
                    <p className="font-medium">
                      {new Date(subscription.trial_end_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Link href="/app/billing/upgrade">
                  <Button variant="default">Upgrade Plan</Button>
                </Link>
                {subscription.plan_type !== "free" && (
                  <Link href="/app/billing/payment-methods">
                    <Button variant="outline">Manage Payment Methods</Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No active subscription</p>
              <Link href="/app/billing/upgrade">
                <Button>Choose a Plan</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalPaid.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Unpaid Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${unpaidInvoices.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices?.filter((i) => i.status === "pending").length || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Next Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${subscription?.monthly_price ? parseFloat(subscription.monthly_price.toString()).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {subscription?.next_billing_date
                ? new Date(subscription.next_billing_date).toLocaleDateString()
                : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
            <Link href="/app/billing/invoices">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!invoices || invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices yet
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => {
                const statusColors = {
                  draft: "bg-gray-100 text-gray-800",
                  pending: "bg-blue-100 text-blue-800",
                  paid: "bg-green-100 text-green-800",
                  failed: "bg-red-100 text-red-800",
                  refunded: "bg-yellow-100 text-yellow-800",
                  void: "bg-gray-100 text-gray-800",
                };

                return (
                  <Link
                    key={invoice.id}
                    href={`/app/billing/invoices/${invoice.id}`}
                    className="block p-4 border rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{invoice.invoice_number}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {invoice.description || "Platform subscription"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </div>
                        {invoice.paid_at && (
                          <div className="text-sm text-green-600 mt-1 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Paid: {new Date(invoice.paid_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          ${parseFloat(invoice.total_amount.toString()).toFixed(2)}
                        </div>
                        <Badge className={statusColors[invoice.status as keyof typeof statusColors]}>
                          {invoice.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {payments && payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map((payment) => {
                const statusColors = {
                  pending: "bg-blue-100 text-blue-800",
                  processing: "bg-yellow-100 text-yellow-800",
                  completed: "bg-green-100 text-green-800",
                  failed: "bg-red-100 text-red-800",
                  refunded: "bg-gray-100 text-gray-800",
                };

                return (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {payment.agent_invoices?.invoice_number || "Payment"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(payment.payment_date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        via {payment.payment_method}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ${parseFloat(payment.amount.toString()).toFixed(2)}
                      </div>
                      <Badge className={statusColors[payment.status as keyof typeof statusColors]}>
                        {payment.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
