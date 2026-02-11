import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PMPaymentsPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div>Not authenticated</div>;
  }

  // Get all rent payments for this agent
  const { data: payments } = await supabase
    .from("pm_rent_payments")
    .select(`
      *,
      pm_leases (
        id,
        monthly_rent,
        pm_properties (address),
        pm_units (unit_number)
      )
    `)
    .eq("agent_id", userData.user.id)
    .order("due_date", { ascending: false });

  // Calculate stats
  const totalPayments = payments?.length || 0;
  const paidCount = payments?.filter((p) => p.status === "paid").length || 0;
  const overdueCount = payments?.filter((p) => p.status === "overdue").length || 0;
  const pendingCount = payments?.filter((p) => p.status === "pending").length || 0;

  const totalRevenue = payments
    ?.filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;

  const totalOutstanding = payments
    ?.filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rent Payments</h1>
          <p className="text-muted-foreground mt-1">
            Track rent invoices and payment history
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paidCount} payments received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingCount + overdueCount} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overdueCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No rent payments yet. Payments will be created automatically on the 1st of each month.
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => {
                const property = payment.pm_leases?.pm_properties;
                const unit = payment.pm_leases?.pm_units;
                const fullAddress = unit?.unit_number
                  ? `${property?.address}, Unit ${unit.unit_number}`
                  : property?.address || "Unknown Property";

                const statusColors = {
                  paid: "bg-green-100 text-green-800",
                  pending: "bg-blue-100 text-blue-800",
                  overdue: "bg-red-100 text-red-800",
                  void: "bg-gray-100 text-gray-800",
                  partial: "bg-yellow-100 text-yellow-800",
                };

                const dueDate = new Date(payment.due_date);
                const isOverdue = payment.status === "pending" && dueDate < new Date();

                return (
                  <div
                    key={payment.id}
                    className={`p-4 border rounded-lg ${isOverdue ? "border-red-200 bg-red-50" : ""}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold">{fullAddress}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {new Date(payment.due_date).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}{" "}
                          - Due: {dueDate.toLocaleDateString()}
                        </div>
                        {payment.paid_at && (
                          <div className="text-sm text-muted-foreground">
                            Paid: {new Date(payment.paid_at).toLocaleDateString()}
                          </div>
                        )}
                        {payment.late_fee_amount > 0 && (
                          <div className="text-sm text-red-600 mt-1">
                            Late fee: ${payment.late_fee_amount.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          ${payment.amount.toFixed(2)}
                        </div>
                        <Badge
                          className={`mt-1 ${statusColors[payment.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}`}
                        >
                          {payment.status.toUpperCase()}
                        </Badge>
                        {payment.payment_method && (
                          <div className="text-xs text-muted-foreground mt-1">
                            via {payment.payment_method}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
