import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DollarSign, Plus, ExternalLink } from "lucide-react";
import CreateMonthlyInvoiceButton from "./create-monthly-invoice-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PMInvoicesPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // Get all rent payments for this agent
  const { data: payments } = await supabase
    .from("pm_rent_payments")
    .select(`
      *,
      pm_leases (
        id,
        tenant_name,
        tenant_email,
        monthly_rent,
        pm_properties (address),
        pm_units (unit_number)
      )
    `)
    .eq("agent_id", userData.user.id)
    .order("due_date", { ascending: false });

  // Get all active leases for creating new invoices
  const { data: activeLeases } = await supabase
    .from("pm_leases")
    .select(`
      id,
      tenant_name,
      tenant_email,
      monthly_rent,
      ghl_contact_id,
      tenant_contact_id,
      pm_properties (address),
      pm_units (unit_number)
    `)
    .eq("agent_id", userData.user.id)
    .in("status", ["active", "month_to_month"]);

  const statusColors = {
    paid: "bg-green-100 text-green-800",
    pending: "bg-blue-100 text-blue-800",
    overdue: "bg-red-100 text-red-800",
    void: "bg-gray-100 text-gray-800",
    partial: "bg-yellow-100 text-yellow-800",
  };

  const paymentTypeLabels = {
    monthly: "Monthly Rent",
    move_in: "Move-In",
    late_fee: "Late Fee",
    other: "Other",
  };

  // Calculate summary stats
  const totalRevenue = payments
    ?.filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;

  const outstandingAmount = payments
    ?.filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()) + parseFloat((p.late_fee_amount || 0).toString()), 0) || 0;

  const overdueCount = payments?.filter((p) => {
    if (p.status !== "pending") return false;
    return new Date(p.due_date) < new Date();
  }).length || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Invoices & Payments</h2>
          <p className="text-muted-foreground">Manage rent invoices and track payments</p>
        </div>
        {activeLeases && activeLeases.length > 0 && (
          <CreateMonthlyInvoiceButton leases={activeLeases} />
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${outstandingAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {payments?.filter((p) => p.status === "pending" || p.status === "overdue").length || 0} unpaid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overdueCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Invoices past due
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
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No invoices created yet</p>
              {activeLeases && activeLeases.length > 0 && (
                <CreateMonthlyInvoiceButton leases={activeLeases} />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => {
                const lease = payment.pm_leases;
                const property = Array.isArray(lease?.pm_properties) ? lease.pm_properties[0] : lease?.pm_properties;
                const unit = Array.isArray(lease?.pm_units) ? lease.pm_units[0] : lease?.pm_units;
                const propertyAddress = property?.address || "Property";
                const fullAddress = unit ? `${propertyAddress}, Unit ${unit.unit_number}` : propertyAddress;

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
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{lease?.tenant_name || "Unknown Tenant"}</div>
                          <Badge variant="outline" className="text-xs">
                            {paymentTypeLabels[payment.payment_type as keyof typeof paymentTypeLabels] || payment.payment_type}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {fullAddress}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Due: {dueDate.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        {payment.paid_at && (
                          <div className="text-sm text-green-600 mt-1">
                            ✓ Paid: {new Date(payment.paid_at).toLocaleDateString()}
                            {payment.payment_method && ` via ${payment.payment_method}`}
                          </div>
                        )}
                        {payment.late_fee_amount && payment.late_fee_amount > 0 && (
                          <div className="text-sm text-red-600 mt-1">
                            Late fee: ${payment.late_fee_amount.toFixed(2)}
                          </div>
                        )}
                        <div className="flex gap-3 mt-2">
                          {payment.ghl_payment_url && (
                            <a
                              href={payment.ghl_payment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              GHL Payment Link
                            </a>
                          )}
                          {payment.qbo_invoice_id && (
                            <span className="text-sm text-green-600 flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              Synced to QBO
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          ${totalAmount.toFixed(2)}
                        </div>
                        <Badge className={statusColors[payment.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                          {payment.status.toUpperCase()}
                        </Badge>
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
