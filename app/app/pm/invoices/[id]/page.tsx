import { supabaseServer } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, DollarSign, ExternalLink, Calendar, User, Home } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PMInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // Get invoice details
  const { data: payment, error } = await supabase
    .from("pm_rent_payments")
    .select(`
      *,
      pm_leases (
        id,
        tenant_name,
        tenant_email,
        tenant_phone,
        monthly_rent,
        lease_start_date,
        lease_end_date,
        pm_properties (address, city, state_province, postal_code),
        pm_units (unit_number)
      )
    `)
    .eq("id", id)
    .eq("agent_id", userData.user.id)
    .single();

  if (error) {
    console.error("Error fetching invoice:", error);
    console.error("Invoice ID:", id);
    console.error("Agent ID:", userData.user.id);
  }

  if (error || !payment) {
    notFound();
  }

  const lease = payment.pm_leases;
  const property = Array.isArray(lease?.pm_properties) ? lease.pm_properties[0] : lease?.pm_properties;
  const unit = Array.isArray(lease?.pm_units) ? lease.pm_units[0] : lease?.pm_units;
  const propertyAddress = property?.address || "Property";
  const fullAddress = unit ? `${propertyAddress}, Unit ${unit.unit_number}` : propertyAddress;

  const dueDate = new Date(payment.due_date);
  const isOverdue = payment.status === "pending" && dueDate < new Date();
  const totalAmount = parseFloat(payment.amount.toString()) + parseFloat((payment.late_fee_amount || 0).toString());

  const statusColors = {
    paid: "bg-green-100 text-green-800",
    pending: "bg-blue-100 text-blue-800",
    overdue: "bg-red-100 text-red-800",
    void: "bg-gray-100 text-gray-800",
    partial: "bg-yellow-100 text-yellow-800",
  };

  const paymentTypeLabels = {
    monthly: "Monthly Rent",
    move_in: "Move-In Charges",
    late_fee: "Late Fee",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link href="/app/pm/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Invoice Details</h2>
          <p className="text-muted-foreground">
            Invoice #{payment.id.slice(0, 8)}
          </p>
        </div>
        <Badge className={statusColors[payment.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
          {payment.status.toUpperCase()}
        </Badge>
      </div>

      {/* Invoice Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Tenant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Tenant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-medium">{lease?.tenant_name || "N/A"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{lease?.tenant_email || "N/A"}</div>
              </div>
              {lease?.tenant_phone && (
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-medium">{lease.tenant_phone}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Address</div>
                <div className="font-medium">{fullAddress}</div>
              </div>
              {property?.city && (
                <div>
                  <div className="text-sm text-muted-foreground">City, State ZIP</div>
                  <div className="font-medium">
                    {property.city}, {property.state_province} {property.postal_code}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                <div className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                  {dueDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {isOverdue && " (Overdue)"}
                </div>
              </div>
              {payment.paid_at && (
                <div>
                  <div className="text-sm text-muted-foreground">Paid On</div>
                  <div className="font-medium text-green-600">
                    {new Date(payment.paid_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              )}
              {payment.payment_method && (
                <div>
                  <div className="text-sm text-muted-foreground">Payment Method</div>
                  <div className="font-medium">{payment.payment_method}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Amount Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Amount Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rent Amount</span>
                <span className="font-medium">${parseFloat(payment.amount.toString()).toFixed(2)}</span>
              </div>
              {payment.late_fee_amount && payment.late_fee_amount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Late Fee</span>
                  <span className="font-medium">${parseFloat(payment.late_fee_amount.toString()).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* External Links */}
          {(payment.ghl_payment_url || payment.qbo_invoice_id) && (
            <Card>
              <CardHeader>
                <CardTitle>External Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payment.ghl_payment_url && (
                  <a
                    href={payment.ghl_payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View in GHL / Send to Tenant
                  </a>
                )}
                {payment.qbo_invoice_id && (
                  <div className="flex items-center gap-2 text-green-600">
                    <ExternalLink className="h-4 w-4" />
                    Synced to QuickBooks (ID: {payment.qbo_invoice_id})
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
